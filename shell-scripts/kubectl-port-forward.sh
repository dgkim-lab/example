#!/usr/bin/env bash

# Interactively select a Kubernetes namespace, Service, and port, then forward
# the selected Service port to localhost.

set -euo pipefail

readonly SCRIPT_NAME="${0##*/}"

usage() {
    cat <<EOF
Usage: $SCRIPT_NAME [options] [service] [local_port:]remote_port

Without arguments, drill down through namespace, Service, and port. fzf is
used for searchable selection when installed; otherwise numbered menus are
shown.

Options:
  -n, --namespace NAME       Start in this namespace
      --context NAME         Kubernetes context
      --all-namespaces       Include every namespace in the first menu
      --list                 List Services and exit
      --completion           Print Bash completion code and exit
  -h, --help                 Show this help

Examples:
  $SCRIPT_NAME
  $SCRIPT_NAME -n monitoring
  $SCRIPT_NAME -n default redis
  $SCRIPT_NAME -n default redis 16379:6379

Install Bash completion for the current shell:
  source <($SCRIPT_NAME --completion)
EOF
}

die() {
    printf 'Error: %s\n' "$*" >&2
    exit 1
}

require_kubectl() {
    command -v kubectl >/dev/null 2>&1 || die "kubectl is not installed or not in PATH"
}

# Print one selected item. Prompts and fallback menus go to stderr so the
# function can safely be used in command substitution.
choose() {
    local title="$1"
    local items="$2"
    local choice

    [[ -n "$items" ]] || die "no options available for $title"

    if command -v fzf >/dev/null 2>&1; then
        choice="$(fzf --height=45% --reverse --border --prompt="$title > " <<<"$items" || true)"
    else
        printf '\n%s\n' "$title" >&2
        nl -ba <<<"$items" >&2
        printf 'Select a number (or Ctrl-C): ' >&2
        read -r choice
        [[ "$choice" =~ ^[0-9]+$ ]] || die "invalid selection"
        choice="$(sed -n "${choice}p" <<<"$items")"
    fi

    [[ -n "$choice" ]] || die "no selection made for $title"
    printf '%s\n' "$choice"
}

namespace=""
context=""
all_namespaces=false
list_only=false
service=""
port_spec=""

while (($#)); do
    case "$1" in
        -n|--namespace)
            (($# >= 2)) || die "$1 requires a namespace"
            namespace="$2"
            shift 2
            ;;
        --context)
            (($# >= 2)) || die "--context requires a context"
            context="$2"
            shift 2
            ;;
        --all-namespaces)
            all_namespaces=true
            shift
            ;;
        --list)
            list_only=true
            shift
            ;;
        --completion)
            cat <<'COMPLETION'
_kubectl_port_forward_complete() {
    local cur prev ns all_ns i services
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"

    if [[ "$prev" == "-n" || "$prev" == "--namespace" || "$prev" == "--context" ]]; then
        COMPREPLY=()
        return
    fi

    if [[ "$cur" == -* ]]; then
        COMPREPLY=($(compgen -W '-n --namespace --context --all-namespaces --list --help' -- "$cur"))
        return
    fi

    ns=""
    all_ns=false
    for ((i=1; i<COMP_CWORD; i++)); do
        if [[ "${COMP_WORDS[i]}" == "-n" || "${COMP_WORDS[i]}" == "--namespace" ]]; then
            ns="${COMP_WORDS[i+1]}"
        elif [[ "${COMP_WORDS[i]}" == "--all-namespaces" ]]; then
            all_ns=true
        fi
    done

    if [[ -n "$ns" ]]; then
        services="$(kubectl get svc -n "$ns" -o name 2>/dev/null | sed 's#^service/##')"
    elif [[ "$all_ns" == true ]]; then
        services="$(kubectl get svc --all-namespaces -o custom-columns='NAMESPACE:.metadata.namespace,NAME:.metadata.name' --no-headers 2>/dev/null | awk '{print $1 "/" $2}')"
    else
        services="$(kubectl get svc -o name 2>/dev/null | sed 's#^service/##')"
    fi
    COMPREPLY=($(compgen -W "$services" -- "$cur"))
}

complete -F _kubectl_port_forward_complete kubectl-port-forward.sh
complete -F _kubectl_port_forward_complete kubectl-port-forward
complete -F _kubectl_port_forward_complete kpf
COMPLETION
            exit 0
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        --)
            shift
            break
            ;;
        -*)
            die "unknown option: $1 (try --help)"
            ;;
        *)
            if [[ -z "$service" ]]; then
                service="$1"
            elif [[ -z "$port_spec" ]]; then
                port_spec="$1"
            else
                die "too many positional arguments"
            fi
            shift
            ;;
    esac
done

require_kubectl

kubectl_prefix=()
[[ -n "$context" ]] && kubectl_prefix+=(--context "$context")

if [[ "$service" == */* ]]; then
    [[ -z "$namespace" ]] || die "specify namespace either with -n or as namespace/name, not both"
    namespace="${service%%/*}"
    service="${service#*/}"
fi

if [[ -z "$namespace" ]]; then
    namespace_items="$(kubectl "${kubectl_prefix[@]}" get namespace -o name | sed 's#^namespace/##')"
    namespace="$(choose 'Namespace' "$namespace_items")"
fi

service_items="$(kubectl "${kubectl_prefix[@]}" get svc -n "$namespace" -o name | sed 's#^service/##')"
[[ -n "$service_items" ]] || die "no Services found in namespace: $namespace"

if [[ "$list_only" == true ]]; then
    printf '%s\n' "$service_items"
    exit 0
fi

if [[ -z "$service" ]]; then
    service="$(choose "Service in $namespace" "$service_items")"
else
    grep -Fxq "$service" <<<"$service_items" || die "Service not found in namespace $namespace: $service"
fi

port_items="$(kubectl "${kubectl_prefix[@]}" get svc "$service" -n "$namespace" \
    -o jsonpath='{range .spec.ports[*]}{.port}{"\t"}{.name}{"\n"}{end}')"
[[ -n "$port_items" ]] || die "Service has no ports: $namespace/$service"

if [[ -z "$port_spec" ]]; then
    selected_port="$(choose "Port on $service" "$port_items")"
    remote_port="${selected_port%%$'\t'*}"
    local_port="$remote_port"
else
    if [[ "$port_spec" == *:* ]]; then
        local_port="${port_spec%%:*}"
        remote_port="${port_spec#*:}"
    else
        local_port="$port_spec"
        remote_port="$port_spec"
    fi
fi

[[ "$local_port" =~ ^[0-9]+$ ]] || die "local port must be numeric: $local_port"
[[ "$remote_port" =~ ^[0-9]+$ || "$remote_port" =~ ^[a-zA-Z][a-zA-Z0-9.-]*$ ]] || die "invalid remote port: $remote_port"

printf 'Forwarding localhost:%s -> %s/%s:%s\n' "$local_port" "$namespace" "$service" "$remote_port" >&2
exec kubectl "${kubectl_prefix[@]}" port-forward -n "$namespace" "service/$service" "$local_port:$remote_port"
