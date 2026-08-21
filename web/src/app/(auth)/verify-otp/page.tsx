'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { Button, Card } from '@/components/ui';
import type { User as UserType } from '@/types';
import { useLocale, type Locale } from '@/lib/i18n';
import { getErrorMessage } from '@/lib/errors';

type VOStrings = {
  invalidLink: string;
  backToLogin: string;
  title: string;
  subtitleTpl: string;
  codeIncomplete: string;
  genericVerifyError: string;
  resendGenericError: string;
  verifyBtn: string;
  resendCooldownTpl: string;
  resendingLabel: string;
  resendLabel: string;
};

const STRINGS: Record<Locale, VOStrings> = {
  tr: {
    invalidLink: 'Geçersiz doğrulama bağlantısı.',
    backToLogin: 'Girişe dön',
    title: 'Doğrulama kodu gir',
    subtitleTpl: '{email} adresine gönderilen 6 haneli kodu gir.',
    codeIncomplete: '6 haneli kodu eksiksiz gir.',
    genericVerifyError: 'Kod hatalı veya süresi dolmuş.',
    resendGenericError: 'Kod tekrar gönderilemedi.',
    verifyBtn: 'Doğrula',
    resendCooldownTpl: 'Yeni kod ({s}sn)',
    resendingLabel: 'Gönderiliyor…',
    resendLabel: 'Kodu tekrar gönder',
  },
  en: {
    invalidLink: 'Invalid verification link.',
    backToLogin: 'Back to login',
    title: 'Enter verification code',
    subtitleTpl: 'Enter the 6-digit code sent to {email}.',
    codeIncomplete: 'Enter the full 6-digit code.',
    genericVerifyError: 'Invalid or expired code.',
    resendGenericError: 'Could not resend the code.',
    verifyBtn: 'Verify',
    resendCooldownTpl: 'New code ({s}s)',
    resendingLabel: 'Sending…',
    resendLabel: 'Resend code',
  },
  ar: {
    invalidLink: 'رابط تحقق غير صالح.',
    backToLogin: 'العودة لتسجيل الدخول',
    title: 'أدخل رمز التحقق',
    subtitleTpl: 'أدخل الرمز المكوّن من 6 أرقام المرسل إلى {email}.',
    codeIncomplete: 'أدخل الرمز المكوّن من 6 أرقام كاملاً.',
    genericVerifyError: 'الرمز غير صحيح أو منتهي الصلاحية.',
    resendGenericError: 'تعذر إعادة إرسال الرمز.',
    verifyBtn: 'تحقق',
    resendCooldownTpl: 'رمز جديد ({s} ث)',
    resendingLabel: 'جارٍ الإرسال…',
    resendLabel: 'إعادة إرسال الرمز',
  },
  ru: {
    invalidLink: 'Недействительная ссылка для подтверждения.',
    backToLogin: 'Назад ко входу',
    title: 'Введите код подтверждения',
    subtitleTpl: 'Введите 6-значный код, отправленный на {email}.',
    codeIncomplete: 'Введите полный 6-значный код.',
    genericVerifyError: 'Неверный или истёкший код.',
    resendGenericError: 'Не удалось отправить код повторно.',
    verifyBtn: 'Подтвердить',
    resendCooldownTpl: 'Новый код ({s}с)',
    resendingLabel: 'Отправка…',
    resendLabel: 'Отправить код повторно',
  },
  de: {
    invalidLink: 'Ungültiger Bestätigungslink.',
    backToLogin: 'Zurück zur Anmeldung',
    title: 'Bestätigungscode eingeben',
    subtitleTpl: 'Gib den an {email} gesendeten 6-stelligen Code ein.',
    codeIncomplete: 'Gib den vollständigen 6-stelligen Code ein.',
    genericVerifyError: 'Code ungültig oder abgelaufen.',
    resendGenericError: 'Code konnte nicht erneut gesendet werden.',
    verifyBtn: 'Bestätigen',
    resendCooldownTpl: 'Neuer Code ({s}s)',
    resendingLabel: 'Wird gesendet…',
    resendLabel: 'Code erneut senden',
  },
  fr: {
    invalidLink: 'Lien de vérification invalide.',
    backToLogin: 'Retour à la connexion',
    title: 'Entre le code de vérification',
    subtitleTpl: 'Entre le code à 6 chiffres envoyé à {email}.',
    codeIncomplete: 'Entre le code à 6 chiffres complet.',
    genericVerifyError: 'Code invalide ou expiré.',
    resendGenericError: "Le code n'a pas pu être renvoyé.",
    verifyBtn: 'Vérifier',
    resendCooldownTpl: 'Nouveau code ({s}s)',
    resendingLabel: 'Envoi…',
    resendLabel: 'Renvoyer le code',
  },
  es: {
    invalidLink: 'Enlace de verificación no válido.',
    backToLogin: 'Volver al inicio de sesión',
    title: 'Introduce el código de verificación',
    subtitleTpl: 'Introduce el código de 6 dígitos enviado a {email}.',
    codeIncomplete: 'Introduce el código completo de 6 dígitos.',
    genericVerifyError: 'Código incorrecto o caducado.',
    resendGenericError: 'No se pudo reenviar el código.',
    verifyBtn: 'Verificar',
    resendCooldownTpl: 'Nuevo código ({s}s)',
    resendingLabel: 'Enviando…',
    resendLabel: 'Reenviar código',
  },
  it: {
    invalidLink: 'Link di verifica non valido.',
    backToLogin: 'Torna al login',
    title: 'Inserisci il codice di verifica',
    subtitleTpl: 'Inserisci il codice a 6 cifre inviato a {email}.',
    codeIncomplete: 'Inserisci il codice completo a 6 cifre.',
    genericVerifyError: 'Codice errato o scaduto.',
    resendGenericError: 'Impossibile reinviare il codice.',
    verifyBtn: 'Verifica',
    resendCooldownTpl: 'Nuovo codice ({s}s)',
    resendingLabel: 'Invio…',
    resendLabel: 'Reinvia codice',
  },
  ja: {
    invalidLink: '無効な確認リンクです。',
    backToLogin: 'ログインに戻る',
    title: '確認コードを入力',
    subtitleTpl: '{email} に送信された6桁のコードを入力してください。',
    codeIncomplete: '6桁のコードをすべて入力してください。',
    genericVerifyError: 'コードが正しくないか、期限切れです。',
    resendGenericError: 'コードを再送信できませんでした。',
    verifyBtn: '確認',
    resendCooldownTpl: '新しいコード ({s}秒)',
    resendingLabel: '送信中…',
    resendLabel: 'コードを再送信',
  },
};

function VerifyOtpContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();
  const { locale } = useLocale();
  const t = STRINGS[locale];

  const email = params.get('email') || '';
  const purpose = (params.get('purpose') === 'register' ? 'register' : 'login') as
    | 'login'
    | 'register';

  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleDigitChange = (idx: number, value: string) => {
    const v = value.replace(/[^0-9]/g, '').slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[idx] = v;
      return next;
    });
    if (v && idx < 5) inputsRef.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!text) return;
    e.preventDefault();
    setDigits(Array.from({ length: 6 }, (_, i) => text[i] || ''));
    inputsRef.current[Math.min(text.length, 5)]?.focus();
  };

  const submitCode = async (code: string) => {
    setError('');
    setLoading(true);
    try {
      const res = await authApi.verifyOtp({ email, code, purpose });
      localStorage.setItem('lexis_token', res.access_token);
      const me = await authApi.getMe();

      const user: UserType = {
        id: me.id,
        email: me.email,
        username: me.username || '',
        display_name: me.display_name,
        is_admin: me.is_admin ?? me.role === 'admin',
        role: me.role,
        daily_goal: me.daily_goal ?? 5,
        native_lang: me.native_lang,
        learning_lang: me.learning_lang,
        created_at: me.created_at || new Date().toISOString(),
      };

      login(res.access_token, user);
      // Admin/admin_readonly rolündeki kullanıcılar doğrudan admin panele
      // yönlendirilsin — aksi halde /dashboard'a düşüp panele manuel
      // gitmeleri gerekiyordu.
      router.push(user.role === 'admin' || user.role === 'admin_readonly' ? '/admin' : '/dashboard');
    } catch (err) {
      localStorage.removeItem('lexis_token');
      setError(getErrorMessage(err, t.genericVerifyError));
      setDigits(Array(6).fill(''));
      inputsRef.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length !== 6) {
      setError(t.codeIncomplete);
      return;
    }
    await submitCode(code);
  };

  const handleResend = async () => {
    setError('');
    setResending(true);
    try {
      await authApi.resendOtp({ email, purpose });
      setCooldown(60);
      setDigits(Array(6).fill(''));
      inputsRef.current[0]?.focus();
    } catch (err) {
      setError(getErrorMessage(err, t.resendGenericError));
    } finally {
      setResending(false);
    }
  };

  if (!email) {
    return (
      <Card padding="lg" className="border-0 shadow-xl shadow-slate-200/60 text-center">
        <p className="text-slate-600">{t.invalidLink}</p>
        <Link href="/login" className="text-sky-600 font-medium hover:underline mt-4 inline-block">
          {t.backToLogin}
        </Link>
      </Card>
    );
  }

  const [subtitleBefore, subtitleAfter] = t.subtitleTpl.split('{email}');

  return (
    <Card padding="lg" className="border-0 shadow-xl shadow-slate-200/60">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-800">{t.title}</h1>
        <p className="text-slate-400 text-sm mt-2">
          {subtitleBefore}
          <span className="font-medium text-slate-600">{email}</span>
          {subtitleAfter}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex justify-center gap-2" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-11 h-12 text-center text-lg font-semibold rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          ))}
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 text-center">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          {t.verifyBtn}
        </Button>
      </form>

      <div className="text-center mt-5">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || cooldown > 0}
          className="text-sm text-sky-600 font-medium hover:underline disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed"
        >
          {cooldown > 0
            ? t.resendCooldownTpl.replace('{s}', String(cooldown))
            : resending
            ? t.resendingLabel
            : t.resendLabel}
        </button>
      </div>

      <p className="text-center text-sm text-slate-400 mt-6">
        <Link href="/login" className="text-sky-600 font-medium hover:underline">
          {t.backToLogin}
        </Link>
      </p>
    </Card>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOtpContent />
    </Suspense>
  );
}
