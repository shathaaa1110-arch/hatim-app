import { useCallback, useState } from "react";
import { Linking, View } from "react-native";
import { FileDown, RefreshCw } from "lucide-react-native";
import { Button, Notice, T } from "../../shared/ui/primitives";
import { ErrorNotice, Loading, Page, s } from "../../shared/ui/layout";
import { PUBLIC_ORIGIN } from "../../shared/api/http";
import { useRemote } from "../../shared/useRemote";
import { sharingApi } from "./api";
import { InvitationCard } from "./InvitationCard";
import { exportPdf } from "./exportPdf";
import { stamp } from "./presentation";

export function PublicInvitationScreen({ code }: { code: string }) {
  const r = useRemote(useCallback(() => sharingApi.public(code), [code]));
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  return (
    <Page title="لكم مكان على الطاولة" subtitle="دعوة من حاتم · تفتح بدون حساب">
      <ErrorNotice
        error={r.error}
        retry={() => {
          void r.refresh();
        }}
      />
      {r.loading && <Loading />}
      {r.data && (
        <>
          <InvitationCard details={r.data.details} plan={r.data.plan} />
          <View style={{ gap: 10 }}>
            <T style={s.muted}>
              آخر قراءة: {stamp(r.data.read_at)} · توقيت الرياض
            </T>
            <Notice
              text={
                r.data.plan.archived
                  ? "هذه طلعة مؤرشفة؛ اختيارات خطتها محفوظة."
                  : "الخطة تتحدث تلقائيًا عند تغيير المنظّم لها. التفاصيل للعرض، والحضور يُرتّب مع المنظّم."
              }
            />
          </View>
          <Button
            secondary
            icon={RefreshCw}
            label="حدّث تفاصيل الدعوة"
            onPress={() => {
              void r.refresh();
            }}
          />
          <ErrorNotice error={exportError} />
          <Button
            icon={FileDown}
            label="حفظ نسخة PDF"
            busy={exporting}
            disabled={!!r.error}
            onPress={() => {
              if (!r.data) return;
              setExporting(true);
              setExportError(null);
              void exportPdf(r.data, `${PUBLIC_ORIGIN}/s/${code}`)
                .catch((e) =>
                  setExportError(
                    e instanceof Error ? e.message : "تعذّر إنشاء الملف.",
                  ),
                )
                .finally(() => setExporting(false));
            }}
          />
          <T style={s.muted}>
            الـPDF نسخة وقت تنزيلها. يضم روابط للموقع والتقييم الحالي على Google
            Maps.
          </T>
          <Button
            secondary
            small
            label="شروط وخصوصية Google Maps"
            onPress={() => {
              void Linking.openURL(
                "https://maps.google.com/help/terms_maps/",
              ).catch(() => setExportError("تعذّر فتح الرابط."));
            }}
          />
          <Button
            secondary
            small
            label="سياسة خصوصية Google"
            onPress={() => {
              void Linking.openURL("https://policies.google.com/privacy").catch(
                () => setExportError("تعذّر فتح الرابط."),
              );
            }}
          />
        </>
      )}
    </Page>
  );
}
