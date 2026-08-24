# AI OFFICE development guidance

## Goal

Build a portfolio-quality React web app in which five anime AI employees work in a modern virtual office.

## Required behavior

- Preserve the approved five character identities and their roles.
- Keep the wall label exactly `AI OFFICE`.
- Provide Work, Walk, Break, Meeting, and Night modes.
- Clicking an employee opens their current task, progress, and dialogue.
- Persist project progress and the last selected mode in localStorage.
- Support desktop and mobile layouts.
- Respect `prefers-reduced-motion`.

## Engineering rules

- Use React, TypeScript, and Vite.
- Keep components small and role-focused.
- Store employee and task data in typed data files, not hard-coded across UI components.
- Do not add an external backend or paid service in the first version.
- Do not replace approved assets without explicit user approval.
- Never commit secrets or `.env` files.

## Validation

Before completion, run the build, type check, lint, and relevant tests. Verify all five modes, employee selection, persistence, and mobile layout.

## Done when

The app runs locally, the production build passes, key interactions are tested, and README contains setup instructions and portfolio talking points.

