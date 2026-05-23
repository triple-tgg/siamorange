# Siam Orange V2 — Deploy Guide 🍊

## Architecture

```
Frontend (Cloudflare Pages) → Worker API (Cloudflare Workers) → n8n Webhooks (Railway)
                           → R2 Storage (slip uploads, product images)
                           → KV Store (product catalog, shipping rules)
```

## Prerequisites

- Node.js 18+
- Cloudflare account ([dash.cloudflare.com](https://dash.cloudflare.com))
- `wrangler` CLI: `npm install -g wrangler`

## Quick Start

### 1. Install Dependencies

```bash
cd worker
npm install
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Create KV Namespace

```bash
# Production
wrangler kv:namespace create PRODUCTS_KV
# → Copy the namespace ID to worker/wrangler.toml

# Staging
wrangler kv:namespace create PRODUCTS_KV --env staging
```

### 4. Create R2 Bucket

```bash
wrangler r2 bucket create siamorange-slips
```

### 5. Set Worker Secrets

```bash
cd worker

# Production secrets
wrangler secret put N8N_ORDER_WEBHOOK
wrangler secret put N8N_MEMBER_WEBHOOK
wrangler secret put N8N_MEMBER_CHECK_WEBHOOK
wrangler secret put N8N_MYPURCHASE_WEBHOOK
wrangler secret put N8N_AFFPURCHASE_WEBHOOK
wrangler secret put N8N_LINE_MESSAGE_WEBHOOK

# Staging secrets
wrangler secret put N8N_ORDER_WEBHOOK --env staging
# ... (repeat for all secrets)
```

### 6. Update wrangler.toml

Edit `worker/wrangler.toml`:
- Replace `<PRODUCTION_KV_ID>` with actual KV namespace ID
- Uncomment the KV and R2 binding sections

### 7. Deploy Worker API

```bash
# Staging
cd worker
wrangler deploy --env staging

# Production
wrangler deploy
```

### 8. Deploy Frontend (Pages)

```bash
# Manual deploy
cd frontend
wrangler pages deploy ./ --project-name=siamorange-order

# Or connect GitHub repo for auto-deploy
```

### 9. Setup Custom Domain

In Cloudflare Dashboard:
1. Go to **Pages** → `siamorange-order` → **Custom domains**
2. Add `order.siamorange.com`
3. For staging: add `staging.order.siamorange.com`

### 10. Configure Pages → Worker Routing

In `frontend/` create `_routes.json` or use Service Bindings to route `/api/*` to the Worker.

Alternatively, use a Cloudflare Pages Function or proxy configuration.

## Development

```bash
# Run Worker locally
cd worker
npx wrangler dev

# Serve frontend locally (separate terminal)
cd frontend
npx wrangler pages dev ./
```

## Environment Matrix

| Environment | Frontend URL | Worker API | Branch |
|---|---|---|---|
| Production | `order.siamorange.com` | `siamorange-api.*.workers.dev` | `main` |
| Staging | `staging.order.siamorange.com` | `siamorange-api-staging.*.workers.dev` | `develop` |
| Preview | `*.siamorange-order.pages.dev` | staging worker | PR branches |

## File Structure

```
siamorange/
├── frontend/          # Cloudflare Pages (static)
│   ├── index.html     # Main order form
│   ├── member_form.html
│   ├── order-status.html
│   ├── public/        # Static assets (img, product)
│   └── src/           # CSS + JS modules
├── worker/            # Cloudflare Worker (API)
│   ├── src/index.js   # Hono.js entry point
│   ├── src/routes/    # API route handlers
│   ├── src/middleware/ # CORS, rate limiting
│   └── wrangler.toml  # Worker config
├── scripts/           # Build & seed scripts
│   ├── seed-kv.js
│   └── data/          # KV seed data (JSON)
└── .env.example       # Environment variables template
```
