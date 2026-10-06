import { describe, expect, it } from 'vitest'
import { en, zh } from '../src/client/locale.js'

describe('approval locale dictionaries', () => {
  it('keeps complete key and parameter parity', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort())
    for (const [key, value] of Object.entries(en)) {
      const translated = Object.entries(zh).find(([candidate]) => candidate === key)?.[1]
      expect(value.trim()).not.toBe('')
      expect(translated?.trim()).not.toBe('')
      const params = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort()
      expect(params(translated ?? '')).toEqual(params(value))
    }
  })
})
