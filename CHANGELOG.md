# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial implementation of OpenCode Go Usage Planner
- Model catalog with 72 models (36 Go + 36 Go Plus) extracted from official OpenCode documentation
- Calculator for quota consumption using formula P_i = 100 × C_i / L_i
- Plan selector (OpenCode Go / Go Plus) with visual cards
- Model comparator with sortable columns (limit, price, contribution per dollar)
- Budget planner with editable allocations
- Scenario simulation with hypothetical spending
- Unlimited model handling (null limit, not zero)
- Strikethrough price extraction (current price, not old)
- GitHub Actions workflow for automated catalog updates
- CLI script for catalog updates (`npx tsx scripts/update-catalog.ts`)
- Integrity validation with Zod schemas
- Partial extraction protection (minimum models per plan, suspicious change detection)
- Atomic file write (temp file + rename)
- 58 automated tests (calculations, parser, integrity, UI)
- Operia Systems visual identity (dark theme, cyan/emerald accents, glass effect)
- Responsive design (mobile cards, desktop tables)
- Tools panel with catalog status and update command

### Changed
- Migrated from Tailwind CSS v3 to v4
- Separated client/server code (removed fs/path from browser bundle)
- Moved catalog persistence to Node-only module

### Fixed
- CSS import missing in main.tsx (styles not loading)
- Hardcoded table indices in parser (now identified by headers)
- Duplicate model IDs between Go and Go Plus plans
- Unlimited models represented as 0 instead of null
- Strikethrough prices extracted as old values instead of current
- fs/path module in client bundle causing Vite error

## [0.1.0] - 2026-10-26

### Added
- Initial release of OpenCode Go Usage Planner
- MIT License
- Documentation in docs/ directory