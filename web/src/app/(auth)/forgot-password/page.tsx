'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, KeyRound } from 'lucide-react';
import { authApi } from '@/lib/api';
import { Button, Input, Card } from '@/components/ui';
import { useLocale, type Locale } from '@/lib/i18n';
import { getErrorMessage } from '@/lib/errors';

type FPStrings = {
  title: string;
  subtitle: string;
  emailLabel: string;
  emailPlaceholder: string;
  emailInvalid: string;
  genericError: string;
  sendBtn: string;
  checkEmailTitle: string;
  checkEmailBodyTpl: string;
  enterCodeBtn: string;
  backToLogin: string;
};

const STRINGS: Record<Locale, FPStrings> = {
  tr: {
    title: 'Şifreni mi unuttun?',
    subtitle: 'E-postanı gir, sana bir sıfırlama kodu gönderelim.',
    emailLabel: 'E-posta',
    emailPlaceholder: 'ornek@email.com',
    emailInvalid: 'Geçerli bir e-posta gir.',
    genericError: 'Bir şeyler ters gitti, tekrar dene.',
    sendBtn: 'Sıfırlama kodu gönder',
    checkEmailTitle: 'E-postanı kontrol et',
    checkEmailBodyTpl: '{email} adresi sistemde kayıtlıysa, şifreni sıfırlamak için 6 haneli bir kod gönderdik.',
    enterCodeBtn: 'Kodu gir',
    backToLogin: 'Girişe dön',
  },
  en: {
    title: 'Forgot your password?',
    subtitle: "Enter your email and we'll send you a reset code.",
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    emailInvalid: 'Enter a valid email.',
    genericError: 'Something went wrong, please try again.',
    sendBtn: 'Send reset code',
    checkEmailTitle: 'Check your email',
    checkEmailBodyTpl: "If {email} is registered, we've sent a 6-digit code to reset your password.",
    enterCodeBtn: 'Enter code',
    backToLogin: 'Back to login',
  },
  ar: {
    title: 'هل نسيت كلمة المرور؟',
    subtitle: 'أدخل بريدك الإلكتروني وسنرسل لك رمز إعادة التعيين.',
    emailLabel: 'البريد الإلكتروني',
    emailPlaceholder: 'example@email.com',
    emailInvalid: 'أدخل بريدًا إلكترونيًا صحيحًا.',
    genericError: 'حدث خطأ ما، حاول مرة أخرى.',
    sendBtn: 'إرسال رمز إعادة التعيين',
    checkEmailTitle: 'تحقق من بريدك الإلكتروني',
    checkEmailBodyTpl: 'إذا كان {email} مسجلاً لدينا، فقد أرسلنا رمزًا مكونًا من 6 أرقام لإعادة تعيين كلمة المرور.',
    enterCodeBtn: 'أدخل الرمز',
    backToLogin: 'العودة لتسجيل الدخول',
  },
  ru: {
    title: 'Забыли пароль?',
    subtitle: 'Введите email, и мы отправим код для сброса пароля.',
    emailLabel: 'Эл. почта',
    emailPlaceholder: 'you@example.com',
    emailInvalid: 'Введите корректный email.',
    genericError: 'Что-то пошло не так, попробуйте снова.',
    sendBtn: 'Отправить код',
    checkEmailTitle: 'Проверьте почту',
    checkEmailBodyTpl: 'Если {email} зарегистрирован у нас, мы отправили 6-значный код для сброса пароля.',
    enterCodeBtn: 'Ввести код',
    backToLogin: 'Назад ко входу',
  },
  de: {
    title: 'Passwort vergessen?',
    subtitle: 'Gib deine E-Mail ein, wir senden dir einen Reset-Code.',
    emailLabel: 'E-Mail',
    emailPlaceholder: 'du@beispiel.com',
    emailInvalid: 'Gib eine gültige E-Mail-Adresse ein.',
    genericError: 'Etwas ist schiefgelaufen, versuche es erneut.',
    sendBtn: 'Reset-Code senden',
    checkEmailTitle: 'Prüfe deine E-Mails',
    checkEmailBodyTpl: 'Falls {email} bei uns registriert ist, haben wir einen 6-stelligen Code zum Zurücksetzen gesendet.',
    enterCodeBtn: 'Code eingeben',
    backToLogin: 'Zurück zur Anmeldung',
  },
  fr: {
    title: 'Mot de passe oublié ?',
    subtitle: 'Entre ton e-mail, nous t’enverrons un code de réinitialisation.',
    emailLabel: 'E-mail',
    emailPlaceholder: 'toi@exemple.com',
    emailInvalid: 'Entre un e-mail valide.',
    genericError: 'Une erreur est survenue, réessaie.',
    sendBtn: 'Envoyer le code',
    checkEmailTitle: 'Vérifie tes e-mails',
    checkEmailBodyTpl: 'Se {email} est enregistré chez nous, nous avons envoyé un code à 6 chiffres pour réinitialiser ton mot de passe.',
    enterCodeBtn: 'Entrer le code',
    backToLogin: 'Retour à la connexion',
  },
  es: {
    title: '¿Olvidaste tu contraseña?',
    subtitle: 'Introduce tu correo y te enviaremos un código de restablecimiento.',
    emailLabel: 'Correo electrónico',
    emailPlaceholder: 'tu@ejemplo.com',
    emailInvalid: 'Introduce un correo válido.',
    genericError: 'Algo salió mal, inténtalo de nuevo.',
    sendBtn: 'Enviar código',
    checkEmailTitle: 'Revisa tu correo',
    checkEmailBodyTpl: 'Si {email} está registrado, te hemos enviado un código de 6 dígitos para restablecer tu contraseña.',
    enterCodeBtn: 'Introducir código',
    backToLogin: 'Volver al inicio de sesión',
  },
  it: {
    title: 'Password dimenticata?',
    subtitle: 'Inserisci la tua email e ti invieremo un codice di ripristino.',
    emailLabel: 'E-mail',
    emailPlaceholder: 'tu@esempio.com',
    emailInvalid: 'Inserisci un’email valida.',
    genericError: 'Qualcosa è andato storto, riprova.',
    sendBtn: 'Invia codice',
    checkEmailTitle: 'Controlla la tua email',
    checkEmailBodyTpl: 'Se {email} è registrata, abbiamo inviato un codice a 6 cifre per reimpostare la password.',
    enterCodeBtn: 'Inserisci codice',
    backToLogin: 'Torna al login',
  },
  ja: {
    title: 'パスワードをお忘れですか?',
    subtitle: 'メールアドレスを入力すると、リセットコードをお送りします。',
    emailLabel: 'メールアドレス',
    emailPlaceholder: 'you@example.com',
    emailInvalid: '有効なメールアドレスを入力してください。',
    genericError: '問題が発生しました。もう一度お試しください。',
    sendBtn: 'リセットコードを送信',
    checkEmailTitle: 'メールを確認してください',
    checkEmailBodyTpl: '{email} が登録されている場合、パスワードをリセットする6桁のコードを送信しました。',
    enterCodeBtn: 'コードを入力',
    backToLogin: 'ログインに戻る',
  },
};

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const t = STRINGS[locale];

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.includes('@')) {
      setError(t.emailInvalid);
      return;
    }

    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: unknown) {
      // Backend güvenlik gereği zaten hata döndürmüyor (her zaman genel mesaj) —
      // ama ağ hatası gibi durumlar için yine de bir fallback bırakıyoruz.
      setError(getErrorMessage(err, t.genericError));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    const [bodyBefore, bodyAfter] = t.checkEmailBodyTpl.split('{email}');
    return (
      <Card padding="lg" className="border-0 shadow-xl shadow-slate-200/60 text-center">
        <div className="w-11 h-11 bg-sky-500 rounded-xl flex items-center justify-center shrink-0 mx-auto mb-4">
          <KeyRound size={20} className="text-white" strokeWidth={2.5} />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t.checkEmailTitle}</h1>
        <p className="text-slate-400 text-sm mb-6">
          {bodyBefore}
          <span className="font-medium text-slate-600 dark:text-slate-300">{email}</span>
          {bodyAfter}
        </p>
        <Button
          type="button"
          className="w-full"
          size="lg"
          onClick={() => router.push(`/reset-password?email=${encodeURIComponent(email)}`)}
        >
          {t.enterCodeBtn}
        </Button>
        <p className="text-center text-sm text-slate-400 mt-6">
          <Link href="/login" className="text-sky-600 dark:text-sky-400 font-medium hover:underline">
            {t.backToLogin}
          </Link>
        </p>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="border-0 shadow-xl shadow-slate-200/60">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-11 h-11 bg-sky-500 rounded-xl flex items-center justify-center shrink-0">
          <KeyRound size={20} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t.title}</h1>
          <p className="text-slate-400 text-sm mt-0.5">{t.subtitle}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t.emailLabel}
          type="email"
          placeholder={t.emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail size={16} />}
          autoFocus
          required
        />

        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full mt-2" size="lg" loading={loading}>
          {t.sendBtn}
        </Button>
      </form>

      <p className="text-center text-sm text-slate-400 mt-6">
        <Link href="/login" className="text-sky-600 dark:text-sky-400 font-medium hover:underline">
          {t.backToLogin}
        </Link>
      </p>
    </Card>
  );
}
