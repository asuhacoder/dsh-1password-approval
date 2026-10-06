import { useState } from 'react'
import type { Binding, Operation, Request, SecretRef } from 'handkey-client'
import { cautionKey, countdown, methodKey, number, originHost } from './labels.js'
import type { Translate } from './store.js'

export function Headline({ request, t }: { request: Request; t: Translate }) {
  return <span>{request.agent ?? t('card.unknownAgent')} <small>({t('card.agent')})</small> · {t(methodKey(request.operation))}</span>
}

function Secret({ secret, t }: { secret: SecretRef; t: Translate }) {
  const ids = `${secret.vaultId} › ${secret.itemId} › ${secret.fieldId}`
  switch (secret.name.kind) {
    case 'verified': return <><span>{secret.name.vault} › {secret.name.item} › {secret.name.field}</span>{secret.name.origins.length > 0 && <small className="opa-muted">{secret.name.origins.map(originHost).join(' · ')}</small>}</>
    case 'unverified': return <><code>{ids}</code><div className="opa-warning">{t('card.nameUnverified')}{Object.values(secret.name.partial).some(Boolean) && <p>{t('card.partialNames', { names: [secret.name.partial.vault, secret.name.partial.item, secret.name.partial.field].filter(Boolean).join(' › ') })}</p>}</div></>
    case 'legacy': return <><code>{ids}</code><p className="opa-warning">{t('card.legacyRequest')}</p></>
    default: { const exhaustive: never = secret.name; return exhaustive }
  }
}

function Command({ command, directory, env, t }: { command: readonly string[]; directory: string; env: readonly Binding[]; t: Translate }) {
  return <>
    <dt>{t('card.command')}</dt><dd className="opa-argv">{command.map((arg, index) => <code key={index}>{arg}</code>)}</dd>
    <dt>{t('card.directory')}</dt><dd>{directory}</dd>
    <dt>{t('card.environment')}</dt><dd><ul>{env.map(binding => <li key={binding.name}><code>{binding.name}</code> → {binding.ref ? <Secret secret={binding.ref} t={t} /> : t('card.unbound')}</li>)}</ul></dd>
  </>
}

function Details({ operation, t }: { operation: Operation; t: Translate }) {
  switch (operation.kind) {
    case 'reveal': return <dl><dt>{t('card.outputFormat')}</dt><dd>{operation.outputFormat ?? '—'}</dd></dl>
    case 'exec': return <dl><Command command={operation.command} directory={operation.directory} env={operation.env} t={t} /></dl>
    case 'proxy': return <dl><dt>{t('card.origin')}</dt><dd>{operation.origin}</dd><dt>{t('card.header')}</dt><dd>{operation.header}</dd><dt>{t('card.prefix')}</dt><dd>{operation.prefix}</dd><Command command={operation.command} directory={operation.directory} env={operation.env} t={t} /></dl>
    case 'type': return <dl><dt>{t('card.target')}</dt><dd>{operation.target.kind === 'window' ? <>{operation.target.app} · {operation.target.title} <small>PID {operation.target.pid}</small></> : operation.target.raw}</dd></dl>
    case 'write': return <dl><dt>{t('card.vault')}</dt><dd>{operation.vaultName && <>{operation.vaultName} · </>}{operation.vaultId}</dd><dt>{t('card.title')}</dt><dd>{operation.title}</dd><dt>{t('card.category')}</dt><dd>{operation.category}</dd><dt>{t('card.fields')}</dt><dd><ul>{operation.fields.map((field, index) => <li key={index}>{field.label} · {field.type} <code>{field.id}</code></li>)}</ul></dd><dt>{t('card.passwordRecipe')}</dt><dd>{operation.passwordRecipe ?? '—'}</dd></dl>
    case 'refresh': return <p>{t('card.refresh')}</p>
    case 'unrecognized': return <dl><dt>{t('card.rawMethod')}</dt><dd>{operation.raw}</dd></dl>
    case 'otp': case 'clipboard': return <p>{t(methodKey(operation))}</p>
    default: { const exhaustive: never = operation; return exhaustive }
  }
}

export function RequestCard({ request, t, language, now, selected, disabled, onSelect, onDeny }: {
  request: Request; t: Translate; language: string; now: number; selected: boolean; disabled: boolean
  onSelect: () => void; onDeny: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const long = request.reason.length > 180 || request.reason.includes('\n')
  return <article className="opa-card">
    <div className="opa-headline"><Headline request={request} t={t} /><time>{countdown(request.deadline, now, language)}</time></div>
    <ul className="opa-secrets">{request.secrets.map(secret => <li key={secret.key}><Secret secret={secret} t={t} /></li>)}</ul>
    <strong>{t('card.reason')}</strong><p className={expanded || !long ? '' : 'opa-clamp'}>{request.reason}</p>
    {long && <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{t(expanded ? 'card.collapse' : 'card.expand')}</button>}
    <p><span className="opa-muted">{t('card.source')} · </span>{request.source || t('card.localSocket')}</p>
    <p>{request.lease.kind === 'single-use' ? t('lease.singleUse') : t('lease.window', { minutes: number(request.lease.seconds / 60, language), uses: number(request.lease.maxUses, language) })}</p>
    <ul className="opa-chips">{request.cautions.map(caution => <li className="opa-warning" key={caution}>{t(cautionKey(caution))}</li>)}</ul>
    <details><summary>{t('card.details')}</summary><Details operation={request.operation} t={t} /></details>
    <div className="opa-actions">{request.operation.kind !== 'unrecognized' && <label className="opa-select"><input type="checkbox" aria-label={`${t('action.select')} ${request.id}`} checked={selected} disabled={disabled} onChange={onSelect} />{t('action.select')}</label>}<button type="button" disabled={disabled} onClick={onDeny}>{t('action.deny')}</button></div>
  </article>
}
