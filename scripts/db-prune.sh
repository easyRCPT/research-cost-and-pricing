#!/bin/sh
# Deletes the databases of branches that no longer exist.
#
# The cost of a database per branch is that they outlive their branches. Merging
# and deleting a branch leaves a container and a volume with nothing pointing at
# them, and no amount of `git` housekeeping notices. This is the counterweight.
#
# Destructive, so it lists what it will remove and asks first. Only ever touches
# projects in the registry whose branch is gone — never the default branch's
# database, and never a project it did not create.
#
# The registry is machine-wide but branches are read from *this* checkout, so if
# you keep two separate clones, a branch that exists only in the other one looks
# orphaned from here. That is why this confirms rather than just doing it, and
# why it names every project before asking.

set -e

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

# Machine-wide, matching scripts/branch-env.sh — see the comment there.
registry="${XDG_CONFIG_HOME:-$HOME/.config}/rcpt/db-ports"

[ -f "$registry" ] || {
	echo "No per-branch databases have been created yet."
	exit 0
}

# Identical derivation to branch-env.sh, so a branch cannot look orphaned merely
# because the two disagree about how to slug it.
live_projects() {
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

orphans=$(while IFS="$(printf '\t')" read -r project port; do
	[ -n "$project" ] || continue
	echo "$live" | grep -qx "$project" || echo "$project"
done <"$registry")

if [ -z "$orphans" ]; then
	echo "Nothing to prune — every database belongs to a branch that still exists."
	exit 0
fi

echo ""
echo "  These databases belong to branches that no longer exist:"
echo "$orphans" | sed 's/^/    /'
echo ""
echo "  Their containers and volumes will be deleted. This cannot be undone."
echo ""
echo "  Branches are read from this checkout. If you keep a separate clone of"
echo "  this repo, check none of the above still exists there."
echo ""
printf "  Delete them? [y/N] "
read -r reply
case "$reply" in
y | Y | yes | YES) ;;
*)
	echo "  Cancelled."
	exit 0
	;;
esac

echo "$orphans" | while IFS= read -r project; do
	[ -n "$project" ] || continue
	echo "  removing $project..."
	# `down -v` needs the compose file plus the project name; the service
	# definition is identical for every branch, only the name and port differ.
	COMPOSE_PROJECT_NAME="$project" docker compose down -v >/dev/null 2>&1 || true
	# A volume can outlive its container if the stack was already torn down
	# without -v, in which case `down -v` above finds nothing to do.
	docker volume rm "${project}_pgdata" >/dev/null 2>&1 || true
done

# Drop the pruned entries so their ports are available again.
tmp=$(mktemp)
while IFS="$(printf '\t')" read -r project port; do
	[ -n "$project" ] || continue
	echo "$orphans" | grep -qx "$project" || printf '%s\t%s\n' "$project" "$port"
done <"$registry" >"$tmp"
mv "$tmp" "$registry"

echo ""
echo "  Pruned. 'make db-list' shows what is left."
echo ""
