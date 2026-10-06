// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { Root } from '../src/client/Root.js'
import { en } from '../src/client/locale.js'
import type { Translate } from '../src/client/store.js'
import { KEY, SECOND_KEY, NOW, created, deferred, harness, iso, json, wire } from './helpers.js'

const t: Translate = (key, params) => {
  if (!(key in en)) return key
  const template = Object.entries(en).find(([candidate]) => candidate === key)?.[1] ?? key
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params?.[name] ?? ''))
}
afterEach(cleanup)
function mount(actor: ReturnType<typeof harness>) {
  render(<Root t={t} inject={{ handkey: () => actor.handkey, language: { subscribe: () => () => {}, getSnapshot: () => 'en' } }} />)
  return userEvent.setup()
}
async function open(user: ReturnType<typeof userEvent.setup>) { await user.click(await screen.findByRole('button', { name: /Register handkey|pending approvals|Approval progress/ })) }
function keyInput() { const input = screen.getByLabelText('Device key'); if (!(input instanceof HTMLInputElement)) throw new Error('Key input missing'); return input }
function leak(actor: ReturnType<typeof harness>, keys = [KEY]) {
  for (const key of keys) {
    expect(document.documentElement.outerHTML).not.toContain(key)
    for (const input of document.querySelectorAll('input')) expect(input.value).not.toContain(key)
    expect(JSON.stringify(actor.handkey.getSnapshot())).not.toContain(key)
    expect(actor.persistence.read() ?? '').not.toContain(key)
    expect(JSON.stringify(localStorage)).not.toContain(key)
  }
}
async function fillRegistration(user: ReturnType<typeof userEvent.setup>, key = KEY) {
  await user.type(screen.getByLabelText('Broker URL'), 'https://broker.example')
  await user.type(screen.getByLabelText('Device ID'), 'device')
  await user.clear(screen.getByLabelText('Session name'))
  await user.type(screen.getByLabelText('Session name'), 'Phone Safari')
  await user.type(keyInput(), key)
}

 describe('approval overlay with real Handkey actor', () => {
  it('registers, consumes the key synchronously, and shows the SSE-listed count', async () => {
    const actor = harness(); actor.pending([wire()]); actor.queue('POST', '/v1/devices/device/sessions', json(created()))
    const user = mount(actor); await open(user); await fillRegistration(user)
    const input = keyInput(); fireEvent.submit(input.closest('form')!)
    expect(input.value).toBe('')
    await screen.findByRole('checkbox', { name: 'Select r1' })
    expect(screen.getByRole('button', { name: '1 pending approvals' })).toBeDefined()
    const call = actor.calls.find(call => call.path === '/v1/devices/device/sessions')
    expect(call?.method).toBe('POST'); expect(JSON.parse(String(call?.body))).toEqual({ key: KEY, name: 'Phone Safari' })
    leak(actor)
  })

  it.each([['rejection', json({}, 401), 'The device ID or device key did not match.'], ['network', new Error('private transport'), en['fault.unreachable']]])('explains registration %s without leaking credentials', async (_, reply, message) => {
    const actor = harness(); actor.queue('POST', '/v1/devices/device/sessions', reply)
    const user = mount(actor); await open(user); await fillRegistration(user)
    await user.click(screen.getByRole('button', { name: 'Register this browser' }))
    expect((await screen.findByRole('alert')).textContent).toBe(message)
    expect(keyInput().value).toBe(''); leak(actor)
  })

  it('lists and revokes sessions with a fresh consumed key for each action', async () => {
    const actor = harness(); actor.queue('POST', '/v1/devices/device/sessions', json({}, 409))
    actor.queue('POST', '/v1/devices/device/sessions/list', json([{ session_id: 'old', name: 'Old phone <script>', created_at: iso(NOW), view_until: iso(NOW + 86_400_000), current: false }]))
    actor.queue('POST', '/v1/devices/device/sessions/old/revoke', json({ status: 'revoked' }))
    const user = mount(actor); await open(user); await fillRegistration(user)
    await user.click(screen.getByRole('button', { name: 'Register this browser' }))
    await screen.findByText(en['sessionLimit.explanation'])
    const listKey = keyInput(); await user.type(listKey, KEY); fireEvent.submit(listKey.closest('form')!); expect(listKey.value).toBe('')
    await screen.findByText('Old phone <script>'); await user.click(screen.getByRole('button', { name: 'Revoke session' }))
    expect(screen.getByText('Autofill again')).toBeDefined()
    const revokeKey = keyInput(); await user.type(revokeKey, SECOND_KEY); fireEvent.submit(revokeKey.closest('form')!); expect(revokeKey.value).toBe('')
    await screen.findByRole('button', { name: 'Register this browser' })
    const mutations = actor.calls.filter(call => call.method === 'POST')
    expect(mutations.map(call => call.path)).toEqual(['/v1/devices/device/sessions', '/v1/devices/device/sessions/list', '/v1/devices/device/sessions/old/revoke'])
    expect(JSON.parse(String(mutations[1]?.body))).toEqual({ key: KEY })
    expect(JSON.parse(String(mutations[2]?.body))).toEqual({ key: SECOND_KEY })
    expect((screen.getByLabelText('Device ID') as HTMLInputElement).value).toBe('device')
    leak(actor, [KEY, SECOND_KEY])
  })

  it('renders trusted names, warnings, every caution, operation details, and literal malicious text', async () => {
    const actor = harness(true)
    const refs = [{ vault: 'v', item: 'i', field: 'f' }]
    const known = { refs: [{ ...refs[0], known: true, vault_name: 'Production', item_title: 'API login', field_label: 'Token', origins: ['https://api.example.com/path'] }] }
    const partial = { refs: [{ ...refs[0], known: false, vault_name: 'Maybe vault', item_title: 'Maybe item', field_label: 'Maybe field' }] }
    actor.pending([
      wire('a', 'reveal', { refs, agent: '<img src=x onerror=alert(1)>', ttl_seconds: 3600, uses: 2, output_format: 'json' }, known),
      wire('b', 'exec', { refs, unredacted: true, command: ['node', '--check', 'two words'], directory: '/work', bindings: { TOKEN: 'v/i/f' } }, partial),
      wire('c', 'clipboard', { refs }), wire('d', 'type', { target: '123|Safari|Login window' }),
      wire('e', 'write', { create: { vault: 'v', title: 'New login', category: 'LOGIN', fields: [{ id: 'username', label: 'User name', type: 'STRING', value: 'NEVER_RENDER' }], generate_password: 'letters,digits,32' } }),
      wire('f', 'alien'), wire('g', 'proxy', { origin: 'https://fixed.example', header: 'Authorization', prefix: 'Bearer ', command: ['curl'], directory: '/proxy', bindings: {} }),
      wire('h', 'type', { target: 'raw target' }), wire('j', 'refresh'), { malformed: true },
    ])
    const user = mount(actor); await open(user)
    await screen.findByText('Production › API login › Token')
    expect(screen.getByText('api.example.com')).toBeDefined()
    expect(screen.getAllByText(en['card.nameUnverified'])).toHaveLength(2)
    expect(screen.getByText(en['card.legacyRequest'])).toBeDefined()
    for (const key of ['caution.aiProvider', 'caution.unmaskedOutput', 'caution.clipboardHistory', 'caution.enteredValues', 'caution.longLease', 'caution.multipleUses'] as const) expect(screen.getByText(en[key])).toBeDefined()
    expect(screen.getAllByText(en['caution.namesUnverified'])).toHaveLength(2)
    expect(screen.getByText(/<img src=x onerror=alert\(1\)>/)).toBeDefined(); expect(document.querySelector('img')).toBeNull()
    expect(screen.getByText('TOKEN')).toBeDefined(); expect(screen.getByText('two words')).toBeDefined(); expect(screen.getByText('/work')).toBeDefined()
    expect(screen.getByText(/Safari · Login window/)).toBeDefined(); expect(screen.getByText('raw target')).toBeDefined()
    expect(screen.getByText(/User name · STRING/)).toBeDefined(); expect(document.documentElement.outerHTML).not.toContain('NEVER_RENDER')
    expect(screen.getByText('https://fixed.example')).toBeDefined()
    const unknown = screen.getByText('alien').closest('article'); if (!unknown) throw new Error('Missing unknown card')
    expect(within(unknown).queryByRole('checkbox')).toBeNull(); expect(within(unknown).getByRole('button', { name: 'Deny' })).toBeDefined()
    expect(screen.getByText('1 requests could not be read')).toBeDefined()
  })

  it('denies one without a body and removes it after re-list', async () => {
    const actor = harness(true); actor.pending([wire()])
    actor.queue('POST', '/v1/requests/r1/deny', () => { actor.pending([]); return json({ status: 'denied' }) })
    const user = mount(actor); await open(user); await screen.findByRole('checkbox'); await user.click(screen.getByRole('button', { name: 'Deny' }))
    await screen.findByText('No pending requests.')
    const call = actor.calls.find(call => call.path.endsWith('/deny')); expect(call?.method).toBe('POST'); expect(call?.body).toBeUndefined(); expect(call?.headers.get('Authorization')).toBe('Bearer view-only')
  })

  it('approves in order and renders live store progress while hidden and reopened', async () => {
    const actor = harness(true); actor.pending([wire('r1'), wire('r2')])
    const post = deferred<Response>(); actor.queue('POST', '/v1/requests/r1/approve', () => post.promise)
    actor.queue('GET', '/v1/requests/r1', json({ ...wire('r1'), approval: 'approved', execution: 'ready' }))
    actor.queue('POST', '/v1/requests/r2/approve', json({ status: 'processed' }))
    actor.queue('GET', '/v1/requests/r2', json({ ...wire('r2'), approval: 'approved', execution: 'failed' }))
    const user = mount(actor); await open(user); await user.click(await screen.findByRole('checkbox', { name: 'Select r1' })); await user.click(screen.getByRole('checkbox', { name: 'Select r2' })); await user.click(screen.getByRole('button', { name: 'Approve selected (2)' }))
    expect(screen.getAllByText(/Test agent/)).toHaveLength(2)
    const input = keyInput(); await user.type(input, KEY); fireEvent.submit(input.closest('form')!); expect(input.value).toBe('')
    await screen.findByText('Approving'); expect(screen.getByText('Queued')).toBeDefined()
    await user.keyboard('{Escape}'); expect(screen.queryByRole('dialog')).toBeNull(); await open(user)
    actor.pending([]); await act(async () => post.resolve(json({ status: 'processed' })))
    await screen.findByText('Done · Executed'); expect(screen.getByText('Done · Execution failed')).toBeDefined()
    expect(actor.calls.filter(call => /\/r[12](\/approve)?$/.test(call.path)).map(call => `${call.method} ${call.path}`)).toEqual(['POST /v1/requests/r1/approve', 'GET /v1/requests/r1', 'POST /v1/requests/r2/approve', 'GET /v1/requests/r2'])
    leak(actor); await user.click(screen.getByRole('button', { name: 'Dismiss' })); expect(actor.handkey.getSnapshot()).toMatchObject({ approval: null })
  })

  it('stops on a rejected key, confirms with GET, and marks the second item not sent', async () => {
    const actor = harness(true); actor.pending([wire('r1'), wire('r2')]); actor.queue('POST', '/v1/requests/r1/approve', json({}, 401)); actor.queue('GET', '/v1/requests/r1', json(wire('r1')))
    const user = mount(actor); await open(user); await user.click(await screen.findByRole('checkbox', { name: 'Select r1' })); await user.click(screen.getByRole('checkbox', { name: 'Select r2' })); await user.click(screen.getByRole('button', { name: 'Approve selected (2)' })); await user.type(keyInput(), KEY); await user.click(screen.getByRole('button', { name: 'Approve' }))
    await screen.findByText('Done · Key rejected'); expect(screen.getByText('Done · Not sent')).toBeDefined(); expect(screen.getByText('Batch stopped: Key rejected')).toBeDefined()
    expect(actor.calls.filter(call => call.path.endsWith('/approve')).map(call => call.path)).toEqual(['/v1/requests/r1/approve'])
    leak(actor); await user.click(screen.getByRole('button', { name: 'Dismiss' })); expect(actor.handkey.getSnapshot()).toMatchObject({ approval: null })
  })

  it('returns to registration with the rejected session reason after a list 401', async () => {
    const actor = harness(true); actor.pending([wire()]); const user = mount(actor); await open(user); await screen.findByRole('checkbox')
    actor.status(401); await act(async () => actor.handkey.refresh())
    expect(screen.getByText(en['register.rejected'])).toBeDefined(); expect(screen.getByRole('button', { name: 'Register this browser' })).toBeDefined()
  })

  it('labels the dialog, traps forward and reverse focus, and returns focus on Escape and backdrop', async () => {
    const actor = harness(); const user = mount(actor); const pill = screen.getByRole('button', { name: 'Register handkey' }); await open(user)
    const dialog = screen.getByRole('dialog', { name: 'Handkey approvals' }); expect(dialog.getAttribute('aria-modal')).toBe('true'); expect(document.activeElement).toBe(dialog)
    await user.tab(); expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }))
    await user.tab({ shift: true }); expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Register this browser' }))
    await user.tab(); expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }))
    await user.keyboard('{Escape}'); expect(screen.queryByRole('dialog')).toBeNull(); expect(document.activeElement).toBe(pill)
    await open(user); const backdrop = document.querySelector('.opa-backdrop'); if (!backdrop) throw new Error('Backdrop missing'); await user.click(backdrop); expect(document.activeElement).toBe(pill)
  })
 })
