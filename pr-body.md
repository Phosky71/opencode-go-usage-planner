# 🔄 Automated Catalog Update

This PR updates the model catalog from official OpenCode Go Markdown sources.

## Sources
- **Limits:** `https://opencode.ai/console/go.md`
- **Prices:** `https://opencode.ai/docs/console/models.md`

## Summary
| Metric | Value |
|--------|-------|
| Previous records | 90 |
| New total records | 90 |
| Active models | 0 |
| Deprecated models | 18 |

## Validation
- ✅ Catalog integrity check passed
- ✅ TypeScript type check passed
- ✅ Build succeeded
- ✅ All tests passed
- ✅ No duplicate IDs
- ✅ Dubious correspondences not associated
- ✅ Unknown prices not converted to zero

## Review Checklist
- [ ] Review added/modified models in `src/data/models.json`
- [ ] Verify deprecated models are correctly identified
- [ ] Check that no unexpected models were removed
- [ ] Confirm price and limit changes match official sources

## Notes
- This PR was generated automatically by the weekly catalog update workflow.
- Changes are **not** auto-merged; manual review and approval are required.
- A backup of the previous catalog is available as `src/data/models.json.backup`.
- 4 dubious correspondences remain unassociated (DeepSeek V4.1 Flash 1017, Muse Spark Contributor ×2, Iceman Contributor Free).
- 11 models have no published price and are included with `priceInputUsd: undefined`.

---
*Generated on scheduled run*
