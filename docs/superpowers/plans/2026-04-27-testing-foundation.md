# Testing Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish backend API tests and Playwright E2E smoke tests that run against isolated deterministic data.

**Architecture:** Backend tests use Jest, Supertest, and MongoDB Memory Server against an importable Express app. E2E tests use a Node runner that starts MongoDB Memory Server, seeds data, starts the backend and CRA frontend, runs Playwright, then tears everything down.

**Tech Stack:** Node ES modules, Express, Mongoose 5, Jest, Supertest, MongoDB Memory Server, Playwright, Create React App.

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `package.json` | Add test dependencies, Jest config, and root test scripts |
| Modify | `package-lock.json` | Lock new test dependencies |
| Create | `backend/app.js` | Export Express app without DB connection or server listen |
| Modify | `backend/server.js` | Load env, connect DB, import app, start server |
| Create | `backend/__tests__/helpers/jestEnv.js` | Set deterministic Jest environment variables |
| Create | `backend/__tests__/helpers/testDb.js` | MongoDB Memory Server lifecycle helpers for Jest |
| Create | `backend/__tests__/helpers/fixtures.js` | Seed users/products for backend tests |
| Create | `backend/__tests__/app.test.js` | Backend app/config/error smoke tests |
| Create | `backend/__tests__/products.test.js` | Product API tests |
| Create | `backend/__tests__/users.test.js` | User/auth/admin API tests |
| Modify | `backend/utils/shouldSeed.test.js` | Convert existing Node test to Jest |
| Create | `playwright.config.js` | Playwright test configuration |
| Create | `e2e/run-playwright.js` | E2E environment orchestrator |
| Create | `e2e/seed.js` | Deterministic E2E seed data helper |
| Create | `e2e/tests/smoke.spec.js` | Browser smoke flows |

---

## Task 1: Install Test Tooling And Add Scripts

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `backend/__tests__/helpers/jestEnv.js`

- [ ] **Step 1: Install backend and E2E test dependencies**

Run:

```bash
npm install --save-dev jest supertest mongodb-memory-server @playwright/test
```

Expected:

- `package.json` gains the four dev dependencies.
- `package-lock.json` updates.
- No source files change.

- [ ] **Step 2: Install the Chromium browser used by Playwright**

Run:

```bash
npx playwright install chromium
```

Expected:

- Playwright downloads Chromium.
- No tracked source files need to change.

- [ ] **Step 3: Update root package scripts and Jest config**

Edit `package.json` so it contains these scripts and top-level Jest config. Keep the existing scripts and dependencies that are already present.

```json
{
  "scripts": {
    "start": "node backend/server",
    "server": "nodemon backend/server",
    "client": "npm start --prefix frontend",
    "dev": "concurrently \"npm run server\" \"npm run client\"",
    "data:import": "node backend/seeder",
    "data:seed-on-empty": "node backend/seedOnEmpty",
    "data:destroy": "node backend/seeder -d",
    "test:backend": "node --experimental-vm-modules node_modules/.bin/jest --runInBand",
    "test:e2e": "node e2e/run-playwright.js",
    "test": "npm run test:backend && npm run test:e2e",
    "heroku-postbuild": "NPM_CONFIG_PRODUCTION=false npm install --prefix frontend && npm run build --prefix frontend"
  },
  "jest": {
    "testEnvironment": "node",
    "transform": {},
    "testMatch": [
      "**/backend/**/*.test.js"
    ],
    "setupFiles": [
      "<rootDir>/backend/__tests__/helpers/jestEnv.js"
    ]
  }
}
```

Do not replace the whole file with this partial JSON. Merge these keys into the existing `package.json`.

- [ ] **Step 4: Create Jest environment defaults**

Create `backend/__tests__/helpers/jestEnv.js`:

```javascript
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.PAYPAL_CLIENT_ID = 'test-paypal-client-id'
```

- [ ] **Step 5: Run backend tests to verify the expected initial failure**

Run:

```bash
npm run test:backend
```

Expected:

- The command starts Jest.
- It fails because `backend/utils/shouldSeed.test.js` imports `node:test`, or because later backend test files do not exist yet.
- This confirms the new test runner is wired.

- [ ] **Step 6: Commit**

Run:

```bash
git add package.json package-lock.json backend/__tests__/helpers/jestEnv.js
git commit -m "chore: add backend and e2e test tooling"
```

---

## Task 2: Extract The Express App For Supertest

**Files:**
- Create: `backend/app.js`
- Modify: `backend/server.js`
- Test: `backend/__tests__/app.test.js`

- [ ] **Step 1: Write a failing app smoke test**

Create `backend/__tests__/app.test.js`:

```javascript
import request from 'supertest'
import app from '../app.js'

describe('app smoke behavior', () => {
  it('returns API running response at root in non-production mode', async () => {
    const res = await request(app).get('/')

    expect(res.status).toBe(200)
    expect(res.text).toBe('API is running....')
  })

  it('returns JSON 404 errors for unknown API routes', async () => {
    const res = await request(app).get('/api/not-real')

    expect(res.status).toBe(404)
    expect(res.body.message).toBe('Not Found - /api/not-real')
  })

  it('returns the PayPal client id from environment config', async () => {
    process.env.PAYPAL_CLIENT_ID = 'test-client-id'

    const res = await request(app).get('/api/config/paypal')

    expect(res.status).toBe(200)
    expect(res.text).toBe('test-client-id')
  })
})
```

- [ ] **Step 2: Run the app smoke test and verify it fails**

Run:

```bash
npm run test:backend -- backend/__tests__/app.test.js
```

Expected:

- FAIL with a module resolution error for `../app.js`.

- [ ] **Step 3: Create `backend/app.js`**

Create `backend/app.js`:

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

- [ ] **Step 4: Replace `backend/server.js` with startup-only code**

Replace `backend/server.js` with:

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

The `colors` import stays because `server.js` uses `.yellow.bold` on the log string.

- [ ] **Step 5: Run the app smoke test and verify it passes**

Run:

```bash
npm run test:backend -- backend/__tests__/app.test.js
```

Expected:

- PASS `backend/__tests__/app.test.js`
- No MongoDB connection attempt occurs when Supertest imports `app`.

- [ ] **Step 6: Run the production startup command syntax check**

Run:

```bash
node --check backend/server.js
node --check backend/app.js
```

Expected:

- Both commands exit successfully with no output.

- [ ] **Step 7: Commit**

Run:

```bash
git add backend/app.js backend/server.js backend/__tests__/app.test.js
git commit -m "test: expose express app for api tests"
```

---

## Task 3: Add Backend Test Database And Fixtures

**Files:**
- Create: `backend/__tests__/helpers/testDb.js`
- Create: `backend/__tests__/helpers/fixtures.js`
- Test: `backend/__tests__/products.test.js`

- [ ] **Step 1: Write a failing product API test that needs database helpers**

Create `backend/__tests__/products.test.js`:

```javascript
import request from 'supertest'
import mongoose from 'mongoose'
import app from '../app.js'
import {
  clearTestDb,
  closeTestDb,
  connectTestDb,
} from './helpers/testDb.js'
import { seedUsersAndProducts } from './helpers/fixtures.js'

beforeAll(async () => {
  await connectTestDb()
})

beforeEach(async () => {
  await clearTestDb()
})

afterAll(async () => {
  await closeTestDb()
})

describe('product API', () => {
  it('lists seeded products', async () => {
    const { products } = await seedUsersAndProducts()

    const res = await request(app).get('/api/products')

    expect(res.status).toBe(200)
    expect(res.body.products).toHaveLength(products.length)
    expect(res.body.products.map((product) => product.name)).toEqual(
      expect.arrayContaining(['Test Camera', 'Test Headphones'])
    )
    expect(res.body.page).toBe(1)
    expect(res.body.pages).toBe(1)
  })

  it('gets a product by id', async () => {
    const { products } = await seedUsersAndProducts()

    const res = await request(app).get(`/api/products/${products[0]._id}`)

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Test Camera')
    expect(res.body.countInStock).toBe(5)
  })

  it('returns 404 when a product does not exist', async () => {
    const missingId = new mongoose.Types.ObjectId()

    const res = await request(app).get(`/api/products/${missingId}`)

    expect(res.status).toBe(404)
    expect(res.body.message).toBe('Product not found')
  })

  it('filters products by keyword and returns pagination metadata', async () => {
    await seedUsersAndProducts()

    const res = await request(app).get('/api/products?keyword=Camera&pageNumber=1')

    expect(res.status).toBe(200)
    expect(res.body.products).toHaveLength(1)
    expect(res.body.products[0].name).toBe('Test Camera')
    expect(res.body.page).toBe(1)
    expect(res.body.pages).toBe(1)
  })
})
```

- [ ] **Step 2: Run the product API test and verify it fails**

Run:

```bash
npm run test:backend -- backend/__tests__/products.test.js
```

Expected:

- FAIL because `./helpers/testDb.js` and `./helpers/fixtures.js` do not exist.

- [ ] **Step 3: Create MongoDB Memory Server lifecycle helper**

Create `backend/__tests__/helpers/testDb.js`:

```javascript
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

let mongoServer

const connectTestDb = async () => {
  if (mongoose.connection.readyState !== 0) {
    return
  }

  mongoServer = await MongoMemoryServer.create()
  const uri = mongoServer.getUri()
  process.env.MONGO_URI = uri

  await mongoose.connect(uri, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useCreateIndex: true,
  })
}

const clearTestDb = async () => {
  const collections = mongoose.connection.collections

  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({})
  }
}

const closeTestDb = async () => {
  await mongoose.connection.dropDatabase()
  await mongoose.connection.close()

  if (mongoServer) {
    await mongoServer.stop()
    mongoServer = undefined
  }
}

export { clearTestDb, closeTestDb, connectTestDb }
```

- [ ] **Step 4: Create backend test fixtures**

Create `backend/__tests__/helpers/fixtures.js`:

```javascript
import Product from '../../models/productModel.js'
import User from '../../models/userModel.js'

const seedUsersAndProducts = async () => {
  const adminUser = await User.create({
    name: 'Admin User',
    email: 'admin@example.com',
    password: '123456',
    isAdmin: true,
  })

  const regularUser = await User.create({
    name: 'Test User',
    email: 'test@example.com',
    password: '123456',
    isAdmin: false,
  })

  const products = await Product.insertMany([
    {
      user: adminUser._id,
      name: 'Test Camera',
      image: '/images/camera.jpg',
      brand: 'Canon',
      category: 'Electronics',
      description: 'A camera for automated tests',
      rating: 4.5,
      numReviews: 2,
      price: 499.99,
      countInStock: 5,
    },
    {
      user: adminUser._id,
      name: 'Test Headphones',
      image: '/images/headphones.jpg',
      brand: 'Sony',
      category: 'Electronics',
      description: 'Headphones for automated tests',
      rating: 4,
      numReviews: 1,
      price: 199.99,
      countInStock: 3,
    },
  ])

  return {
    users: {
      adminUser,
      regularUser,
    },
    products,
  }
}

export { seedUsersAndProducts }
```

- [ ] **Step 5: Run the product API test and verify it passes**

Run:

```bash
npm run test:backend -- backend/__tests__/products.test.js
```

Expected:

- PASS `backend/__tests__/products.test.js`

- [ ] **Step 6: Commit**

Run:

```bash
git add backend/__tests__/helpers/testDb.js backend/__tests__/helpers/fixtures.js backend/__tests__/products.test.js
git commit -m "test: add product api tests with memory database"
```

---

## Task 4: Add User API And Authorization Tests

**Files:**
- Create: `backend/__tests__/users.test.js`
- Modify: `backend/__tests__/helpers/fixtures.js`

- [ ] **Step 1: Write user API tests**

Create `backend/__tests__/users.test.js`:

```javascript
import request from 'supertest'
import app from '../app.js'
import {
  clearTestDb,
  closeTestDb,
  connectTestDb,
} from './helpers/testDb.js'
import { seedUsersAndProducts } from './helpers/fixtures.js'

beforeAll(async () => {
  await connectTestDb()
})

beforeEach(async () => {
  await clearTestDb()
})

afterAll(async () => {
  await closeTestDb()
})

describe('user API', () => {
  it('registers a new user and returns a token', async () => {
    const res = await request(app).post('/api/users').send({
      name: 'New User',
      email: 'new@example.com',
      password: '123456',
    })

    expect(res.status).toBe(201)
    expect(res.body.name).toBe('New User')
    expect(res.body.email).toBe('new@example.com')
    expect(res.body.isAdmin).toBe(false)
    expect(res.body.token).toEqual(expect.any(String))
  })

  it('rejects duplicate registration emails', async () => {
    await seedUsersAndProducts()

    const res = await request(app).post('/api/users').send({
      name: 'Duplicate User',
      email: 'test@example.com',
      password: '123456',
    })

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('User already exists')
  })

  it('logs in with valid credentials', async () => {
    await seedUsersAndProducts()

    const res = await request(app).post('/api/users/login').send({
      email: 'test@example.com',
      password: '123456',
    })

    expect(res.status).toBe(200)
    expect(res.body.email).toBe('test@example.com')
    expect(res.body.token).toEqual(expect.any(String))
  })

  it('rejects invalid login credentials', async () => {
    await seedUsersAndProducts()

    const res = await request(app).post('/api/users/login').send({
      email: 'test@example.com',
      password: 'wrong-password',
    })

    expect(res.status).toBe(401)
    expect(res.body.message).toBe('Invalid email or password')
  })

  it('rejects unauthenticated profile access', async () => {
    const res = await request(app).get('/api/users/profile')

    expect(res.status).toBe(401)
    expect(res.body.message).toBe('Not authorized, no token')
  })

  it('returns the authenticated user profile with a valid token', async () => {
    await seedUsersAndProducts()

    const login = await request(app).post('/api/users/login').send({
      email: 'test@example.com',
      password: '123456',
    })

    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${login.body.token}`)

    expect(res.status).toBe(200)
    expect(res.body.email).toBe('test@example.com')
    expect(res.body.isAdmin).toBe(false)
  })

  it('prevents non-admin users from listing users', async () => {
    await seedUsersAndProducts()

    const login = await request(app).post('/api/users/login').send({
      email: 'test@example.com',
      password: '123456',
    })

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${login.body.token}`)

    expect(res.status).toBe(401)
    expect(res.body.message).toBe('Not authorized as an admin')
  })
})
```

- [ ] **Step 2: Run user API tests and verify they pass**

Run:

```bash
npm run test:backend -- backend/__tests__/users.test.js
```

Expected:

- PASS `backend/__tests__/users.test.js`

- [ ] **Step 3: Run product and user API tests together**

Run:

```bash
npm run test:backend -- backend/__tests__/products.test.js backend/__tests__/users.test.js
```

Expected:

- PASS both suites.
- No test data leaks between suites.

- [ ] **Step 4: Commit**

Run:

```bash
git add backend/__tests__/users.test.js
git commit -m "test: add user auth api coverage"
```

---

## Task 5: Convert Existing Utility Test To Jest And Verify Backend Suite

**Files:**
- Modify: `backend/utils/shouldSeed.test.js`

- [ ] **Step 1: Replace the Node test runner test with Jest syntax**

Replace `backend/utils/shouldSeed.test.js` with:

```javascript
import shouldSeed from './shouldSeed.js'

describe('shouldSeed', () => {
  it('returns true when there are no products', () => {
    expect(shouldSeed(0)).toBe(true)
  })

  it('returns false when products already exist', () => {
    expect(shouldSeed(1)).toBe(false)
  })
})
```

- [ ] **Step 2: Run the full backend suite**

Run:

```bash
npm run test:backend
```

Expected:

- PASS `backend/__tests__/app.test.js`
- PASS `backend/__tests__/products.test.js`
- PASS `backend/__tests__/users.test.js`
- PASS `backend/utils/shouldSeed.test.js`

- [ ] **Step 3: Commit**

Run:

```bash
git add backend/utils/shouldSeed.test.js
git commit -m "test: run shouldSeed test under jest"
```

---

## Task 6: Add Playwright Configuration And E2E Seed Helper

**Files:**
- Create: `playwright.config.js`
- Create: `e2e/seed.js`

- [ ] **Step 1: Create Playwright config**

Create `playwright.config.js`:

```javascript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
```

- [ ] **Step 2: Create deterministic E2E seed helper**

Create `e2e/seed.js`:

```javascript
import Product from '../backend/models/productModel.js'
import User from '../backend/models/userModel.js'

const seedE2EData = async () => {
  await Product.deleteMany({})
  await User.deleteMany({})

  const adminUser = await User.create({
    name: 'E2E Admin',
    email: 'admin@example.com',
    password: '123456',
    isAdmin: true,
  })

  const regularUser = await User.create({
    name: 'E2E User',
    email: 'john@example.com',
    password: '123456',
    isAdmin: false,
  })

  const products = await Product.insertMany([
    {
      user: adminUser._id,
      name: 'E2E Camera',
      image: '/images/camera.jpg',
      brand: 'Canon',
      category: 'Electronics',
      description: 'A camera seeded for E2E tests',
      rating: 4.5,
      numReviews: 2,
      price: 499.99,
      countInStock: 5,
    },
    {
      user: adminUser._id,
      name: 'E2E Headphones',
      image: '/images/headphones.jpg',
      brand: 'Sony',
      category: 'Electronics',
      description: 'Headphones seeded for E2E tests',
      rating: 4,
      numReviews: 1,
      price: 199.99,
      countInStock: 3,
    },
  ])

  return {
    adminUser,
    regularUser,
    products,
  }
}

export { seedE2EData }
```

- [ ] **Step 3: Run Playwright directly and verify expected failure**

Run:

```bash
npx playwright test
```

Expected:

- FAIL because no E2E test files exist yet, or because no app servers are running.
- The command should load `playwright.config.js` without syntax errors.

- [ ] **Step 4: Commit**

Run:

```bash
git add playwright.config.js e2e/seed.js
git commit -m "test: add playwright config and e2e seed data"
```

---

## Task 7: Add E2E Runner That Owns Environment Lifecycle

**Files:**
- Create: `e2e/run-playwright.js`

- [ ] **Step 1: Create the E2E runner**

Create `e2e/run-playwright.js`:

```javascript
import { spawn } from 'child_process'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { seedE2EData } from './seed.js'

const BACKEND_URL = 'http://127.0.0.1:5000'
const FRONTEND_URL = 'http://127.0.0.1:3000'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const waitForUrl = async (url, label) => {
  const deadline = Date.now() + 60000
  let lastError

  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.ok) {
        return
      }
      lastError = new Error(`${label} returned ${res.status}`)
    } catch (error) {
      lastError = error
    }

    await sleep(1000)
  }

  throw new Error(`Timed out waiting for ${label}: ${lastError.message}`)
}

const spawnProcess = (command, args, env) => {
  const child = spawn(command, args, {
    env: {
      ...process.env,
      ...env,
    },
    stdio: 'inherit',
    detached: process.platform !== 'win32',
  })

  child.on('error', (error) => {
    console.error(error)
  })

  return child
}

const stopProcess = async (child) => {
  if (!child || child.killed) {
    return
  }

  if (process.platform === 'win32') {
    child.kill()
    return
  }

  try {
    process.kill(-child.pid, 'SIGTERM')
  } catch (error) {
    if (error.code !== 'ESRCH') {
      throw error
    }
  }
}

const runCommand = (command, args, env) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: {
        ...process.env,
        ...env,
      },
      stdio: 'inherit',
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`))
      }
    })

    child.on('error', reject)
  })

let mongoServer
let backend
let frontend

const cleanup = async () => {
  await stopProcess(frontend)
  await stopProcess(backend)

  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close()
  }

  if (mongoServer) {
    await mongoServer.stop()
  }
}

process.on('SIGINT', async () => {
  await cleanup()
  process.exit(130)
})

process.on('SIGTERM', async () => {
  await cleanup()
  process.exit(143)
})

try {
  mongoServer = await MongoMemoryServer.create()
  const mongoUri = mongoServer.getUri()

  await mongoose.connect(mongoUri, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useCreateIndex: true,
  })
  await seedE2EData()
  await mongoose.connection.close()

  backend = spawnProcess('node', ['backend/server.js'], {
    NODE_ENV: 'test',
    PORT: '5000',
    MONGO_URI: mongoUri,
    JWT_SECRET: 'test-jwt-secret',
    PAYPAL_CLIENT_ID: 'test-paypal-client-id',
  })

  await waitForUrl(`${BACKEND_URL}/`, 'backend')

  frontend = spawnProcess('npm', ['start', '--prefix', 'frontend'], {
    BROWSER: 'none',
    PORT: '3000',
    HOST: '127.0.0.1',
  })

  await waitForUrl(FRONTEND_URL, 'frontend')

  await runCommand('npx', ['playwright', 'test', '--project=chromium'], {
    E2E_BASE_URL: FRONTEND_URL,
  })

  await cleanup()
} catch (error) {
  console.error(error)
  await cleanup()
  process.exit(1)
}
```

- [ ] **Step 2: Run the E2E script and verify expected failure**

Run:

```bash
npm run test:e2e
```

Expected:

- Backend starts against MongoDB Memory Server.
- Frontend starts on `http://127.0.0.1:3000`.
- Playwright runs and fails because `e2e/tests/smoke.spec.js` does not exist yet, or reports no tests found.
- The runner tears down backend, frontend, and MongoDB Memory Server.

- [ ] **Step 3: Commit**

Run:

```bash
git add e2e/run-playwright.js
git commit -m "test: orchestrate isolated e2e environment"
```

---

## Task 8: Add Playwright Smoke Tests

**Files:**
- Create: `e2e/tests/smoke.spec.js`

- [ ] **Step 1: Write E2E smoke tests**

Create `e2e/tests/smoke.spec.js`:

```javascript
import { expect, test } from '@playwright/test'

test.describe('ProShop smoke flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('homepage renders seeded products', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Latest Products' })).toBeVisible()
    await expect(page.getByText('E2E Camera')).toBeVisible()
    await expect(page.getByText('E2E Headphones')).toBeVisible()
  })

  test('product detail opens from the homepage', async ({ page }) => {
    await page.getByRole('link', { name: 'E2E Camera' }).click()

    await expect(page.getByRole('heading', { name: 'E2E Camera' })).toBeVisible()
    await expect(page.getByText('Description: A camera seeded for E2E tests')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add To Cart' })).toBeEnabled()
  })

  test('seeded user can log in', async ({ page }) => {
    await page.getByRole('link', { name: /sign in/i }).click()
    await page.getByLabel('Email Address').fill('john@example.com')
    await page.getByLabel('Password').fill('123456')
    await page.getByRole('button', { name: 'Sign In' }).click()

    await expect(page.getByText('E2E User')).toBeVisible()
  })

  test('user can add a product to cart and reach checkout login redirect', async ({ page }) => {
    await page.getByRole('link', { name: 'E2E Camera' }).click()
    await page.getByRole('button', { name: 'Add To Cart' }).click()

    await expect(page.getByRole('heading', { name: 'Shopping Cart' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'E2E Camera' })).toBeVisible()
    await expect(page.getByText('Subtotal (1) items')).toBeVisible()

    await page.getByRole('button', { name: 'Proceed To Checkout' }).click()

    await expect(page).toHaveURL(/\/login\?redirect=shipping/)
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()
  })
})
```

- [ ] **Step 2: Run E2E tests**

Run:

```bash
npm run test:e2e
```

Expected:

- PASS `e2e/tests/smoke.spec.js`
- Backend and frontend processes shut down after the run.

- [ ] **Step 3: Commit**

Run:

```bash
git add e2e/tests/smoke.spec.js
git commit -m "test: add playwright smoke flows"
```

---

## Task 9: Verify Full Testing Foundation

**Files:**
- Modify only if a previous task exposed a real bug in the test setup.

- [ ] **Step 1: Run full backend test suite**

Run:

```bash
npm run test:backend
```

Expected:

- All backend suites pass.

- [ ] **Step 2: Run full E2E suite**

Run:

```bash
npm run test:e2e
```

Expected:

- Playwright Chromium smoke tests pass.
- The backend uses MongoDB Memory Server.
- The development database is not touched.

- [ ] **Step 3: Run combined test command**

Run:

```bash
npm test
```

Expected:

- `npm run test:backend` passes.
- `npm run test:e2e` passes.

- [ ] **Step 4: Check working tree**

Run:

```bash
git status --short
```

Expected:

- Only intentional files from the testing foundation remain changed.
- Existing user-owned files, such as a pre-staged `AGENTS.md`, are not reverted.

- [ ] **Step 5: Final commit if verification required fixes**

If Step 1, 2, or 3 required any code changes, commit them:

```bash
git add package.json package-lock.json backend/app.js backend/server.js backend/__tests__ backend/utils/shouldSeed.test.js playwright.config.js e2e
git commit -m "test: stabilize testing foundation"
```

If no files changed during verification, do not create an empty commit.
