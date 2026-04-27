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

describe('order API', () => {
  it('rejects orders without order items', async () => {
    await seedUsersAndProducts()

    const login = await request(app).post('/api/users/login').send({
      email: 'test@example.com',
      password: '123456',
    })

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({
        shippingAddress: {
          address: '123 Test St',
          city: 'Testville',
          postalCode: '12345',
          country: 'US',
        },
        paymentMethod: 'PayPal',
        itemsPrice: '0.00',
        taxPrice: '0.00',
        shippingPrice: '0.00',
        totalPrice: '0.00',
      })

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('No order items')
  })
})
