import { useState } from 'react'
import type { Handkey, SessionId, SessionSummary } from 'handkey-client'
import { CREDENTIAL_ATTRIBUTES, takeKey } from 'handkey-client/dom'
import { date, faultKey } from './labels.js'
import { inputElement, validationKey } from './RegisterForm.js'
import type { LocaleKey } from './locale.js'
import type { Translate } from './store.js'

export type LimitState = { readonly brokerUrl: string; readonly deviceId: string } & (
  { readonly stage: 'list' } |
  { readonly stage: 'sessions'; readonly sessions: readonly SessionSummary[] } |
  { readonly stage: 'revoke'; readonly sessions: readonly SessionSummary[]; readonly sessionId: SessionId }
)

export function SessionLimit({ handkey, state, t, language, onState, onRegister }: {
  handkey: Handkey; state: LimitState; t: Translate; language: string
  onState: (state: LimitState) => void; onRegister: () => void
}) {
  const [message, setMessage] = useState<LocaleKey | null>(null)
  const [working, setWorking] = useState(false)
  return <>
    <p>{t('sessionLimit.explanation')}</p>
    {state.stage !== 'sessions' && <form className="opa-form" key={state.stage === 'revoke' ? state.sessionId : 'list'} onSubmit={event => {
      event.preventDefault()
      const input = takeKey({ deviceId: inputElement(event.currentTarget, 'username'), key: inputElement(event.currentTarget, 'password') })
      if (input.kind !== 'ok') { setMessage(validationKey(input.kind)); return }
      setMessage(null); setWorking(true)
      if (state.stage === 'revoke') {
        void handkey.revokeSessionWithKey({ brokerUrl: state.brokerUrl, deviceId: state.deviceId, sessionId: state.sessionId, key: input.key }).then(result => {
          setWorking(false)
          switch (result.kind) {
            case 'ok': onRegister(); break
            case 'failed': setMessage(faultKey(result.fault)); break
            case 'key-spent': case 'rejected': case 'not-found': case 'invalid-broker-url': case 'invalid-device-id': setMessage(validationKey(result.kind)); break
            default: { const exhaustive: never = result; return exhaustive }
          }
        })
      } else {
        void handkey.listSessionsWithKey({ brokerUrl: state.brokerUrl, deviceId: state.deviceId, key: input.key }).then(result => {
          setWorking(false)
          switch (result.kind) {
            case 'ok': onState({ brokerUrl: state.brokerUrl, deviceId: state.deviceId, stage: 'sessions', sessions: result.value }); break
            case 'failed': setMessage(faultKey(result.fault)); break
            case 'key-spent': case 'rejected': case 'invalid-broker-url': case 'invalid-device-id': setMessage(validationKey(result.kind)); break
            default: { const exhaustive: never = result; return exhaustive }
          }
        })
      }
    }}>
      {state.stage === 'revoke' && <p>{t('sessionLimit.autofillAgain')}</p>}
      <label>{t('register.deviceId')}<input type={CREDENTIAL_ATTRIBUTES.deviceId.type} name={CREDENTIAL_ATTRIBUTES.deviceId.name} autoComplete={CREDENTIAL_ATTRIBUTES.deviceId.autocomplete} readOnly defaultValue={state.deviceId} autoCapitalize="off" autoCorrect="off" spellCheck={false} /></label>
      <label>{t('register.deviceKey')}<input type={CREDENTIAL_ATTRIBUTES.key.type} name={CREDENTIAL_ATTRIBUTES.key.name} autoComplete={CREDENTIAL_ATTRIBUTES.key.autocomplete} autoCapitalize="off" autoCorrect="off" spellCheck={false} /></label>
      {message && <p role="alert">{t(message)}</p>}
      <button className="opa-primary" type="submit" disabled={working}>{t(working ? 'form.working' : state.stage === 'revoke' ? 'sessionLimit.revoke' : 'sessionLimit.list')}</button>
    </form>}
    {state.stage !== 'list' && <ul className="opa-stack">
      {state.sessions.length === 0 && <li>{t('sessionLimit.empty')}</li>}
      {state.sessions.map(session => <li className="opa-card" key={session.sessionId}>
        <strong>{session.name}</strong>
        <p>{t('sessionLimit.created', { date: date(session.createdAt, language) })}</p>
        <p>{t('sessionLimit.expires', { date: date(session.viewUntil, language) })}</p>
        <button type="button" disabled={working} onClick={() => { setMessage(null); onState({ brokerUrl: state.brokerUrl, deviceId: state.deviceId, stage: 'revoke', sessions: state.sessions, sessionId: session.sessionId }) }}>{t('sessionLimit.revoke')}</button>
      </li>)}
    </ul>}
    <button type="button" onClick={onRegister}>{t('register.reregister')}</button>
  </>
}
