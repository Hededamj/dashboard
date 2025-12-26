# FamilyMind Dashboard

Et professionelt dashboard til styring af FamilyMind medlemmer og økonomi via Stripe.

## Features

- 📊 Real-time metrics (MRR, aktive medlemmer, churn rate, total indtægt)
- 📈 Interaktive charts (12 måneders trends)
- 🔐 Sikker Google OAuth authentication
- ⚡ Server-side caching for optimal performance
- 📱 Fully responsive design
- 🎨 Moderne UI med Tailwind CSS

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Charts:** Recharts
- **Authentication:** NextAuth.js (Google OAuth)
- **API:** Stripe
- **Deployment:** Vercel

## Setup Instruktioner

### 1. Konfigurer Stripe

1. Log ind på [Stripe Dashboard](https://dashboard.stripe.com/)
2. Gå til **Developers → API keys**
3. Kopier din **Secret key** (test mode)
   - Starter med `sk_test_...`
   - Til production: brug `sk_live_...`

### 2. Konfigurer Google OAuth

1. Gå til [Google Cloud Console](https://console.cloud.google.com/)
2. Opret et nyt projekt eller vælg eksisterende
3. Gå til **APIs & Services → Credentials**
4. Klik **Create Credentials → OAuth client ID**
5. Vælg **Web application**
6. Konfigurer:
   - **Authorized JavaScript origins:**
     - `http://localhost:3000` (development)
     - `https://dit-domain.vercel.app` (production)
   - **Authorized redirect URIs:**
     - `http://localhost:3000/api/auth/callback/google` (development)
     - `https://dit-domain.vercel.app/api/auth/callback/google` (production)
7. Kopier **Client ID** og **Client Secret**

### 3. Konfigurer Environment Variables

1. Åbn `.env.local` filen
2. Udfyld følgende værdier:

```env
# Stripe (test mode)
STRIPE_SECRET_KEY=sk_test_din_stripe_secret_key

# NextAuth
# Generer med: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
NEXTAUTH_SECRET=din_nextauth_secret_minimum_32_karakterer
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=din_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=din_google_client_secret

# Whitelist email (kun denne email kan logge ind)
ALLOWED_EMAIL=din@email.com
```

**Vigtig:** Skift `din@email.com` til den Google-konto du vil bruge til login!

### 4. Installer og Kør

```bash
# Dependencies er allerede installeret
# Hvis du har brug for at geninstallere:
# npm install

# Kør development server
npm run dev
```

Åbn [http://localhost:3000](http://localhost:3000) i din browser.

### 5. Test Dashboardet

1. Du bliver redirected til login siden
2. Klik "Log ind med Google"
3. Vælg din Google-konto (skal matche `ALLOWED_EMAIL`)
4. Du bliver redirected til dashboardet

**Bemærk:** I test mode viser Stripe kun test data. For at se rigtige medlemmer, skift til live mode.

## Migration til Production

### 1. Skift til Stripe Live Mode

1. I `.env.local`, skift:
   ```env
   STRIPE_SECRET_KEY=sk_live_din_live_secret_key
   ```
2. Genstart development server

### 2. Deploy til Vercel

1. Opret en GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/din-bruger/familymind-dashboard.git
   git push -u origin main
   ```

2. Gå til [Vercel](https://vercel.com/)
3. Klik **Add New → Project**
4. Importer din GitHub repository
5. Konfigurer environment variables i Vercel:
   - `STRIPE_SECRET_KEY` (live key)
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (https://dit-domain.vercel.app)
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `ALLOWED_EMAIL`

6. Deploy!

### 3. Opdater Google OAuth

Efter deployment, tilføj production URLs i Google Cloud Console:
- **Authorized JavaScript origins:** `https://dit-domain.vercel.app`
- **Authorized redirect URIs:** `https://dit-domain.vercel.app/api/auth/callback/google`

## Dashboard Metrics

### MRR (Monthly Recurring Revenue)
```typescript
MRR = Antal aktive medlemmer × 149 DKK
```

### Churn Rate
```typescript
Churn Rate = (Antal opsigelser denne måned / Antal medlemmer ved månedens start) × 100
```

### Growth Rate
```typescript
Growth Rate = (Nye medlemmer - Opsigelser / Antal medlemmer ved månedens start) × 100
```

## Projektstruktur

```
Dashboard/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── auth/         # NextAuth
│   │   │   ├── metrics/      # Dashboard metrics
│   │   │   ├── trends/       # Historical trends
│   │   │   └── activity/     # Recent activity
│   │   ├── dashboard/        # Dashboard page
│   │   └── login/            # Login page
│   ├── components/
│   │   ├── ui/               # shadcn/ui components
│   │   └── dashboard/        # Dashboard components
│   ├── lib/
│   │   ├── stripe.ts         # Stripe client
│   │   ├── auth.ts           # NextAuth config
│   │   ├── cache.ts          # Caching utilities
│   │   ├── metrics.ts        # Metrics calculations
│   │   └── utils.ts          # Utility functions
│   └── types/                # TypeScript types
└── .env.local                # Environment variables
```

## Caching

Dashboardet bruger in-memory caching for at reducere Stripe API calls:
- **Standard TTL:** 5 minutter
- **Trends TTL:** 10 minutter (dyrere query)

Cache bliver automatisk invalideret når TTL udløber.

## Sikkerhed

- ✅ Stripe API keys kun server-side
- ✅ Google OAuth authentication
- ✅ Email whitelist for adgang
- ✅ HTTPS enforced (Vercel)
- ✅ Session-based auth med 7 dage TTL
- ✅ Environment variables aldrig i git

## Troubleshooting

### "Unauthorized" fejl ved login
- Tjek at `ALLOWED_EMAIL` matcher din Google-konto
- Tjek at Google OAuth er korrekt konfigureret

### Ingen data i dashboard
- Tjek at Stripe API key er korrekt
- Hvis test mode: opret test subscriptions i Stripe Dashboard
- Tjek browser console for fejl

### Build fejl
```bash
# Ryd cache og geninstaller
rm -rf .next node_modules
npm install
npm run build
```

## Costs

**Development:**
- Vercel: $0 (free tier)
- Stripe API: $0 (gratis API calls)
- Google OAuth: $0 (gratis)

**Total: $0/måned** 💰

Vercel free tier inkluderer:
- 100GB bandwidth/måned
- Unlimited deployments
- Automatic HTTPS
- Global CDN

## Support

Hvis du har problemer:
1. Tjek at alle environment variables er korrekt sat
2. Tjek browser console for fejl
3. Tjek Vercel logs hvis deployed
4. Tjek Stripe API logs i Stripe Dashboard

## Næste Steps

Efter deployment kan du overveje:
- 📧 Email notifications (weekly digest)
- 📊 Advanced analytics (cohort analysis)
- 💳 Payment failure tracking
- 👥 Multi-user support
- 🗄️ Database layer (hvis >1000 medlemmer)

---

**Bygget med ❤️ for FamilyMind**
# Updated 26. dec 2025 17:19:39

