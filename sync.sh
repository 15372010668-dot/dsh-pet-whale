#!/bin/sh
# Sync the dsh-pet-whale workspace into the DSH plugins folder (link: target).
# Run after every code change; browser-side changes need a page reload,
# host-side changes need a DSH restart.
#
# Override via env if your layout differs:
#   DSH_PLUGINS_DIR=~/dsh-plugins ./sync.sh
set -e
SRC="$(cd "$(dirname "$0")" && pwd)"
DST="${DSH_PLUGINS_DIR:-$HOME/dsh-plugins}/dsh-pet-whale"
case "$SRC" in
  *-release|*release*)
    echo "refusing: $SRC looks like a release snapshot, not the dev workspace"; exit 1 ;;
esac
rsync -a --delete --exclude ".DS_Store" "$SRC/" "$DST/"
echo "synced: $SRC -> $DST"
cd "$DST" && node test-host.mjs >/dev/null && node test-roam.mjs >/dev/null && node test-notifications.mjs >/dev/null && echo "tests: pass" || { echo "tests: FAILED (synced anyway)"; exit 1; }
