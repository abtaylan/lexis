# Lexis — Kurulum & Deploy Rehberi

## 1. Supabase Kurulum

1. https://app.supabase.com → New Project
2. Proje adı: `lexis`, şifre belirle, region: `eu-central-1` (Frankfurt)
3. SQL Editor'da sırayla çalıştır:
   - `supabase/migrations/001_initial.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/seeds/001_languages.sql`
4. Settings → API'den şunları kopyala:
   - Project URL → `SUPABASE_URL`
   - anon public → `SUPABASE_ANON_KEY`
   - service_role → `SUPABASE_SERVICE_KEY`

## 2. Backend Deploy (Railway)

1. https://railway.app → New Project → Deploy from GitHub
2. `lexis/backend` klasörünü seç
3. Variables'a `.env.example` içindekini doldur
4. Deploy tamamlanınca URL kopyala → `https://lexis-api.railway.app`

## 3. Web Deploy (Vercel)

1. https://vercel.com → New Project → GitHub'dan `lexis/web`
2. Framework: Next.js
3. Environment variables ekle:
   ```
   NEXT_PUBLIC_API_URL=https://lexis-api.railway.app
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
4. Deploy → `https://lexis.vercel.app`

## 4. Mobil Deploy (Expo EAS)

```bash
cd mobile
npm install -g eas-cli
eas login
eas build:configure

# iOS (TestFlight için)
eas build --platform ios

# Android (Play Store için)
eas build --platform android

# Her iki platform
eas build --platform all
```

App Store ve Play Store'a göndermek için:
- Apple Developer hesabı ($99/yıl)
- Google Play Developer hesabı ($25 tek seferlik)

## 5. GitHub Secrets

Repository → Settings → Secrets ekle:
```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY
NEXT_PUBLIC_API_URL
```

## 6. İlk Admin Kullanıcısı

Supabase SQL Editor'da:
```sql
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'kullanici-uuid-buraya';
```

## Ortam Değişkenleri Özeti

| Değişken | Nerede kullanılır | Nerede bulunur |
|----------|-------------------|----------------|
| SUPABASE_URL | Backend, Web | Supabase Settings |
| SUPABASE_ANON_KEY | Backend, Web, Mobile | Supabase Settings |
| SUPABASE_SERVICE_KEY | Sadece Backend | Supabase Settings |
| NEXT_PUBLIC_API_URL | Web | Railway URL |
| EXPO_PUBLIC_API_URL | Mobile | Railway URL |
