#!/usr/bin/env bash
# Execute with:  source load_secrets.sh

load_secrets() {
  [ -f /run/secrets/KRAKEN_API_KEY ]    && export KRAKEN_API_KEY="$(< /run/secrets/KRAKEN_API_KEY)"
  [ -f /run/secrets/KRAKEN_API_SECRET ] && export KRAKEN_API_SECRET="$(< /run/secrets/KRAKEN_API_SECRET)"

  if [ -f /run/secrets/GITHUB_TOKEN_CODE_SERVER ]; then
    export GITHUB_TOKEN_CODE_SERVER="$(< /run/secrets/GITHUB_TOKEN_CODE_SERVER)"

    if git rev-parse --is-inside-work-tree &>/dev/null; then
      current_url="$(git remote get-url origin 2>/dev/null || true)"
      token_prefix="https://${GITHUB_TOKEN_CODE_SERVER}@"
      if [[ -n "$current_url" && "$current_url" != ${token_prefix}* ]]; then
        if [[ "$current_url" == https://github.com/* ]]; then
          git remote set-url origin "${token_prefix}${current_url#https://}"
          echo "➜ Git remote 'origin' auf Token-URL umgestellt."
        fi
      fi
    fi
  fi
}

load_secrets

if (return 0 2>/dev/null); then
  return 0
fi

if [[ $# -gt 0 ]]; then
  exec "$@"
else
  exec "${SHELL:-/bin/bash}"
fi
