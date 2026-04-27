# CLAUDE.md Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Append six best-practice sections to CLAUDE.md and set up the backend testing infrastructure those docs describe.

**Architecture:** Static documentation sections are appended directly to CLAUDE.md. Backend testing requires splitting `server.js` into `backend/app.js` (exports Express app) and a slimmed `server.js` (imports app, calls listen) so Supertest can import the app without starting a server or connecting to MongoDB.

**Tech Stack:** Jest 29, Supertest, Node 20 ES modules (`--experimental-vm-modules`)

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `CLAUDE.md` | Append 6 new sections |
| Create | `backend/app.js` | Express config exported for testing |
| Modify | `backend/server.js` | Import app, call listen only |
| Modify | `package.json` (root) | Add `test:backend` script + jest config |
| Create | `backend/__tests__/app.test.js` | Smoke tests for route structure |

---

## Task 1: Append static documentation sections to CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Append Prerequisites, API Endpoint Map, Gotchas, Deployment, and AI Notes sections**

Open `CLAUDE.md` and append the following block at the very end of the file:

```markdown
## Prerequisites

- Node.js 20+ (currently tested on 20.19.2)
- MongoDB 4.x+ running locally on port 27017, or set `MONGO_URI` to a MongoDB Atlas connection string
- `NODE_OPTIONS=--openssl-legacy-provider` is already wired into frontend `package.json` scripts — no manual action needed

## API Endpoint Map

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

## Gotchas & Known Issues

- **ES modules throughout backend** — all imports must use `import`/`export`, never `require()`. Relative imports require the `.js` extension (e.g., `import db from './config/db.js'`)
- **`rating` and `numReviews` are denormalized** — always recalculate both from the `reviews` subdocument array in `productController.js` after any review change; never update them in isolation
- **`/api/products/top` route must be declared before `/:id`** — otherwise Express matches `top` as an id param; already correct in `productRoutes.js`, don't reorder
- **JWT stored in `localStorage`** via Redux persist — not an httpOnly cookie; intentional for this app, not a bug to "fix"
- **`uploads/` directory** — multer saves images here; files are not cleaned up when a product is deleted
- **Mongoose v5** — `.save()` returns the saved document; chaining `.populate()` after `.save()` requires a separate `.findById()` query
- **`colors` package** — used for terminal logging in `seeder.js` and `server.js`; safe to leave, don't remove
- **`POST /api/upload` has no auth middleware** — known gap; don't assume this is the pattern for other routes

## Deployment

Configured for Heroku via `Procfile` (`web: npm start`).

- `heroku-postbuild` in root `package.json` installs frontend deps and builds the React app automatically on push
- `NODE_ENV=production` causes `server.js` to serve `frontend/build/` as static files — run `cd frontend && npm run build` locally to test this
- All `.env` variables must be set as Heroku config vars (`heroku config:set KEY=value`)
- Use MongoDB Atlas for production — replace `MONGO_URI` with the Atlas connection string
- `uploads/` is ephemeral on Heroku (dyno filesystem resets on restart) — consider S3 for persistent image storage

## AI Notes

Constraints Claude must respect unless explicitly instructed otherwise:

- **Do not switch backend to CommonJS** — `"type": "module"` in root `package.json` is intentional; never introduce `require()`
- **Do not migrate Redux to Redux Toolkit** — state slices use the manual `REQUEST → SUCCESS/FAIL` pattern with separate actions/reducers/constants files
- **Do not use React Router v6 APIs** — app uses v5; `<Switch>`, `<Route>`, `useHistory` are correct; do not use `<Routes>`, `useNavigate`
- **Do not move JWT to httpOnly cookies** without a full auth refactor plan covering both backend middleware and frontend Redux state
- **Do not add `try/catch` in controllers** — `express-async-handler` propagates thrown errors to the global handler in `errorMiddleware.js`; trust it
- **Do not add backend test files inside `frontend/`** — backend tests live in `backend/__tests__/`
- **React 16 is intentional** — do not upgrade to React 18 without explicit instruction; hooks API is available but concurrent features are not
```

- [ ] **Step 2: Verify the file**

```bash
tail -80 CLAUDE.md
```

Expected: the six new sections appear at the end with correct formatting.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: append prerequisites, API map, gotchas, deployment, AI notes to CLAUDE.md"
```

---

## Task 2: Install Jest and Supertest

**Files:**
- Modify: `package.json` (root)

- [ ] **Step 1: Install dependencies**

```bash
npm install --save-dev jest supertest
```

- [ ] **Step 2: Add test:backend script and jest config to root package.json**

In `package.json`, add `"test:backend"` to the `scripts` object and add a top-level `"jest"` key:

```json
"scripts": {
  "start": "node backend/server",
  "server": "nodemon backend/server",
  "client": "npm start --prefix frontend",
  "dev": "concurrently \"npm run server\" \"npm run client\"",
  "data:import": "node backend/seeder",
  "data:destroy": "node backend/seeder -d",
  "test:backend": "node --experimental-vm-modules node_modules/.bin/jest",
  "heroku-postbuild": "NPM_CONFIG_PRODUCTION=false npm install --prefix frontend && npm run build --prefix frontend"
},
"jest": {
  "testEnvironment": "node",
  "transform": {}
}
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install jest + supertest, add test:backend script"
```

---

## Task 3: Extract app.js and write smoke tests (TDD)

**Files:**
- Create: `backend/__tests__/app.test.js`
- Create: `backend/app.js`
- Modify: `backend/server.js`

- [ ] **Step 1: Write failing tests**

Create `backend/__tests__/app.test.js`:

```javascript
import request from 'supertest'
import app from '../app.js'

describe('API smoke', () => {
  it('returns 404 JSON for unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent-xyz')
    expect(res.status).toBe(404)
    expect(res.body.message).toBe('Not Found - /api/nonexistent-xyz')
  })

  it('GET /api/config/paypal returns PAYPAL_CLIENT_ID env var', async () => {
    process.env.PAYPAL_CLIENT_ID = 'test-client-id'
    const res = await request(app).get('/api/config/paypal')
    expect(res.status).toBe(200)
    expect(res.text).toBe('test-client-id')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:backend
```

Expected: `Cannot find module '../app.js'`

- [ ] **Step 3: Create backend/app.js**

Create `backend/app.js` with the Express config (extracted from `server.js`):

```javascript
import path from 'path'
import express from 'express'
import morgan from 'morgan'
import { notFound, errorHandler } from './middleware/errorMiddleware.js'
import productRoutes from './routes/productRoutes.js'
import userRoutes from './routes/userRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import uploadRoutes from './routes/uploadRoutes.js'

const app = express()

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

app.use(express.json())

app.use('/api/products', productRoutes)
app.use('/api/users', userRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/upload', uploadRoutes)

app.get('/api/config/paypal', (req, res) =>
  res.send(process.env.PAYPAL_CLIENT_ID)
)

const __dirname = path.resolve()
app.use('/uploads', express.static(path.join(__dirname, '/uploads')))

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '/frontend/build')))
  app.get('*', (req, res) =>
    res.sendFile(path.resolve(__dirname, 'frontend', 'build', 'index.html'))
  )
} else {
  app.get('/', (req, res) => {
    res.send('API is running....')
  })
}

app.use(notFound)
app.use(errorHandler)

export default app
```

- [ ] **Step 4: Update backend/server.js**

Replace `backend/server.js` entirely with:

```javascript
import dotenv from 'dotenv'
import colors from 'colors'
import connectDB from './config/db.js'
import app from './app.js'

dotenv.config()

connectDB()

const PORT = process.env.PORT || 5000

app.listen(
  PORT,
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold
  )
)
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm run test:backend
```

Expected output:
```
PASS backend/__tests__/app.test.js
  API smoke
    ✓ returns 404 JSON for unknown routes
    ✓ GET /api/config/paypal returns PAYPAL_CLIENT_ID env var
```

- [ ] **Step 6: Verify dev server still starts**

```bash
npm run server
```

Expected: `Server running in development mode on port 5000` (loaded from `.env`). MongoDB may log a connection error if not running locally — that's fine, the server process itself should not crash. Stop with Ctrl+C.

- [ ] **Step 7: Commit**

```bash
git add backend/app.js backend/server.js backend/__tests__/app.test.js
git commit -m "feat: extract backend/app.js for testability, add Jest smoke tests"
```

---

## Task 4: Append Backend Testing section to CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Append Backend Testing section**

Open `CLAUDE.md` and append the following block at the very end:

```markdown
## Backend Testing

```bash
npm run test:backend    # Run all backend tests (Jest + Supertest)
```

Test files live in `backend/__tests__/`. Install dependencies once from the project root: `npm install --save-dev jest supertest`.

- `--experimental-vm-modules` is required because backend uses ES modules (`"type": "module"`)
- Express app config lives in `backend/app.js` (exported); `server.js` imports it and calls `listen`
- Tests import from `backend/app.js` directly — no DB connection is made during tests
- Pattern: `import request from 'supertest'; import app from '../app.js'` then `await request(app).get('/path')`
```

- [ ] **Step 2: Verify**

```bash
tail -15 CLAUDE.md
```

Expected: the Backend Testing section with the bash block and four bullet points.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add Backend Testing section to CLAUDE.md"
```
