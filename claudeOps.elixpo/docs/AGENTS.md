# Agent Reference

All agents live in `~/.claude/agents/` and are available globally across all projects.

## How Agents Work

- Claude **auto-delegates** to agents based on the `description` field
- You can also invoke explicitly: "use the breaker agent on this code"
- Agents run in **isolated context** — they don't see your conversation history
- Results return as a summary to your main conversation

## Agent Catalog

### breaker
| | |
|---|---|
| **Model** | Opus |
| **Effort** | High |
| **Tools** | Read, Grep, Glob, Bash (read-only) |
| **Use when** | After any significant code change |

Tries to BREAK your code. Never praises or validates. Every issue includes a concrete exploit scenario with exact inputs that trigger it.

### red-team
| | |
|---|---|
| **Model** | Opus |
| **Effort** | Max |
| **Tools** | Read, Grep, Glob, Bash (read-only) |
| **Use when** | Auth, billing, API, infra, or security-sensitive code |

You provide: the code + what security measures you added + what you assume is handled upstream. The red team specifically attacks YOUR STATED ASSUMPTIONS.

### architect
| | |
|---|---|
| **Model** | Opus |
| **Effort** | Max |
| **Tools** | Read, Grep, Glob (read-only, no code writing) |
| **Use when** | Design decisions, new features, system refactoring |

Produces Architecture Decision Records (ADRs). Always compares 3+ approaches before recommending. Never writes implementation code.

### brancher
| | |
|---|---|
| **Model** | Opus |
| **Effort** | Max |
| **Use when** | Complex problems with multiple valid solutions |

4-phase process: Decompose, Branch (min 3 approaches), Evaluate, Select. Won't start implementing until all branches are compared.

### refiner
| | |
|---|---|
| **Model** | Opus |
| **Effort** | High |
| **Use when** | Critical code paths — auth, billing, data pipelines, core business logic |

Multi-pass self-review with two modes. **Surgical** (default): find exactly 3 weaknesses, fix only those, compare before/after. **Systematic**: review against 6 principles (correctness, security, performance, error handling, concurrency, testability).

### judge
| | |
|---|---|
| **Model** | Opus |
| **Effort** | High |
| **Tools** | Read, Grep, Glob, Bash |
| **Use when** | Multiple competing solutions exist |

Evaluates N solutions through binary gates (build? tests? security?) then weighted scoring. Never declares a tie.

### questioner
| | |
|---|---|
| **Model** | Sonnet |
| **Effort** | Medium |
| **Tools** | Read, Grep, Glob (read-only) |
| **Use when** | Before any non-trivial implementation |

6 mandatory questions before code: minimal change surface, hidden assumptions, what breaks if wrong, existing reusable code, what caller actually needs, simplest possible thing.

### fuzzer
| | |
|---|---|
| **Model** | Sonnet |
| **Effort** | High |
| **Use when** | Pure functions, parsers, serializers, data transformations |

Property-based testing across 1000+ random inputs. Supports Hypothesis (Python), fast-check (JS/TS), proptest (Rust), jqwik (Java).

### prism
| | |
|---|---|
| **Model** | Sonnet |
| **Effort** | High |
| **Use when** | Important PRs, thorough multi-angle review needed |

4 isolated review passes with blinders: Security, Performance, Test Coverage, Correctness. Single-domain focus produces deeper analysis than multi-domain review.

### researcher
| | |
|---|---|
| **Model** | Sonnet |
| **Effort** | High |
| **Use when** | Any research task |

7 depth levels: `surface` (30s) to `overkill` (unlimited). Launches parallel sub-agents at higher levels.

### specwriter
| | |
|---|---|
| **Model** | Opus |
| **Effort** | High |
| **Use when** | Before any non-trivial feature implementation |

Interviews you through 5 rounds of probing questions, then produces a SPEC.md detailed enough for a fresh session to execute without follow-ups.

### wirer
| | |
|---|---|
| **Model** | Opus |
| **Effort** | High |
| **Use when** | After any implementation |

Verifies new code is actually connected to the running system. Traces the full call chain from entry point to storage. Catches the #1 AI coding failure: beautiful code that nothing calls.

### test-auditor
| | |
|---|---|
| **Model** | Sonnet |
| **Effort** | High |
| **Use when** | After test suites are written |

Catches fake tests — mocks that test nothing, assertions that always pass, happy-path-only coverage. If a test passes when the feature is deleted, it's fake.

### ui-architect
| | |
|---|---|
| **Model** | Opus |
| **Effort** | High |
| **Use when** | Any frontend task — auto-triggers |

Fetches real components from 21st.dev, shadcn, magicui, animotion, and aceternity instead of writing from scratch. Handles responsive, dark mode, accessibility.

### design-critic
| | |
|---|---|
| **Model** | Sonnet |
| **Effort** | High |
| **Use when** | After any frontend implementation — auto-triggers |

Scores UI output 1-10 across layout, color, interactivity, animation, responsiveness, and polish. If score < 6, suggests component library alternatives.

---

## Usage Examples

```
Use the breaker agent to review this implementation
```

```
Use the red-team agent. Here's what I did for security:
- Added JWT auth on all endpoints
- Input validation via zod schemas
Attack my assumptions.
```

```
Use the refiner on src/auth/ — this is critical code.
```

```
Build a landing page for [product] with animated hero and feature grid
```
The `ui-architect` auto-triggers. `design-critic` auto-runs after to score visual quality.
