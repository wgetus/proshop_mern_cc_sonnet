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
