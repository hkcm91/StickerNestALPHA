#!/bin/bash
# Push current StickerNest5.0 local state to StickerNestALPHA repo
# Run this from the StickerNest5.0 directory on your machine

set -e

echo "=== StickerNest5.0 -> StickerNestALPHA Push Script ==="
echo ""

# Step 1: Fix git config if corrupted
if ! git status > /dev/null 2>&1; then
    echo "Git config may be corrupted. Rebuilding..."
    cat > .git/config << 'GITCFG'
[core]
	repositoryformatversion = 0
	filemode = false
	bare = false
	logallrefupdates = true
[remote "origin"]
	url = https://github.com/hkcm91/StickerNest5.0.git
	fetch = +refs/heads/*:refs/remotes/origin/*
[branch "main"]
	remote = origin
	merge = refs/heads/main
[user]
	name = Kimber
	email = kimber@stickernest.dev
GITCFG
    echo "Git config restored."
fi

# Step 2: Create a temporary directory for Alpha
ALPHA_DIR=$(mktemp -d)
echo "Staging in: $ALPHA_DIR"

# Step 3: Init fresh repo
cd "$ALPHA_DIR"
git init
git branch -m main
git config user.name "Kimber"
git config user.email "kimber@stickernest.dev"
git remote add origin https://github.com/hkcm91/StickerNestALPHA.git

# Step 4: Copy all files (excluding .git, node_modules, and temp files)
echo "Copying files from StickerNest5.0..."
rsync -a \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='build' \
    --exclude='coverage' \
    --exclude='test-results' \
    --exclude='playwright-report' \
    --exclude='.supabase' \
    --exclude='storybook-static' \
    --exclude='.vercel' \
    --exclude='.cache' \
    --exclude='.temp' \
    --exclude='.tmp' \
    --exclude='*.tsbuildinfo' \
    --exclude='*.env' \
    --exclude='.env*' \
    --exclude='vite.config.ts.timestamp-*' \
    --exclude='vitest.config.ts.timestamp-*' \
    --exclude='.DS_Store' \
    --exclude='*.plugin' \
    --exclude='.claude/worktrees' \
    --exclude='push-to-alpha.sh' \
    "$OLDPWD/" ./

# Step 5: Commit
echo "Staging files..."
git add -A
echo "Committing..."
git commit -m "feat: initialize StickerNestALPHA from StickerNest5.0 local state

Full copy of the StickerNest V5 codebase including all committed and
uncommitted work as of $(date +%Y-%m-%d). Includes all 7 layers (Kernel
through Shell), build tooling, schemas, tests, canvas system, marketplace,
runtime widgets, and MCP dev server.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

# Step 6: Push
echo "Pushing to StickerNestALPHA..."
git push -u origin main

echo ""
echo "=== Done! StickerNestALPHA is now populated ==="
echo "Cleaning up staging directory..."
rm -rf "$ALPHA_DIR"
echo "Complete!"
