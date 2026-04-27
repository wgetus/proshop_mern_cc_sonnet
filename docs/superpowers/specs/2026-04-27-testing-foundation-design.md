# Testing Foundation Design

**Date:** 2026-04-27
**Milestone:** Establish a reliable automated testing baseline before dependency upgrades or backend/frontend refactors.

## Goal

Create a solid safety net for the existing MERN ProShop app so future dependency updates and refactors can move forward with lower regression risk.

The first milestone focuses on backend API confidence and browser-level smoke coverage. It deliberately avoids broad modernization work and frontend component tests until the project has a stable baseline.

## Scope

Included:

- Backend API tests with Jest, Supertest, and MongoDB Memory Server.
- Playwright E2E smoke tests from the project root.
- Deterministic test data for backend and E2E tests.
- Root-level scripts for running backend tests, E2E tests, and the combined suite.
- Minimal backend testability extraction if required, specifically separating the Express app from server startup.

Excluded:

- React component tests.
- React, Redux, React Router, or Create React App modernization.
- Redux Toolkit migration.
- Broad controller, screen, or state-management refactors.
- Dependency upgrades unrelated to test tooling.
- Full checkout/payment E2E coverage.

## Architecture

The testing stack has two layers.

### Backend API Tests

Backend tests run from the project root using:

- `jest`
- `supertest`
- `mongodb-memory-server`

Tests exercise real Express routes against a disposable MongoDB instance. This gives route, middleware, controller, model, validation, auth, and error-handler coverage without touching the developer's local MongoDB data.

To make this possible, the backend should expose an importable Express app. The expected structure is:

- `backend/app.js` exports the configured Express app.
- `backend/server.js` loads environment variables, connects to MongoDB, imports the app, and starts `app.listen()`.

This split is a testability extraction, not a behavior refactor. Runtime route behavior should stay the same.

### Playwright E2E Tests

Playwright tests run from the project root and exercise the real frontend/backend integration in a browser.

The first E2E suite should stay small and high-value:

- The app loads.
- Seeded products render on the homepage.
- A product detail page opens from the homepage.
- A seeded user can log in.
- A user can add a product to the cart and reach the checkout path far enough to prove routing, Redux state, localStorage, and API integration.

Playwright should own its test environment setup. The design favors deterministic setup and teardown over reusing development data.

## Test Data

Backend tests use MongoDB Memory Server directly:

- Start the memory server before tests.
- Set `MONGO_URI` to the memory server URI.
- Connect Mongoose.
- Seed only the data needed by each suite.
- Clear collections between tests or suites.
- Disconnect Mongoose and stop the memory server after the run.

E2E tests need deterministic data across multiple processes. The preferred design is a Playwright global setup that:

- Starts an isolated MongoDB Memory Server or an equivalent isolated test database.
- Starts the backend with `NODE_ENV=test` and the test `MONGO_URI`.
- Starts the frontend dev server.
- Seeds known users and products.
- Tears down servers and the database after the run.

If process orchestration proves too brittle, a dedicated local test database is an acceptable fallback for E2E only, but it must use a separate database name and explicit cleanup. It must not use the development database.

## Initial Backend Coverage

The backend API baseline should cover:

- App smoke behavior:
  - `GET /` returns the API running response in non-production mode.
  - Unknown API routes return JSON 404 errors.
- Config:
  - `GET /api/config/paypal` returns the configured PayPal client ID.
- Products:
  - Product list returns seeded products.
  - Product detail returns a product by id.
  - Missing product returns 404.
  - Search and pagination return expected metadata.
- Users:
  - Register creates a user and returns a token.
  - Login succeeds with valid credentials.
  - Login fails with invalid credentials.
  - Duplicate registration is rejected.
  - Protected profile route rejects unauthenticated requests.
  - Protected profile route accepts a valid user token.
- Authorization:
  - A non-admin user cannot access at least one admin route.

This is a baseline, not exhaustive API coverage.

## Initial E2E Coverage

The Playwright baseline should cover:

- Homepage renders seeded product content.
- Product detail navigation works from a seeded product.
- Login works with a seeded user.
- Cart flow works far enough to verify add-to-cart behavior and checkout routing.

The first milestone should not attempt:

- PayPal payment simulation.
- Full order placement.
- Admin CRUD flows.
- Visual regression testing.
- Browser matrix expansion beyond Playwright's default configured browser choice.

Those can be added after the test foundation is stable.

## Commands

Root scripts should be the primary entry points:

```json
"test:backend": "node --experimental-vm-modules node_modules/.bin/jest --runInBand",
"test:e2e": "playwright test",
"test": "npm run test:backend && npm run test:e2e"
```

`--experimental-vm-modules` is required because the backend uses ES modules. `--runInBand` keeps MongoDB Memory Server and Mongoose lifecycle handling predictable in the first version.

## Reliability Rules

- Tests must not depend on the developer's existing local database contents.
- Tests must not write to the development database.
- Seed data should be small, explicit, and local to tests.
- Test helpers should favor clear lifecycle ownership over hidden global state.
- E2E tests should assert stable user-visible behavior, not implementation details.
- The first milestone should stop at a reliable baseline before expanding coverage.

## Success Criteria

Milestone 1 is complete when:

- Backend API tests can be run from the root with one command.
- Playwright E2E tests can be run from the root with one command.
- The combined root test command runs both suites.
- Tests create and clean up isolated data.
- Existing development and production startup behavior remains unchanged.
- The test suite gives enough confidence to begin dependency upgrades and targeted backend/frontend refactors in later milestones.
