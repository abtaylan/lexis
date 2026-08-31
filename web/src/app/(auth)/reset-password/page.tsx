'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Lock, KeyRound } from 'lucide-react';
import { authApi } from '@/lib/api';
import { Button, Input, Card } from '@/components/ui';
import { useLocale, type Locale } from '@/lib/i18n';
import { getErrorMessage } from '@/lib/errors';

type RPStrings = {
  invalidLink: string;
  backToForgot: string;
  codeIncomplete: string;
  tooShort: string;
  mismatch: string;
  genericError: string;
  doneTitle: string;
  doneBody: string;
  goToLoginBtn: string;
  title: string;
  subtitleTpl: string;
  codeLabel: string;
  newPasswordLabel: string;
  newPasswordPlaceholder: string;
  confirmLabel: string;
  confirmPlaceholder: string;
  updateBtn: string;
  backToLogin: string;
};

const STRINGS: Record<Locale, RPStrings> = {
  tr: {
    invalidLink: 'Geçersiz bağlantı.',
    backToForgot: 'Şifremi unuttum sayfasına dön',
    codeIncomplete: '6 haneli kodu eksiksiz gir.',
    tooShort: 'Şifre en az 6 karakter olmalı.',
    mismatch: 'Şifreler eşleşmiyor.',
    genericError: 'Kod hatalı veya süresi dolmuş.',
    doneTitle: 'Şifren güncellendi',
    doneBody: 'Yeni şifrenle giriş yapabilirsin.',
    goToLoginBtn: 'Girişe git',
    title: 'Şifreni sıfırla',
    subtitleTpl: '{email} adresine gönderilen 6 haneli kodu ve yeni şifreni gir.',
    codeLabel: 'Doğrulama kodu',
    newPasswordLabel: 'Yeni şifre',
    newPasswordPlaceholder: 'En az 6 karakter',
    confirmLabel: 'Yeni şifre (tekrar)',
    confirmPlaceholder: 'Şifreni tekrar gir',
    updateBtn: 'Şifreyi güncelle',
    backToLogin: 'Girişe dön',
  },
  en: {
    invalidLink: 'Invalid link.',
    backToForgot: 'Back to forgot password',
    codeIncomplete: 'Enter the full 6-digit code.',
    tooShort: 'Password must be at least 6 characters.',
    mismatch: 'Passwords do not match.',
    genericError: 'Invalid or expired code.',
    doneTitle: 'Password updated',
    doneBody: 'You can now log in with your new password.',
    goToLoginBtn: 'Go to login',
    title: 'Reset your password',
    subtitleTpl: 'Enter the 6-digit code sent to {email} and your new password.',
    codeLabel: 'Verification code',
    newPasswordLabel: 'New password',
    newPasswordPlaceholder: 'At least 6 characters',
    confirmLabel: 'New password (confirm)',
    confirmPlaceholder: 'Re-enter your password',
    updateBtn: 'Update password',
    backToLogin: 'Back to login',
  },
  ar: {
    invalidLink: 'رابط غير صالح.',
    backToForgot: 'العودة إلى صفحة نسيت كلمة المرور',
    codeIncomplete: 'أدخل الرمز المكوّن من 6 أرقام كاملاً.',
    tooShort: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.',
    mismatch: 'كلمتا المرور غير متطابقتين.',
    genericError: 'الرمز غير صحيح أو منتهي الصلاحية.',
    doneTitle: 'تم تحديث كلمة المرور',
    doneBody: 'يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.',
    goToLoginBtn: 'الذهاب لتسجيل الدخول',
    title: 'إعادة تعيين كلمة المرور',
    subtitleTpl: 'أدخل الرمز المكوّن من 6 أرقام المرسل إلى {email} وكلمة المرور الجديدة.',
    codeLabel: 'رمز التحقق',
    newPasswordLabel: 'كلمة مرور جديدة',
    newPasswordPlaceholder: '6 أحرف على الأقل',
    confirmLabel: 'كلمة المرور الجديدة (تأكيد)',
    confirmPlaceholder: 'أعد إدخال كلمة المرور',
    updateBtn: 'تحديث كلمة المرور',
    backToLogin: 'العودة لتسجيل الدخول',
  },
  ru: {
    invalidLink: 'Недействительная ссылка.',
    backToForgot: 'Назад к восстановлению пароля',
    codeIncomplete: 'Введите полный 6-значный код.',
    tooShort: 'Пароль должен содержать не менее 6 символов.',
    mismatch: 'Пароли не совпадают.',
    genericError: 'Неверный или истёкший код.',
    doneTitle: 'Пароль обновлён',
    doneBody: 'Теперь вы можете войти с новым паролем.',
    goToLoginBtn: 'Перейти ко входу',
    title: 'Сбросить пароль',
    subtitleTpl: 'Введите 6-значный код, отправленный на {email}, и новый пароль.',
    codeLabel: 'Код подтверждения',
    newPasswordLabel: 'Новый пароль',
    newPasswordPlaceholder: 'Минимум 6 символов',
    confirmLabel: 'Новый пароль (повтор)',
    confirmPlaceholder: 'Введите пароль ещё раз',
    updateBtn: 'Обновить пароль',
    backToLogin: 'Назад ко входу',
  },
  de: {
    invalidLink: 'Ungültiger Link.',
    backToForgot: 'Zurück zu Passwort vergessen',
    codeIncomplete: 'Gib den vollständigen 6-stelligen Code ein.',
    tooShort: 'Das Passwort muss mindestens 6 Zeichen haben.',
    mismatch: 'Die Passwörter stimmen nicht überein.',
    genericError: 'Code ungültig oder abgelaufen.',
    doneTitle: 'Passwort aktualisiert',
    doneBody: 'Du kannst dich jetzt mit deinem neuen Passwort anmelden.',
    goToLoginBtn: 'Zur Anmeldung',
    title: 'Passwort zurücksetzen',
    subtitleTpl: 'Gib den an {email} gesendeten 6-stelligen Code und dein neues Passwort ein.',
    codeLabel: 'Bestätigungscode',
    newPasswordLabel: 'Neues Passwort',
    newPasswordPlaceholder: 'Mindestens 6 Zeichen',
    confirmLabel: 'Neues Passwort (bestätigen)',
    confirmPlaceholder: 'Passwort erneut eingeben',
    updateBtn: 'Passwort aktualisieren',
    backToLogin: 'Zurück zur Anmeldung',
  },
  fr: {
    invalidLink: 'Lien invalide.',
    backToForgot: 'Retour à mot de passe oublié',
    codeIncomplete: 'Entre le code à 6 chiffres complet.',
    tooShort: 'Le mot de passe doit contenir au moins 6 caractères.',
    mismatch: 'Les mots de passe ne correspondent pas.',
    genericError: 'Code invalide ou expiré.',
    doneTitle: 'Mot de passe mis à jour',
    doneBody: 'Tu peux maintenant te connecter avec ton nouveau mot de passe.',
    goToLoginBtn: 'Aller à la connexion',
    title: 'Réinitialiser ton mot de passe',
    subtitleTpl: 'Entre le code à 6 chiffres envoyé à {email} et ton nouveau mot de passe.',
    codeLabel: 'Code de vérification',
    newPasswordLabel: 'Nouveau mot de passe',
    newPasswordPlaceholder: 'Au moins 6 caractères',
    confirmLabel: 'Nouveau mot de passe (confirmation)',
    confirmPlaceholder: 'Ressaisis ton mot de passe',
    updateBtn: 'Mettre à jour le mot de passe',
    backToLogin: 'Retour à la connexion',
  },
  es: {
    invalidLink: 'Enlace no válido.',
    backToForgot: 'Volver a olvidé mi contraseña',
    codeIncomplete: 'Introduce el código completo de 6 dígitos.',
    tooShort: 'La contraseña debe tener al menos 6 caracteres.',
    mismatch: 'Las contraseñas no coinciden.',
    genericError: 'Código incorrecto o caducado.',
    doneTitle: 'Contraseña actualizada',
    doneBody: 'Ya puedes iniciar sesión con tu nueva contraseña.',
    goToLoginBtn: 'Ir a iniciar sesión',
    title: 'Restablece tu contraseña',
    subtitleTpl: 'Introduce el código de 6 dígitos enviado a {email} y tu nueva contraseña.',
    codeLabel: 'Código de verificación',
    newPasswordLabel: 'Nueva contraseña',
    newPasswordPlaceholder: 'Al menos 6 caracteres',
    confirmLabel: 'Nueva contraseña (confirmar)',
    confirmPlaceholder: 'Vuelve a introducir tu contraseña',
    updateBtn: 'Actualizar contraseña',
    backToLogin: 'Volver al inicio de sesión',
  },
  it: {
    invalidLink: 'Link non valido.',
    backToForgot: 'Torna a password dimenticata',
    codeIncomplete: 'Inserisci il codice completo a 6 cifre.',
    tooShort: 'La password deve avere almeno 6 caratteri.',
    mismatch: 'Le password non coincidono.',
    genericError: 'Codice errato o scaduto.',
    doneTitle: 'Password aggiornata',
    doneBody: 'Ora puoi accedere con la tua nuova password.',
    goToLoginBtn: 'Vai al login',
    title: 'Reimposta la password',
    subtitleTpl: 'Inserisci il codice a 6 cifre inviato a {email} e la tua nuova password.',
    codeLabel: 'Codice di verifica',
    newPasswordLabel: 'Nuova password',
    newPasswordPlaceholder: 'Almeno 6 caratteri',
    confirmLabel: 'Nuova password (conferma)',
    confirmPlaceholder: 'Inserisci di nuovo la password',
    updateBtn: 'Aggiorna password',
    backToLogin: 'Torna al login',
  },
  ja: {
    invalidLink: '無効なリンクです。',
    backToForgot: 'パスワードを忘れた場合のページに戻る',
    codeIncomplete: '6桁のコードをすべて入力してください。',
    tooShort: 'パスワードは6文字以上にしてください。',
    mismatch: 'パスワードが一致しません。',
    genericError: 'コードが正しくないか、期限切れです。',
    doneTitle: 'パスワードを更新しました',
    doneBody: '新しいパスワードでログインできます。',
    goToLoginBtn: 'ログインへ',
    title: 'パスワードをリセット',
    subtitleTpl: '{email} に送信された6桁のコードと新しいパスワードを入力してください。',
    codeLabel: '確認コード',
    newPasswordLabel: '新しいパスワード',
    newPasswordPlaceholder: '6文字以上',
    confirmLabel: '新しいパスワード(確認)',
    confirmPlaceholder: 'もう一度パスワードを入力',
    updateBtn: 'パスワードを更新',
    backToLogin: 'ログインに戻る',
  },
  pt: {
    invalidLink: 'Link inválido.',
    backToForgot: 'Voltar à página de password esquecida',
    codeIncomplete: 'Introduz o código de 6 dígitos completo.',
    tooShort: 'A password deve ter pelo menos 6 caracteres.',
    mismatch: 'As passwords não coincidem.',
    genericError: 'O código está incorreto ou expirou.',
    doneTitle: 'Password Atualizada',
    doneBody: 'Já podes iniciar sessão com a tua nova password.',
    goToLoginBtn: 'Ir para o Login',
    title: 'Redefinir Password',
    subtitleTpl: 'Introduz o código de 6 dígitos enviado para {email} e a tua nova password.',
    codeLabel: 'Código de Confirmação',
    newPasswordLabel: 'Nova Password',
    newPasswordPlaceholder: '6 ou mais caracteres',
    confirmLabel: 'Nova Password (confirmar)',
    confirmPlaceholder: 'Introduz a password novamente',
    updateBtn: 'Atualizar Password',
    backToLogin: 'Voltar ao Login',
  },
};

function ResetPasswordContent() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') || '';
  const { locale } = useLocale();
  const t = STRINGS[locale];

  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (code.trim().length !== 6) {
      setError(t.codeIncomplete);
      return;
    }
    if (newPassword.length < 6) {
      setError(t.tooShort);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t.mismatch);
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({ email, code: code.trim(), new_password: newPassword });
      setDone(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err, t.genericError));
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return (
      <Card padding="lg" className="border-0 shadow-xl shadow-slate-200/60 text-center">
        <p className="text-slate-600 dark:text-slate-300">{t.invalidLink}</p>
        <Link href="/forgot-password" className="text-sky-600 dark:text-sky-400 font-medium hover:underline mt-4 inline-block">
          {t.backToForgot}
        </Link>
      </Card>
    );
  }

  if (done) {
    return (
      <Card padding="lg" className="border-0 shadow-xl shadow-slate-200/60 text-center">
        <div className="w-11 h-11 bg-sky-500 rounded-xl flex items-center justify-center shrink-0 mx-auto mb-4">
          <KeyRound size={20} className="text-white" strokeWidth={2.5} />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t.doneTitle}</h1>
        <p className="text-slate-400 text-sm mb-6">{t.doneBody}</p>
        <Button type="button" className="w-full" size="lg" onClick={() => router.push('/login')}>
          {t.goToLoginBtn}
        </Button>
      </Card>
    );
  }

  const [subtitleBefore, subtitleAfter] = t.subtitleTpl.split('{email}');

  return (
    <Card padding="lg" className="border-0 shadow-xl shadow-slate-200/60">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t.title}</h1>
        <p className="text-slate-400 text-sm mt-2">
          {subtitleBefore}
          <span className="font-medium text-slate-600 dark:text-slate-300">{email}</span>
          {subtitleAfter}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t.codeLabel}
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
          leftIcon={<KeyRound size={16} />}
          autoFocus
          required
        />

        <Input
          label={t.newPasswordLabel}
          type={showPw ? 'text' : 'password'}
          placeholder={t.newPasswordPlaceholder}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          leftIcon={<Lock size={16} />}
          rightIcon={
            <button type="button" onClick={() => setShowPw((v) => !v)} className="text-slate-400 hover:text-slate-600 hover:dark:text-slate-300">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
          required
        />

        <Input
          label={t.confirmLabel}
          type={showPw ? 'text' : 'password'}
          placeholder={t.confirmPlaceholder}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          leftIcon={<Lock size={16} />}
          required
        />

        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full mt-2" size="lg" loading={loading}>
          {t.updateBtn}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
