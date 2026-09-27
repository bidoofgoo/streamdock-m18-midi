#!/bin/sh
# macOS/Linux: starts the dock daemon in the background, then the MIDI bridge here.
# Assumes streamdock-m18 sits next to this folder; override with DOCKD_DIR=...
cd "$(dirname "$0")"
DOCKD_DIR="${DOCKD_DIR:-../streamdock-m18}"
(cd "$DOCKD_DIR" && npm run dockd) &
DOCKD=$!
trap 'kill $DOCKD 2>/dev/null' EXIT INT TERM
sleep 2
npm start
