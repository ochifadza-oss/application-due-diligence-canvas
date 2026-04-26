# ADC Frontend — React 18 + Vite + Tailwind CSS
**Version:** 1.0 | **Author:** GMT Technology Solutions | **Ref:** SRS-ADC-2026-001

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Set VITE_API_BASE_URL to your backend URL
# e.g. VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### 3. Run development server
```bash
npm run dev
# Opens http://localhost:5173
```

### 4. Build for production
```bash
npm run build
# Output in dist/ — deploy to Netlify
```

---

## Project Structure

```
src/
├── api/
│   └── client.js           # Axios instance + all API calls + JWT refresh
├── contexts/
│   ├── AuthContext.jsx      # User auth state, login/logout
│   └── AppContext.jsx       # Org, domains, apps, criteria global state
├── components/
│   ├── shared/
│   │   ├── UI.jsx           # Modal, Toast, StarRating, Spinner, ScoreBadge etc.
│   │   └── TopBar.jsx       # Navigation header with tabs
│   ├── canvas/
│   │   └── CanvasView.jsx   # Domain grid, rating panel, add app modal
│   ├── pricing/
│   │   └── PricingView.jsx  # TCO table, recommendations, score weights
│   ├── queries/
│   │   └── QueriesView.jsx  # Query cards, workflow tracker, response thread
│   ├── tor/
│   │   └── TORView.jsx      # Terms of Reference form, PDF export, AI
│   ├── reports/
│   │   └── ReportsView.jsx  # Portfolio tables, bar chart, Excel/PDF export
│   └── settings/
│       └── SettingsView.jsx # Org settings, logo, criteria, domains, users
├── pages/
│   └── AuthPages.jsx        # LoginPage + TermsPage (T&C acceptance)
├── App.jsx                  # Root routing + protected route
├── main.jsx                 # React entry point
└── index.css                # Tailwind + global component classes
```

---

## Environment Variables

| Variable            | Description                        | Example                                |
|---------------------|------------------------------------|----------------------------------------|
| VITE_API_BASE_URL   | FastAPI backend base URL           | https://your-app.up.railway.app/api/v1 |
| VITE_APP_NAME       | App title (optional)               | Application Due Diligence Canvas       |
| VITE_APP_VERSION    | Version string (optional)          | 1.0.0                                  |

---

## Key Features

- **JWT authentication** with automatic refresh token handling
- **Tenant isolation** — all API calls include the user's org_id via JWT
- **T&C acceptance screen** — scrollable terms with 3 checkboxes before access
- **Canvas** — domain grid with star ratings, progress bars, add/manage applications
- **Pricing** — editable TCO table with recommendations and portfolio totals
- **TOR** — full Terms of Reference builder with PDF print export and AI generation
- **Queries** — 5-step workflow tracker, response threads, status/priority filters
- **Reports** — Recharts bar chart, sortable tables, Excel download, PDF print, AI analysis
- **Settings** — org details, logo upload, criteria weights, domain management, user CRUD

---

## Deploy to Netlify

1. Push repo to GitHub
2. Connect to Netlify → New site → Import from Git
3. Build command: `npm run build` | Publish directory: `dist`
4. Add environment variable: `VITE_API_BASE_URL` = your Railway backend URL
5. Deploy

---

*ADC Frontend v1.0 | GMT Technology Solutions | April 2026*
