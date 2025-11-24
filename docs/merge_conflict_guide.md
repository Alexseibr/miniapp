# Merge conflict resolution guide

This project currently tracks work on the `work` branch. If GitHub shows conflicts when opening a pull request, use the following process locally to re-sync with the target branch and resolve conflicts cleanly.

1. Fetch the latest target branch (replace `target` with the real branch name such as `main`):
   ```bash
   git fetch origin
   git checkout target
   git pull
   ```
2. Switch back to `work` and replay your commits on top of the target branch:
   ```bash
   git checkout work
   git rebase target
   ```
3. When a conflict appears, open each reported file and choose the correct version of the code. Remove all conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`).
4. After fixing a file, mark it as resolved and continue:
   ```bash
   git add <path>
   git rebase --continue
   ```
5. Run the project's tests to confirm the merge result is stable. Commit any remaining changes and push the updated branch:
   ```bash
   npm test  # or relevant test suite
   git push --force-with-lease
   ```
6. If you prefer a merge workflow instead of rebase, replace step 2 with `git merge target`, resolve conflicts, then push the merge commit.

For quick detection of unresolved markers in the working tree, use the helper script `scripts/check-conflicts.sh` described below.
