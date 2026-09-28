import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, Linking, ScrollView, Share, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  FileDown,
  Link2,
  Pencil,
  Settings2,
  Share2,
  Trash2,
} from "lucide-react-native";
import {
  ActionRow,
  Button,
  Notice,
  Sheet,
  T,
} from "../../shared/ui/primitives";
import { ErrorNotice, Loading, s } from "../../shared/ui/layout";
import { PUBLIC_ORIGIN } from "../../shared/api/http";
import { ar, colors as c } from "../../shared/theme";
import { useRemote } from "../../shared/useRemote";
import { sharingApi, type InvitationDetails, type SharingSource } from "./api";
import { InvitationCard } from "./InvitationCard";
import { InvitationForm } from "./InvitationForm";
import { exportPdf } from "./exportPdf";

type Stage = "overview" | "edit" | "preview" | "options" | "revoke" | "discard";

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
  const [stage, setStage] = useState<Stage>("overview");
  const [returnStage, setReturnStage] = useState<Stage>("overview");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [working, setWorking] = useState(false);
  const inFlight = useRef(false);
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    if (r.data && !baseline) {
      setDraft(r.data.details);
      setBaseline({ details: r.data.details, revision: r.data.revision });
    }
  }, [r.data, baseline]);
  const move = (next: Stage) => {
    Keyboard.dismiss();
    setStage(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const dirty =
    !!draft && JSON.stringify(draft) !== JSON.stringify(baseline?.details);
  const stale = !!(baseline && r.data && baseline.revision !== r.data.revision);
  const url = r.data?.code ? `${PUBLIC_ORIGIN}/s/${r.data.code}` : null;
  const busy = r.busy || working;
  const unavailable = busy || stale || !!r.error;
  const attempt = (operation: () => Promise<unknown>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setWorking(true);
    setError(null);
    void operation()
      .catch((e) =>
        setError(e instanceof Error ? e.message : "تعذّرت المشاركة."),
      )
      .finally(() => {
        inFlight.current = false;
        setWorking(false);
      });
  };
  const save = async () => {
    if (!draft || !draft.title.trim() || stale) return;
    const result = await r.mutate(
      () => sharingApi.save(source, draft, baseline?.revision ?? null),
      (next) => next,
    );
    setDraft(result.details);
    setBaseline({ details: result.details, revision: result.revision });
    setCopied(false);
    move("overview");
  };
  const requestClose = () => {
    if (busy) return;
    if (dirty) {
      setReturnStage(stage === "discard" ? returnStage : stage);
      move("discard");
    } else close();
  };
  const title = {
    overview: "مشاركة الخطة",
    edit: "تعديل الدعوة",
    preview: "معاينة الدعوة",
    options: "خيارات المشاركة",
    revoke: "إلغاء رابط الدعوة؟",
    discard: "عندك تعديلات غير محفوظة",
  }[stage];
  const footer =
    draft && r.data ? (
      <>
        <ErrorNotice
          error={error ?? r.error}
          retry={
            r.error
              ? () => {
                  setError(null);
                  void r.refresh();
                }
              : undefined
          }
        />
        {stage === "overview" && (
          <>
            <T style={[s.muted, { fontSize: 12 }]}>
              {url
                ? "رابط للعرض يتحدّث مع خطتك. تفضيلات الرفقة وأسماؤهم تبقى خاصة."
                : "إنشاء الرابط يتيح مشاهدة الخطة لأي شخص معه الرابط، بدون بيانات الرفقة الخاصة."}
            </T>
            <Button
              icon={url && !dirty ? Share2 : Link2}
              label={
                !url
                  ? "إنشاء رابط الدعوة"
                  : dirty
                    ? "حفظ التعديلات"
                    : "مشاركة الدعوة"
              }
              busy={busy}
              disabled={!draft.title.trim() || unavailable}
              onPress={() =>
                attempt(
                  url && !dirty
                    ? () =>
                        Share.share({
                          title: draft.title,
                          message: `${draft.title}\n${draft.message ?? ""}\n${url}`,
                          url,
                        })
                    : save,
                )
              }
            />
            {url && !dirty && (
              <Button
                secondary
                small
                icon={copied ? Check : Copy}
                label={copied ? "تم نسخ الرابط" : "نسخ الرابط"}
                disabled={unavailable}
                onPress={() =>
                  attempt(async () => {
                    await Clipboard.setStringAsync(url);
                    setCopied(true);
                  })
                }
              />
            )}
          </>
        )}
        {stage === "edit" && (
          <Button
            icon={url ? Check : Eye}
            label={url ? "حفظ التعديلات" : "معاينة الدعوة"}
            busy={busy}
            disabled={!draft.title.trim() || unavailable}
            onPress={() => (url ? attempt(save) : move("overview"))}
          />
        )}
        {stage === "preview" && (
          <Button
            secondary
            label="رجوع إلى الدعوة"
            onPress={() => move("overview")}
          />
        )}
        {stage === "revoke" && (
          <>
            <Button
              icon={Trash2}
              label="تأكيد إلغاء الرابط"
              busy={busy}
              disabled={unavailable}
              onPress={() =>
                attempt(async () => {
                  await r.mutate(() =>
                    sharingApi.revoke(source, r.data!.revision!),
                  );
                  setBaseline(null);
                  setCopied(false);
                  move("overview");
                })
              }
            />
            <Button
              secondary
              label="الاحتفاظ بالرابط"
              disabled={busy}
              onPress={() => move("options")}
            />
          </>
        )}
        {stage === "discard" && (
          <>
            <Button label="متابعة التعديل" onPress={() => move(returnStage)} />
            <Button secondary label="تجاهل التعديلات وإغلاق" onPress={close} />
          </>
        )}
      </>
    ) : undefined;
  return (
    <Sheet
      title={title}
      visible
      scrollRef={scroll}
      onClose={requestClose}
      onBack={
        stage !== "overview" && stage !== "discard"
          ? () => {
              if (!busy) move(stage === "revoke" ? "options" : "overview");
            }
          : undefined
      }
      footer={footer}
    >
      {r.loading && <Loading />}
      {!r.data && (
        <ErrorNotice
          error={r.error}
          retry={() => {
            void r.refresh();
          }}
        />
      )}
      {draft && r.data && (
        <>
          {stale && (
            <>
              <Notice
                warning
                text="تغيّرت الدعوة من جهاز آخر. مسودتك محفوظة هنا؛ راجعي أحدث نسخة قبل الحفظ أو المشاركة."
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
          {stage === "overview" && (
            <>
              <InvitationCard compact details={draft} plan={r.data.plan} />
              <T accessibilityLiveRegion="polite" style={s.muted}>
                {ar(r.data.plan.entries.length)} تجارب في الدعوة ·{" "}
                {dirty
                  ? "تعديلات لم تُحفظ بعد"
                  : url
                    ? "الرابط جاهز للمشاركة"
                    : "معاينة فقط · لم يُنشأ رابط بعد"}
              </T>
              <View style={{ borderTopWidth: 1, borderTopColor: c.line }}>
                <ActionRow
                  label="تعديل الدعوة"
                  icon={Pencil}
                  disabled={busy}
                  onPress={() => move("edit")}
                />
                <ActionRow
                  label="معاينة الأماكن والأطباق"
                  icon={Eye}
                  disabled={busy}
                  onPress={() => move("preview")}
                />
                {url && (
                  <ActionRow
                    label="خيارات المشاركة"
                    description="PDF، فتح الرابط أو إلغاؤه"
                    icon={Settings2}
                    disabled={busy}
                    onPress={() => move("options")}
                  />
                )}
              </View>
            </>
          )}
          {stage === "edit" && (
            <InvitationForm value={draft} onChange={setDraft} disabled={busy} />
          )}
          {stage === "preview" && (
            <InvitationCard details={draft} plan={r.data.plan} />
          )}
          {stage === "options" && (
            <>
              {dirty && (
                <Notice text="احفظي تعديلات الدعوة من الشاشة السابقة قبل فتحها أو تصديرها." />
              )}
              <ActionRow
                label="افتح الدعوة"
                description="افتحي النسخة التي يشوفها المستلم"
                icon={ExternalLink}
                disabled={unavailable || dirty || !url}
                onPress={() => attempt(() => Linking.openURL(url!))}
              />
              <ActionRow
                label={working ? "جارٍ تجهيز الملف…" : "حفظ نسخة PDF"}
                description="نسخة ثابتة بالأماكن والأطباق وروابط الخرائط"
                icon={FileDown}
                disabled={unavailable || dirty || !url}
                onPress={() => attempt(() => exportPdf(r.data!.code!))}
              />
              <View
                style={{
                  borderTopWidth: 1,
                  borderColor: c.line,
                  paddingTop: 16,
                }}
              >
                <ActionRow
                  label="إلغاء رابط الدعوة"
                  description="إيقاف مشاهدة الخطة من هذا الرابط"
                  icon={Trash2}
                  destructive
                  disabled={unavailable || !url}
                  onPress={() => move("revoke")}
                />
              </View>
            </>
          )}
          {stage === "revoke" && (
            <Notice
              warning
              text="يتوقف الرابط عند الجميع. النسخ المحفوظة كـPDF تبقى لدى أصحابها. تقدر تنشئ رابطًا جديدًا لاحقًا."
            />
          )}
          {stage === "discard" && (
            <T style={{ lineHeight: 27 }}>
              إذا أغلقتِ الآن، تفقدين تعديلات التصميم غير المحفوظة. الدعوة
              المنشورة تبقى كما كانت.
            </T>
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
        icon={Share2}
        label="مشاركة الخطة"
        disabled={disabled}
        onPress={() => setOpen(true)}
      />
      {open && <Editor source={source} close={() => setOpen(false)} />}
    </>
  );
}
