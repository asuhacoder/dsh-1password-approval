import { useEffect, useState, useSyncExternalStore } from 'react'
import type { SettingsSectionOwnerProps } from '@deepseek-ai/dsh-client-ui-settings/client'
import { RegisterForm } from './RegisterForm.js'
import { SessionLimit } from './SessionLimit.js'
import { number } from './labels.js'
import type { RootProps } from './store.js'

export function Settings({ t, handkey: factory, language: languageStore, ui, close }: RootProps & SettingsSectionOwnerProps) {
  const [handkey] = useState(factory)
  const snapshot = useSyncExternalStore(handkey.subscribe, handkey.getSnapshot, handkey.getSnapshot)
  const state = useSyncExternalStore(ui.subscribe, ui.getSnapshot, ui.getSnapshot)
  const language = useSyncExternalStore(languageStore.subscribe, languageStore.getSnapshot, languageStore.getSnapshot)
  useEffect(() => { void handkey.refresh() }, [handkey])
  const registration = state.registration
  const run = snapshot.approval
  function body() {
    switch (registration.kind) {
      case 'sessionLimit': return <SessionLimit handkey={handkey} state={registration.state} t={t} language={language}
        onState={state => ui.registration({ kind: 'sessionLimit', state })}
        onRegister={() => ui.registration({ kind: 'register', target: { brokerUrl: registration.state.brokerUrl, deviceId: registration.state.deviceId } })} />
      case 'register': case 'session': {
        if (snapshot.kind === 'register' || registration.kind === 'register') return <RegisterForm handkey={handkey} snapshot={snapshot}
          target={registration.kind === 'register' ? registration.target : null} t={t}
          onRegistered={() => ui.registration({ kind: 'session' })}
          onLimit={target => ui.registration({ kind: 'sessionLimit', state: { ...target, stage: 'list' } })} />
        return <>
          <dl className="opa-session-rows">
            <div><dt>{t('register.brokerUrl')}</dt><dd>{snapshot.session.brokerUrl}</dd></div>
            <div><dt>{t('register.deviceId')}</dt><dd>{snapshot.session.deviceId}</dd></div>
          </dl>
          <p>{t('register.expires', { days: number(Math.max(0, Math.ceil((snapshot.session.viewUntil - Date.now()) / 86_400_000)), language) })}</p>
          <div className="opa-actions">
            <span>{t('pill.pending', { count: number(snapshot.pending.length, language) })}</span>
            <button type="button" onClick={event => { const opener = event.currentTarget; close(); ui.open(snapshot.pending.length, run !== null, opener) }}>{t(run ? 'pill.progress' : 'settings.openApprovals')}</button>
          </div>
          <div className="opa-settings">
            <button type="button" disabled={run?.kind === 'running'} onClick={() => ui.registration({ kind: 'register', target: null })}>{t('register.reregister')}</button>
            <button type="button" disabled={run?.kind === 'running'} onClick={() => void handkey.signOut()}>{t('register.unregister')}</button>
          </div>
        </>
      }
      default: { const exhaustive: never = registration; return exhaustive }
    }
  }
  return <section className="opa-root opa-section">
    <h2>{t('settings.title')}</h2>
    <p className="opa-muted">{t('settings.description')}</p>
    {body()}
    {snapshot.kind === 'register' && run && <button type="button" onClick={event => { close(); ui.open(0, true, event.currentTarget) }}>{t('pill.progress')}</button>}
    {registration.kind === 'register' && snapshot.kind === 'active' && <button type="button" onClick={() => ui.registration({ kind: 'session' })}>{t('action.cancel')}</button>}
  </section>
}
