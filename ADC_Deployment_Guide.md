# ADC System — Netlify + Railway Deployment Guide
**Document:** DEP-ADC-2026-001 | **Version:** 1.0 | **Date:** 25 April 2026  
**Author:** GMT Technology Solutions | **Classification:** Internal

---

## Architecture Overview

| Tier | Technology | Hosting | Purpose |
|---|---|---|---|
| Frontend | React 18 + Tailwind CSS | Netlify (free/pro) | SPA served via global CDN |
| Backend | Python 3.11 + FastAPI | Railway | REST API, auth, exports |
| Database | MySQL 8.0 | Railway | All persistent data |
| Billing | Stripe | Stripe Cloud | Subscription management |

---

## Prerequisites

- Node.js 20+ installed locally
- Python 3.11+ installed locally
- GitHub account with repository containing ADC source code
- Netlify account (free tier sufficient to start)
- Railway account (free trial, then ~$5/month)
- Stripe account (free to create, transaction fees only)

---

## Step 1 — Prepare the React frontend

Add `netlify.toml` to your project root (file included in this package).

Add a `.env.production` file to your React project:

```
VITE_API_BASE_URL=https://YOUR-RAILWAY-APP.up.railway.app/api/v1
VITE_APP_NAME=Application Due Diligence Canvas
VITE_APP_VERSION=1.0.0
```

Build and test locally:

```bash
npm install
npm run build
npm run preview
```

---

## Step 2 — Deploy frontend to Netlify

1. Go to [netlify.com](https://netlify.com) → New site → Import from Git
2. Connect your GitHub repository
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Go to **Site Settings → Environment Variables** and add:
   - `VITE_API_BASE_URL` = your Railway backend URL (set after Step 4)
5. Click **Deploy site**

> **Important:** Never put MySQL passwords, JWT secrets, or the Anthropic API key in Netlify environment variables. Those belong in Railway only.

---

## Step 3 — Create Railway project

1. Go to [railway.app](https://railway.app) → New Project
2. Add a **MySQL** service from the Railway template gallery
3. Note the connection details: host, port, database name, username, password

---

## Step 4 — Deploy FastAPI backend to Railway

Add these files to your backend directory:

**Procfile:**
```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

**requirements.txt:**
```
fastapi==0.110.0
uvicorn[standard]==0.27.0
sqlalchemy==2.0.28
aiomysql==0.2.0
alembic==1.13.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9
anthropic==0.21.3
openpyxl==3.1.2
weasyprint==62.3
stripe==8.0.0
```

In Railway, set these environment variables:

```
DATABASE_URL      = mysql+aiomysql://user:pass@host:3306/adc_db
JWT_SECRET_KEY    = your-256-bit-secret-here
ANTHROPIC_API_KEY = sk-ant-...
STRIPE_SECRET_KEY = sk_live_...
ALLOWED_ORIGINS   = https://your-app.netlify.app
ENVIRONMENT       = production
```

Deploy by connecting Railway to your GitHub repo or using the Railway CLI:

```bash
npm install -g @railway/cli
railway login
railway link
railway up
```

---

## Step 5 — Run database migrations

```bash
# Option A — Run the SQL schema script directly
railway run mysql -u $DB_USER -p$DB_PASS $DB_NAME < adc_schema.sql

# Option B — Use Alembic (recommended for ongoing migrations)
railway run alembic upgrade head
```

---

## Step 6 — Configure CORS on the backend

Add this to your `main.py`:

```python
from fastapi.middleware.cors import CORSMiddleware
import os

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
```

---

## Step 7 — Update Netlify with backend URL

1. In Netlify → Site Settings → Environment Variables
2. Set `VITE_API_BASE_URL` to your Railway backend URL
3. Trigger a redeploy: Deploys → Trigger deploy → Deploy site

---

## Step 8 — Configure Stripe billing

1. Create products in Stripe dashboard:
   - ADC Starter — R 3,500/month
   - ADC Professional — R 8,500/month
   - ADC Enterprise — R 18,000/month
2. Copy price IDs into your backend environment variables:
   ```
   STRIPE_PRICE_STARTER       = price_xxx
   STRIPE_PRICE_PROFESSIONAL  = price_xxx
   STRIPE_PRICE_ENTERPRISE    = price_xxx
   STRIPE_WEBHOOK_SECRET      = whsec_xxx
   ```
3. Configure Stripe webhook to point to: `https://YOUR-RAILWAY-APP.up.railway.app/api/v1/billing/webhook`
4. Events to listen for: `customer.subscription.created`, `customer.subscription.deleted`, `invoice.payment_failed`

---

## Step 9 — Multi-tenant middleware (critical for SaaS)

Add this middleware to every protected FastAPI endpoint to enforce tenant isolation:

```python
# middleware/tenant.py
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from auth import get_current_user

def get_current_org_id(current_user = Depends(get_current_user)) -> int:
    """Extracts org_id from JWT — injected into every protected endpoint."""
    if not current_user.org_id:
        raise HTTPException(status_code=403, detail="No organisation assigned")
    return current_user.org_id

# Usage in any endpoint:
@app.get("/api/v1/applications")
def list_applications(
    org_id: int = Depends(get_current_org_id),
    db: Session = Depends(get_db)
):
    # org_id is always the current tenant — never trust client input for this
    return db.query(Application).filter(Application.org_id == org_id).all()
```

> **Security rule:** Every database query on tenant data MUST include `.filter(Model.org_id == org_id)`. Never query without this filter on multi-tenant tables.

---

## Step 10 — Go live checklist

- [ ] Custom domain configured in Netlify (e.g. adc.yourcompany.co.za)
- [ ] SSL certificate active (automatic via Netlify)
- [ ] HTTPS redirect enforced in netlify.toml
- [ ] Security headers returning correctly (test at securityheaders.com)
- [ ] Database backups scheduled on Railway (daily, 30-day retention)
- [ ] Stripe webhook verified and receiving events
- [ ] Terms and Conditions acceptance screen live for all new users
- [ ] POPIA compliance review completed with client DPO
- [ ] CSD (Central Supplier Database) registration submitted

---

## Infrastructure Cost Summary

| Service | Plan | Monthly Cost (ZAR approx.) |
|---|---|---|
| Netlify | Pro | R 370 |
| Railway (backend + DB) | Hobby/Pro | R 500–1,500 |
| Anthropic API | Pay-as-you-go | R 200–500 |
| Stripe | Transaction fees only | ~1.5% of revenue |
| **Total at 10 clients** | | **~R 1,070–2,370/month** |

---

*ADC Deployment Guide v1.0 | GMT Technology Solutions | 25 April 2026*
