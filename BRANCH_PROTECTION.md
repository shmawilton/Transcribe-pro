# Branch Protection Guidelines

This document outlines recommended branch protection rules for GitHub. These settings help maintain code quality and prevent accidental changes to critical branches.

## Recommended GitHub Settings

### Main Branch Protection

**Settings → Branches → Add rule for `main`:**

1. **Branch name pattern**: `main`
2. **Protect matching branches**: ✓
3. **Require a pull request before merging**:
   - ✓ Require pull request reviews before merging
   - Required number of reviewers: `1` (adjust based on team size)
   - ✓ Dismiss stale pull request approvals when new commits are pushed
   - ✓ Require review from Code Owners
4. **Require status checks to pass before merging**:
   - ✓ Require branches to be up to date before merging
   - Add required status checks (e.g., CI/CD, linting, tests)
5. **Require conversation resolution before merging**: ✓
6. **Do not allow bypassing the above settings**: ✓ (for admins too)
7. **Restrict who can push to matching branches**: No one (only via PR)
8. **Allow force pushes**: ✗
9. **Allow deletions**: ✗

### Develop Branch Protection

**Settings → Branches → Add rule for `develop`:**

1. **Branch name pattern**: `develop`
2. **Protect matching branches**: ✓
3. **Require a pull request before merging**:
   - ✓ Require pull request reviews before merging
   - Required number of reviewers: `1` (optional, can be less strict than main)
   - ✓ Dismiss stale pull request approvals when new commits are pushed
4. **Require status checks to pass before merging**:
   - ✓ Require branches to be up to date before merging
   - Add required status checks (e.g., CI/CD, linting, tests)
5. **Require conversation resolution before merging**: ✓ (optional)
6. **Do not allow bypassing the above settings**: ✗ (allow admins to bypass)
7. **Restrict who can push to matching branches**: No one (only via PR)
8. **Allow force pushes**: ✗
9. **Allow deletions**: ✗

## CODEOWNERS File

Create a `.github/CODEOWNERS` file to automatically request reviews from code owners:

```
# Global owners
* @your-username

# Specific paths
/src/main/ @backend-team
/src/App.tsx @frontend-team
/docs/ @documentation-team
```

## Status Checks (CI/CD)

Set up GitHub Actions or other CI/CD to run:
- Linting (`npm run lint`)
- Type checking (`npm run type-check`)
- Tests (`npm run test`)
- Build verification (`npm run build`)

These checks should be required before merging to `main` and `develop`.

## Manual Setup Instructions

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Branches**
3. Click **Add rule** for each branch (`main` and `develop`)
4. Configure the settings as outlined above
5. Save the rules

## Alternative: Using GitHub CLI

If you have GitHub CLI installed, you can set up branch protection via command line:

```bash
# Protect main branch
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["ci"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1}' \
  --field restrictions=null

# Protect develop branch (similar, but may be less strict)
gh api repos/:owner/:repo/branches/develop/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["ci"]}' \
  --field enforce_admins=false \
  --field required_pull_request_reviews='{"required_approving_review_count":1}' \
  --field restrictions=null
```

## Notes

- Branch protection rules help prevent accidental pushes to critical branches
- Feature branches are not protected and can be freely pushed to
- Adjust the strictness based on your team size and workflow preferences
- Consider requiring fewer approvals for `develop` than `main` to maintain development velocity

