import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'

export function ApprovalPill({ t }: PropsLocale<'onepassword-approval'>) {
  return (
    <button type="button" style={{
      position: 'fixed',
      right: 16,
      bottom: 16,
      pointerEvents: 'auto',
      background: 'var(--dsw-alias-bg-layer-2)',
      color: 'var(--dsw-alias-label-primary)',
      border: '1px solid var(--dsw-alias-border-l2)',
      borderRadius: 'var(--dsw-radius-md)',
      fontFamily: 'var(--dsw-font-family)',
      fontSize: 13,
      lineHeight: '20px',
      padding: '8px 12px',
    }}>
      {t('pill.register')}
    </button>
  )
}
