import shouldSeed from './shouldSeed.js'

describe('shouldSeed', () => {
  it('returns true when there are no products', () => {
    expect(shouldSeed(0)).toBe(true)
  })

  it('returns false when products already exist', () => {
    expect(shouldSeed(1)).toBe(false)
  })
})
