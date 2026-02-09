import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../password.js'

describe('hashPassword', () => {
  it('produces a valid bcrypt hash', async () => {
    const hash = await hashPassword('testPassword123')
    expect(hash).toMatch(/^\$2[aby]?\$\d{2}\$.{53}$/)
  })

  it('produces different hashes for the same input (salt)', async () => {
    const hash1 = await hashPassword('samePassword')
    const hash2 = await hashPassword('samePassword')
    expect(hash1).not.toBe(hash2)
  })
})

describe('verifyPassword', () => {
  it('returns true for a correct password', async () => {
    const hash = await hashPassword('correctPassword')
    const result = await verifyPassword('correctPassword', hash)
    expect(result).toBe(true)
  })

  it('returns false for an incorrect password', async () => {
    const hash = await hashPassword('correctPassword')
    const result = await verifyPassword('wrongPassword', hash)
    expect(result).toBe(false)
  })

  it('returns false for empty password against valid hash', async () => {
    const hash = await hashPassword('somePassword')
    const result = await verifyPassword('', hash)
    expect(result).toBe(false)
  })
})
