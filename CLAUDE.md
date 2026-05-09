# K-OS — Project instructions for Claude

## Project context

**K-OS** (KTano Operating System) is a modular personal life-management platform. The first module is **K-OS ToDo** (a.k.a. **Project North Star**) — a calm, premium, keyboard-first task manager.

- Authoritative design lives in `design/project-north-start/`. Read it before any UI/schema work — `chats/chat1.md` for intent, `project/styles.css` for design tokens, `project/data.js` for the canonical entity shapes.
- Locked architectural decisions (stack, hosting, auth, etc.) are in project memory at `.claude/projects/.../memory/decision_stack_and_hosting.md`. **Do not re-debate** these without an explicit user request.

## Working agreements

- **Memory System**: Store all architectural decisions in `K-OS Vault/Decisions/` and patterns in `K-OS Vault/Patterns/`.
- **Sessions**: After every session, summarize important outcomes in `K-OS Vault/Sessions/`.
- **Files**: Use Markdown for notes.

## Vault structure

The `K-OS Vault/` directory at the project root is an **Obsidian vault** (the folder name *is* the vault name displayed in Obsidian). Treat it as the canonical knowledge base for documentation, decisions, patterns, and session logs.

```
K-OS Vault/                 # ← Obsidian vault root (open this folder in Obsidian)
├── Home.md                 # vault entry / map of content
├── Decisions/              # ADR-style decision records (one note per decision)
│   └── Decisions.md        # section index + conventions + template
├── Patterns/               # recurring patterns and conventions
│   └── Patterns.md         # section index + conventions + template
└── Sessions/               # per-session summaries
    └── Sessions.md         # section index + conventions + template
```

Each section's index note (`Decisions.md`, `Patterns.md`, `Sessions.md`) defines the **filename conventions, required frontmatter, and template** for notes in that section. Follow them.

## Vault conventions (summary)

- Use **Obsidian Flavored Markdown**: frontmatter properties, `[[wikilinks]]` for internal references, `> [!note]` callouts, embeds.
- Every note has frontmatter with at minimum `type`, `created`, and `tags`.
- **Decisions** are append-only. To change a decision, write a new ADR that supersedes the old one (`status: superseded`, `superseded-by: [[…]]`); never edit accepted ADRs in place.
- **Patterns** can be edited as understanding deepens; track changes with the `updated` field.
- **Sessions** are written to be a handoff to your future self — include goal, outcomes, decisions made (linked to ADRs), open questions, and next steps.

## Working with the vault programmatically

- For initial creation and bulk edits, write files directly with the standard file tools — that's how this vault was scaffolded.
- For live interactions (search, append, daily notes, plugin reload, etc.) when Obsidian is running, the `obsidian-cli` skill from the `obsidian-skills` plugin is available.
- For Obsidian-flavored markdown syntax reference (callout types, embed forms, properties), the `obsidian-markdown` skill from the same plugin is available.

## What not to do

- Don't create documentation files outside `K-OS Vault/` (other than `docs/architecture.md` once it's written, which is referenced by ADRs but committed to the repo for non-Obsidian readers).
- Don't auto-port content between project memory (`.claude/projects/...`) and the vault. Memory is for Claude's own working state; the vault is for human-readable, version-controlled knowledge. They overlap intentionally; the human chooses what graduates to the vault.
- Don't run the Obsidian app or take screenshots of the design unless explicitly asked — the `design/` HTML/CSS/JS files contain everything needed.
