"""Inspect actual server bytes, public authorization, freshness and bounded layouts."""

from concurrent.futures import ThreadPoolExecutor
from importlib import import_module
from io import BytesIO

import pytest
from pypdf import PdfReader
from test_api import create
from test_plan_sharing import save
from test_social import outing, setup_circle

from hatim.features.plan_sharing.models import PublicInvitation
from hatim.features.plan_sharing.pdf import render_pdf


def urls(reader):
    return [
        annotation.get_object()["/A"]["/URI"]
        for page in reader.pages
        for annotation in page.get("/Annots", [])
    ]


def assert_pdf(content):
    assert content.startswith(b"%PDF-")
    reader = PdfReader(BytesIO(content))
    assert not reader.is_encrypted
    assert "/OpenAction" not in reader.trailer["/Root"]
    assert all(len(page.extract_text()) > 30 for page in reader.pages)
    for page in reader.pages:
        assert float(page.mediabox.width) == pytest.approx(595.28, abs=0.1)
        assert float(page.mediabox.height) == pytest.approx(841.89, abs=0.1)
        for annotation in page.get("/Annots", []):
            link = annotation.get_object()
            assert link["/Subtype"] == "/Link"
            assert link["/A"]["/S"] == "/URI"
            x0, y0, x1, y1 = map(float, link["/Rect"])
            assert 0 <= x0 < x1 <= float(page.mediabox.width)
            assert 0 <= y0 < y1 <= float(page.mediabox.height)
    return reader


@pytest.mark.parametrize("kind", ["plan", "outing"])
def test_pdf_uses_latest_public_plan_and_revocation(client, monkeypatch, kind):
    monkeypatch.setenv("HATIM_PUBLIC_ORIGIN", "https://hatim.example")
    if kind == "plan":
        group, auth = create(client)
        source_id = group["id"]
    else:
        auth, circle = setup_circle(client)
        source_id = outing(client, auth, circle)["id"]
    path = f"/api/plan-invitations/{kind}/{source_id}"
    saved = save(client, path, auth).json()
    public = f"/api/shared-plans/{saved['code']}"
    source = client.get(public).json()
    response = client.get(f"{public}/pdf", headers={"Host": "untrusted.example"})
    assert response.status_code == 200, response.text[:200]
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["content-disposition"] == 'attachment; filename="hatim-plan.pdf"'
    assert response.headers["cache-control"] == "no-store"
    reader = assert_pdf(response.content)
    links = urls(reader)
    assert links.count(f"https://hatim.example/s/{saved['code']}") == 2  # QR and label
    assert set(links) == {f"https://hatim.example/s/{saved['code']}"} | {
        e["maps_url"] for e in source["plan"]["entries"]
    }
    assert not any("untrusted.example" in link for link in links)
    text = " ".join(page.extract_text() for page in reader.pages)
    for secret in (auth["Authorization"].split()[-1], source_id, "preferences", "allergies"):
        assert secret not in text and secret not in str(reader.metadata)
    if kind == "plan":
        client.put(f"/api/groups/{source_id}/settings", headers=auth, json={"slots": 1})
        newer = assert_pdf(client.get(f"{public}/pdf").content)
        selected = client.get(public).json()["plan"]["entries"]
        assert [u for u in urls(newer) if "google.com/maps" in u] == [
            e["maps_url"] for e in selected
        ]
    client.request("DELETE", path, headers=auth, json={"expected_revision": saved["revision"]})
    assert client.get(f"{public}/pdf").status_code == 404
    assert client.get("/api/shared-plans/not-an-invitation/pdf").status_code == 404


@pytest.fixture
def invitation(client):
    group, auth = create(client)
    saved = save(client, f"/api/plan-invitations/plan/{group['id']}", auth).json()
    return PublicInvitation.model_validate(client.get(f"/api/shared-plans/{saved['code']}").json())


@pytest.mark.parametrize("theme", ["palm", "saffron", "rose"])
def test_pdf_long_arabic_mixed_text_and_nine_slots(invitation, theme):
    invitation.details.title = "خميس الأصدقاء " * 4
    invitation.details.message = "أهلًا في لمّتنا 2026 <script>literal</script> & Café " * 4
    invitation.details.when_label = "الخميس الساعة 8:30 PM بتوقيت الرياض " * 2
    invitation.details.meeting_note = "لقاؤنا عند المدخل " * 5
    invitation.details.theme = theme
    entries = invitation.plan.entries
    invitation.plan.entries = [entries[i % len(entries)].model_copy(deep=True) for i in range(9)]
    for entry in invitation.plan.entries:
        entry.dishes = ["طبق التجربة مع إضافاته حسب التوفر " * 3] * 5
    invitation.plan.available = 9
    reader = assert_pdf(render_pdf(invitation, "https://hatim.example/s/sample"))
    assert 3 <= len(reader.pages) <= 10
    assert len([u for u in urls(reader) if "google.com/maps" in u]) == 9
    assert "literal" in " ".join(page.extract_text() for page in reader.pages)
    embedded = [
        font.get_object()["/FontDescriptor"]
        for page in reader.pages
        for font in page["/Resources"]["/Font"].get_object().values()
        if "/FontDescriptor" in font.get_object()
    ]
    assert embedded and all("/FontFile2" in font for font in embedded)


def test_empty_archived_plan_and_newline_only_message(invitation):
    invitation.plan.entries = []
    invitation.plan.archived = True
    invitation.plan.anchor_unavailable = True
    invitation.plan.unfilled = 2
    invitation.plan.consumed = 7
    invitation.details.message = "أهلًا" + "\n" * 190 + "بكم"
    invitation.details.title = "ط" * 60
    reader = assert_pdf(render_pdf(invitation, "https://hatim.example/s/empty"))
    assert len(reader.pages) == 1
    assert len(urls(reader)) == 2


def test_parallel_documents_keep_their_own_links(invitation):
    def export(i):
        url = f"https://hatim.example/s/invitation-{i}"
        reader = assert_pdf(render_pdf(invitation, url))
        assert [link for link in urls(reader) if "hatim.example" in link] == [url, url]

    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(export, range(8)))


def test_pdf_failure_returns_readable_error_without_breaking_invitation(client, monkeypatch):
    group, auth = create(client)
    saved = save(client, f"/api/plan-invitations/plan/{group['id']}", auth).json()
    public = f"/api/shared-plans/{saved['code']}"

    def fail(*args):
        raise ValueError("internal renderer details")

    monkeypatch.setattr(import_module("hatim.features.plan_sharing.router"), "render_pdf", fail)
    response = client.get(f"{public}/pdf")
    assert response.status_code == 503
    assert "internal renderer details" not in response.text
    assert client.get(public).status_code == 200


def test_five_experiences_do_not_leave_a_qr_only_page(invitation):
    invitation.details = invitation.details.model_copy(update={"title": "لمتنا في الرياض"})
    invitation.plan.entries = invitation.plan.entries[:5]
    reader = assert_pdf(render_pdf(invitation, "https://hatim.example/s/compact"))
    assert len(reader.pages) == 2
    assert len([u for u in urls(reader) if "google.com/maps" in u]) == 5
    first_page_links = [a.get_object()["/A"]["/URI"] for a in reader.pages[0].get("/Annots", [])]
    assert first_page_links.count("https://hatim.example/s/compact") == 2
