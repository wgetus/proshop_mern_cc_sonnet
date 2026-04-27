# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev          # Start backend (port 5000) + frontend (port 3000) concurrently
npm run server       # Backend only, with nodemon auto-reload
npm run client       # Frontend only (React dev server)
```

### Building & Production
```bash
npm start                          # Production: node backend/server.js
cd frontend && npm run build       # Build React app (required before npm start serves frontend)
```

### Database
```bash
npm run data:import    # Seed sample users, products into MongoDB
npm run data:destroy   # Wipe all seeded data
```

### Testing (frontend)
```bash
cd frontend && npm test            # Run React test suite (CRA/Jest)
cd frontend && npm test -- --testPathPattern=<file>  # Run a single test file
```

## Environment Setup

Create a `.env` file at the project root:
```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/proshop
JWT_SECRET=your_jwt_secret
PAYPAL_CLIENT_ID=your_paypal_client_id
```

After seeding (`npm run data:import`), sample credentials:
- Admin: `admin@example.com` / `123456`
- User: `john@example.com` / `123456`

## Architecture

### Backend (`/backend`)

Express REST API using ES modules (`"type": "module"` in package.json).

**Request lifecycle:** `server.js` → routes → `authMiddleware` (protect/admin) → controller → Mongoose model → response

- `server.js` — Express entry point; mounts routes under `/api/*`, serves `uploads/` static files, serves React build in production, registers global error handler
- `config/db.js` — Mongoose connection
- `middleware/authMiddleware.js` — `protect` (JWT verification, attaches `req.user`) and `admin` (checks `req.user.isAdmin`)
- `middleware/errorMiddleware.js` — Global error handler; maps status codes, exposes stack trace in dev
- Controllers use `express-async-handler` to propagate thrown errors to the global error handler

**Models:**
- `userModel.js` — Pre-save hook auto-hashes password via bcrypt; instance method `matchPassword()`
- `productModel.js` — Embeds `reviews` as a subdocument array; `rating`/`numReviews` are denormalized fields updated manually in the controller
- `orderModel.js` — `orderItems` stores a snapshot of product data (name, image, price) at time of purchase

### Frontend (`/frontend/src`)

React 16 SPA bootstrapped with Create React App. Requires `NODE_OPTIONS=--openssl-legacy-provider` for Node.js 17+ compatibility (already set in frontend `package.json` scripts).

**State management:** Redux with `redux-thunk`. State is organized into slices by domain:
- `cart` — persisted to `localStorage`; `cartItems` + `shippingAddress`
- `userLogin` — persisted to `localStorage`; holds `userInfo` with JWT token
- All other slices follow the `REQUEST → SUCCESS/FAIL` pattern

**API communication:** Actions in `actions/` use axios. The frontend dev server proxies `/api` requests to `http://localhost:5000` (set via `"proxy"` in `frontend/package.json`).

**Routing** (`App.js`): React Router v5. Public routes are open; protected screens redirect to `/login` if no `userInfo` in Redux store; admin screens additionally check `userInfo.isAdmin`.

**Key conventions:**
- Screens live in `screens/`, reusable UI in `components/`
- Each Redux domain has a matching `actions/` file, `reducers/` file, and `constants/` file
- `Loader` and `Message` components are used throughout screens for loading/error states

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

### Config
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/config/paypal` | — | Returns PAYPAL_CLIENT_ID env var |

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

Configured for Heroku via `Procfile` (`web: node backend/server.js`).

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
