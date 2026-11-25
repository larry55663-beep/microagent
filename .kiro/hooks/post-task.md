---
name: post-task-verification
trigger: task-complete
---

# Hook: Post-Task Verification

Fires after any agent task completes. Blocks task closure until all checks pass.

## Checks

1. **Line budget** - run `npm run lines`; fail if `skeleton-core` > 200 lines
   or any app > 200 lines.
2. **Dependency gate** - run `npm run deps`; fail if `dependencies` is non-empty.
3. **Test suite** - run `npm test`; fail on any non-zero exit.
4. **Kiro directory integrity** - confirm `.kiro/specs`, `.kiro/steering`,
   `.kiro/hooks` all exist and are not ignored by `.gitignore`.

## On failure
Report the failing check with the exact file and line count. Do not proceed.
