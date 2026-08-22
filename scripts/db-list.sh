#!/bin/sh
# Every database this repo has created, and whether anything still points at it.
#
# Per-branch databases accumulate: a branch that was merged and deleted six weeks
# ago still has a volume, and nothing in git or Docker connects the two. This
# reads the registry, checks each project's branch against the ones that still
# exist, and marks the rest as orphaned. `make db-prune` deletes those.

set -e

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

# Machine-wide, matching scripts/branch-env.sh — see the comment there.
registry="${XDG_CONFIG_HOME:-$HOME/.config}/rcpt/db-ports"

# Every project name a currently existing branch would map to. Compared by
# project rather than by branch name so this uses the identical derivation as
# branch-env.sh — including the hash — instead of re-deriving it differently.
live_projects() {
	echo "rcpt"
	git for-each-ref --format='%(refname:short)' refs/heads 2>/dev/null | while IFS= read -r branch; do
		case "$branch" in
		main | master) continue ;;
		esac
		slug=$(printf '%s' "$branch" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]\{1,\}/-/g; s/^-*//; s/-*$//')
		[ -n "$slug" ] || slug="branch"
		hash=$(printf '%s' "$branch" | shasum | cut -c1-6)
		echo "rcpt-$slug-$hash"
	done
}

live=$(live_projects)
running=$(docker ps --format '{{.Label "com.docker.compose.project"}}' 2>/dev/null || true)

printf "%-34s %-7s %-9s %s\n" PROJECT PORT STATE BRANCH
printf "%-34s %-7s %-9s %s\n" "rcpt" "5433" \
	"$(echo "$running" | grep -qx "rcpt" && echo running || echo stopped)" "main/master"

if [ -f "$registry" ]; then
	while IFS="$(printf '\t')" read -r project port; do
		[ -n "$project" ] || continue
		if echo "$live" | grep -qx "$project"; then
			branch="(live)"
		else
			branch="ORPHANED — branch deleted"
		fi
		state=$(echo "$running" | grep -qx "$project" && echo running || echo stopped)
		printf "%-34s %-7s %-9s %s\n" "$project" "$port" "$state" "$branch"
	done <"$registry"
fi

echo ""
echo "Volumes:"
docker volume ls --format '  {{.Name}}' 2>/dev/null | grep rcpt || echo "  (none)"
echo ""
echo "'make db-prune' deletes the orphaned ones."
