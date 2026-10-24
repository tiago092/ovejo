#!/usr/bin/env bash
set -euo pipefail
ROSA_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
export XDG_DATA_HOME="$ROSA_ROOT/.tools/data"
export XDG_CONFIG_HOME="$ROSA_ROOT/.tools/config"
export XDG_CACHE_HOME="$ROSA_ROOT/.tools/cache"
ROSA_GODOT="${GODOT_BIN:-$ROSA_ROOT/.tools/Godot_v4.7.2-stable_linux.x86_64}"
if [[ ! -x "$ROSA_GODOT" ]]; then echo 'Falta Godot 4.7.2. Ejecutá scripts/setup_tools.py o definí GODOT_BIN.' >&2; exit 1; fi
exec "$ROSA_GODOT" --path "$ROSA_ROOT/godot" "$@"
