import { describe, it, expect } from 'vitest'
import { MAX_STROKE_POINTS, MAX_PARTICIPANTS, TOKEN_EXPIRY_SECONDS } from './limits'

describe('MAX_STROKE_POINTS', () => {
  it('should be 10000', () => {
    expect(MAX_STROKE_POINTS).toBe(10000)
  })

  it('should be a positive integer', () => {
    expect(Number.isInteger(MAX_STROKE_POINTS)).toBe(true)
    expect(MAX_STROKE_POINTS).toBeGreaterThan(0)
  })
})

describe('MAX_PARTICIPANTS', () => {
  it('should be 10', () => {
    expect(MAX_PARTICIPANTS).toBe(10)
  })

  it('should be a positive integer', () => {
    expect(Number.isInteger(MAX_PARTICIPANTS)).toBe(true)
    expect(MAX_PARTICIPANTS).toBeGreaterThan(0)
  })
})

describe('TOKEN_EXPIRY_SECONDS', () => {
  it('should be 3600 (1 hour)', () => {
    expect(TOKEN_EXPIRY_SECONDS).toBe(3600)
  })

  it('should be a positive integer', () => {
    expect(Number.isInteger(TOKEN_EXPIRY_SECONDS)).toBe(true)
    expect(TOKEN_EXPIRY_SECONDS).toBeGreaterThan(0)
  })
})
