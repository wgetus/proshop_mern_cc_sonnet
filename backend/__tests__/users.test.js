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
