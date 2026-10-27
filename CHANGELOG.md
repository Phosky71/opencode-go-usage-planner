# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Explicit catalog provenance: `sourceType`, `verification`, `verifiedAt`, `verifiedBy`.
- Explicit `limitStatus`: `known`, `unlimited` or `unknown`.
- Local scenario persistence in `localStorage` under `operia.planner.scenario.v1`.
- JSON export/import of scenarios, version 1, validated with Zod.
- Import size and item limits; unknown model IDs are rejected.
- “Borrar datos” action for local scenario and plan.
- UI tests for calculation, persistence and budget excess.
- Parser tests for unknown limits and unknown prices.
- Scenario schema, serialization and invalid-input tests.
- Catalog validation with Zod on load.
- Read-only catalog audit (`npm run verify:catalog`) and field-level diff tests.
- 80 automated tests.

### Changed
- Catalog refreshed from the official source: 74 models (37 Go + 37 Go Plus), including two new unlimited models.
- Catalog records are now `official_document` + `auto_extracted`, not `official_verified`.
- Confidence for auto-extracted records is `medium`.
- Unknown monthly limits are `null` with `limitStatus: unknown`; they are not zero.
- `-`/`—`/`n/a` prices are missing values, not free.
- Budget panel shows total, assigned, unassigned and excess; excess is never silently redistributed.
- Plan selection is persisted locally.
- Catalog update workflow uses the local `tsx` dependency and runs tests before opening a PR.
- ESLint flat config repaired for ESLint 9.
- Vite base is relative for subpath hosting.

### Fixed
- Budget summary precedence bug.
- Budget total display after additional allocations.
- Unused import bundled into the client.
- `no-case-declarations` in the comparator.
- Unknown/blank limit handling in the parser.
- UI test configuration now includes `.test.tsx` files and setup.
- “Borrar datos” now removes the saved scenario and plan preference without re-saving an empty scenario.
- Export sanitizes numeric fields so an invalid value cannot produce an unimportable JSON file.
- Comma decimals are handled in calculations and persistence.

### Removed
- Client-side catalog updater import from the browser bundle.
- Unused `contributionPerDollar` import from the calculator.
- Broken placeholder UI test and the out-of-config UI test.

## [0.1.0] - 2026-10-26

### Added
- Initial release of OpenCode Go Usage Planner
- MIT License
- Documentation in docs/ directory
