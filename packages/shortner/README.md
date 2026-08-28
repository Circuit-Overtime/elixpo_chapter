# @elixpo/shortner

Official command-line client for [Lixrl](https://lixrl.com). Version 1.0.1 manages production short links and is designed for both people and automated agents.

```bash
npm install --global @elixpo/shortner
shortner login --open
shortner whoami
```

Create a read/write API key at [lixrl.com/profile/keys](https://lixrl.com/profile/keys). Interactive login stores the key in the operating-system keychain. CI can provide `LIXRL_API_KEY` without writing it to disk.

Use `shortner --help` for the complete command list. `lixrl` is provided as an equivalent binary name.
