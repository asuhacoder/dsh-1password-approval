# dsh-1password-approval

A DeepSeek Harness plugin for Handkey approval requests. The host registers the `handkey` agent skill. The browser client currently renders a translated registration pill. The next step adds a panel that talks directly to the broker through `handkey-client`.

## Status

This commit is a scaffold placeholder only. The approval UI lands in the next commit. The registration instructions below describe the intended UI, not a working feature in this commit.

## Compatibility

The plugin targets `dsh >=0.2.0-rc.2 <0.3.0` and Node.js `^22.19.0 || >=24`.

Handkey is experimental. The CLI contract follows the `key-session-admin` API snapshot, not a released minimum version. Its broker needs a separate real 1Password CLI binary. The agent uses the Handkey binary or its `op` shim.

DSH desktop is unsupported. A DSH page at `http://127.0.0.1` is unsupported. Plain HTTP is limited to numeric-loopback broker development with Handkey's `--dev` option.

## Installation commands

The intended plugin installation command is:

```sh
dsh plugin add dsh-1password-approval
```

This command is documentation only. It has not been executed as part of this scaffold. Registration does not make the future approval UI available in this commit.

## Intended registration

The future approval UI requires a broker with `--listen` and HTTPS access. Configure the broker's `--origins` with the exact HTTPS DSH origin. Provision a broker device separately before registering this browser.

Create a 1Password Login item outside the broker's service-account-accessible vaults. Its username is the device ID. Its password is the device key. Its websites include the HTTPS DSH URL.

After the approval UI is available, register this browser with these steps:

1. Open the HTTPS DSH Web UI and select **Register handkey**.
2. Enter the broker URL.
3. Autofill the device ID and device key from the 1Password Login item.
4. Enter a session name and select **Register this browser**.

The intended client opens a broker session and shows pending approval requests. The device key is never stored. localStorage holds the broker URL, device ID, session ID, view token, and expiry. These storage rules are not implemented in the placeholder. Enter approval keys only in the client, never in an agent conversation or CLI arguments.

## Agent access

The bundled `handkey` skill directs agents to request specific fields and delivery methods. It prefers a fixed-origin proxy, command environment injection, or typing into a focused field over raw disclosure. Every approval request has a specific reason and agent name. Requests retain private receipt files for status, reuse, and cancellation.

`HANDKEY_ENDPOINT` normally names a Unix socket such as `unix:///absolute/handkey.sock`. The CLI also accepts an HTTPS broker origin and the `--endpoint` alternative. Neither the endpoint nor plugin registration grants approval by itself.

Handkey's `run` masks exact fetched values unless `--no-masking` is approved. Masking does not prevent a command from transforming or splitting a secret. Receipt files are bearer capabilities and must not enter logs or conversations.

## Development

Run `pnpm install`, then `pnpm verify`. The checks exercise the real skill registry and built browser factory. Library declaration checking is skipped because the published dsh client declarations reference undeclared development-only packages. Plugin code remains strict.

## License

[MIT](<LICENSE>). Copyright Yudai Kobayashi. This project is unaffiliated with 1Password.
