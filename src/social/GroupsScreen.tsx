import { useCallback, useState } from "react";
import { Image, Pressable, View } from "react-native";
import {
  ArrowUpLeft,
  LogOut,
  Pin,
  Plus,
  UsersRound,
} from "lucide-react-native";
import {
  Button,
  Empty,
  IconButton,
  Notice,
  Row,
  Sheet,
  T,
} from "../components/ui";
import { PreferencesForm } from "../components/PreferencesForm";
import { emptyPreferences } from "../api/client";
import { ar, colors as c, photos } from "../theme";
import { social, type Account } from "./client";
import { useRemote } from "./useRemote";
import { ErrorNotice, Field, Loading, Page, Panel, s } from "./ui";

export function GroupsScreen({
  token,
  account,
  open,
  logout,
  claim,
}: {
  token: string;
  account: Account;
  open: (id: string) => void;
  logout: () => Promise<void>;
  claim?: () => Promise<string>;
}) {
  const read = useCallback(() => social.groups(token), [token]);
  const remote = useRemote(read);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [showArchive, setShowArchive] = useState(false);
  const groups =
    remote.data?.filter((g) => (showArchive ? g.archived : !g.archived)) ?? [];
  return (
    <Page
      title={`يا هلا، ${account.name}`}
      subtitle="نفس الربع. طلعة جديدة كل مرة."
      action={
        <IconButton
          icon={LogOut}
          label="تسجيل الخروج"
          onPress={() => {
            void remote.mutate(logout).catch(() => {});
          }}
        />
      }
    >
      <Panel glass>
        <Row style={{ alignItems: "center" }}>
          <View style={{ flex: 1, gap: 8 }}>
            <T weight="bold" style={s.heading}>
              لَمّاتي
            </T>
            <T style={s.muted}>أذواقكم محفوظة. نغيّر الخطة على قدّ وقتكم.</T>
          </View>
          <Image
            source={photos.levant}
            style={{ width: 95, height: 110, borderRadius: 20 }}
          />
        </Row>
        <Button
          label="قروب جديد"
          icon={Plus}
          onPress={() => {
            setTitle("");
            setCreating(true);
          }}
        />
      </Panel>
      <ErrorNotice
        error={remote.error}
        retry={() => {
          void remote.refresh();
        }}
      />
      {claim && (
        <Panel>
          <T weight="semibold">لَمّتك السابقة جاهزة للنقل</T>
          <T style={s.muted}>
            نربطها بحسابك، ونحافظ على أعضاءها وخطتها والجيب واللحظات المكتملة.
          </T>
          <Button
            secondary
            label="اربط قروبي السابق بحسابي"
            busy={remote.busy}
            onPress={() => {
              void remote
                .mutate(claim)
                .then(open)
                .catch(() => {});
            }}
          />
        </Panel>
      )}
      <Row style={{ justifyContent: "space-between" }}>
        <T weight="semibold" style={s.heading}>
          {showArchive ? "أرشيف اللمّات" : "قروباتك"}
        </T>
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowArchive(!showArchive)}
        >
          <T style={{ color: c.green }}>
            {showArchive ? "القروبات الحالية" : "الأرشيف"}
          </T>
        </Pressable>
      </Row>
      {remote.loading && <Loading />}
      {!remote.loading && !groups.length && (
        <Empty
          icon={UsersRound}
          title={showArchive ? "الأرشيف فاضي" : "كل لَمّة تبدأ بشخص"}
          text={
            showArchive
              ? "القروبات المؤرشفة تظهر هنا."
              : "سوّ قروب، اعزم الربع، واكتبوا أذواقكم مرة واحدة."
          }
        />
      )}
      {groups.map((group) => (
        <Panel key={group.id}>
          <Row>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`افتح قروب ${group.title}`}
              onPress={() => open(group.id)}
              style={{ flex: 1, gap: 5 }}
            >
              <T weight="semibold" style={s.heading}>
                {group.title}
              </T>
              <T style={s.muted}>
                {ar(group.member_count)} من الربع ·{" "}
                {group.is_owner ? "أنت مالك القروب" : "عضو"}
              </T>
            </Pressable>
            <IconButton
              icon={Pin}
              label={
                group.pinned
                  ? `إلغاء تثبيت ${group.title}`
                  : `ثبّت ${group.title}`
              }
              active={group.pinned}
              onPress={() => {
                void remote
                  .mutate(() =>
                    social.options(token, group.id, { pinned: !group.pinned }),
                  )
                  .catch(() => {});
              }}
            />
            <IconButton
              icon={ArrowUpLeft}
              label={`دخول ${group.title}`}
              onPress={() => open(group.id)}
            />
          </Row>
        </Panel>
      ))}
      <Sheet
        title="وش اسم لَمّتكم؟"
        visible={creating}
        onClose={() => {
          if (!remote.busy) setCreating(false);
        }}
      >
        <Field
          label="اسم القروب"
          value={title}
          onChangeText={setTitle}
          maxLength={60}
          placeholder="ربع الخميس"
        />
        <Notice text="ذوقك هنا يُحفظ لهذا القروب. تقدر تعدّله بأي وقت." />
        <PreferencesForm
          initial={{ ...emptyPreferences, name: account.name }}
          label="أنشئ القروب"
          busy={remote.busy}
          onSave={async (preferences) => {
            if (!title.trim()) throw new Error("اكتب اسم القروب أولًا.");
            const group = await remote.mutate(() =>
              social.create(token, title.trim(), preferences),
            );
            setCreating(false);
            open(group.id);
          }}
        />
      </Sheet>
    </Page>
  );
}
