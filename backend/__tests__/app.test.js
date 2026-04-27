import request from 'supertest'
import app from '../app.js'

describe('API smoke', () => {
  it('returns 404 JSON for unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent-xyz')
    expect(res.status).toBe(404)
    expect(res.body.message).toBe('Not Found - /api/nonexistent-xyz')
  })

  it('GET /api/config/paypal returns PAYPAL_CLIENT_ID env var', async () => {
    process.env.PAYPAL_CLIENT_ID = 'test-client-id'
    const res = await request(app).get('/api/config/paypal')
    expect(res.status).toBe(200)
    expect(res.text).toBe('test-client-id')
  })
})
