#!/usr/bin/env bash
# Rebuild assets/project_image.gif from a source file (default: git HEAD version).
# Requires: ffmpeg, gifsicle
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:-}"
OUT="$ROOT/assets/project_image.gif"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if [[ -z "$SRC" ]]; then
  git -C "$ROOT" show HEAD:assets/project_image.gif >"$TMP/source.gif" 2>/dev/null || {
    echo "Usage: $0 /path/to/source.gif" >&2
    exit 1
  }
  SRC="$TMP/source.gif"
fi

ffmpeg -y -i "$SRC" \
  -vf "select='not(mod(n\,3))',setpts=N/FRAME_RATE/TB,fps=10,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5" \
  -loop 0 "$TMP/raw.gif"

gifsicle -O3 --colors 96 --lossy=80 "$TMP/raw.gif" -o "$OUT"
ls -lh "$OUT"
gifsicle -I "$OUT" | head -6
