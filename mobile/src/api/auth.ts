import { api } from './client';
import type { AuthResponse, OtpPendingResponse, User } from './types';

export const authApi = {
  register: async (data: {
    email: string;
    password: string;
    display_name: string;
    username?: string;
    native_lang?: string;
    learning_lang?: string;
    learning_langs?: string[];
  }): Promise<{ pending: true; email: string; purpose: 'register'; message?: string }> => {
    const res = await api.post('/auth/register', data);
    return res.data;
  },

  // NOT (7 Eylül 2026 kullanıcı isteği): backend artık kayıttan sonraki ilk
  // giriş dışında OTP istemiyor — bu yüzden dönüş tipi ya OtpPendingResponse
  // (pending: true, ilk giriş) ya da doğrudan AuthResponse (access_token,
  // sonraki girişler) olabilir. Hangisi geldiği login.tsx'te 'access_token'
  // alanının varlığına bakılarak ayırt ediliyor.
  login: async (data: { email: string; password: string }): Promise<OtpPendingResponse | AuthResponse> => {
    const res = await api.post<OtpPendingResponse | AuthResponse>('/auth/login', data);
    return res.data;
  },

  verifyOtp: async (data: {
    email: string;
    code: string;
    purpose: 'login' | 'register' | 'reset_password';
  }): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/verify-otp', data);
    return res.data;
  },

  resendOtp: async (data: {
    email: string;
    purpose: 'login' | 'register' | 'reset_password';
  }): Promise<{ message: string }> => {
    const res = await api.post('/auth/resend-otp', data);
    return res.data;
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  },

  resetPassword: async (data: { email: string; code: string; new_password: string }): Promise<{ message: string }> => {
    const res = await api.post('/auth/reset-password', data);
    return res.data;
  },

  getMe: async (): Promise<User> => {
    const res = await api.get<User>('/auth/me');
    return res.data;
  },

  updateProfile: async (data: {
    display_name?: string;
    daily_goal?: number;
    native_lang?: string;
    learning_lang?: string;
    username?: string;
  }): Promise<User> => {
    const res = await api.patch<User>('/auth/profile', data);
    return res.data;
  },

  // Hesabı ve tüm ilişkili verileri kalıcı olarak siler (Google Play / Apple
  // hesap silme politikası — bkz. backend/app/api/routes/auth.py delete_account,
  // ve mobile/src/app/(app)/profile.tsx handleDeleteAccount).
  deleteAccount: async (): Promise<void> => {
    await api.delete('/auth/account');
  },
};
