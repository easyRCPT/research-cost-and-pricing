#!/bin/sh
# Points this checkout at the database belonging to its current git branch.
#
# Each branch gets its own Compose project, which means its own container, its
# own volume, and its own port. Switching branches switches databases, and the
# one you left keeps its data — which is the whole point once seeds cost real
# time to rebuild. Two worktrees on two different branches are unaffected by
# each other, so they run at the same time.
#
# Keyed on the branch rather than the checkout directory on purpose. Keying on
# the directory also gives concurrent worktrees, but every branch visited in one
# worktree then shares a single database, so switching still means db-reset. The
# branch is the thing whose schema and seed data actually differ.
#
# Writes only. No Docker commands on the common path, because this runs from
# post-checkout and a checkout that pauses to talk to Docker is a checkout
# people stop making. Starting, migrating and seeding is preflight's job, at the
# point a dev server actually needs the database.
#
# Run automatically by .githooks/post-checkout and scripts/preflight.sh.
# Directly: `make branch-env`.

set -e

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

DEFAULT_PORT=5433
DEFAULT_PROJECT=rcpt
MAX_PORT=5533

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null) || exit 0

# Detached HEAD: bisect, a rebase in progress, a tag checkout. There is no
# stable identity to key a database on, so leave whatever is configured alone
# rather than inventing a database per commit.
[ -n "$branch" ] && [ "$branch" != "HEAD" ] || exit 0

# The registry is machine-wide, not per-checkout.
#
# Keeping it in .git seems tidier and is wrong: the project name is derived from
# the branch, so a second *clone* on the same branch derives the same name — but
# with its own registry it allocates a different port, and Docker then recreates
# the first clone's container to match. Same name, two ports, one container
# fought over. A shared registry makes the rule uniform instead: a branch's
# database is the branch's database, everywhere on this machine. Worktrees
# cannot collide anyway, since git refuses two checkouts of one branch.
registry_dir="${XDG_CONFIG_HOME:-$HOME/.config}/rcpt"
registry="$registry_dir/db-ports"
mkdir -p "$registry_dir" 2>/dev/null || true

slugify() {
	printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]\{1,\}/-/g; s/^-*//; s/-*$//'
}

slug=$(slugify "$branch")
[ -n "$slug" ] || slug="branch"

case "$branch" in
main | master)
	# The default branch keeps the stock project and port, so the common case
	# matches every example in the README and nothing in an existing checkout
	# has to move.
	project="$DEFAULT_PROJECT"
	port="$DEFAULT_PORT"
	;;
*)
	# Short hash of the *raw* branch name, so `feat/x` and `feat-x` — which
	# slugify identically — cannot land on one database.
	hash=$(printf '%s' "$branch" | shasum | cut -c1-6)
	project="$DEFAULT_PROJECT-$slug-$hash"

	# Registry line format: <project><tab><port>. Keyed by project rather than
	# by branch name so the tab cannot be ambiguous, since a branch name may
	# contain almost anything but the project slug may not.
	port=$(awk -F'\t' -v p="$project" '$1 == p {print $2; exit}' "$registry" 2>/dev/null || true)

	if [ -z "$port" ]; then
		# First time on this branch: allocate the lowest port nobody has taken.
		# Sequential rather than hashed — a hash needs no registry but collides
		# birthday-style, and the collision surfaces as a container that will
		# not start. The registry is shared and cheap, so prefer never colliding.
		taken=$(awk -F'\t' '{print $2}' "$registry" 2>/dev/null || true)
		published=$(docker ps --format '{{.Ports}}' 2>/dev/null |
			grep -oE ':[0-9]+->' | tr -d ':>-' || true)
		taken=$(printf '%s\n%s\n%s\n' "$taken" "$published" "$DEFAULT_PORT" |
			grep -E '^[0-9]+$' | sort -u)

		port=$DEFAULT_PORT
		while echo "$taken" | grep -qx "$port"; do
			port=$((port + 1))
			if [ "$port" -gt "$MAX_PORT" ]; then
				echo "branch-env: no free port between $DEFAULT_PORT and $MAX_PORT." >&2
				echo "Run 'make db-prune' to release branches you no longer have." >&2
				exit 1
			fi
		done

		printf '%s\t%s\n' "$project" "$port" >>"$registry"
	fi
	;;
esac

# Upsert rather than append: unlike a per-worktree allocation, these values
# change every time the branch changes, so appending would pile up dead keys and
# leave the last one winning by accident.
set_env() {
	file=$1
	key=$2
	value=$3
	tmp=$(mktemp)
	[ -f "$file" ] && grep -v "^$key=" "$file" >"$tmp" || true
	printf '%s=%s\n' "$key" "$value" >>"$tmp"
	mv "$tmp" "$file"
}

previous=""
[ -f .env ] && previous=$(sed -n 's/^POSTGRES_PORT=\([0-9]*\).*/\1/p' .env)

set_env .env COMPOSE_PROJECT_NAME "$project"
set_env .env POSTGRES_PORT "$port"

# backend/.env carries the port inside DATABASE_URL and has to agree, or Django
# talks to whichever database happens to be on the old port — quite possibly
# another branch's, which is worse than talking to none.
if [ -f backend/.env ]; then
	tmp=$(mktemp)
	sed "s|^\(DATABASE_URL=.*@[^:]*:\)[0-9]*\(/.*\)|\1$port\2|" backend/.env >"$tmp"
	mv "$tmp" backend/.env
fi

# Silent when nothing moved. This runs on every checkout and every dev-server
# start; announcing a no-op trains people to stop reading it.
if [ "$previous" != "$port" ]; then
	echo ""
	echo "  database for '$branch': $project on port $port"
	echo "  run 'make backend' (starts, migrates and seeds it as needed)"
	echo ""
fi
