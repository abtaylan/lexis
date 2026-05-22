# 🧠 Lexis — Vocabulary Learning Platform

Çok dilli kelime öğrenme platformu. Web + iOS + Android.

## 📁 Proje Yapısı

```
lexis/
├── backend/          # FastAPI — REST API
├── web/              # Next.js — Web uygulaması  
├── mobile/           # React Native (Expo) — iOS & Android
├── supabase/         # DB şeması, migrations
├── admin/            # Admin panel (Next.js)
├── docs/             # Teknik dokümantasyon
└── .github/          # CI/CD workflows
```

## 🏗️ Teknoloji Stack

| Katman | Teknoloji | Açıklama |
|--------|-----------|----------|
| Veritabanı | Supabase (PostgreSQL) | Auth + DB + Storage |
| Backend | FastAPI (Python) | REST API |
| Web | Next.js 14 (React) | Web uygulaması |
| Mobil | React Native + Expo | iOS + Android |
| Deploy (Backend) | Railway | Auto-deploy |
| Deploy (Web) | Vercel | Auto-deploy |
| Deploy (Mobil) | Expo EAS | App Store + Play Store |

## 🚀 Kurulum

### Gereksinimler
- Python 3.11+
- Node.js 20+
- Expo CLI
- Supabase hesabı

### 1. Supabase Kurulum
```bash
# supabase/ klasöründeki SQL'leri sırayla çalıştır
# supabase/migrations/001_initial.sql
# supabase/migrations/002_rls_policies.sql
# supabase/seeds/001_languages.sql
```

### 2. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # .env dosyasını doldur
uvicorn app.main:app --reload
```

### 3. Web
```bash
cd web
npm install
cp .env.example .env.local
npm run dev
```

### 4. Mobil
```bash
cd mobile
npm install
cp .env.example .env
npx expo start
```

## 🌍 Çoklu Dil Desteği

Şu an desteklenen dil çiftleri:
- 🇬🇧 İngilizce → 🇹🇷 Türkçe
- (Yakında) İngilizce → Almanca, Fransızca, İspanyolca

## 📱 Özellikler

- ✅ Kelime ekleme (Cambridge Dictionary otomatik)
- ✅ Flashcard sistemi
- ✅ Spaced repetition algoritması
- ✅ Quiz modu (çoktan seçmeli)
- ✅ Günlük hedef & streak takibi
- ✅ Gelişim analizi & grafikler
- ✅ Çalışma programı
- ✅ Kullanıcı sistemi (kayıt/giriş)
- ✅ Admin paneli

## 🔐 Ortam Değişkenleri

Her modülün kendi `.env.example` dosyası var. Detaylar için `docs/environment.md`.
