---
type: decision
status: accepted
date: 2026-05-09
tags:
  - decision
  - process
  - knowledge-base
---

# 0019 — Obsidian vault as project knowledge base

## Context

K-OS will accumulate documentation, decisions, patterns, and session logs over time. These need to live somewhere that:

- Is **version-controlled** alongside the code (so history is preserved and contributors see context)
- Renders well on GitHub (so anyone with repo access can read without extra tools)
- Has **rich navigation** (cross-linking between decisions, sessions, and patterns)
- Is **portable** — no third-party SaaS that holds the knowledge hostage
- Plays well with **Claude** for reading and writing notes

The user already uses Obsidian and asked for it explicitly. Obsidian-flavored markdown is a superset of standard Markdown — files render fine on GitHub even without Obsidian.

## Decision

A directory `K-OS Vault/` at the repo root is an **Obsidian vault** with three sections:

```
K-OS Vault/
├── .obsidian/                 # vault config (workspace state gitignored)
├── Home.md                    # vault entry / map of content
├── Decisions/                 # ADR-style decision records
│   └── Decisions.md           # section index + conventions + template
├── Patterns/                  # recurring patterns and conventions
│   └── Patterns.md            # section index + conventions + template
└── Sessions/                  # per-session summaries
    └── Sessions.md            # section index + conventions + template
```

**Conventions**:

- **Decisions** are append-only ADRs with required frontmatter (`type`, `status`, `date`, optional `supersedes` / `superseded-by`, `tags`). Filename: `NNNN - kebab-title.md`. Sequence is global. Editing accepted decisions in-place is forbidden — supersede with a new ADR that links back.
- **Patterns** are editable; filename is descriptive kebab-case; required sections include "When not to use".
- **Sessions** are written for future-self; filename is `YYYY-MM-DD - title.md`; required sections include "Decisions made" (linking to ADRs), "Open questions", and "Next steps".

The full convention spec lives in each section's index note (`Decisions.md`, `Patterns.md`, `Sessions.md`).

**Working agreements** in the project root `CLAUDE.md`:

- Store all architectural decisions in `K-OS Vault/Decisions/` and patterns in `K-OS Vault/Patterns/`
- After every session, summarise outcomes in `K-OS Vault/Sessions/`
- Use Markdown for notes

## Alternatives considered

- **Standalone `docs/` with plain Markdown** — Workable. **Rejected** because: loses Obsidian's wikilink navigation, graph view, and tag system; flat documentation has higher friction for the kind of cross-referencing decisions and session logs need.
- **Notion** — Best-in-class collaborative editing. **Rejected**: third-party SaaS; not in repo; not portable; export-to-Markdown loses fidelity.
- **GitHub Wiki** — Lives with the repo. **Rejected**: separate from main branch (can't be reviewed via PR); poor cross-link experience; no Obsidian-style backlinks.
- **Confluence / GitBook** — Enterprise wikis. **Rejected**: heavyweight; not in repo; vendor lock-in.
- **Just keep decisions in Claude memory** — Tempting. **Rejected**: memory is for Claude's working state; humans need to navigate it without Claude; not version-controlled in the project.

## Consequences

- **Positive**:
  - Vault is portable — just Markdown, opens anywhere (Obsidian, VS Code, GitHub, plain text)
  - Wikilinks and backlinks make navigation rich; Obsidian's graph view shows decision-pattern-session relationships
  - Append-only ADRs preserve history of *why* decisions changed, not just *what* they changed to
  - Claude can read and write notes via standard file tools; the `obsidian-skills` plugin adds live-vault interaction when Obsidian is running
  - GitHub renders the Markdown for browsers
- **Negative**:
  - Convention discipline matters — without writing ADRs and session notes consistently, the vault rots fast
  - Wikilink-style references work best inside Obsidian; on GitHub they render as plain text (acceptable)
- **Neutral**:
  - Project memory (`.claude/projects/.../memory/`) and the vault overlap intentionally; memory is for Claude's working state, vault is the human-readable/version-controlled source. CLAUDE.md spells out the boundary.

## References

- `CLAUDE.md` (repo root) — full convention spec and "what not to do" boundaries
- [[Decisions|Decisions section index]]
- [[Patterns|Patterns section index]]
- [[Sessions|Sessions section index]]
- [Obsidian](https://obsidian.md/)
- [obsidian-skills plugin](https://github.com/kepano/obsidian-skills) — installed locally for the project
