import { useState } from 'react'
import type { Handkey, Snapshot } from 'handkey-client'
import { CREDENTIAL_ATTRIBUTES, takeRegistration } from 'handkey-client/dom'
import type { LocaleKey } from './locale.js'
import { faultKey, sessionName } from './labels.js'
import type { Translate } from './store.js'

export function inputElement(form: HTMLFormElement, name: string): HTMLInputElement {
  const element = form.elements.namedItem(name)
  if (!(element instanceof HTMLInputElement)) throw new Error('Missing credential control')
  return element
}

export function validationKey(kind: 'empty-key' | 'invalid-key' | 'invalid-broker-url' | 'invalid-device-id' | 'invalid-name' | 'key-spent' | 'busy' | 'not-registered' | 'empty' | 'rejected' | 'not-found'): LocaleKey {
  switch (kind) {
    case 'empty-key': return 'form.emptyKey'
    case 'invalid-key': return 'form.invalidKey'
    case 'invalid-broker-url': return 'form.brokerOriginRequired'
    case 'invalid-device-id': return 'form.invalidDevice'
    case 'invalid-name': return 'form.invalidName'
    case 'key-spent': return 'form.keySpent'
    case 'busy': return 'form.busy'
    case 'not-registered': return 'form.notRegistered'
    case 'empty': return 'form.empty'
    case 'rejected': return 'register.mismatch'
    case 'not-found': return 'outcome.notFound'
    default: { const exhaustive: never = kind; return exhaustive }
  }
}

export function RegisterForm({ handkey, snapshot, target, t, onRegistered, onLimit }: {
  handkey: Handkey; snapshot: Snapshot; target: { brokerUrl: string; deviceId: string } | null; t: Translate
  onRegistered: () => void; onLimit: (target: { brokerUrl: string; deviceId: string }) => void
}) {
  const [message, setMessage] = useState<LocaleKey | null>(null)
  const [working, setWorking] = useState(false)
  const remembered = target ?? (snapshot.kind === 'register' ? snapshot.remembered : snapshot.session)
  const reason = snapshot.kind === 'register' ? snapshot.reason : null
  return <>
    {reason === 'expired' && <p role="status">{t('register.expired')}</p>}
    {reason === 'rejected' && <p role="status">{t('register.rejected')}</p>}
    {reason === 'invalid-saved-session' && <p role="status">{t('register.invalidSaved')}</p>}
    <p>{t('register.help')}</p>
    <form className="opa-form" noValidate onSubmit={event => {
      event.preventDefault()
      const form = event.currentTarget
      const input = takeRegistration({ brokerUrl: inputElement(form, 'broker'), deviceId: inputElement(form, 'username'), key: inputElement(form, 'password'), name: inputElement(form, 'sessionName') })
      if (input.kind !== 'ok') { setMessage(validationKey(input.kind)); return }
      const target = { brokerUrl: input.value.brokerUrl, deviceId: input.value.deviceId }
      setWorking(true); setMessage(null)
      void handkey.register(input.value).then(result => {
        setWorking(false)
        switch (result.kind) {
          case 'registered':
            if (result.persistence === 'failed') setMessage('fault.storageUnavailable')
            else onRegistered()
            break
          case 'session-limit': onLimit(target); break
          case 'failed': setMessage(faultKey(result.fault)); break
          case 'rejected': case 'key-spent': case 'busy': case 'invalid-broker-url': case 'invalid-device-id': case 'invalid-name': setMessage(validationKey(result.kind)); break
          default: { const exhaustive: never = result; return exhaustive }
        }
      })
    }}>
      <label>{t('register.brokerUrl')}<input name="broker" type="url" defaultValue={remembered?.brokerUrl ?? ''} autoCapitalize="off" autoCorrect="off" spellCheck={false} /></label>
      <label>{t('register.deviceId')}<input type={CREDENTIAL_ATTRIBUTES.deviceId.type} name={CREDENTIAL_ATTRIBUTES.deviceId.name} autoComplete={CREDENTIAL_ATTRIBUTES.deviceId.autocomplete} defaultValue={remembered?.deviceId ?? ''} autoCapitalize="off" autoCorrect="off" spellCheck={false} /></label>
      <label>{t('register.deviceKey')}<input type={CREDENTIAL_ATTRIBUTES.key.type} name={CREDENTIAL_ATTRIBUTES.key.name} autoComplete={CREDENTIAL_ATTRIBUTES.key.autocomplete} autoCapitalize="off" autoCorrect="off" spellCheck={false} /></label>
      <label>{t('register.sessionName')}<input name="sessionName" defaultValue={sessionName(navigator)} /></label>
      {message && <p role="alert">{t(message)}</p>}
      <button className="opa-primary" type="submit" disabled={working}>{t(working ? 'form.working' : 'register.submit')}</button>
    </form>
  </>
}
