# LICENSES — Directory layout

This directory holds the canonical license texts and exception clauses
that apply to OreoOS. The top-level [`LICENSE`](../LICENSE) file is a short
pointer; the real text lives here. Structure mirrors the Linux kernel's
`LICENSES/` tree.

## Subdirectories

```
preferred/    Licenses that contributions to OreoOS should use.
              New source files default to MIT.

exceptions/   Project-specific clauses that modify or qualify a
              preferred license. Reference these via `WITH` in the
              SPDX-License-Identifier line of affected files.
```

## Index

| Path                                  | SPDX ID                  | Used for                                          |
|---------------------------------------|--------------------------|---------------------------------------------------|
| `preferred/MIT`                       | `MIT`                    | All source code in this repository.               |
| `preferred/Apache-2.0`                | `Apache-2.0`             | Reference copy — covers upstream ESP-IDF.         |
| `exceptions/Oreo-trademarks`          | `Oreo-trademarks`        | Reserves project names and the panda mascot.     |

The Apache-2.0 file is included as a reference because firmware images
distributed from this repository contain ESP-IDF binary components, and
downstream distributors must retain that license. See
[`notices/notice-board`](notices/notice-board) for the full upstream
credit list.

## Contributions

By submitting a pull request to this repository, you agree that your
contribution is licensed inbound under the MIT License and that you have
the right to submit it (i.e. it is your original work, or you have
permission from the rights holder). The
[Developer Certificate of Origin](https://developercertificate.org)
applies to every commit. We do not require a CLA.

For trademark or naming questions, contact **hello@elixpo.com**.

## SPDX tagging

Every new source file in this repository should start with an SPDX
identifier:

```python
# SPDX-License-Identifier: MIT WITH Oreo-trademarks
```

The `WITH Oreo-trademarks` clause is project-internal. External SPDX
tooling will treat the file as plain MIT — the exception only governs
the use of project names and branding, not the rights granted to the
code itself.
