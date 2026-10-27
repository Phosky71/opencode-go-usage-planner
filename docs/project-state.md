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

## Recent Changes
- Initial implementation complete
- 72 models in catalog (36 Go + 36 Go Plus)
- 58 automated tests passing
- Typecheck and build passing
- UI redesigned with Operia Systems identity
- Plan selector implemented (Go / Go Plus)
- Calculator with scenario simulation, model comparator, and budget planner
- GitHub Actions workflow for automated catalog updates
- CLI script for catalog updates
- Integrated as a static application under the Operia Systems website
- Removed the unused updater import from the browser bundle (~368 KB → ~246 KB JS)
- Fixed the budget summary precedence bug and the budget total display

## Active Work
- None. Ready for review and deployment.

## Pending Work
- GitHub Actions workflow needs to be tested on a remote repository
- Manual verification of all 72 records against official source
- Public repository and public deployment are still pending
- UI test (`calculator-ui.test.tsx`) is not included by the current Vitest config and needs rewriting
- Catalog parser should distinguish unknown values from zero in edge cases

## Known Issues
- Workflow not executed on GitHub (no remote repository configured)
- Parser depends on official documentation structure
- No scenario persistence or import/export
- Budget planner does not enforce that allocations equal the stated budget
- Catalog records are labeled `official_verified` automatically; manual review is pending
- Lint passes with warnings; several pre-existing `any`/unused-variable warnings remain

## Next Steps
1. Create and review a public repository if authorized
2. Configure and test GitHub Actions on the remote
3. Manually validate the catalog against the official source
4. Deploy the web app and verify the `/app/` route under the production CSP
5. Rewrite the UI test and add it to the active test configuration

## OpenCode Session
- Session ID: (current session)
