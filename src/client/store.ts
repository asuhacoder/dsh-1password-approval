import { createHandkey } from 'handkey-client'
import type { Handkey, RequestId } from 'handkey-client'
import { browserEnvironment } from 'handkey-client/dom'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { LimitState } from './SessionLimit.js'

let singleton: Handkey | undefined
export function getHandkey(): Handkey {
  return singleton ??= createHandkey(browserEnvironment({ storageKey: 'dsh-1password-approval:v1' }))
}

export type View = { readonly kind: 'closed' } | { readonly kind: 'list'; readonly selected: readonly RequestId[] } | { readonly kind: 'approve'; readonly ids: readonly RequestId[] }
export type RegistrationView = { readonly kind: 'session' } | { readonly kind: 'register'; readonly target: { readonly brokerUrl: string; readonly deviceId: string } | null } | { readonly kind: 'sessionLimit'; readonly state: LimitState }
type UiSnapshot = { readonly view: View; readonly registration: RegistrationView; readonly seenIds: readonly RequestId[] }
export function createUiStore() {
  let snapshot: UiSnapshot = { view: { kind: 'closed' }, registration: { kind: 'session' }, seenIds: [] }
  let returnFocus: HTMLElement | null = null
  const listeners = new Set<() => void>()
  const publish = (next: UiSnapshot) => { snapshot = next; for (const listener of listeners) listener() }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    open(ids: readonly RequestId[], progress: boolean, opener: HTMLElement) { returnFocus = opener; publish({ ...snapshot, seenIds: ids, view: progress ? { kind: 'approve', ids: [] } : { kind: 'list', selected: [] } }) },
    navigate(view: View) { publish({ ...snapshot, view }) },
    select(id: RequestId) { const view = snapshot.view; if (view.kind === 'list') publish({ ...snapshot, view: { kind: 'list', selected: view.selected.includes(id) ? view.selected.filter(candidate => candidate !== id) : [...view.selected, id] } }) },
    registration(registration: RegistrationView) { publish({ ...snapshot, registration }) },
    restoreFocus() { if (returnFocus?.isConnected) returnFocus.focus(); returnFocus = null },
    dispose() { returnFocus = null; publish({ view: { kind: 'closed' }, registration: { kind: 'session' }, seenIds: [] }); listeners.clear() },
  }
}
export type Translate = PropsLocale<'onepassword-approval'>['t']
export interface Face {
  readonly handkey: () => Handkey
  readonly ui: ReturnType<typeof createUiStore>
  readonly language: { readonly subscribe: (listener: () => void) => () => void; readonly getSnapshot: () => string }
}
export type RootProps = PropsLocale<'onepassword-approval'> & Face
