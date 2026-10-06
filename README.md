# dsh-1password-approval

A DeepSeek Harness plugin for reviewing Handkey approval requests. The host registers the `handkey` agent skill. One browser overlay contains a pending-request pill and a review dialog that talks directly to the broker.

## Status

Registration, request review, denial, sequential approval progress, and session-limit recovery are implemented. Automated tests use the real `handkey-client` actor with scripted HTTP responses and SSE streams. Live iOS Safari autofill is not yet verified.

## Compatibility

The plugin targets `dsh >=0.2.0-rc.2 <0.3.0` and Node.js `^22.19.0 || >=24`.

Handkey is experimental. Session-limit recovery requires a broker with the key-authenticated session list and revoke routes, available on Handkey main after PR #7. The broker needs a separate real 1Password CLI binary. The agent uses the Handkey binary or its `op` shim.

DSH desktop is unsupported. A DSH page at `http://127.0.0.1` is unsupported. Plain HTTP is limited to numeric-loopback broker development with Handkey's `--dev` option.

## Register this browser

Configure a broker with `--listen` and HTTPS access. Set its `--origins` to include the exact HTTPS DSH origin. Provision a broker device separately.

Create a 1Password Login item outside the broker's service-account-accessible vaults. Its username is the device ID. Its password is the device key. Its websites include the HTTPS DSH URL.

1. Open the HTTPS DSH Web UI and select **Register handkey**.
2. Enter the broker URL.
3. Autofill the device ID and device key from the 1Password Login item.
4. Enter a session name and select **Register this browser**.

If the device reaches its session limit, autofill again to **List sessions**. Select an unused session, autofill a fresh key entry, and select **Revoke session**. The dialog returns to registration with the broker URL and device ID prefilled.

## Review requests

The pill shows the pending count. Its accent border marks a count increase since the panel was last opened. It makes no sound and sends no notifications.

Open the pill to refresh the list. Cards show the self-declared agent, delivery method, time remaining, secret references, reason, source, lease, cautions, and operation details. Verified names show the vault, item, and field. Unverified or legacy names carry explicit warnings. Unrecognized methods can only be denied.

Select requests and choose **Approve selected**. Review the selected headlines, then autofill the device key. The client approves sequentially and confirms each result with a GET. Progress and stop reasons remain until **Dismiss**. Closing the panel during approval hides the dialog but does not stop the run.

**Deny** needs no device key. The settings strip shows session expiry and can unregister this browser or start registration again. Expired or rejected sessions return to registration.

## Key handling

Credential inputs are uncontrolled. Only `takeRegistration` and `takeKey` read the key input. They empty it before validation or any network call. Raw keys never enter React state, context, refs, logs, errors, snapshots, or persistence. Each submit consumes a single-use opaque key handle.

Browser persistence holds the broker URL, device ID, session ID, view token, expiry, and schema version. The view token grants only list, read, and deny access. Enter approval keys only in the client, never in an agent conversation or CLI arguments.

JavaScript cannot guarantee erasure of temporary input strings or fetch buffers. All agent-provided text renders as React text, not HTML, Markdown, or request-derived links.

## Known limits

- Browser storage coordination is best effort across tabs. A race can require registration again.
- Each tab opens one SSE stream. Several tabs may exhaust HTTP/1.1 connection limits.
- Approval progress is not shared across tabs.
- The pill occupies a screen corner because `shell.overlay` is the only always-rendered additive slot.
- Live iOS Safari and 1Password autofill still need device testing. Automated DOM tests cannot establish password-manager behavior.

## Agent access

The bundled `handkey` skill directs agents to request specific fields and delivery methods. It prefers a fixed-origin proxy, command environment injection, or typing into a focused field over raw disclosure. Every approval request has a specific reason and agent name. Requests retain private receipt files for status, reuse, and cancellation.

`HANDKEY_ENDPOINT` normally names a Unix socket such as `unix:///absolute/handkey.sock`. The CLI also accepts an HTTPS broker origin and the `--endpoint` alternative. Neither the endpoint nor plugin registration grants approval by itself.

Handkey's `run` masks exact fetched values unless `--no-masking` is approved. Masking does not prevent a command from transforming or splitting a secret. Receipt files are bearer capabilities and must not enter logs or conversations.

## Development

Run `pnpm install`, then `pnpm verify`. `handkey-client` is a development dependency at `file:../handkey-client` and esbuild bundles it into the client artifact. CI needs `handkey-client` published to npm first, then this specifier becomes a version range and the lockfile must be regenerated.

Verification typechecks strict plugin code, exercises the real skill registry and built browser factory, runs real-actor component flows and key leak checks, and checks that the client artifact requires only `react` and `react/jsx-runtime`. Library declaration checking is skipped because the published dsh client declarations reference undeclared development-only packages.

No plugin installation, profile changes, or publication was performed during development.

## License

[MIT](<LICENSE>). Copyright Yudai Kobayashi. This project is unaffiliated with 1Password.
