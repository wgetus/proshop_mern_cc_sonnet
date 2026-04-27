# CLAUDE.md Improvements Design

**Date:** 2026-04-27
**Approach:** Append-only enrichment (Option A) — six new sections added to the existing CLAUDE.md without restructuring

## Goal

Improve CLAUDE.md to serve two audiences equally:
1. **AI assistant (Claude)** — more context to avoid mistakes, clear constraints, API reference
2. **Solo developer** — prerequisites, backend testing setup, deployment notes

## Scope

Six new sections appended after the existing Architecture section:

---

## Section 1 — Prerequisites

Documents runtime requirements (Node 20+, MongoDB) and clarifies the openssl workaround is already handled.

```markdown
## Prerequisites

- Node.js 20+ (currently tested on 20.19.2)
- MongoDB 4.x+ running locally on port 27017, or set `MONGO_URI` to a MongoDB Atlas connection string
- `NODE_OPTIONS=--openssl-legacy-provider` is already wired into frontend `package.json` scripts — no manual action needed
```

---

## Section 2 — Backend Testing

Introduces Jest + Supertest for backend route-level and unit tests. ES modules require `--experimental-vm-modules`.

```markdown
## Backend Testing

Install once (root level):
```bash
npm install --save-dev jest supertest
```

Add to root `package.json` scripts:
```json
"test:backend": "node --experimental-vm-modules node_modules/.bin/jest"
```

Add to root `package.json` (top level):
```json
"jest": {
  "testEnvironment": "node",
  "transform": {}
}
```

- Test files live in `backend/__tests__/`
- Use `supertest` to spin up the Express app for route-level tests
- `--experimental-vm-modules` is required because backend uses ES modules (`"type": "module"`)
- Pattern: import the Express app from `server.js`, wrap with `supertest(app)`, assert on response status/body
```

---

## Section 3 — API Endpoint Map

Complete REST endpoint reference with auth requirements. Accurate as of routes audit on 2026-04-27.

Auth legend: `—` public, `🔒` requires JWT (`protect`), `🛡` requires admin

### Products `/api/products`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/products` | — | List all (paginated) |
| GET | `/api/products/top` | — | Top-rated products |
| GET | `/api/products/:id` | — | Product detail |
| POST | `/api/products` | 🛡 | Create product |
| PUT | `/api/products/:id` | 🛡 | Update product |
| DELETE | `/api/products/:id` | 🛡 | Delete product |
| POST | `/api/products/:id/reviews` | 🔒 | Add review |

### Users `/api/users`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/users/login` | — | Login, returns JWT |
| POST | `/api/users` | — | Register |
| GET | `/api/users/profile` | 🔒 | Get own profile |
| PUT | `/api/users/profile` | 🔒 | Update own profile |
| GET | `/api/users` | 🛡 | List all users |
| GET | `/api/users/:id` | 🛡 | Get user by id |
| PUT | `/api/users/:id` | 🛡 | Update user |
| DELETE | `/api/users/:id` | 🛡 | Delete user |

### Orders `/api/orders`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/orders` | 🔒 | Create order |
| GET | `/api/orders` | 🛡 | List all orders |
| GET | `/api/orders/myorders` | 🔒 | Own orders |
| GET | `/api/orders/:id` | 🔒 | Order detail |
| PUT | `/api/orders/:id/pay` | 🔒 | Mark as paid |
| PUT | `/api/orders/:id/deliver` | 🛡 | Mark as delivered |

### Upload
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/upload` | — | Upload image (jpg/jpeg/png only) |

---

## Section 4 — Gotchas & Known Issues

Runtime quirks and architectural decisions that would otherwise be non-obvious.

- ES modules throughout backend — `.js` extensions required on relative imports
- `rating`/`numReviews` are denormalized — must be recalculated from `reviews` array after any change
- `/api/products/top` route order is load-bearing — must stay before `/:id`
- JWT in `localStorage` is intentional, not a bug
- `uploads/` files are not cleaned up on product delete
- Mongoose v5 `.save()` quirk — chain `.populate()` requires a separate `.findById()`
- `colors` package is used in backend logging

---

## Section 5 — Deployment

Heroku deployment via Procfile, with notes on ephemeral filesystem and Atlas requirement.

- `heroku-postbuild` builds React frontend automatically
- `NODE_ENV=production` activates static file serving of `frontend/build/`
- All `.env` vars must be set as Heroku config vars
- MongoDB Atlas required for production
- `uploads/` is ephemeral on Heroku — S3 recommended for persistent images

---

## Section 6 — AI Notes

Hard constraints Claude must not violate without explicit instruction:

- No CommonJS (`require`) in backend
- No Redux Toolkit migration
- No React Router v6 APIs
- No JWT-to-httpOnly-cookie refactor without full plan
- No `try/catch` in controllers — trust `express-async-handler`
- Backend tests in `backend/__tests__/` only
- React 16 is intentional — do not upgrade

---

## Implementation

Edit `CLAUDE.md` — append all six sections after the existing `### Frontend` section. No existing content is modified.
