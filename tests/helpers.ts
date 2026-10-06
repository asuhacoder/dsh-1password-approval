import { createHandkey, memoryPersistence } from 'handkey-client'
import type { Environment } from 'handkey-client'

export const KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
export const SECOND_KEY = 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBA'
export const NOW = Date.now()
export const iso = (milliseconds: number) => new Date(milliseconds).toISOString()
export function wire(id = 'r1', method = 'otp', spec: Record<string, unknown> = {}, display?: unknown) {
  return { id, spec: { method, agent: 'Test agent', reason: 'Access the production service', ...spec }, approval: 'pending', execution: 'not_started', created_at: iso(NOW - 1000), deadline: iso(NOW + 600_000), ...(display === undefined ? {} : { display }) }
}
export const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
export const created = () => ({ id: 'device', session_id: 'browser', view_token: 'view-only', view_until: iso(NOW + 86_400_000) })
export type Call = { readonly path: string; readonly method: string; readonly body: BodyInit | null | undefined; readonly headers: Headers }
type Reply = Response | Error | ((call: Call) => Response | Promise<Response>)

export function harness(active = false) {
  const persistence = memoryPersistence()
  if (active) persistence.compareAndSwap(null, JSON.stringify({ version: 1, brokerUrl: 'https://broker.example', deviceId: 'device', sessionId: 'browser', viewToken: 'view-only', viewUntil: NOW + 86_400_000 }))
  const calls: Call[] = []
  const replies = new Map<string, Reply[]>()
  let pending: unknown[] = []
  let listStatus = 200
  let controller: ReadableStreamDefaultController<Uint8Array> | undefined
  const timers = new Set<unknown>()
  const environment: Environment = {
    now: () => NOW, random: () => 1,
    setTimeout() { const token = {}; timers.add(token); return token },
    clearTimeout(token) { timers.delete(token) },
    fetch: async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const call: Call = { path: new URL(url).pathname, method: init?.method ?? 'GET', body: init?.body, headers: new Headers(init?.headers) }
      calls.push(call)
      const reply = replies.get(`${call.method} ${call.path}`)?.shift()
      if (reply instanceof Error) throw reply
      if (reply) return typeof reply === 'function' ? reply(call) : reply
      if (call.path === '/v1/events') {
        const stream = new ReadableStream<Uint8Array>({ start(value) { controller = value; value.enqueue(new TextEncoder().encode('event: sync\ndata: {}\n\n')) } })
        return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })
      }
      if (call.path === '/v1/requests') return json(pending, listStatus)
      throw new Error(`Unscripted ${call.method} ${call.path}`)
    },
  }
  const handkey = createHandkey({ persistence, environment })
  return { handkey, persistence, calls, timers,
    queue(method: string, path: string, ...responses: Reply[]) { const id = `${method} ${path}`; replies.set(id, [...(replies.get(id) ?? []), ...responses]) },
    pending(value: unknown[]) { pending = value },
    status(value: number) { listStatus = value },
    change() { controller?.enqueue(new TextEncoder().encode('event: change\ndata: {}\n\n')) },
  }
}

export function deferred<T>() {
  let resolve: (value: T) => void = () => { throw new Error('Deferred not initialized') }
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}
