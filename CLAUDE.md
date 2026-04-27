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
