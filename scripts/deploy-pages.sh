#!/usr/bin/env bash
# Deploy dist/ to the gh-pages branch WITHOUT breaking phones that cached an
# older index.html: previously deployed hashed bundles (assets/index-*.js/css)
# are carried forward, so stale pages keep loading until their cache expires.
set -euo pipefail
cd "$(dirname "$0")/.."

npm run build
touch dist/.nojekyll

# carry forward old hashed bundles from the live gh-pages branch
git fetch origin gh-pages 2>/dev/null || true
if git rev-parse --verify origin/gh-pages >/dev/null 2>&1; then
  tmp=$(mktemp -d)
  git worktree add --detach "$tmp" origin/gh-pages >/dev/null
  for f in "$tmp"/assets/index-*.js "$tmp"/assets/index-*.css; do
    [ -e "$f" ] || continue
    base=$(basename "$f")
    [ -e "dist/assets/$base" ] || cp "$f" "dist/assets/$base"
  done
  git worktree remove --force "$tmp"
fi

cd dist
rm -rf .git
git init -q
git checkout -q -b gh-pages
git add -A
git commit -q -m "Deploy"
git -c credential.helper= -c "credential.helper=!gh auth git-credential" \
  push -f https://github.com/nsingleton1/neikirk.git gh-pages
cd ..
rm -rf dist/.git
echo "deployed."
