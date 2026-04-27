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

    const res = await request(app).get(
      '/api/products?keyword=Camera&pageNumber=1'
    )

    expect(res.status).toBe(200)
    expect(res.body.products).toHaveLength(1)
    expect(res.body.products[0].name).toBe('Test Camera')
    expect(res.body.page).toBe(1)
    expect(res.body.pages).toBe(1)
  })
})
