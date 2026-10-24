#!/bin/bash
# Builds T3 Code from this checkout and replaces the installed macOS app with it.
#
#   scripts/update-local-mac-app.sh               # build, then install
#   scripts/update-local-mac-app.sh --skip-build  # install the newest existing build
#
# The install step quits the app, which also stops its server and every agent it
# runs. It therefore runs in a detached session that outlives the caller, so an
# agent inside T3 Code can start an update of the app it runs in. Turn on
# Settings > General > Continue threads after restarts to resume threads after.
# Installer output goes to ~/Library/Logs/t3code-local-update.log.
set -euo pipefail

APP_NAME="T3 Code (Alpha).app"
APP_ID="com.t3tools.t3code"
INSTALL_DIR="/Applications"
LOG_FILE="$HOME/Library/Logs/t3code-local-update.log"

skip_build=false
for arg in "$@"; do
  case "$arg" in
    --skip-build) skip_build=true ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

if [ "$(uname -s)" != "Darwin" ] || [ "$(uname -m)" != "arm64" ]; then
  echo "This script builds and installs the Apple silicon macOS app only." >&2
  exit 1
fi

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

for dir in /opt/homebrew/bin /opt/homebrew/opt/node@24/bin "$HOME/.local/share/t3code-build-tools/bin"; do
  if [ -d "$dir" ]; then PATH="$dir:$PATH"; fi
done
export PATH

marker="$(mktemp -t t3code-update-marker)"
if [ "$skip_build" = false ]; then
  echo "Building $APP_NAME from $(git rev-parse --short HEAD) (about 10 to 15 minutes)..."
  vp run dist:desktop:dmg:arm64
fi

zip_path="$(ls -t release/T3-Code-*-arm64.zip 2>/dev/null | head -n 1 || true)"
if [ -z "$zip_path" ]; then
  echo "No release/T3-Code-*-arm64.zip found. Run without --skip-build." >&2
  exit 1
fi
if [ "$skip_build" = false ] && [ ! "$zip_path" -nt "$marker" ]; then
  echo "The build did not produce a new archive; refusing to install $zip_path." >&2
  exit 1
fi
rm -f "$marker"

work_dir="$(mktemp -d -t t3code-update)"
ditto -x -k "$zip_path" "$work_dir/extracted"
new_app="$work_dir/extracted/$APP_NAME"
if [ ! -d "$new_app" ]; then
  echo "$zip_path does not contain $APP_NAME." >&2
  exit 1
fi

installer="$work_dir/install.sh"
cat > "$installer" <<'INSTALLER'
#!/bin/bash
set -uo pipefail
app_name="$1"; app_id="$2"; install_dir="$3"; new_app="$4"; work_dir="$5"
target="$install_dir/$app_name"
backup="$work_dir/previous.app"
log() { echo "[$(date '+%Y-%m-%d %I:%M:%S %p %Z')] $*"; }
is_running() { [ "$(osascript -e "application id \"$app_id\" is running")" = "true" ]; }

log "Installing $new_app"
# Give the caller a moment to report before the app and its agents stop.
sleep 3
if is_running; then
  log "Quitting $app_name"
  osascript -e "tell application id \"$app_id\" to quit"
  for _ in $(seq 1 60); do
    is_running || break
    sleep 1
  done
  if is_running; then
    log "$app_name did not quit within 60 seconds; leaving the installed app unchanged."
    exit 1
  fi
fi

if [ -d "$target" ]; then
  mv "$target" "$backup" || { log "Could not move the installed app aside."; exit 1; }
fi
if ditto "$new_app" "$target"; then
  xattr -dr com.apple.quarantine "$target" 2>/dev/null || true
  rm -rf "$backup"
  log "Installed $target"
else
  log "Copy failed; restoring the previous app."
  rm -rf "$target"
  [ -d "$backup" ] && mv "$backup" "$target"
fi

open "$target"
log "Relaunched $app_name"
rm -rf "$work_dir"
INSTALLER
chmod +x "$installer"

mkdir -p "$(dirname "$LOG_FILE")"
# fork + setsid moves the installer out of this process group, so quitting the
# app (and the agent that may be running this script) does not stop it.
nohup /usr/bin/perl -MPOSIX -e 'fork and exit; POSIX::setsid(); exec @ARGV' -- \
  "$installer" "$APP_NAME" "$APP_ID" "$INSTALL_DIR" "$new_app" "$work_dir" \
  >>"$LOG_FILE" 2>&1 </dev/null &

echo "Installer started; $APP_NAME will quit, update, and relaunch in a few seconds."
echo "Log: $LOG_FILE"
