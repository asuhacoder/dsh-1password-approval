import { useState } from 'react'
import type { Handkey, RequestId, Snapshot } from 'handkey-client'
import { CREDENTIAL_ATTRIBUTES, takeKey } from 'handkey-client/dom'
import { outcomeKey, stepKey } from './labels.js'
import { inputElement, validationKey } from './RegisterForm.js'
import { Headline, RequestReview } from './RequestCard.js'
import type { LocaleKey } from './locale.js'
import type { Translate } from './store.js'

export function ApproveForm({ handkey, snapshot, ids, t, language, now, onDismiss }: {
  handkey: Handkey; snapshot: Snapshot; ids: readonly RequestId[]; t: Translate; language: string; now: number; onDismiss: () => void
}) {
  const [message, setMessage] = useState<LocaleKey | null>(null)
  const [removed, setRemoved] = useState<readonly RequestId[]>([])
  const missing = snapshot.kind === 'active' ? ids.filter(id => !snapshot.pending.some(request => request.id === id && request.operation.kind !== 'unrecognized')) : []
  if (missing.some(id => !removed.includes(id))) setRemoved([...removed, ...missing.filter(id => !removed.includes(id))])
  const reviewable = ids.filter(id => !removed.includes(id) && !missing.includes(id))
  const run = snapshot.approval
  if (run) return <>
    {run.kind === 'running' && <p>{t('approve.runningHint')}</p>}
    <ol className="opa-stack" aria-live="polite">{run.items.map(item => <li className="opa-card" key={item.id}>
      {item.request ? <Headline request={item.request} t={t} /> : <code>{item.id}</code>}
      <p>{t(stepKey(item.step))}{item.step.kind === 'done' && <> · {t(outcomeKey(item.step.outcome.kind))}</>}</p>
    </li>)}</ol>
    {run.stopped && <p role="status">{t('approve.stopped', { reason: t(outcomeKey(run.stopped)) })}</p>}
    {run.kind === 'finished' && <button type="button" onClick={() => { handkey.dismissApproval(); onDismiss() }}>{t('action.dismiss')}</button>}
  </>
  if (snapshot.kind !== 'active') return <p>{t('form.notRegistered')}</p>
  return <>
    <h3>{t('approve.confirmList')}</h3>
    <ul className="opa-stack">{reviewable.map(id => { const request = snapshot.pending.find(candidate => candidate.id === id); return request ? <li className="opa-card" key={id}><RequestReview request={request} t={t} language={language} now={now} full /></li> : null })}</ul>
    {removed.map(id => <p role="status" key={id}>{t('approve.noLongerPending', { id })}</p>)}
    <p>{t('approve.autofillHint')}</p>
    <form className="opa-form" onSubmit={event => {
      event.preventDefault()
      const input = takeKey({ deviceId: inputElement(event.currentTarget, 'username'), key: inputElement(event.currentTarget, 'password') })
      if (input.kind !== 'ok') { setMessage(validationKey(input.kind)); return }
      setMessage(null)
      void handkey.approve(reviewable, input.key).then(result => {
        switch (result.kind) {
          case 'finished': break
          case 'key-spent': case 'busy': case 'empty': case 'not-registered': setMessage(validationKey(result.kind)); break
          default: { const exhaustive: never = result; return exhaustive }
        }
      })
    }}>
      <label>{t('register.deviceId')}<input type={CREDENTIAL_ATTRIBUTES.deviceId.type} name={CREDENTIAL_ATTRIBUTES.deviceId.name} autoComplete={CREDENTIAL_ATTRIBUTES.deviceId.autocomplete} readOnly defaultValue={snapshot.session.deviceId} autoCapitalize="off" autoCorrect="off" spellCheck={false} /></label>
      <label>{t('register.deviceKey')}<input type={CREDENTIAL_ATTRIBUTES.key.type} name={CREDENTIAL_ATTRIBUTES.key.name} autoComplete={CREDENTIAL_ATTRIBUTES.key.autocomplete} autoCapitalize="off" autoCorrect="off" spellCheck={false} /></label>
      {message && <p role="alert">{t(message)}</p>}
      <button type="submit" className="opa-primary" disabled={reviewable.length === 0}>{t('action.approve')}</button>
    </form>
  </>
}
