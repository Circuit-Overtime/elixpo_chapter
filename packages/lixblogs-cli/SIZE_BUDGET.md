# CLI distribution size budget

The release gate limits the files inside `@elixpo/lixblogs-cli` to **100 KiB
unpacked**. Runtime dependencies installed separately by npm are not counted in
that budget.

Registry metadata sampled on 2026-08-29:

| Package | Unpacked | Files | Runtime dependencies | Functional scope |
| --- | ---: | ---: | ---: | --- |
| `@tryghost/ghst@0.17.0` | 1,515,748 B | 5 | 19 | Broad publishing, members, newsletters, migrations, stats, and MCP |
| `@sinedied/devto-cli@1.4.0` | 60,170 B | 33 | 16 | Initialize, create, push, and inspect article stats |
| `@elixpo/lixblogs-cli@1.3.3` | 167,982 B | 50 | 1 | Auth, profiles, blog lifecycle, organizations, collaboration, analytics, and skills |
| Optimized LixBlogs payload | 88,333 B | 13 | 1 | Same LixBlogs command and skill surface |

Sources: [Ghost CLI](https://github.com/TryGhost/ghst),
[Dev.to CLI](https://www.npmjs.com/package/@sinedied/devto-cli), and npm registry
`dist` metadata. The optimized value is measured from the generated executable,
README, package metadata, and five bundled skills; GitHub Actions measures the
actual tarball contents again before release.

## Rules

- Bundle and minify first-party modules into `dist/lixblogs.mjs`.
- Keep `@napi-rs/keyring` external so npm selects the correct native binary.
- Publish user-facing essentials only; keep contributor and contract documents
  in the repository and link to them from the packaged README.
- Reject a release when its actual unpacked file total exceeds 102,400 bytes.
- Do not remove commands, skills, validation, or security behavior to meet the
  budget.
