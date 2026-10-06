import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import type { KeyboardEvent } from 'react'
import type { RequestId } from 'handkey-client'
import { ApproveForm } from './ApproveForm.js'
import { faultKey, number, outcomeKey } from './labels.js'
import { RequestCard } from './RequestCard.js'
import type { RootProps } from './store.js'

export function Root({ t, handkey: factory, language: languageStore, ui }: RootProps) {
  const [handkey] = useState(factory)
  const snapshot = useSyncExternalStore(handkey.subscribe, handkey.getSnapshot, handkey.getSnapshot)
  const language = useSyncExternalStore(languageStore.subscribe, languageStore.getSnapshot, languageStore.getSnapshot)
  const state = useSyncExternalStore(ui.subscribe, ui.getSnapshot, ui.getSnapshot)
  const view = state.view
  const [now, setNow] = useState(Date.now)
  const [notice, setNotice] = useState<string | null>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const title = useId()
  const open = view.kind !== 'closed'
  const run = snapshot.approval
  const navigate = (next: typeof view) => { setNotice(null); ui.navigate(next) }
  const close = () => navigate({ kind: 'closed' })

  useEffect(() => {
    if (!open) return
    dialog.current?.focus()
    setNow(Date.now())
    void handkey.refresh()
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => { window.clearInterval(timer); ui.restoreFocus() }
  }, [open, handkey, ui])
  useEffect(() => { if (open && dialog.current && !dialog.current.contains(document.activeElement)) dialog.current.focus() }, [open, view.kind, snapshot.kind, run !== null])
  useEffect(() => { setNotice(null) }, [open])

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
    })
  }
  function body() {
    if (run) return <><ApproveForm handkey={handkey} snapshot={snapshot} ids={[]} t={t} onDismiss={() => navigate({ kind: 'list', selected: [] })} />{snapshot.kind === 'register' && <p className="opa-muted">{t('settings.registerPointer')}</p>}</>
    if (snapshot.kind === 'register') return <p className="opa-muted">{t('settings.registerPointer')}</p>
    switch (view.kind) {
      case 'approve': return <ApproveForm handkey={handkey} snapshot={snapshot} ids={view.ids} t={t} onDismiss={() => navigate({ kind: 'list', selected: [] })} />
      case 'list': {
        const selected = snapshot.pending.filter(request => view.selected.includes(request.id) && request.operation.kind !== 'unrecognized').map(request => request.id)
        return <>
          {snapshot.list.kind === 'loading' && <p role="status">{t('health.updating')}</p>}
          {snapshot.list.kind === 'stale' && <div role="status"><p>{t('health.stale')} {t(faultKey(snapshot.list.fault))}</p><button type="button" onClick={() => void handkey.refresh()}>{t('action.retry')}</button></div>}
          {snapshot.unreadable > 0 && <p role="status">{t('health.unreadable', { count: number(snapshot.unreadable, language) })}</p>}
          {snapshot.pending.length === 0 && <p>{t('list.empty')}</p>}
          {snapshot.pending.map(request => <RequestCard key={request.id} request={request} t={t} language={language} now={now} selected={selected.includes(request.id)} disabled={false} onSelect={() => ui.select(request.id)} onDeny={() => deny([request.id])} />)}
          <div className="opa-footer"><button className="opa-primary" type="button" disabled={selected.length === 0} onClick={() => navigate({ kind: 'approve', ids: selected })}>{t('action.approveSelected', { count: number(selected.length, language) })}</button><button type="button" disabled={selected.length === 0} onClick={() => deny(selected)}>{t('action.denySelected')}</button></div>
        </>
      }
      case 'closed': return null
      default: { const exhaustive: never = view; return exhaustive }
    }
  }
  if (!open) return null
  return <div className="opa-root"><div className="opa-backdrop" onClick={event => { if (event.target === event.currentTarget) close() }}><div ref={dialog} className="opa-dialog" role="dialog" aria-modal="true" aria-labelledby={title} tabIndex={-1} onKeyDown={trap}>
    <div className="opa-header"><h2 id={title}>{t('panel.title')}</h2><button type="button" onClick={close}>{t('action.close')}</button></div>
    <div className="opa-body">{body()}{notice && <p role="status">{notice}</p>}{!run && snapshot.kind === 'active' && view.kind === 'approve' && <button type="button" onClick={() => navigate({ kind: 'list', selected: [] })}>{t('action.cancel')}</button>}</div>
  </div></div></div>
}
