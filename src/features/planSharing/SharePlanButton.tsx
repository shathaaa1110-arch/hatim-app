import { useCallback, useEffect, useState } from "react";
import { Linking, Share, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Share2 } from "lucide-react-native";
import { Button, Chip, Notice, Sheet, T } from "../../shared/ui/primitives";
import { ErrorNotice, Field, Loading, s } from "../../shared/ui/layout";
import { PUBLIC_ORIGIN } from "../../shared/api/http";
import { useRemote } from "../../shared/useRemote";
import { sharingApi, type InvitationDetails, type SharingSource } from "./api";
import { InvitationCard } from "./InvitationCard";
import { themes } from "./presentation";
import { exportPdf } from "./exportPdf";

function Editor({
  source,
  close,
}: {
  source: SharingSource;
  close: () => void;
}) {
  const read = useCallback(
    () => sharingApi.editor(source),
    [source.kind, source.id, source.token],
  );
  const r = useRemote(read);
  const [draft, setDraft] = useState<InvitationDetails | null>(null);
  const [baseline, setBaseline] = useState<{
    details: InvitationDetails;
    revision: number | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  useEffect(() => {
    if (r.data && !baseline) {
      setDraft(r.data.details);
      setBaseline({ details: r.data.details, revision: r.data.revision });
    }
  }, [r.data, baseline]);
  const dirty =
    !!draft && JSON.stringify(draft) !== JSON.stringify(baseline?.details);
  const stale = baseline && r.data && baseline.revision !== r.data.revision;
  const url = r.data?.code ? `${PUBLIC_ORIGIN}/s/${r.data.code}` : null;
  const attempt = (operation: () => Promise<unknown>) => {
    setError(null);
    void operation().catch((e) =>
      setError(e instanceof Error ? e.message : "تعذّرت المشاركة."),
    );
  };
  const busy = r.busy || exporting;
  return (
    <Sheet
      title="دعوة تليق باللمّة"
      visible
      onClose={() => {
        if (!busy) close();
      }}
    >
      <ErrorNotice
        error={r.error ?? error}
        retry={() => {
          void r.refresh();
        }}
      />
      {r.loading && <Loading />}
      {draft && r.data && (
        <>
          <InvitationCard
            compact={!showDetails}
            details={draft}
            plan={r.data.plan}
          />
          <Button
            secondary
            label={
              showDetails ? "إخفاء تفاصيل المعاينة" : "معاينة الأماكن والأطباق"
            }
            onPress={() => setShowDetails(!showDetails)}
          />
          <View style={s.wrap}>
            {Object.entries(themes).map(([key, theme]) => (
              <Chip
                key={key}
                label={theme.name}
                selected={draft.theme === key}
                onPress={() => {
                  if (!busy)
                    setDraft({
                      ...draft,
                      theme: key as InvitationDetails["theme"],
                    });
                }}
              />
            ))}
          </View>
          <Field
            label="عنوان الدعوة"
            value={draft.title}
            onChangeText={(title) => setDraft({ ...draft, title })}
            maxLength={60}
            editable={!busy}
          />
          <Field
            label="رسالتك للرفقة"
            value={draft.message ?? ""}
            onChangeText={(message) => setDraft({ ...draft, message })}
            maxLength={200}
            multiline
            editable={!busy}
          />
          <Field
            label="متى نتلاقى؟ (اختياري)"
            value={draft.when_label ?? ""}
            onChangeText={(when_label) => setDraft({ ...draft, when_label })}
            maxLength={80}
            placeholder="الخميس ١ أكتوبر، ٨ مساءً بتوقيت الرياض"
            editable={!busy}
          />
          <Field
            label="مكان التجمع (اختياري)"
            value={draft.meeting_note ?? ""}
            onChangeText={(meeting_note) =>
              setDraft({ ...draft, meeting_note })
            }
            maxLength={100}
            placeholder="نتلاقى عند مدخل المكان"
            editable={!busy}
          />
          <Notice text="أي شخص معه الرابط يقدر يشوف الدعوة والأماكن المختارة، وتتحدث مع خطتك. أسماء الأعضاء وحساسياتهم وتفضيلاتهم الخاصة ما تظهر. تقدر تلغي الرابط متى ما بغيت." />
          {stale && (
            <>
              <Notice
                warning
                text="تغيّرت الدعوة من جهاز آخر؛ راجع أحدث نسخة قبل الحفظ."
              />
              <Button
                secondary
                label="استخدام أحدث دعوة"
                disabled={busy}
                onPress={() => {
                  setDraft(r.data!.details);
                  setBaseline({
                    details: r.data!.details,
                    revision: r.data!.revision,
                  });
                  setError(null);
                }}
              />
            </>
          )}
          <Button
            label={url ? "حفظ تصميم الدعوة" : "أنشئ رابط الدعوة"}
            busy={r.busy}
            disabled={exporting || !draft.title.trim() || !!stale}
            onPress={() =>
              attempt(async () => {
                const result = await r.mutate(
                  () =>
                    sharingApi.save(source, draft, baseline?.revision ?? null),
                  (next) => next,
                );
                setDraft(result.details);
                setBaseline({
                  details: result.details,
                  revision: result.revision,
                });
                setCopied(false);
              })
            }
          />
          {url && (
            <>
              {dirty && (
                <Notice text="احفظ تعديلات التصميم قبل مشاركة الدعوة." />
              )}
              <T
                selectable
                style={{
                  writingDirection: "ltr",
                  textAlign: "left",
                  fontSize: 12,
                }}
              >
                {url}
              </T>
              <Button
                secondary
                label={copied ? "تم نسخ رابط الدعوة" : "نسخ رابط الدعوة"}
                disabled={busy || dirty || !!stale || !!r.error}
                onPress={() =>
                  attempt(async () => {
                    await Clipboard.setStringAsync(url);
                    setCopied(true);
                  })
                }
              />
              <Button
                icon={Share2}
                label="أرسل الدعوة"
                disabled={busy || dirty || !!stale || !!r.error}
                onPress={() =>
                  attempt(() =>
                    Share.share({
                      title: draft.title,
                      message: `${draft.title}\n${draft.message ?? ""}\n${url}`,
                      url,
                    }),
                  )
                }
              />
              <Button
                secondary
                label="افتح الدعوة"
                disabled={busy || dirty || !!stale}
                onPress={() => attempt(() => Linking.openURL(url))}
              />
              <Button
                secondary
                label="حفظ نسخة PDF"
                disabled={busy || dirty || !!stale || !!r.error}
                onPress={() => {
                  setExporting(true);
                  setError(null);
                  // Export precisely the reviewed public projection, never the organizer's private plan.
                  const now = new Date().toISOString();
                  void exportPdf(
                    {
                      details: r.data!.details,
                      plan: r.data!.plan,
                      read_at: now,
                      created_at: now,
                    },
                    url,
                  )
                    .catch((e) =>
                      setError(
                        e instanceof Error ? e.message : "تعذّر إنشاء الملف.",
                      ),
                    )
                    .finally(() => setExporting(false));
                }}
              />
              {!confirmRevoke ? (
                <Button
                  secondary
                  label="إلغاء رابط الدعوة"
                  disabled={busy}
                  onPress={() => setConfirmRevoke(true)}
                />
              ) : (
                <>
                  <Notice
                    warning
                    text="يتوقف الرابط عند الجميع. النسخ المحفوظة كـPDF تبقى لدى أصحابها. تقدر تنشئ رابطًا جديدًا لاحقًا."
                  />
                  <Button
                    label="تأكيد إلغاء الرابط"
                    busy={r.busy}
                    onPress={() =>
                      attempt(async () => {
                        await r.mutate(() =>
                          sharingApi.revoke(source, r.data!.revision!),
                        );
                        setBaseline(null);
                        setConfirmRevoke(false);
                        setCopied(false);
                      })
                    }
                  />
                  <Button
                    secondary
                    label="خلّ الرابط"
                    disabled={busy}
                    onPress={() => setConfirmRevoke(false)}
                  />
                </>
              )}
            </>
          )}
        </>
      )}
    </Sheet>
  );
}

export function SharePlanButton({
  source,
  disabled,
}: {
  source: SharingSource;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        secondary
        icon={Share2}
        label="دعوة ومشاركة الخطة"
        disabled={disabled}
        onPress={() => setOpen(true)}
      />
      {open && <Editor source={source} close={() => setOpen(false)} />}
    </>
  );
}
