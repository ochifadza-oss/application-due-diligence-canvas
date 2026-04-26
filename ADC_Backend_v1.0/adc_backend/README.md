# ADC Backend — FastAPI + MySQL
**Version:** 1.0 | **Author:** GMT Technology Solutions | **Ref:** SRS-ADC-2026-001

## Quick Start

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your MySQL credentials, JWT secret, and API keys
```

### 3. Seed the database
```bash
python -m app.services.seed
# Creates org, admin user, 9 domains, 4 scoring criteria
# Default login: admin@adc.local / ChangeMe@2026
```

### 4. Run development server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. API documentation
- Swagger UI: http://localhost:8000/api/docs
- ReDoc:       http://localhost:8000/api/redoc

---

## Run tests
```bash
pip install aiosqlite  # for in-memory SQLite test DB
pytest -v
```

---

## Deploy to Railway
```bash
# Install Railway CLI
npm install -g @railway/cli
railway login
railway link
railway up
```

Set environment variables in Railway dashboard:
```
DATABASE_URL      = mysql+aiomysql://user:pass@host:3306/adc_db
JWT_SECRET_KEY    = <256-bit secret>
ANTHROPIC_API_KEY = sk-ant-...
STRIPE_SECRET_KEY = sk_live_...
STRIPE_WEBHOOK_SECRET = whsec_...
ALLOWED_ORIGINS   = https://your-app.netlify.app
MARKETPLACE_LOGIN_URL = https://app.adcsystem.co.za/login
SMTP_HOST         = smtp.yourprovider.com
SMTP_PORT         = 587
SMTP_USERNAME     = <smtp user>
SMTP_PASSWORD     = <smtp password>
SMTP_FROM_EMAIL   = no-reply@adcsystem.co.za
ENVIRONMENT       = production
```

---

## API Endpoints

| Module              | Method | Path                              | Description                        |
|---------------------|--------|-----------------------------------|------------------------------------|
| **Auth**            | POST   | /api/v1/auth/login                | Login, receive JWT tokens          |
|                     | POST   | /api/v1/auth/refresh              | Refresh access token               |
|                     | POST   | /api/v1/auth/change-password      | Change current user password       |
|                     | POST   | /api/v1/auth/accept-terms         | Record T&C acceptance              |
|                     | GET    | /api/v1/auth/me                   | Get current user profile           |
| **Marketplace**     | POST   | /api/v1/marketplace/subscribe     | Auto-provision org and admin user  |
| **Organisation**    | GET    | /api/v1/org                       | Get org settings                   |
|                     | PUT    | /api/v1/org                       | Update org settings                |
|                     | POST   | /api/v1/org/logo                  | Upload institutional logo          |
|                     | GET    | /api/v1/org/logo                  | Retrieve logo binary               |
|                     | GET    | /api/v1/org/criteria              | Get scoring criteria               |
|                     | PUT    | /api/v1/org/criteria              | Update criteria labels & weights   |
| **Domains**         | GET    | /api/v1/domains                   | List all domains                   |
|                     | POST   | /api/v1/domains                   | Create domain                      |
|                     | PUT    | /api/v1/domains/{id}              | Update domain                      |
|                     | DELETE | /api/v1/domains/{id}              | Soft-delete domain                 |
| **Applications**    | GET    | /api/v1/applications              | List applications (filter by domain)|
|                     | POST   | /api/v1/applications              | Create application                 |
|                     | GET    | /api/v1/applications/{id}         | Get application with scores        |
|                     | PUT    | /api/v1/applications/{id}         | Update application                 |
|                     | DELETE | /api/v1/applications/{id}         | Soft-delete application            |
|                     | POST   | /api/v1/applications/{id}/scores  | Set/update a criterion score       |
| **Pricing**         | GET    | /api/v1/pricing                   | List all pricing records           |
|                     | PUT    | /api/v1/pricing/{app_id}          | Upsert pricing for application     |
| **Queries**         | GET    | /api/v1/queries                   | List queries (filter status/priority)|
|                     | POST   | /api/v1/queries                   | Create new query                   |
|                     | GET    | /api/v1/queries/stats             | Query counts by status             |
|                     | PUT    | /api/v1/queries/{id}              | Update status / workflow step      |
|                     | POST   | /api/v1/queries/{id}/responses    | Add response to thread             |
|                     | DELETE | /api/v1/queries/{id}              | Delete query                       |
| **TOR**             | GET    | /api/v1/tor                       | Get Terms of Reference             |
|                     | PUT    | /api/v1/tor                       | Create/update TOR                  |
| **Reports**         | GET    | /api/v1/reports/summary           | Full portfolio summary (JSON)      |
|                     | GET    | /api/v1/reports/export/excel      | Download Excel report              |
| **AI Analysis**     | POST   | /api/v1/ai/analyse                | Claude-powered portfolio analysis  |
| **Users**           | GET    | /api/v1/users                     | List org users (admin only)        |
|                     | POST   | /api/v1/users                     | Create user (admin only)           |
|                     | PUT    | /api/v1/users/{id}                | Update user (admin only)           |
| **Billing**         | POST   | /api/v1/billing/checkout          | Create Stripe checkout session     |
|                     | POST   | /api/v1/billing/webhook           | Stripe webhook handler             |
|                     | GET    | /api/v1/billing/status            | Get subscription status            |
| **System**          | GET    | /health                           | Health check                       |

---

## Security model

- **JWT authentication** on all endpoints except `/health`
- **Tenant isolation** enforced by `get_current_org_id` dependency — every query filters by `org_id`
- **RBAC** via `require_role()` — administrators, senior_analysts, analysts, reviewers, client_stakeholders
- **Audit logging** via `AuditMiddleware` — all POST/PUT/DELETE calls logged
- **Password hashing** via bcrypt (12 rounds)
- **CORS** restricted to `ALLOWED_ORIGINS` environment variable

---

*ADC Backend v1.0 | GMT Technology Solutions | April 2026*
