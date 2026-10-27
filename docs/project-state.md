# Project State — OpenCode Go Usage Planner

## Current State
- **Version**: 0.1.0
- **Status**: Integrated into the Operia Systems website as a static, same-origin application
- **Last Updated**: 2026-10-27

## Integration
- Public route (once deployed): `/proyectos/opencode-go-usage-planner/app/`
- Product page: `/proyectos/opencode-go-usage-planner/`
- Build uses `base: './'` so the app works under the Operia subpath.
- The app header links back to `/proyectos/`.
- The client bundle no longer imports the catalog updater; updates are CLI/CI only.
- No backend, accounts, API keys, or user-data transmission.

## Phase 2 — provenance and scenarios
- Catalog records now distinguish:
  - `sourceType: official_document`
  - `verification: auto_extracted`
  - `limitStatus: known | unlimited | unknown`
- No record is presented as manually verified.
- Unknown limits and unknown prices are no longer converted to zero or "free".
- Scenario persistence in `localStorage` (`operia.planner.scenario.v1`).
- JSON export/import, version 1, validated with Zod, 256 KB / 200-item limits.
- Import rejects unknown model IDs and asks for confirmation before replacing data.
- Budget summary shows total, assigned, unassigned and excess; no silent reassignment.
- Catalog context validates the JSON with Zod on load.

## Recent Changes
- Initial implementation complete
- 72 models in catalog (36 Go + 36 Go Plus)
- 74 automated tests passing (domain, parser, integrity, scenario, UI)
- Typecheck and build passing
- UI redesigned with Operia Systems identity
- Plan selector implemented (Go / Go Plus)
- Calculator with scenario simulation, model comparator, and budget planner
- GitHub Actions workflow for automated catalog updates
- CLI script for catalog updates
- Integrated as a static application under the Operia Systems website
- Removed the unused updater import from the browser bundle
- Added local persistence and import/export
- Added explicit provenance and unknown-limit semantics
- Added active UI tests

## Active Work
- None. Ready for review and deployment.

## Pending Work
- GitHub Actions workflow needs to be tested on a remote repository
- Manual verification of all 72 records against official source
- Public repository and public deployment are still pending
- Catalog parser could be extended to record more provenance fields per column
- No scenario history or versioned snapshots yet

## Known Issues
- Workflow not executed on GitHub (no remote repository configured)
- Parser depends on official documentation structure
- Budget planner warns about excess but does not enforce a sum
- Manual verification remains pending for all records
- Lint passes with 53 pre-existing warnings
- Bundle is ~263 KB uncompressed / ~70 KB gzip after adding validated persistence

## Next Steps
1. Create and review a public repository if authorized
2. Configure and test GitHub Actions on the remote
3. Manually validate the catalog against the official source
4. Deploy the web app and verify the `/app/` route under the production CSP
5. Consider cryptographic/local snapshots for scenario history

## OpenCode Session
- Session ID: (current session)
