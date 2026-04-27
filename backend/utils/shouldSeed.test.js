import assert from 'assert/strict'
import test from 'node:test'
import shouldSeed from './shouldSeed.js'

test('should seed when there are no products', () => {
  assert.equal(shouldSeed(0), true)
})

test('should skip seeding when products already exist', () => {
  assert.equal(shouldSeed(1), false)
})
