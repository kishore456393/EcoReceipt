# EcoReceipt - Deployment Guide

## Prerequisites
- Node.js 18+ installed
- A Google Cloud account (for OAuth)
- A Supabase account (free tier works)
- A Vercel account (for deployment)

---

## 1. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth Client ID**
5. Choose **Web Application**
6. Add **Authorized redirect URIs**:
   - For development: `http://localhost:3000/api/auth/callback/google`
   - For production: `https://your-domain.vercel.app/api/auth/callback/google`
7. Copy the **Client ID** and **Client Secret**

---

## 2. Supabase Database Setup

1. Go to [Supabase](https://supabase.com/) and create a new project
2. Wait for the project to initialize
3. Go to **Settings > Database**
4. Copy the **Connection string** (URI format)
   - It looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`
5. Replace `[YOUR-PASSWORD]` with your database password

---

## 3. Local Development Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd eco-receipt

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Fill in your .env file with:
# - DATABASE_URL (from Supabase)
# - NEXTAUTH_SECRET (run: openssl rand -base64 32)
# - GOOGLE_CLIENT_ID
# - GOOGLE_CLIENT_SECRET

# Generate Prisma client & push schema to database
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see the app.

---

## 4. Vercel Deployment

### Option A: Via Vercel Dashboard (Recommended)

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com/) and click **New Project**
3. Import your GitHub repository
4. Set the **Root Directory** to `eco-receipt` (if applicable)
5. Add **Environment Variables** in Vercel dashboard:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Supabase connection string |
| `NEXTAUTH_URL` | `https://your-domain.vercel.app` |
| `NEXTAUTH_SECRET` | Random 32-char secret |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.vercel.app` |

6. Click **Deploy**

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add DATABASE_URL
vercel env add NEXTAUTH_URL
vercel env add NEXTAUTH_SECRET
vercel env add GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_SECRET
vercel env add NEXT_PUBLIC_APP_URL

# Deploy to production
vercel --prod
```

---

## 5. Post-Deployment Checklist

- [ ] Update Google OAuth redirect URI to include your Vercel domain
- [ ] Run `npx prisma db push` against production database (or use Prisma Migrate)
- [ ] Test Google login flow end-to-end
- [ ] Create a test shop and generate a test bill
- [ ] Scan the QR code from a mobile device
- [ ] Verify UPI deep link opens payment app
- [ ] Test PDF download on both desktop and mobile

---

## 6. Razorpay Setup (Optional - Pro Feature)

1. Create a [Razorpay](https://razorpay.com/) account
2. Go to **Settings > API Keys**
3. Generate a new key pair
4. Add the keys in **Shop Setup > Razorpay Settings** within the app
5. Configure Razorpay webhook URL: `https://your-domain.vercel.app/api/razorpay/webhook`

---

## 7. Database Migrations

For schema changes in production:

```bash
# Create a migration
npx prisma migrate dev --name describe_your_change

# Apply to production
npx prisma migrate deploy
```

---

## 8. Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_URL` | Yes | App URL (http://localhost:3000 for dev) |
| `NEXTAUTH_SECRET` | Yes | Random secret for session encryption |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth Client Secret |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app URL (same as NEXTAUTH_URL) |

---

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Shop Owner  │────>│   Next.js    │────>│  Supabase   │
│  (Browser)   │<────│   (Vercel)   │<────│ (PostgreSQL)│
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
                    ┌──────┴───────┐
                    │   QR Code    │
                    │  Generated   │
                    └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │   Customer   │
                    │  (Mobile)    │
                    │  Scans QR    │
                    │  Views Bill  │
                    │  Pays UPI    │
                    └──────────────┘
```

## Tech Stack Summary

- **Frontend**: Next.js 14, React 19, Tailwind CSS, shadcn/ui, Framer Motion
- **Auth**: NextAuth.js with Google OAuth
- **Database**: PostgreSQL via Supabase + Prisma ORM
- **Payments**: UPI deep links + Razorpay (optional)
- **PDF**: jsPDF + jspdf-autotable
- **QR Codes**: qrcode.react
- **Hosting**: Vercel (frontend + API) + Supabase (database)
