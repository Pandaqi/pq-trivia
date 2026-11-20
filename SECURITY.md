# Security

## Reporting

Open a private security advisory on GitHub, or email the maintainer through
the contact page at [thewaywardmelody.com](https://thewaywardmelody.com).

Please do not open a public issue for a live problem.

## What this library does

- Parses text into an AST. No `eval`, no `new Function`.
- Renders AST nodes. No `innerHTML` from untrusted content by default.
- Raw HTML and scripts are off. `allowScripts` runs a widget in a sandboxed
  iframe, on purpose, when the host asks.
- No backend. No accounts. No analytics. No stray network calls.
- External iframes are blocked by default and YouTube uses the nocookie host.
- Encrypted quizzes use AES-GCM. The key comes from a passphrase via PBKDF2.
  There is no recovery. That is the honest part.

## Known limits

- **Offline answers are on the machine.** Restricted mode keeps answers out of
  the view model and the DOM, but the file is still the file. A determined
  person with the source can find them.
- **Multiplayer is peer to peer.** The host owns the score. A modified client
  can lie about its own answers; a host can lie about everything. The room
  code is the only secret.
- **`file://` is limited by the browser,** not by us.
- **Third-party media.** A quiz can point at any URL. That request leaves the
  machine. The offline pack and local media do not.

## Supported versions

3.x gets fixes. 2.5.0 is frozen in `dist/v2/` and works as it did.
