# ProShop

ProShop is a MERN e-commerce training app for a small online store: customers can browse products, search, add items to a cart, register, place orders, pay through PayPal, and review products; admins can manage products, users, and orders. The project is useful for developers who want to run and inspect a full-stack React 16 + Express + MongoDB app with JWT auth and Redux state management.

## Tech Stack

Versions below are taken from `package.json` and `frontend/package.json`.

### Backend

- Node.js: tested locally with `20.19.2`
- Express: `^4.17.1`
- MongoDB driver via Mongoose: `^5.10.6`
- JWT auth: `jsonwebtoken ^8.5.1`
- Password hashing: `bcryptjs ^2.4.3`
- File uploads: `multer ^1.4.2`
- Request logging: `morgan ^1.10.0`
- Env loading: `dotenv ^8.2.0`
- Async controller errors: `express-async-handler ^1.1.4`

### Frontend

- React: `^16.13.1`
- React DOM: `^16.13.1`
- React Router DOM: `^5.2.0`
- Redux: `^4.0.5`
- React Redux: `^7.2.1`
- Redux Thunk: `^2.3.0`
- Axios: `^0.20.0`
- React Bootstrap: `^1.3.0`
- React Scripts: `3.4.3`
- PayPal button component: `react-paypal-button-v2 ^2.6.2`

### Tooling and Tests

- Nodemon: `^2.0.4`
- Concurrently: `^5.3.0`
- Jest: `^30.3.0`
- Supertest: `^7.2.2`
- Playwright: `^1.59.1`
- MongoDB Memory Server: `^11.0.1`

## Project Structure

```text
.
├── backend/              Express API, MongoDB models, controllers, routes, seed scripts, backend tests
├── e2e/                  Playwright smoke test runner and test seed helper
├── frontend/             Create React App frontend
│   ├── public/           Static CRA assets and sample product images
│   └── src/              React screens, components, Redux actions/reducers/constants, store setup
├── uploads/              Runtime upload target for product images
├── docs/                 Local project notes and planning docs
├── docker-compose.yml    Production-style Docker Compose setup
├── docker-compose.dev.yml Development Docker Compose setup with MongoDB
├── Dockerfile            Production image for the full app
├── package.json          Root backend scripts and backend/test dependencies
└── Procfile              Heroku process definition
```

## Prerequisites

- Docker with Docker Compose: install from the [Docker documentation](https://docs.docker.com/get-docker/).
- Task: install from the [Task installation guide](https://taskfile.dev/installation/).
- Node.js 20+ and npm only if you use the manual npm fallback. This repo is currently verified with Node `20.19.2` and npm `9.2.0`.
- A PayPal sandbox client ID if you want checkout payment buttons to load. The app can run without it, but payment UI will not be useful.

## Environment Variables

Create `.env` in the project root. These are the variables read by the backend code:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://mongo:27017/proshop
JWT_SECRET=replace_with_a_local_secret
PAYPAL_CLIENT_ID=replace_with_paypal_sandbox_client_id
```

Notes:

- `MONGO_URI` is required by `backend/config/db.js`.
- `JWT_SECRET` is required for login/register/profile/admin routes because tokens are signed and verified with it.
- `PAYPAL_CLIENT_ID` is returned by `GET /api/config/paypal` and consumed by the payment screen.
- `PORT` defaults to `5000` if missing.
- `NODE_ENV=development` enables request logging in `backend/app.js`. `NODE_ENV=production` makes the backend serve `frontend/build`.
- CRA also reads `PUBLIC_URL` internally in `frontend/src/serviceWorker.js`; you usually do not need to set it for local development.
- `docker-compose.dev.yml` also sets `MONGO_URI=mongodb://mongo:27017/proshop` for the app container, so Docker-based development uses the MongoDB service name `mongo`.

## Install

Install root and frontend dependencies inside the Docker app container:

```bash
task install
```

## Run Locally

Start the development stack:

```bash
task start
```

This starts Docker Compose from `docker-compose.dev.yml`:

- React frontend on `http://localhost:3000`
- Express API on `http://localhost:5000`
- MongoDB on `localhost:27017`, stored in the `mongo-dev-data` Docker volume

Stop the stack:

```bash
task stop
```

Run only the backend inside Docker:

```bash
task server
```

Run only the frontend inside Docker:

```bash
task client
```

The frontend dev server proxies API requests to `http://127.0.0.1:5000`, as configured in `frontend/package.json`.

## Seed Database

After the Docker stack is running:

```bash
task seed
```

Seed only if the database has no products:

```bash
task seed-empty
```

Delete seeded data:

```bash
task destroy
```

Sample logins after seeding:

```text
admin@example.com / 123456
john@example.com  / 123456
jane@example.com  / 123456
```

## Build and Production Run

Build the frontend inside Docker:

```bash
task build
```

Start the production Docker Compose stack:

```bash
task prod
```

Stop the production stack:

```bash
task prod-stop
```

## Tests

Run backend and e2e tests inside Docker:

```bash
task test
```

Run only backend tests:

```bash
task test-backend
```

Run only Playwright e2e tests:

```bash
task test-e2e
```

## Manual npm Fallback

Use this path only when you are not using Docker and Task. You need Node.js 20+, npm, and MongoDB running outside Docker.

For manual local MongoDB, use this `.env` value instead of the Docker service name:

```env
MONGO_URI=mongodb://localhost:27017/proshop
```

Install dependencies:

```bash
npm install
cd frontend
npm install
cd ..
```

Run both backend and frontend:

```bash
npm run dev
```

Seed data manually:

```bash
npm run data:import
```

## Troubleshooting

### MongoDB connection fails on startup

The backend exits if `mongoose.connect(process.env.MONGO_URI)` fails. Check that MongoDB is running and that `MONGO_URI` points to the right host:

```env
MONGO_URI=mongodb://mongo:27017/proshop
```

With Docker Compose, the app container reaches MongoDB through the service name `mongo`. If you run Node directly on your host machine, use `mongodb://localhost:27017/proshop` instead.

If the Docker database is in a bad state, stop the stack and remove the development volume:

```bash
task stop
docker volume rm proshop_mern_cc_sonnet_mongo-dev-data
```

### PayPal button does not load or checkout cannot continue

The payment screen gets the client ID from `GET /api/config/paypal`. Set `PAYPAL_CLIENT_ID` to a PayPal sandbox client ID in `.env`, then restart the backend. Use sandbox buyer credentials in the PayPal popup, not your normal PayPal account.

### Frontend API calls fail with proxy or CORS-looking errors

This app does not configure the `cors` package. Local development relies on the CRA proxy in `frontend/package.json`:

```json
"proxy": "http://127.0.0.1:5000"
```

Run the frontend through `task start`, `task client`, `npm run client`, or `npm run dev` so the proxy is active. If you call `http://localhost:5000/api/...` directly from browser code served on `localhost:3000`, the browser may report CORS errors.

### Backend runs but frontend shows empty product data

Seed the database with `task seed`, then refresh the frontend. Also confirm the backend is reachable at `http://localhost:5000/`; in development it responds with `API is running....`.

### `digital envelope routines` or OpenSSL errors from React scripts

The frontend scripts already set `NODE_OPTIONS=--openssl-legacy-provider` in `frontend/package.json`. Docker-based startup uses those scripts through `task start`. For manual npm startup, run:

```bash
npm run client
```

or:

```bash
cd frontend
npm start
```

Avoid running `react-scripts start` directly unless you set `NODE_OPTIONS` yourself.

### Port 3000 or 5000 is already in use

Stop the process using the port, or stop the Docker stack:

```bash
task stop
```

If you change the backend port for manual npm startup, update `frontend/package.json` proxy to the same port before running the frontend.

### Production page returns API text or cannot find frontend files

Production startup expects `frontend/build` to exist. Run `task build` before `task prod` if the image does not already build the frontend.

## License

The MIT License

Copyright (c) 2020 Traversy Media https://traversymedia.com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
