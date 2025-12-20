# Quick Start Guide - For Julius & Wilton

## 🚀 First Time Setup (5 minutes)

### 1. Fork the Repository
- Go to: https://github.com/shmawilton/Transcribe-pro
- Click **"Fork"** button (top right)
- This creates your own copy

### 2. Clone Your Fork
```bash
git clone https://github.com/YOUR_USERNAME/Transcribe-pro.git
cd Transcribe-pro
```

### 3. Add Upstream Remote
```bash
git remote add upstream https://github.com/shmawilton/Transcribe-pro.git
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Set Up Branches
```bash
git fetch upstream
git checkout -b develop upstream/develop
git checkout -b julius/waveform develop    # For Julius
# OR
git checkout -b wilton/audio-engine develop # For Wilton
```

---

## 📋 Daily Workflow (Every Morning)

```bash
# 1. Sync with latest changes
git checkout develop
git fetch upstream
git merge upstream/develop

# 2. Update your feature branch
git checkout julius/waveform  # or your branch
git merge develop

# 3. Start coding!
npm run dev
```

---

## 💾 Save Your Work (Throughout the Day)

```bash
# 1. Stage your changes
git add src/renderer/components/audio/Waveform.tsx

# 2. Commit with clear message
git commit -m "Add: waveform canvas rendering"

# 3. Push to your fork
git push origin julius/waveform
```

---

## 📁 Where to Save Files

### ✅ Your Component Files:

**Julius:**
- `src/renderer/components/audio/Waveform.tsx`
- `src/renderer/components/controls/PlaybackPanel.tsx`
- `src/renderer/components/controls/MarkerPanel.tsx`
- `src/renderer/components/markers/MarkerManager.ts`
- `src/renderer/components/project/ProjectLoader.ts`
- `src/renderer/components/ui/MenuBar.tsx`
- `src/renderer/components/ui/HelpModal.tsx`

**Wilton:**
- `src/renderer/components/audio/AudioEngine.ts`
- `src/renderer/components/controls/GlobalControlsPanel.tsx`
- `src/renderer/components/markers/MarkerTimeline.tsx`
- `src/renderer/components/markers/MarkerEditor.tsx`
- `src/renderer/components/project/ProjectSaver.ts`
- `src/renderer/components/ui/SettingsModal.tsx`

### ❌ Don't Save Here:
- ❌ `src/App.tsx` (old location)
- ❌ Root directory
- ❌ `node_modules/` or `dist/`

---

## 🔄 Common Commands

| What you want to do | Command |
|---------------------|---------|
| See current status | `git status` |
| Switch branch | `git checkout julius/waveform` |
| See all branches | `git branch -a` |
| Sync with upstream | `git fetch upstream && git merge upstream/develop` |
| Commit changes | `git add . && git commit -m "Type: description"` |
| Push to your fork | `git push origin julius/waveform` |
| Start dev server | `npm run dev` |

---

## 📝 Commit Message Format

```
Type: Brief description
```

**Types:** `Add:`, `Fix:`, `Update:`, `Refactor:`, `Style:`, `Docs:`

**Examples:**
- `Add: waveform canvas rendering`
- `Fix: playback controls not responding`
- `Update: improve waveform performance`

---

## ⚠️ Important Rules

### ✅ DO:
- Always sync with `upstream/develop` before starting work
- Work on your assigned feature branches only
- Commit and push frequently
- Test before committing

### ❌ DON'T:
- Don't push to `upstream` (only push to `origin` - your fork)
- Don't work on `develop` or `main` directly
- Don't commit large files or build artifacts
- Don't modify shared files without coordination

---

## 🆘 Need Help?

1. **Read:** [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Complete guide
2. **Check:** [GIT_WORKFLOW.md](./GIT_WORKFLOW.md) - Git commands
3. **Ask:** Your teammate for coordination on shared files

---

**Remember:** 
- Push to `origin` (your fork) ✅
- Never push to `upstream` (main repo) ❌
- Always sync before starting work ✅

