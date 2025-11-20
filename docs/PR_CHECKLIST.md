# PR checklist (automated checklist for reviewers)

- [ ] Branch rebased/merged with main and no conflicts remain.
- [ ] TypeScript: `npx tsc --noEmit` passes.
- [ ] Lint: `npm run lint` passes (no new lint errors).
- [ ] Build: `npm run build` completes.
- [ ] Tests: unit tests added for new validation helpers and handlers; `npm test` passes.
- [ ] Geo endpoints: added input validation for radius/limit; pagination in place.
- [ ] DB: geo indexes exist for geo queries (PostGIS/Mongo 2dsphere) — confirm with DBA or check migration files.
- [ ] Security: rate limiting / caching considered for public search endpoints.
- [ ] Docs: TELEGRAM_BOT_GUIDE.md and README updated with new bot flow and pages.
- [ ] No debug console.* left in committed files.
- [ ] PR description includes testing instructions and manual verification steps.
