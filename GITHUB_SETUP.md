# GitHub Repository Setup

Follow these steps to create and connect your GitHub repository:

## 1. Create Repository on GitHub

1. Go to [GitHub](https://github.com) and sign in
2. Click the "+" icon in the top right corner
3. Select "New repository"
4. Name it `transcription-pro` (or your preferred name)
5. **Do NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

## 2. Connect Local Repository to GitHub

After creating the repository on GitHub, run these commands:

```bash
# Add the remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/transcription-pro.git

# Push main branch
git checkout main
git push -u origin main

# Push develop branch
git checkout develop
git push -u origin develop
```

## 3. Set Default Branch

In your GitHub repository settings:
1. Go to Settings → Branches
2. Set `develop` as the default branch (optional, for Git Flow workflow)

## 4. Next Steps

You're now ready to:
- Create feature branches: `git checkout -b feature/your-feature-name`
- Push changes: `git push origin feature/your-feature-name`
- Create pull requests from feature branches to `develop`
- Merge `develop` to `main` for releases

