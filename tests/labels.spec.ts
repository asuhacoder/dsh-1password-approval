import { describe, expect, it } from 'vitest'
import { countdown, date, number, sessionName } from '../src/client/labels.js'
import { harness, wire, NOW } from './helpers.js'

describe('localized request formatting', () => {
  it('formats countdown, dates, and quantities in the active language', async () => {
    const actor = harness(true); actor.pending([wire()]); const unsubscribe = actor.handkey.subscribe(() => {})
    await actor.handkey.refresh()
    const snapshot = actor.handkey.getSnapshot(); if (snapshot.kind !== 'active' || !snapshot.pending[0]) throw new Error('Missing parsed request')
    const deadline = snapshot.pending[0].deadline
    expect(countdown(deadline, NOW, 'en')).toBe('10:00')
    expect(countdown(deadline, NOW + 599_000, 'en')).toBe('00:01')
    expect(countdown(deadline, NOW + 600_000, 'en')).toBe('00:00')
    expect(number(1200, 'en')).toBe('1,200')
    expect(date(deadline, 'zh')).toContain(String(new Date(deadline).getFullYear()))
    unsubscribe(); expect(actor.timers.size).toBe(0)
  })

  it('derives a bounded Safari session name and prefers user-agent data', () => {
    expect(sessionName({ userAgent: 'Mozilla iPhone Safari/605' })).toBe('dsh – Safari on iOS')
    expect(sessionName({ userAgent: '', userAgentData: { platform: 'macOS', brands: [{ brand: 'Not A Brand' }, { brand: 'Chromium' }] } })).toBe('dsh – Chromium on macOS')
    expect([...sessionName({ userAgent: '', userAgentData: { platform: '😀'.repeat(200) } })]).toHaveLength(128)
  })
})
