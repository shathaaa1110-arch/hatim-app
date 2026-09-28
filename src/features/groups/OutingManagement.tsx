import { useState } from "react";
import { View } from "react-native";
import { Crown, Smile, UserMinus, UsersRound } from "lucide-react-native";
import {
  Button,
  Chip,
  Notice,
  Row,
  Sheet,
  T,
} from "../../shared/ui/primitives";
import { colors as c } from "../../shared/theme";
import { groupsApi, type Outing } from "./api";
import {
  ConfirmationContent,
  type Confirmation,
  ErrorNotice,
  Panel,
  s,
} from "../../shared/ui/layout";

type Participant = Outing["participants"][number];

/** Explain unavailable actions instead of hiding the feature entirely. */
function funBlock(
  outing: Outing,
  me: Participant | undefined,
  target: Participant,
) {
  if (outing.status === "closed") return "الطلعة مغلقة.";
  if (target.fun_used)
    return "أخذ مقعد الاحتياط في هذه الطلعة بالفعل؛ مرة واحدة لكل عضو.";
  if (!me?.fun_opt_in) return "فعّل مشاركتك في الطرد الفكاهي من الزر أعلاه.";
  if (!target.fun_opt_in)
    return `${target.name} لم يفعّل المشاركة في المزاح بعد.`;
  if (me.attendance !== "going") return "أكد حضورك في الطلعة أولًا.";
  if (target.attendance !== "going") return `${target.name} لم يؤكد حضوره بعد.`;
  return null;
}

export function OutingManagement({
  outing: o,
  token,
  busy,
  error,
  update,
  close,
  openGroup,
}: {
  outing: Outing;
  token: string;
  busy: boolean;
  error: string | null;
  update: (operation: () => Promise<Outing>) => Promise<Outing>;
  close: () => void;
  openGroup: () => void;
}) {
  const [picker, setPicker] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const me = o.participants.find((p) => p.is_me);
  const others = o.participants.filter((p) => !p.is_me);
  const writeThenRead = (write: () => Promise<unknown>) =>
    update(async () => {
      await write();
      return groupsApi.outing(token, o.id);
    });
  const confirm = (value: Confirmation) => {
    setSuccess(null);
    setConfirmation(value);
  };
  return (
    <Sheet
      title={
        confirmation?.title ??
        (picker ? "اختيار قائد الطلعة" : "إدارة الطلعة والأعضاء")
      }
      visible
      onClose={() => {
        if (!busy) close();
      }}
    >
      {confirmation ? (
        <ConfirmationContent
          value={confirmation}
          busy={busy}
          back={() => setConfirmation(null)}
          done={() => {
            setConfirmation(null);
            setPicker(false);
            setSuccess("تم حفظ التغيير، وتحدّثت الصلاحيات للجميع.");
          }}
        />
      ) : (
        <>
          <ErrorNotice error={error} />
          {success && <Notice text={success} />}
          {picker ? (
            <>
              <Notice text="القائد يدير الخطة والتصويت. يمكنك اختياره حتى قبل تأكيد حضوره؛ هذا لا يحسبه حاضرًا تلقائيًا." />
              {o.participants.map((person) => (
                <Panel key={person.member_id}>
                  <T weight="semibold">
                    {person.name}
                    {person.is_me ? " · أنت" : ""}
                  </T>
                  <Button
                    secondary
                    label={
                      person.is_coordinator
                        ? `${person.name} هو القائد الحالي`
                        : `تعيين ${person.name} قائدًا`
                    }
                    disabled={
                      busy ||
                      !o.can_manage ||
                      !person.claimed ||
                      person.is_coordinator ||
                      o.status === "closed"
                    }
                    onPress={() =>
                      confirm({
                        title: `قيادة الطلعة لـ${person.name}؟`,
                        text: `${person.name} سيصبح مسؤول الخطة والتصويت. ${o.is_owner ? "تبقى لك إدارة الطلعة بصفتك مالك القروب." : "بعد النقل تصبح عضوًا عاديًا في هذه الطلعة وتفقد صلاحيات القائد."} حضور الجميع وملكية القروب يبقيان كما هما.`,
                        label: "تأكيد تعيين القائد",
                        run: () =>
                          update(() =>
                            groupsApi.coordinator(
                              token,
                              o.id,
                              person.member_id,
                            ),
                          ),
                      })
                    }
                  />
                  {!person.claimed && (
                    <T style={s.muted}>يحتاج ربط عضويته بحساب أولًا.</T>
                  )}
                </Panel>
              ))}
              <Button
                secondary
                label="رجوع إلى إدارة الأعضاء"
                onPress={() => setPicker(false)}
              />
            </>
          ) : (
            <>
              <Panel glass>
                <Row>
                  <Crown color={c.green} size={27} />
                  <View style={{ flex: 1 }}>
                    <T weight="semibold">قائد الطلعة: {o.coordinator_name}</T>
                    <T style={s.muted}>مالك القروب: {o.owner_name}</T>
                  </View>
                </Row>
                <T style={s.muted}>
                  {o.is_owner
                    ? "أنت مالك القروب: تدير الملكية والعضوية وكل طلعاته."
                    : o.can_manage
                      ? "أنت قائد هذه الطلعة: تدير خطتها وتصويتها وتقدر تنقل قيادتها."
                      : "أنت عضو: تؤكد حضورك وتصوّت وتشارك بالمزاح اختياريًا."}
                </T>
                <Button
                  secondary
                  label="تغيير قائد الطلعة"
                  disabled={busy || !o.can_manage || o.status === "closed"}
                  onPress={() => {
                    setSuccess(null);
                    setPicker(true);
                  }}
                />
                {!o.can_manage && (
                  <T style={s.muted}>
                    تغيير القائد للقائد الحالي أو مالك القروب فقط.
                  </T>
                )}
                {o.status === "closed" && (
                  <T style={s.muted}>
                    هذه الطلعة محفوظة؛ لا يمكن تعديل قيادتها.
                  </T>
                )}
              </Panel>
              <Panel>
                <Row>
                  <Smile color={c.coral} size={25} />
                  <T weight="semibold" style={{ flex: 1 }}>
                    الطرد الفكاهي 😄
                  </T>
                </Row>
                <T style={s.muted}>
                  «مقعد الاحتياط» لمدة ٣٠ ثانية. لا يلغي العضوية أو الصوت أو
                  القيود، والمستهدف يقدر يقفله فورًا.
                </T>
                <Button
                  secondary
                  label={
                    me?.fun_opt_in
                      ? "إيقاف مشاركتي في الطرد الفكاهي"
                      : "أوافق وأفعّل الطرد الفكاهي"
                  }
                  disabled={busy || o.status === "closed"}
                  onPress={() => {
                    setSuccess(null);
                    void writeThenRead(() =>
                      groupsApi.options(token, o.circle_id, {
                        fun_opt_in: !me?.fun_opt_in,
                      }),
                    ).catch(() => {});
                  }}
                />
              </Panel>
              <T weight="semibold" style={s.heading}>
                أعضاء الطلعة
              </T>
              {!others.length && (
                <Panel>
                  <UsersRound color={c.green} size={28} />
                  <T weight="semibold">أنت وحدك في الطلعة حاليًا</T>
                  <T style={s.muted}>
                    تعيين قائد آخر والطرد يحتاجان عضوًا ثانيًا. اعزمه للقروب
                    أولًا؛ ستظهر خياراته هنا بمجرد انضمامه.
                  </T>
                  <Button label="اعزم أعضاء من القروب" onPress={openGroup} />
                  <T style={s.muted}>
                    الطرد الجدي يزيل العضو من القروب، وهو لمالكه فقط.
                  </T>
                </Panel>
              )}
              {others.map((person) => {
                const funReason = funBlock(o, me, person);
                const removeReason =
                  o.status === "closed"
                    ? "الطلعة مغلقة. إدارة عضوية القروب من صفحته."
                    : person.is_owner
                      ? "لا يمكن طرد مالك القروب؛ يلزم نقل الملكية أولًا من صفحة القروب."
                      : !o.is_owner
                        ? `الطرد من القروب لمالكه: ${o.owner_name}. قيادة الطلعة وحدها لا تمنح هذه الصلاحية.`
                        : null;
                return (
                  <Panel key={person.member_id}>
                    <Row>
                      <T weight="semibold" style={{ flex: 1, fontSize: 20 }}>
                        {person.name}
                      </T>
                      {person.is_coordinator && <Chip label="قائد الطلعة" />}
                      {person.is_owner && <Chip label="مالك القروب" />}
                    </Row>
                    <Button
                      secondary
                      icon={Smile}
                      label={`طرد ${person.name} فكاهيًا 😄`}
                      disabled={busy || !!funReason}
                      onPress={() => {
                        setSuccess(null);
                        void update(() =>
                          groupsApi.fun(token, o.id, person.member_id),
                        )
                          .then(() =>
                            setSuccess(
                              `${person.name} على مقعد الاحتياط ٣٠ ثانية 😄`,
                            ),
                          )
                          .catch(() => {});
                      }}
                    />
                    {funReason && <T style={s.muted}>{funReason}</T>}
                    <Button
                      secondary
                      icon={UserMinus}
                      label={`طرد ${person.name} من القروب`}
                      disabled={busy || !!removeReason}
                      onPress={() =>
                        confirm({
                          title: `طرد ${person.name} من القروب؟`,
                          text: `هذا طرد حقيقي: يفقد ${person.name} الوصول للقروب وطلعاته وتصويتها، وتُراجع جولات الطلعات المتأثرة. ${person.is_coordinator ? "تعود قيادة هذه الطلعة لمالك القروب. " : ""}تقدر تعيده من قائمة أعضاء القروب.`,
                          label: "تأكيد الطرد",
                          run: () =>
                            writeThenRead(() =>
                              groupsApi.remove(
                                token,
                                o.circle_id,
                                person.member_id,
                              ),
                            ),
                        })
                      }
                    />
                    {removeReason && <T style={s.muted}>{removeReason}</T>}
                  </Panel>
                );
              })}
              {!!others.length && (
                <Button
                  secondary
                  label="القروب والدعوات وإعادة الأعضاء"
                  onPress={openGroup}
                />
              )}
            </>
          )}
        </>
      )}
    </Sheet>
  );
}
