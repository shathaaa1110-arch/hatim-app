import { useState } from "react";
import { View } from "react-native";
import { LockKeyhole, Bookmark } from "lucide-react-native";
import { Button, Chip, Row, T } from "../components/ui";
import { social, type AccountSession } from "./client";
import { ErrorNotice, Field, Page, Panel, s } from "./ui";
import { colors as c } from "../theme";

export function AuthScreen({
  onAuth,
  invitation,
  back,
}: {
  onAuth: (session: AccountSession) => Promise<void>;
  invitation?: string;
  back?: () => void;
}) {
  const [register, setRegister] = useState(true);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (busy) return;
    if (
      !/^[a-zA-Z0-9_.-]{3,40}$/.test(handle.trim()) ||
      password.length < 10 ||
      password.length > 128 ||
      (register && !name.trim())
    ) {
      setError(
        "اكتب اسم مستخدم من ٣ أحرف إنجليزية أو أرقام على الأقل، وكلمة مرور من ١٠ أحرف على الأقل، واسمك عند التسجيل.",
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onAuth(
        register
          ? await social.register(handle.trim(), password, name.trim())
          : await social.login(handle.trim(), password),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر الدخول.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page
      title={invitation ? `لك مكان في «${invitation}»` : "حسابك في حاتم"}
      subtitle="خططك معك، حتى لو تغيّر جهازك. اكتشاف التجارب متاح بدون حساب."
      back={back}
    >
      <Panel glass>
        <Row>
          <Bookmark color={c.green} size={34} />
          <View style={{ flex: 1 }}>
            <T weight="semibold" style={s.heading}>
              خطط محفوظة، على قدّ وقتك.
            </T>
            <T style={s.muted}>
              احفظ خططك وجيبك، وأضف قروبًا دائمًا إذا احتجته.
            </T>
          </View>
        </Row>
      </Panel>
      <Row>
        <Chip
          label="حساب جديد"
          selected={register}
          onPress={
            busy
              ? undefined
              : () => {
                  setRegister(true);
                  setError(null);
                }
          }
        />
        <Chip
          label="تسجيل الدخول"
          selected={!register}
          onPress={
            busy
              ? undefined
              : () => {
                  setRegister(false);
                  setError(null);
                }
          }
        />
      </Row>
      <Panel>
        {register && (
          <Field
            label="اسمك"
            value={name}
            onChangeText={setName}
            maxLength={30}
            autoComplete="given-name"
          />
        )}
        <Field
          label="اسم المستخدم"
          value={handle}
          onChangeText={setHandle}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          maxLength={40}
          placeholder="shatha_11"
          style={{ textAlign: "left", writingDirection: "ltr" }}
        />
        <Field
          label="كلمة المرور"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          maxLength={128}
          autoComplete={register ? "new-password" : "current-password"}
          textContentType={register ? "newPassword" : "password"}
        />
        <T style={s.muted}>
          ١٠ أحرف على الأقل. احتفظ باسم المستخدم وكلمة المرور للعودة إلى حسابك.
        </T>
        <ErrorNotice error={error} />
        <Button
          label={register ? "أنشئ حسابي" : "ادخل إلى حسابي"}
          icon={LockKeyhole}
          busy={busy}
          onPress={() => {
            void submit();
          }}
        />
      </Panel>
    </Page>
  );
}
