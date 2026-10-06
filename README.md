# dsh-1password-approval

A DeepSeek Harness plugin for reviewing Handkey approval requests. The host registers the `handkey` agent skill. Settings > Handkey contains browser registration and session management. A conversation dock row opens an approval dialog that talks directly to the broker.

## Status

Registration, request review, denial, sequential approval progress, and session-limit recovery are implemented. Automated tests use the real `handkey-client` actor with scripted HTTP responses and SSE streams. The flows were also run by hand in dsh 0.2.0-rc.2 on desktop Chromium against a `--dev` broker. 1Password autofill on iOS Safari is not yet verified.

## Compatibility

The plugin targets `dsh >=0.2.0-rc.2 <0.3.0` and Node.js `^22.19.0 || >=24`.

Handkey is experimental. Session-limit recovery requires a broker with the key-authenticated session list and revoke routes ([handkey#7](https://github.com/asuhacoder/handkey/pull/7)). The broker needs a separate real 1Password CLI binary. The agent uses the Handkey binary or its `op` shim.

DSH desktop is unsupported. Outside `--dev`, the broker accepts only HTTPS origins in `--origins`, so a DSH page served over plain HTTP cannot reach a production broker. The plugin itself accepts an `http` broker URL. Only the broker's `--dev` option, which is limited to numeric loopback, makes such a broker exist.

## Register this browser

Configure a broker with `--listen` and HTTPS access. Set its `--origins` to include the exact HTTPS DSH origin. Provision a broker device separately.

Create a 1Password Login item outside the broker's service-account-accessible vaults. Its username is the device ID. Its password is the device key. Its websites include the HTTPS DSH URL.

1. Open the HTTPS DSH Web UI and select **Settings > Handkey**.
2. Enter the broker URL.
3. Autofill the device ID and device key from the 1Password Login item.
4. Enter a session name and select **Register this browser**.

If the device reaches its session limit, autofill again to **List sessions**. Select an unused session, autofill a fresh key entry, and select **Revoke session**. The settings section returns to registration with the broker URL and device ID prefilled.

## Review requests

The conversation dock row appears only for pending requests, retained approval progress, or an ended-session pointer to Settings. Its accent border marks a count increase since the dialog was last opened. The dock is conversation-scoped and is absent when no conversation is open. Settings always shows the pending count for an active browser session.

Open the dock row, or select **Review approvals** in Settings, to refresh the list. Cards show the self-declared agent, delivery method, time remaining, secret references, reason, source, lease, cautions, and operation details. Verified names show the vault, item, and field. Unverified or legacy names carry explicit warnings. Unrecognized methods can only be denied.

Cards keep their order while the dialog is open. Later requests appear at the end under **New since you opened this**. Reopening the dialog resets its order to the current broker list.

Select requests and choose **Approve selected**. Review each request's secrets, reason, source, lease, cautions, and expanded operation details before you autofill the device key. Requests that leave the pending list show a **no longer pending** notice and cannot be approved. If none remain, the approval button is disabled. The client approves sequentially and confirms each result with a GET. Progress and stop reasons remain until **Dismiss**, including when the browser session ends. An ended-session message points to **Settings > Handkey** without opening a registration form in the dialog. Closing the dialog during approval does not stop the run.

**Deny** needs no device key. Settings shows the broker URL, device ID, and session expiry. It can unregister this browser or start registration again. Registration and session-limit recovery stay inline in Settings.

## Key handling

Credential inputs are uncontrolled. Only `takeRegistration` and `takeKey` read the key input. They empty it before validation or any network call. Raw keys never enter React state, context, refs, logs, errors, snapshots, or persistence. Each submit consumes a single-use opaque key handle.

Browser persistence holds the broker URL, device ID, session ID, view token, expiry, and schema version. The view token cannot approve. It can list and read requests, deny them, read events, list the device's sessions, and end its own session. Enter approval keys only in the client, never in an agent conversation or CLI arguments.

JavaScript cannot guarantee erasure of temporary input strings or fetch buffers. All agent-provided text renders as React text, not HTML, Markdown, or request-derived links.

## Known limits

- Browser storage coordination is best effort across tabs. A race can require registration again.
- Each tab opens one SSE stream. Several tabs may exhaust HTTP/1.1 connection limits.
- Approval progress is not shared across tabs.
- The pending row is absent when no conversation is open, because every composer slot in dsh is session-scoped. Settings always shows the count.
- dsh exposes no way to open Settings from a plugin, so the ended-session row is text only.

## Agent access

The bundled `handkey` skill directs agents to request specific fields and delivery methods. It prefers a fixed-origin proxy, command environment injection, or typing into a focused field over raw disclosure. The skill tells agents to give a specific reason and agent name. The full text is in [handkey.md](<skill/handkey.md>).

The agent needs the Handkey binary and `HANDKEY_ENDPOINT`, normally a Unix socket such as `unix:///absolute/handkey.sock`. Neither the endpoint nor plugin registration grants approval by itself.

## Development

Run `pnpm install`, then `pnpm verify`. `handkey-client` is a development dependency at `file:../handkey-client` and esbuild bundles it into the client artifact. CI checks out and builds `handkey-client` beside this repository. After `handkey-client` is published to npm, replace the specifier with a version range and regenerate the lockfile.

Verification typechecks strict plugin code, exercises the real skill registry and built browser factory, runs real-actor component flows and key leak checks, and checks that the client artifact requires only `react` and `react/jsx-runtime`. `skipLibCheck` is on because the published dsh client declarations import packages that are not on npm.

## License

[MIT](<LICENSE>). Copyright Yudai Kobayashi. This project is unaffiliated with 1Password.
