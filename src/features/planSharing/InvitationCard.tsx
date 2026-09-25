import { useState } from "react";
import { Image, Linking, View } from "react-native";
import { MapPin, Star, Utensils } from "lucide-react-native";
import { Button, Chip, Notice, Row, T } from "../../shared/ui/primitives";
import { Panel, s } from "../../shared/ui/layout";
import { ar, colors as c, photos } from "../../shared/theme";
import { experiencesApi, type GoogleRating } from "../experiences";
import type { InvitationDetails, SharedPlan, SharedExperience } from "./api";
import { contexts, stamp, themeFor } from "./presentation";

function PlaceLinks({ experience: e }: { experience: SharedExperience }) {
  const [rating, setRating] = useState<GoogleRating | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      setError("تعذّر فتح الرابط. حاول مرة ثانية.");
    }
  };
  return (
    <View style={{ gap: 10 }}>
      <Button
        secondary
        small
        icon={MapPin}
        label={
          e.maps_verified
            ? `الموقع وتقييم Google Maps · ${e.venue}`
            : `ابحث في Google Maps · ${e.venue}`
        }
        onPress={() => {
          void open(e.maps_url);
        }}
      />
      {!e.is_demo && (
        <Button
          secondary
          small
          icon={Star}
          label={rating ? "تحديث تقييم Google" : "اعرض تقييم Google"}
          busy={busy}
          onPress={() => {
            setBusy(true);
            setError(null);
            void experiencesApi
              .rating(e.id)
              .then(setRating)
              .catch(() =>
                setError("التقييم غير متاح الآن. تقدر تراجعه في Google Maps."),
              )
              .finally(() => setBusy(false));
          }}
        />
      )}
      {rating?.status === "available" && (
        <View
          style={{
            borderWidth: 1,
            borderColor: c.line,
            borderRadius: 14,
            padding: 14,
            backgroundColor: "white",
            gap: 6,
          }}
        >
          <T
            style={{
              color: "#1F1F1F",
              fontSize: 14,
              writingDirection: "ltr",
              textAlign: "right",
            }}
          >
            Google Maps
          </T>
          <T weight="semibold">
            ★ {rating.rating} / 5
            {rating.review_count != null
              ? ` · ${ar(rating.review_count)} مراجعة`
              : ""}
          </T>
          {rating.checked_at && (
            <T style={s.muted}>جُلب في {stamp(rating.checked_at)}</T>
          )}
          {rating.attributions?.map((a) => (
            <Button
              key={a.provider_uri}
              small
              secondary
              label={a.provider}
              onPress={() => {
                void open(a.provider_uri);
              }}
            />
          ))}
        </View>
      )}
      {rating && rating.status !== "available" && (
        <T style={s.muted}>التقييم غير متاح هنا. افتح Google Maps لمراجعته.</T>
      )}
      {error && <Notice warning text={error} />}
      {e.is_demo && (
        <T style={s.muted}>
          مكان توضيحي؛ الرابط بحث بالاسم وليس موقعًا موثقًا، ولا يوجد تقييم
          Google مؤكد له.
        </T>
      )}
    </View>
  );
}

export function InvitationCard({
  details,
  plan,
  compact = false,
}: {
  details: InvitationDetails;
  plan: SharedPlan;
  compact?: boolean;
}) {
  const theme = themeFor(details);
  const anchor =
    plan.entries.find((e) => e.priority === "ركيزة") ?? plan.entries[0];
  const total = plan.entries.reduce((sum, e) => sum + e.price, 0);
  return (
    <View style={{ gap: 20 }}>
      <View
        style={{
          backgroundColor: theme.light,
          borderRadius: 28,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: theme.accent,
        }}
      >
        {anchor && photos[anchor.image] && (
          <Image
            source={photos[anchor.image]}
            style={{ height: compact ? 125 : 190, width: "100%" }}
            accessibilityLabel="صورة توضيحية لأجواء التجربة"
          />
        )}
        <View style={{ alignItems: "center", gap: 14, padding: 25 }}>
          <T style={{ fontSize: 12, color: theme.ink }}>
            حــاتم · {contexts[plan.context.kind ?? "any"]}
          </T>
          <Utensils size={24} color={theme.ink} />
          <T
            weight="bold"
            style={{
              fontSize: compact ? 27 : 34,
              textAlign: "center",
              color: theme.ink,
            }}
          >
            {details.title}
          </T>
          {!!details.message && (
            <T
              style={{ textAlign: "center", lineHeight: 27, color: theme.ink }}
            >
              {details.message}
            </T>
          )}
          {!!details.when_label && (
            <T
              weight="semibold"
              style={{ color: theme.ink, textAlign: "center" }}
            >
              {details.when_label}
            </T>
          )}
          {!!details.meeting_note && (
            <T style={{ color: theme.ink, textAlign: "center" }}>
              نتلاقى: {details.meeting_note}
            </T>
          )}
          <View
            style={{ height: 1, width: 65, backgroundColor: theme.accent }}
          />
          <T style={{ textAlign: "center", fontSize: 13, color: theme.ink }}>
            الطعم يبقى… والخطة تتغيّر.
          </T>
        </View>
      </View>
      {!compact && (
        <>
          <View style={s.wrap}>
            <Chip label={`${ar(plan.entries.length)} تجارب قادمة`} />
            <Chip label={`${ar(plan.available)} خانات متبقية`} />
            <Chip label={`${ar(plan.consumed)} عشناها`} />
          </View>
          {!!plan.entries.length && (
            <T style={s.muted}>
              حوالي {ar(total)} ر.س للشخص للتجارب المعروضة كلها · تقدير تحريري
              وليس فاتورة أو سعرًا مباشرًا.
            </T>
          )}
          {plan.anchor_unavailable && (
            <Notice
              warning
              text="الركيزة تحتاج مراجعة من المنظّم. لم نستبدلها بصمت، وخانتها محفوظة إذا بقي وقت."
            />
          )}
          {plan.unfilled > 0 && (
            <Notice
              text={`${ar(plan.unfilled)} خانات لم تُملأ بعد. هذه الدعوة تعرض التجارب المناسبة المختارة فقط.`}
            />
          )}
          {plan.entries.map((e, index) => (
            <Panel key={e.id}>
              <Row style={{ justifyContent: "space-between" }}>
                <Chip label={e.priority} />
                <T style={s.muted}>خانة {ar(plan.consumed + index + 1)}</T>
              </Row>
              <T weight="semibold" style={{ fontSize: 25 }}>
                {e.title}
              </T>
              <T weight="medium">
                {e.venue} · {e.neighborhood}
              </T>
              <T style={s.muted}>
                {e.cuisine} · {ar(e.price)} ر.س للشخص · {ar(e.minutes)} دقيقة
                للتجربة
              </T>
              <T style={{ lineHeight: 26 }}>{e.reason}</T>
              <T weight="semibold">وش نطلب؟</T>
              <T style={{ lineHeight: 26 }}>
                {e.dishes.length
                  ? e.dishes.join(" · ")
                  : "اسألوا المكان عن أطباق التجربة المتاحة."}
              </T>
              {e.options.map((option) => (
                <T key={option} style={{ lineHeight: 25, color: c.green }}>
                  خيار متاح: {option}
                </T>
              ))}
              <PlaceLinks experience={e} />
            </Panel>
          ))}
          {!plan.entries.length && (
            <Notice
              text={
                plan.available === 0
                  ? "عشتوا خانات هذه الخطة كلها. الحكاية محفوظة."
                  : "الخطة تحتاج مراجعة من المنظّم قبل تحديد الأماكن. ما أضفنا بدائل من خارجها."
              }
            />
          )}
          <T style={s.muted}>
            الأطباق اقتراحات التجربة وليست طلبًا مؤكدًا. تأكدوا مع المكان من
            مكونات الأطباق وتعديلاتكم. مدة التجربة لا تشمل الطريق، والموعد
            المكتوب ليس حجزًا.
          </T>
        </>
      )}
    </View>
  );
}
