#!/bin/sh
# macOS/Linux: starts the dock daemon in the background, then the MIDI bridge here.
# Assumes streamdock-m18 sits next to this folder; override with DOCKD_DIR=...
cd "$(dirname "$0")"
DOCKD_DIR="${DOCKD_DIR:-../streamdock-m18}"

# Job control on: the background job gets its own process group, so we can
# signal npm and the node process it spawns together (not just the subshell).
set -m
(cd "$DOCKD_DIR" && exec npm run dockd) &
DOCKD_PGID=$!
set +m

trap 'kill -TERM -"$DOCKD_PGID" 2>/dev/null' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

sleep 2
npm start
