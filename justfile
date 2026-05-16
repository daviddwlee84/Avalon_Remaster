# Avalon Remaster — task runner.
# `just` lists recipes; `just <name>` runs one. Override variables on the
# command line, e.g. `just deploy-azure azure_location=westus2`.

# ─── Azure Container Apps deploy vars (override on cmdline) ──────────────
azure_name        := "avalon"
azure_rg          := "avalon-rg"
azure_location    := "eastasia"
azure_environment := "avalon-env"
azure_image_tag   := "latest"
# Public WS origin baked into the SvelteKit bundle. Empty = LAN-only deploy
# (Net mode entries hide themselves on the home page). Override to a wss://
# URL pointing at the deployed ACA app to wire Net mode against this server.
public_ws_origin := ""

# ─── Defaults ────────────────────────────────────────────────────────────

# Show available recipes.
default:
    @just --list

# ─── Local dev (no Docker) ──────────────────────────────────────────────

# Run the Bun WS server + Vite dev server in parallel. Two terminals.
dev:
    bun run dev

# Run the engine + bridge + Playwright suites.
test:
    bun run --filter '@avalon/game-core' test
    bun run --filter '@avalon/web' test
    bun run --filter '@avalon/web' test:e2e

# svelte-check on the web package.
check:
    bun run --filter '@avalon/web' check

# Kill any leftover dev servers on the well-known ports.
kill-ports:
    -lsof -ti:3000 -ti:5173 | xargs kill -9 2>/dev/null || true

# ─── Docker (local) ──────────────────────────────────────────────────────

# Build the single-container image.
docker-build:
    docker build -t avalon-remaster:local .

# Bring the stack up in the background and stream logs.
up:
    docker compose up -d --build
    @echo "Avalon up at http://localhost:3000  (curl /health to verify)"

# Tail logs.
logs:
    docker compose logs -f avalon

# Stop and remove the stack.
down:
    docker compose down

# Open a shell in the running container.
sh:
    docker compose exec avalon /bin/sh

# Quick smoke against the running compose stack.
smoke:
    @curl -fsS http://localhost:3000/health && echo
    @curl -fsSI http://localhost:3000/ | head -3
    @curl -fsSI http://localhost:3000/play/foo | head -3

# ─── Azure Container Apps deploy ────────────────────────────────────────

# Provision (first time) OR redeploy from local source. `az containerapp up`
# is the one-shot command — it creates the resource group + Container Apps
# environment + Azure Container Registry + the app on the first run, and
# rebuilds + redeploys on every subsequent run.
#
# Requires `az login` (you've already done this). The build runs in ACR's
# managed build (no local Docker needed) — Apple Silicon hosts skip the
# linux/amd64 dance.
deploy-azure:
    az containerapp up \
      --name {{azure_name}} \
      --resource-group {{azure_rg}} \
      --location {{azure_location}} \
      --environment {{azure_environment}} \
      --source . \
      --ingress external \
      --target-port 3000 \
      --transport auto \
      {{ if public_ws_origin == "" { "" } else { "--env-vars PUBLIC_AVALON_WS_ORIGIN=" + public_ws_origin } }}
    @echo
    @just azure-url

# Show the deployed app's public hostname.
azure-url:
    @az containerapp show \
      --name {{azure_name}} \
      --resource-group {{azure_rg}} \
      --query "properties.configuration.ingress.fqdn" \
      -o tsv \
      | awk '{print "https://"$0"/"}'

# Tail the container's stdout/stderr.
azure-logs:
    az containerapp logs show \
      --name {{azure_name}} \
      --resource-group {{azure_rg}} \
      --follow

# Restart the running revision (useful after env var changes).
azure-restart:
    az containerapp revision restart \
      --name {{azure_name}} \
      --resource-group {{azure_rg}} \
      --revision $(az containerapp show -n {{azure_name}} -g {{azure_rg}} --query "properties.latestRevisionName" -o tsv)

# Show resource group + app status at a glance.
azure-status:
    az group show --name {{azure_rg}} --query "{name:name,state:properties.provisioningState}" -o table
    az containerapp show --name {{azure_name}} --resource-group {{azure_rg}} \
      --query "{name:name,fqdn:properties.configuration.ingress.fqdn,revision:properties.latestRevisionName,running:properties.runningStatus}" -o table

# Tear EVERYTHING down (resource group + every resource in it). Asks for
# confirmation; --no-wait so it returns immediately while Azure deletes
# behind the scenes.
azure-delete:
    @echo "About to delete resource group {{azure_rg}} (and everything in it)."
    @echo "Press Ctrl-C within 5 s to abort."
    @sleep 5
    az group delete --name {{azure_rg}} --yes --no-wait
    @echo "Deletion queued. `az group list` to check progress."
