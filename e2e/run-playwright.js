import { spawn } from 'child_process'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { seedE2EData } from './seed.js'

const E2E_PORT = process.env.E2E_PORT || '5010'
const APP_URL = `http://127.0.0.1:${E2E_PORT}`

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const waitForUrl = async (url, label, child) => {
  const deadline = Date.now() + 60000
  let lastError

  while (Date.now() < deadline) {
    if (child?.exitCode !== null) {
      throw new Error(`${label} exited with code ${child.exitCode} before startup`)
    }

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

const cleanup = async () => {
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
  mongoServer = await MongoMemoryServer.create({
    instance: {
      ip: '127.0.0.1',
      port: 27018,
    },
  })
  const mongoUri = mongoServer.getUri()

  await mongoose.connect(mongoUri, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useCreateIndex: true,
  })
  await seedE2EData()
  await mongoose.connection.close()

  await runCommand('npm', ['run', 'build', '--prefix', 'frontend'], {
    CI: 'false',
    SKIP_PREFLIGHT_CHECK: 'true',
  })

  backend = spawnProcess('node', ['backend/server.js'], {
    NODE_ENV: 'production',
    PORT: E2E_PORT,
    MONGO_URI: mongoUri,
    JWT_SECRET: 'test-jwt-secret',
    PAYPAL_CLIENT_ID: 'test-paypal-client-id',
  })

  await waitForUrl(APP_URL, 'app server', backend)

  await runCommand('npx', ['playwright', 'test', '--project=chromium'], {
    E2E_BASE_URL: APP_URL,
  })

  await cleanup()
} catch (error) {
  console.error(error)
  await cleanup()
  process.exit(1)
}
