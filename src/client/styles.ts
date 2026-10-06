export const styles = `
.opa-root { font: 14px/22px var(--dsw-font-family); color: var(--dsw-alias-label-primary); pointer-events: none; }
.opa-root * { box-sizing: border-box; overflow-wrap: anywhere; }
.opa-root button, .opa-root input, .opa-root summary, .opa-root label { pointer-events: auto; }
.opa-root button { min-height: 40px; padding: 8px 12px; font: inherit; cursor: pointer; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-2); color: inherit; }
.opa-root button:hover:not(:disabled), .opa-root summary:hover { background: var(--dsw-alias-interactive-bg-hover); }
.opa-root button:disabled { opacity: .4; cursor: not-allowed; }
.opa-root :focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 4px; }
.opa-root .opa-primary { background: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-foreground); }
.opa-root .opa-primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover); }
.opa-section { pointer-events: auto; display: flex; flex-direction: column; gap: 12px; max-width: 720px; }
.opa-section h2 { margin: 0; font-size: 16px; font-weight: 500; line-height: 24px; }
.opa-section > p { margin: 0; }
.opa-session-rows > div { padding: 16px 0; border-bottom: 1px solid var(--dsw-alias-border-l2); }
.opa-dock { width: 100%; padding: 4px 12px; font-size: 13px; line-height: 20px; }
.opa-dock > p { margin: 0; padding: 8px 0; }
.opa-root .opa-dock-button { width: 100%; text-align: left; padding: 8px 12px; border-radius: var(--dsw-radius-md); }
.opa-root .opa-accent { border: 2px solid var(--dsw-alias-state-business-primary); }
.opa-backdrop { pointer-events: auto; position: fixed; inset: 0; z-index: 1000; background: var(--dsw-alias-bg-mask-1); display: flex; align-items: center; justify-content: center; padding: 24px; }
.opa-dialog { pointer-events: auto; width: min(720px, 100%); max-height: 100%; display: flex; flex-direction: column; border-radius: var(--dsw-radius-panel); background: var(--dsw-alias-bg-layer-2); box-shadow: var(--dsw-elevation-prominent); overflow: hidden; }
.opa-header, .opa-footer, .opa-actions, .opa-settings { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.opa-header { padding: 16px 24px 12px; border-bottom: 1px solid var(--dsw-alias-border-l2); }
.opa-header h2 { margin: 0; font-size: 16px; line-height: 24px; font-weight: 500; }
.opa-body { padding: 16px 24px 24px; overflow-y: auto; min-height: 0; }
.opa-footer, .opa-settings { padding-top: 16px; margin-top: 16px; border-top: 1px solid var(--dsw-alias-border-l2); }
.opa-form, .opa-form label { display: flex; flex-direction: column; gap: 8px; }
.opa-form { gap: 16px; }
.opa-form input { width: 100%; min-height: 40px; padding: 8px 12px; font: inherit; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); color: inherit; }
.opa-form input:focus { border-color: var(--dsw-alias-state-business-primary); }
.opa-stack, .opa-secrets, .opa-chips { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.opa-card { border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md); padding: 16px; margin-bottom: 12px; }
.opa-card p { margin: 8px 0; white-space: pre-wrap; }
.opa-headline { display: flex; justify-content: space-between; gap: 8px; font-weight: 500; }
.opa-headline time { flex-shrink: 0; font-variant-numeric: tabular-nums; }
.opa-secrets { margin: 12px 0; }
.opa-muted, .opa-root small { color: var(--dsw-alias-label-secondary); }
.opa-secrets small { display: block; }
.opa-dialog:focus-visible { outline: none; }
.opa-warning { border: 1px solid var(--dsw-alias-state-warn-primary); background: var(--dsw-alias-bg-layer-1); padding: 8px; border-radius: var(--dsw-radius-md); }
.opa-chips { flex-direction: row; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
.opa-clamp { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.opa-select { display: flex; align-items: center; gap: 8px; min-height: 40px; }
.opa-select input { width: 24px; height: 24px; accent-color: var(--dsw-alias-state-business-primary); }
.opa-root summary { min-height: 40px; padding: 8px 0; cursor: pointer; }
.opa-root dl { margin: 8px 0; }
.opa-root dt { color: var(--dsw-alias-label-secondary); margin-top: 12px; }
.opa-root dd { margin: 4px 0 0; white-space: pre-wrap; }
.opa-root code { white-space: pre-wrap; }
.opa-argv { display: flex; flex-wrap: wrap; gap: 8px; }
.opa-argv code { padding: 4px 8px; background: var(--dsw-alias-bg-layer-1); border-radius: var(--dsw-radius-md); }
@media (max-width: 600px) { .opa-backdrop { padding: 0; align-items: flex-end; } .opa-dialog { width: 100%; max-height: 100dvh; border-radius: var(--dsw-radius-panel) var(--dsw-radius-panel) 0 0; } .opa-header { padding: 12px 16px; } .opa-body { padding: 16px; } .opa-headline { flex-wrap: wrap; } }
@media (prefers-reduced-motion: reduce) { .opa-root * { animation: none; transition: none; scroll-behavior: auto; } }
`
