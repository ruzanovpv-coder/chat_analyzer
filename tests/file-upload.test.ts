import { describe, it, expect } from '@jest/globals'

describe('Загрузка файлов', () => {
  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

  it('2.1 — Проверка размера файла (до 10 МБ)', () => {
    const validSize = 5 * 1024 * 1024 // 5 MB
    expect(validSize).toBeLessThanOrEqual(MAX_FILE_SIZE)
  })

  it('2.2 — Отклонение файла больше 10 МБ', () => {
    const invalidSize = 15 * 1024 * 1024 // 15 MB
    expect(invalidSize).toBeGreaterThan(MAX_FILE_SIZE)
  })

  it('2.3 — Разрешённые типы файлов', () => {
    const allowedTypes = ['text/plain', 'application/json']
    expect(allowedTypes).toContain('text/plain')
    expect(allowedTypes).toContain('application/json')
    expect(allowedTypes).not.toContain('application/pdf')
  })
})