// lib/socialAuth.ts — Apple/Google ile giriş sonrası ortak tamamlama akışı.
// login/page.tsx'in mevcut "access_token in res" dalındaki mantıkla birebir
// aynı: token localStorage'a yazılır, /auth/me ile profil çekilir, store'a
// login edilir. AppleSignInButton, GoogleSignInButton ve register/page.tsx
// tarafından paylaşılır — sosyal girişte OTP adımı YOK (backend zaten
// Apple/Google kimlik doğrulamasını güçlü kabul ediyor, bkz. auth.py).
import { authApi } from '@/lib/api';
import type { AuthResponse, User as UserType } from '@/types';

export async function completeSocialSignIn(
  res: AuthResponse,
  loginToStore: (token: string, user: UserType) => void,
): Promise<UserType> {
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
  loginToStore(res.access_token, user);
  return user;
}

export function socialSignInRedirectPath(user: UserType): string {
  return user.role === 'admin' || user.role === 'admin_readonly' ? '/admin' : '/dashboard';
}
