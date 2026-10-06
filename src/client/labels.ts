import { remaining } from 'handkey-client'
import type { ApprovalOutcome, ApprovalStep, Caution, Fault, Instant, Operation, StopReason } from 'handkey-client'
import type { LocaleKey } from './locale.js'

export function methodKey(operation: Operation): LocaleKey {
  switch (operation.kind) {
    case 'reveal': return 'method.reveal'
    case 'otp': return 'method.otp'
    case 'exec': return 'method.exec'
    case 'proxy': return 'method.proxy'
    case 'type': return 'method.type'
    case 'clipboard': return 'method.clipboard'
    case 'write': return 'method.write'
    case 'refresh': return 'method.refresh'
    case 'unrecognized': return 'method.unrecognized'
    default: { const exhaustive: never = operation; return exhaustive }
  }
}

export function cautionKey(caution: Caution): LocaleKey {
  switch (caution) {
    case 'value-reaches-model': return 'caution.aiProvider'
    case 'output-unmasked': return 'caution.unmaskedOutput'
    case 'clipboard-persists': return 'caution.clipboardHistory'
    case 'values-not-reviewable': return 'caution.enteredValues'
    case 'names-unverified': return 'caution.namesUnverified'
    case 'long-lease': return 'caution.longLease'
    case 'multiple-uses': return 'caution.multipleUses'
    default: { const exhaustive: never = caution; return exhaustive }
  }
}

export function outcomeKey(outcome: ApprovalOutcome['kind'] | StopReason): LocaleKey {
  switch (outcome) {
    case 'executed': return 'outcome.executed'
    case 'execution-failed': return 'outcome.executionFailed'
    case 'outcome-unknown': return 'outcome.unknown'
    case 'already-decided': return 'outcome.decidedElsewhere'
    case 'key-rejected': return 'outcome.keyRejected'
    case 'session-ended': return 'outcome.sessionEnded'
    case 'auth-undetermined': return 'outcome.rejectionUnknown'
    case 'not-found': return 'outcome.notFound'
    case 'interrupted': return 'outcome.interrupted'
    case 'not-sent': return 'outcome.notSent'
    default: { const exhaustive: never = outcome; return exhaustive }
  }
}

export function stepKey(step: ApprovalStep): LocaleKey {
  switch (step.kind) {
    case 'queued': return 'outcome.queued'
    case 'approving': return 'outcome.approving'
    case 'confirming': return 'outcome.confirming'
    case 'done': return 'outcome.done'
    default: { const exhaustive: never = step; return exhaustive }
  }
}

export function faultKey(fault: Fault): LocaleKey {
  switch (fault.kind) {
    case 'network': return 'fault.unreachable'
    case 'timeout': return 'fault.timeout'
    case 'unavailable': return 'fault.unavailable'
    case 'protocol': return 'fault.unexpectedResponse'
    case 'storage': return 'fault.storageUnavailable'
    default: { const exhaustive: never = fault.kind; return exhaustive }
  }
}

export function countdown(deadline: Instant, now: number, language: string): string {
  const seconds = remaining(deadline, now)
  const number = new Intl.NumberFormat(language, { minimumIntegerDigits: 2, useGrouping: false })
  return `${number.format(Math.floor(seconds / 60))}:${number.format(seconds % 60)}`
}

export function number(value: number, language: string): string {
  return new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(value)
}

export function date(value: Instant, language: string): string {
  return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(value)
}

export function originHost(origin: string): string {
  try { return new URL(origin).host } catch { return origin }
}

export function sessionName(browser: Pick<Navigator, 'userAgent'> & { readonly userAgentData?: { readonly platform?: string; readonly brands?: readonly { readonly brand: string }[] } }): string {
  const ua = browser.userAgent
  const brands = browser.userAgentData?.brands?.map(entry => entry.brand).filter(brand => !/not.?a.?brand/i.test(brand))
  const name = brands?.[0] ?? (/Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser')
  const os = browser.userAgentData?.platform ?? (/iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'OS')
  return [...`dsh – ${name} on ${os}`].slice(0, 128).join('')
}
