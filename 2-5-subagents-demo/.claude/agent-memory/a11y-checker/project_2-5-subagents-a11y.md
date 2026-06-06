---
name: 2-5-subagents-demo a11y audit findings
description: Accessibility audit results for UserCard.tsx and UserList.tsx in the 2-5-subagents-demo project — recurring violation patterns and component status
type: project
---

Audit completed 2026-05-02 for UserCard.tsx and UserList.tsx.

**Why:** These components are course demo files intentionally written with code quality issues to demonstrate what a code reviewer can catch. Accessibility was not deliberately broken, but was neglected.

**How to apply:** When re-auditing these files or reviewing fixes, use this record to confirm which issues have been resolved.

## Critical issues found (5 total)

1. Sort-order toggle button (`UserList.tsx` line 71) — symbol-only label (`↑`/`↓`), no `aria-label`.
2. Search `<input>` (`UserList.tsx` lines 61-65) — no `<label>`, `aria-label`, or `aria-labelledby`; placeholder only.
3. Sort field `<select>` (`UserList.tsx` line 66) — no `<label>` or `aria-label`.
4. All "删除" and "更新" buttons in UserList rows + UserCard delete button — identical accessible names, no per-user context in `aria-label`.
5. Loading/error `<div>` states (`UserList.tsx` lines 55-56) — no `role="status"`/`role="alert"`, no `aria-live`; silent to screen readers.

## Warnings found (4 total)

- All buttons missing `type="button"` (both files).
- "下一页" button has no disabled guard for last page.
- Page indicator `<span>` has no `aria-live` for dynamic update announcement.
- No Tailwind classes used — contrast must be audited against external CSS (`.role-admin`, `.role-member`, `.role-viewer`, etc.).

## Recurring pattern

The project consistently omits accessible names on buttons that appear in repeated list contexts. This is a project-wide risk if more list components are added.
