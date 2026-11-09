#!/usr/bin/env bash
# Synchronize only nonsecret manifests before the existing privileged deploy script.
# Do not grant the runner additional sudo permissions or overwrite runtime secrets.
set -euo pipefail

if [ "$#" -ne 2 ]; then
  printf 'Usage: %s <checkout-manifest-dir> <installed-manifest-dir>\n' "$0" >&2
  exit 1
fi
source_dir="$1"
target_dir="$2"
if [[ ! -d "$source_dir" || ! -d "$target_dir" || -L "$target_dir" ]]; then
  printf 'Manifest directories must exist; target must not be a symlink.\n' >&2
  exit 1
fi
shopt -s nullglob
manifests=()
for source in "$source_dir"/*.yaml; do
  name="${source##*/}"
  [[ "$name" == "01-secrets.yaml" ]] && continue
  if [[ "$name" == "40-nginx-ingress.yaml" ]]; then
    printf 'Server-only manifest must not be supplied by the checkout: %s\n' "$name" >&2
    exit 1
  fi
  if [[ -L "$source" || ! -f "$source" ]]; then
    printf 'Invalid source manifest: %s\n' "$name" >&2
    exit 1
  fi
  manifests+=("$source")
done
if [[ ${#manifests[@]} -eq 0 ]]; then
  printf 'No nonsecret manifests found.\n' >&2
  exit 1
fi
# The installed script applies every YAML file. Preserve the known server-only
# ingress file without reading/copying it; reject other unreviewed extras.
for target in "$target_dir"/*.yaml; do
  name="${target##*/}"
  [[ "$name" == "01-secrets.yaml" ]] && continue
  if [[ "$name" == "40-nginx-ingress.yaml" && -f "$target" && ! -L "$target" ]]; then
    printf 'Preserving server-only manifest: %s\n' "$name"
    continue
  fi
  if [[ ! -f "$source_dir/$name" ]]; then
    printf 'Unexpected manifest in installed directory: %s\n' "$name" >&2
    exit 1
  fi
done
if [[ ! -w "$target_dir" ]]; then
  printf 'Manifest directory is not writable by the runner: %s\n' "$target_dir" >&2
  exit 1
fi
for source in "${manifests[@]}"; do
  target="$target_dir/${source##*/}"
  if [[ -L "$target" || ( -e "$target" && ( ! -f "$target" || ! -w "$target" ) ) ]]; then
    printf 'Installed manifest is not a writable regular file: %s\n' "${source##*/}" >&2
    exit 1
  fi
done
for source in "${manifests[@]}"; do
  target="$target_dir/${source##*/}"
  # Avoid truncating an existing manifest if copying is interrupted.
  staging="$(mktemp "$target_dir/.manifest-sync.XXXXXXXX")"
  trap 'rm -f -- "$staging"' EXIT
  install -m 0644 -- "$source" "$staging"
  mv -f -- "$staging" "$target"
  trap - EXIT
  cmp --silent -- "$source" "$target"
done
printf 'Synchronized %s nonsecret manifests; 01-secrets.yaml untouched.\n' "${#manifests[@]}"
