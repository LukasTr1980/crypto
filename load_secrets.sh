#!/usr/bin/env bash
# Execute with source load_secrets.sh

load_secrets() {
  [ -f /run/secrets/KRAKEN_API_KEY ]    && export KRAKEN_API_KEY="$(< /run/secrets/KRAKEN_API_KEY)"
  [ -f /run/secrets/KRAKEN_API_SECRET ] && export KRAKEN_API_SECRET="$(< /run/secrets/KRAKEN_API_SECRET)"
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
