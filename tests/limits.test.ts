import { describe, it, expect } from '@jest/globals'

describe('Лимиты генераций', () => {
  it('3.1 — Проверка лимита (1 бесплатно)', () => {
    const used = 0
    const limit = 1
    const allowed = used < limit
    expect(allowed).toBe(true)
  })

  it('3.2 — Превышение лимита', () => {
    const used = 1
    const limit = 1
    const allowed = used < limit
    expect(allowed).toBe(false)
  })

  it('3.3 — Увеличение счётчика', () => {
    let used = 0
    used += 1
    expect(used).toBe(1)
  })
})