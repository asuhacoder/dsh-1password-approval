import { useEffect, useId, useReducer, useRef, useState, useSyncExternalStore } from 'react'
import type { KeyboardEvent } from 'react'
import type { RequestId } from 'handkey-client'
import { ApproveForm, approvalOf } from './ApproveForm.js'
import { faultKey, number, outcomeKey } from './labels.js'
import { RegisterForm } from './RegisterForm.js'
import { RequestCard } from './RequestCard.js'
import { SessionLimit } from './SessionLimit.js'
import type { LimitState } from './SessionLimit.js'
import type { RootProps } from './store.js'
import { styles } from './styles.js'

type Target = { readonly brokerUrl: string; readonly deviceId: string }
export type View = { readonly kind: 'closed' } | { readonly kind: 'list'; readonly selected: readonly RequestId[] } | { readonly kind: 'approve'; readonly ids: readonly RequestId[] } | { readonly kind: 'register'; readonly target: Target | null } | { readonly kind: 'sessionLimit'; readonly state: LimitState }
type Action = { readonly kind: 'navigate'; readonly view: View } | { readonly kind: 'select'; readonly id: RequestId }
function reducer(view: View, action: Action): View {
  switch (action.kind) {
    case 'navigate': return action.view
    case 'select': return view.kind === 'list' ? { kind: 'list', selected: view.selected.includes(action.id) ? view.selected.filter(id => id !== action.id) : [...view.selected, action.id] } : view
    default: { const exhaustive: never = action; return exhaustive }
  }
}

export function Root({ t, inject }: RootProps) {
  const [handkey] = useState(inject.handkey)
  const snapshot = useSyncExternalStore(handkey.subscribe, handkey.getSnapshot, handkey.getSnapshot)
  const language = useSyncExternalStore(inject.language.subscribe, inject.language.getSnapshot, inject.language.getSnapshot)
  const [view, dispatch] = useReducer(reducer, { kind: 'closed' })
  const [now, setNow] = useState(Date.now)
  const [notice, setNotice] = useState<string | null>(null)
  const lastOpenedCount = useRef(0)
  const pill = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const title = useId()
  const open = view.kind !== 'closed'
  const run = approvalOf(snapshot)
  const count = snapshot.kind === 'active' ? snapshot.pending.length : 0
  const navigate = (next: View) => dispatch({ kind: 'navigate', view: next })
  const close = () => navigate({ kind: 'closed' })

  useEffect(() => {
    if (!open) return
    const returnFocus = pill.current
    dialog.current?.focus()
    void handkey.refresh()
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => { window.clearInterval(timer); returnFocus?.focus() }
  }, [open, handkey])

  useEffect(() => {
    if (open && dialog.current && !dialog.current.contains(document.activeElement)) dialog.current.focus()
  }, [open, view.kind, snapshot.kind, run !== null])

  function trap(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return }
    if (event.key !== 'Tab') return
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), summary, [tabindex="0"]')].filter(element => !element.closest('details:not([open])') || element.tagName === 'SUMMARY')
    const first = controls[0], last = controls.at(-1)
    if (!first || !last) { event.preventDefault(); event.currentTarget.focus(); return }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && (document.activeElement === last || document.activeElement === event.currentTarget)) { event.preventDefault(); first.focus() }
  }

  const deny = (ids: readonly RequestId[]) => {
    setNotice(null)
    void handkey.deny(ids).then(result => {
      if (result.kind === 'not-registered') setNotice(t('form.notRegistered'))
      else if (result.stopped) setNotice(t(outcomeKey(result.stopped)))
      else setNotice(t('deny.finished', { count: number(result.items.length, language) }))
      void handkey.refresh()
    })
  }

  function body() {
    if (run) return <ApproveForm handkey={handkey} snapshot={snapshot} ids={[]} t={t} onDismiss={() => navigate(snapshot.kind === 'active' ? { kind: 'list', selected: [] } : { kind: 'register', target: null })} />
    if (view.kind === 'sessionLimit') return <SessionLimit handkey={handkey} state={view.state} t={t} language={language} onState={state => navigate({ kind: 'sessionLimit', state })} onRegister={() => navigate({ kind: 'register', target: { brokerUrl: view.state.brokerUrl, deviceId: view.state.deviceId } })} />
    if (snapshot.kind === 'register' || view.kind === 'register') return <RegisterForm handkey={handkey} snapshot={snapshot} target={view.kind === 'register' ? view.target : null} t={t} onRegistered={() => navigate({ kind: 'list', selected: [] })} onLimit={target => navigate({ kind: 'sessionLimit', state: { ...target, stage: 'list' } })} />
    switch (view.kind) {
      case 'approve': return <ApproveForm handkey={handkey} snapshot={snapshot} ids={view.ids} t={t} onDismiss={() => navigate({ kind: 'list', selected: [] })} />
      case 'list': {
        const selected = snapshot.pending.filter(request => view.selected.includes(request.id) && request.operation.kind !== 'unrecognized').map(request => request.id)
        return <>
          {snapshot.list.kind === 'loading' && <p role="status">{t('health.updating')}</p>}
          {snapshot.list.kind === 'stale' && <div role="status"><p>{t('health.stale')} {t(faultKey(snapshot.list.fault))}</p><button type="button" onClick={() => void handkey.refresh()}>{t('action.retry')}</button></div>}
          {snapshot.unreadable > 0 && <p role="status">{t('health.unreadable', { count: number(snapshot.unreadable, language) })}</p>}
          {snapshot.pending.length === 0 && <p>{t('list.empty')}</p>}
          {snapshot.pending.map(request => <RequestCard key={request.id} request={request} t={t} language={language} now={now} selected={selected.includes(request.id)} disabled={false} onSelect={() => dispatch({ kind: 'select', id: request.id })} onDeny={() => deny([request.id])} />)}
          <div className="opa-footer"><button className="opa-primary" type="button" disabled={selected.length === 0} onClick={() => navigate({ kind: 'approve', ids: selected })}>{t('action.approveSelected', { count: number(selected.length, language) })}</button><button type="button" disabled={selected.length === 0} onClick={() => deny(selected)}>{t('action.denySelected')}</button></div>
        </>
      }
      case 'closed': return null
      default: { const exhaustive: never = view; return exhaustive }
    }
  }

  return <div className="opa-root"><style>{styles}</style>
    {(snapshot.kind === 'register' || count > 0 || run || open) && <button ref={pill} className={`opa-pill${count > lastOpenedCount.current ? ' opa-accent' : ''}`} type="button" onClick={() => {
      lastOpenedCount.current = count
      setNotice(null)
      navigate(run ? { kind: 'approve', ids: [] } : snapshot.kind === 'register' ? { kind: 'register', target: null } : { kind: 'list', selected: [] })
    }}>{run ? t('pill.progress') : snapshot.kind === 'register' ? t('pill.register') : t('pill.pending', { count: number(count, language) })}</button>}
    {open && <div className="opa-backdrop" onClick={event => { if (event.target === event.currentTarget) close() }}>
      <div ref={dialog} className="opa-dialog" role="dialog" aria-modal="true" aria-labelledby={title} tabIndex={-1} onKeyDown={trap}>
        <div className="opa-header"><h2 id={title}>{t('panel.title')}</h2><button type="button" onClick={close}>{t('action.close')}</button></div>
        <div className="opa-body">{body()}{notice && <p role="status">{notice}</p>}
          {snapshot.kind === 'active' && <div className="opa-settings"><span>{t('register.expires', { days: number(Math.max(0, Math.ceil((snapshot.session.viewUntil - now) / 86_400_000)), language) })}</span><button type="button" disabled={run?.kind === 'running'} onClick={() => navigate({ kind: 'register', target: null })}>{t('register.reregister')}</button><button type="button" disabled={run?.kind === 'running'} onClick={() => void handkey.signOut()}>{t('register.unregister')}</button></div>}
          {!run && view.kind === 'approve' && <button type="button" onClick={() => navigate({ kind: 'list', selected: [] })}>{t('action.cancel')}</button>}
        </div>
      </div>
    </div>}
  </div>
}
