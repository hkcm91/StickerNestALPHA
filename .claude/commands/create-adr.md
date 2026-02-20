# Create ADR

Generate an Architecture Decision Record (ADR) using the MADR template.

## Usage

```
/create-adr "<title>"
```

## Instructions

When invoked, this command will interactively gather:

1. **Context**: What is the issue we're trying to address?
2. **Decision Drivers**: What factors influence this decision?
3. **Considered Options**: What alternatives were evaluated?
4. **Decision Outcome**: Which option was chosen and why?
5. **Consequences**: What are the positive and negative outcomes?

Then generate a MADR-formatted markdown file in `docs/adr/`.

## MADR Template

```markdown
# [short title of solved problem and solution]

* Status: [proposed | rejected | accepted | deprecated | superseded by ADR-XXXX]
* Deciders: [list of people involved in the decision]
* Date: [YYYY-MM-DD]

## Context and Problem Statement

[Describe the context and problem statement, e.g., in free form using two to three sentences. You may want to articulate the problem in form of a question.]

## Decision Drivers

* [driver 1, e.g., a force, facing concern, ...]
* [driver 2, e.g., a force, facing concern, ...]
* ...

## Considered Options

* [option 1]
* [option 2]
* [option 3]
* ...

## Decision Outcome

Chosen option: "[option X]", because [justification. e.g., only option which meets k.o. criterion decision driver | which resolves force force | ... | comes out best (see below)].

### Positive Consequences

* [e.g., improvement of quality attribute satisfaction, follow-up decisions required, ...]
* ...

### Negative Consequences

* [e.g., compromising quality attribute, follow-up decisions required, ...]
* ...

## Pros and Cons of the Options

### [option 1]

[example | description | pointer to more information | ...]

* Good, because [argument a]
* Good, because [argument b]
* Bad, because [argument c]
* ...

### [option 2]

[example | description | pointer to more information | ...]

* Good, because [argument a]
* Good, because [argument b]
* Bad, because [argument c]
* ...

### [option 3]

[example | description | pointer to more information | ...]

* Good, because [argument a]
* Good, because [argument b]
* Bad, because [argument c]
* ...

## Links

* [Link type] [Link to ADR] <!-- example: Refined by [ADR-0005](0005-example.md) -->
* ...
```

## File Naming

ADRs are numbered sequentially:

```
docs/adr/
  0001-record-architecture-decisions.md
  0002-use-zod-for-schema-validation.md
  0003-event-bus-conflict-resolution-strategy.md
  ...
```

The command will:
1. Scan `docs/adr/` for the highest existing number
2. Increment by 1 for the new ADR
3. Generate filename: `NNNN-kebab-case-title.md`

## StickerNest-Specific ADRs to Seed

The following ADRs should be created based on decisions in the Master Build Plan:

1. **Conflict Resolution Strategy**
   - Context: How to handle concurrent edits in real-time collaboration
   - Decision: LWW for entities, Yjs for docs, revision-based for tables

2. **Widget Hot-Reload Policy**
   - Context: How widgets update when new versions are published
   - Decision: Explicit user action required, no automatic updates

3. **Seven-Store Architecture**
   - Context: How to structure application state
   - Decision: Seven Zustand stores, one per domain, bus-mediated communication

4. **Layer Dependency Direction**
   - Context: How to prevent architecture decay
   - Decision: Downward-only imports, enforced by ESLint and dependency-cruiser

5. **Widget Sandbox Security Model**
   - Context: How to run untrusted widget code safely
   - Decision: srcdoc blob + strict CSP + origin validation + host-proxied external calls

## Notes

- ADRs are immutable once accepted - create new ADRs to supersede old ones
- Link related ADRs using the Links section
- Run `npm run docs:adr` to build the log4brains static site
- Commit ADRs to `docs/adr/` in the repository
