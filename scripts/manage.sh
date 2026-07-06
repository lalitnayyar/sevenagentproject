#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# 7-Agent Price Intelligence Dashboard — Interactive Management Script (Linux/macOS)
# Author: Lalit Nayyar <lalitnayyar@gmail.com> | +971508320336 | +919595353336
# Version: 2.0.0
# Usage: chmod +x manage.sh && ./manage.sh
#        ./manage.sh update   ← recommended: pull + rmi + rebuild + restart
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
SCRIPT_VERSION="2.0.0"
APP_NAME="agent-dashboard"
REPO_URL="https://github.com/lalitnayyar/sevenagentproject.git"
CONTAINER_NAME="agent-dashboard"
IMAGE_NAME="agent-dashboard"
DEFAULT_PORT="${DASHBOARD_PORT:-3000}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; WHITE='\033[1;37m'
GRAY='\033[0;90m'; NC='\033[0m' # No Color

log_success() { echo -e "  ${GREEN}✓${NC} $1"; }
log_info()    { echo -e "  ${CYAN}ℹ${NC} $1"; }
log_warn()    { echo -e "  ${YELLOW}⚠${NC} $1"; }
log_err()     { echo -e "  ${RED}✗${NC} $1"; }
log_step()    { echo -e "  ${BLUE}→${NC} $1"; }


# ── Splash Screen ─────────────────────────────────────────────────────────────
show_splash() {
    clear
    echo ""
    echo -e "${CYAN}  ╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}  ║                                                                              ║${NC}"
    echo -e "${CYAN}  ║   ███████╗███████╗██╗   ██╗███████╗███╗   ██╗ █████╗  ██████╗ ███████╗      ║${NC}"
    echo -e "${CYAN}  ║   ██╔════╝██╔════╝██║   ██║██╔════╝████╗  ██║██╔══██╗██╔════╝ ██╔════╝      ║${NC}"
    echo -e "${CYAN}  ║   ███████╗█████╗  ██║   ██║█████╗  ██╔██╗ ██║███████║██║  ███╗█████╗        ║${NC}"
    echo -e "${CYAN}  ║   ╚════██║██╔══╝  ╚██╗ ██╔╝██╔══╝  ██║╚██╗██║██╔══██║██║   ██║██╔══╝        ║${NC}"
    echo -e "${CYAN}  ║   ███████║███████╗ ╚████╔╝ ███████╗██║ ╚████║██║  ██║╚██████╔╝███████╗      ║${NC}"
    echo -e "${CYAN}  ║   ╚══════╝╚══════╝  ╚═══╝  ╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝      ║${NC}"
    echo -e "${CYAN}  ║                                                                              ║${NC}"
    echo -e "${CYAN}  ║${WHITE}         7-Agent Price Intelligence Dashboard — Management Console${CYAN}         ║${NC}"
    echo -e "${CYAN}  ║${WHITE}                      Docker and Deployment Toolkit  v${SCRIPT_VERSION}${CYAN}                 ║${NC}"
    echo -e "${CYAN}  ║                                                                              ║${NC}"
    echo -e "${CYAN}  ╠══════════════════════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}  ║                                                                              ║${NC}"
    echo -e "${CYAN}  ║${WHITE}   Author   :  Lalit Nayyar${CYAN}                                                ║${NC}"
    echo -e "${CYAN}  ║${WHITE}   Email    :  lalitnayyar@gmail.com${CYAN}                                       ║${NC}"
    echo -e "${CYAN}  ║${WHITE}   Phone    :  +971 508 320 336  (UAE)  |  +91 959 535 3336  (India)${CYAN}      ║${NC}"
    echo -e "${CYAN}  ║${WHITE}   GitHub   :  github.com/lalitnayyar/sevenagentproject${CYAN}                    ║${NC}"
    echo -e "${CYAN}  ║${WHITE}   Role     :  Product Designer · Software Developer · Software Architect${CYAN}  ║${NC}"
    echo -e "${CYAN}  ║                                                                              ║${NC}"
    echo -e "${CYAN}  ╠══════════════════════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${YELLOW}  ║                                                                              ║${NC}"
    echo -e "${YELLOW}  ║   DISCLAIMER:                                                                ║${NC}"
    echo -e "${YELLOW}  ║   This software is provided for educational and research purposes only.      ║${NC}"
    echo -e "${YELLOW}  ║   Use of this tool to interact with live AI APIs (OpenAI, Anthropic,         ║${NC}"
    echo -e "${YELLOW}  ║   Modal.com, HuggingFace, Pushover) will consume real API credits and        ║${NC}"
    echo -e "${YELLOW}  ║   may incur charges on your accounts. The author accepts no liability        ║${NC}"
    echo -e "${YELLOW}  ║   for unintended usage, data loss, or financial charges arising from         ║${NC}"
    echo -e "${YELLOW}  ║   the use of this software. Always review your API usage dashboards.         ║${NC}"
    echo -e "${YELLOW}  ║   By continuing, you acknowledge and accept these terms.                     ║${NC}"
    echo -e "${CYAN}  ║                                                                              ║${NC}"
    echo -e "${CYAN}  ╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${GRAY}Loading in 5 seconds... Press Enter to skip${NC}"
    echo ""
    # 5-second countdown with animated progress bar
    local i
    for i in 5 4 3 2 1; do
        local filled=$(( (5 - i) * 8 ))
        local bar=""
        local j
        for (( j=0; j<filled; j++ )); do bar+="\u2588"; done
        for (( j=filled; j<40; j++ )); do bar+="\u2591"; done
        printf "\r  ${CYAN}  [%s]  ${WHITE}%d sec${NC}  " "$bar" "$i"
        if read -r -t 1 -s -n 1 2>/dev/null; then
            break
        fi
    done
    printf "\r  ${GREEN}  [\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588]  Ready!${NC}  \n"
    echo ""
}

# ── Header ────────────────────────────────────────────────────────────────────
show_header() {
    clear
    echo ""
    echo -e "  ${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "  ${CYAN}║   7-Agent Price Intelligence Dashboard — Management Console  ║${NC}"
    echo -e "  ${CYAN}║   Author: Lalit Nayyar  |  v${SCRIPT_VERSION}                          ║${NC}"
    echo -e "  ${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# ── Helpers ───────────────────────────────────────────────────────────────────
check_docker() {
    if ! docker info &>/dev/null; then
        log_err "Docker is not running. Please start Docker."
        return 1
    fi
    log_success "Docker is running"
    return 0
}

check_git() {
    if ! command -v git &>/dev/null; then
        log_err "Git is not installed."
        return 1
    fi
    return 0
}

get_container_status() {
    docker inspect --format='{{.State.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "not_found"
}

# Kill whatever process (Docker or otherwise) is holding a given port
kill_port() {
    local port="${1:-$DEFAULT_PORT}"
    log_step "Checking if port ${port} is in use..."

    # 1. Kill any Docker container that has mapped this host port
    local containers_on_port
    containers_on_port=$(docker ps --format '{{.Names}}' | while read -r name; do
        docker port "$name" 2>/dev/null | grep -q "0\.0\.0\.0:${port}->" && echo "$name"
    done)
    if [[ -n "$containers_on_port" ]]; then
        log_warn "Docker container(s) using port ${port}: $containers_on_port"
        for c in $containers_on_port; do
            log_step "Stopping container: $c"
            docker stop "$c" 2>/dev/null || true
            docker rm   "$c" 2>/dev/null || true
        done
        log_success "Conflicting container(s) stopped"
        return 0
    fi

    # 2. Kill any OS-level process holding the port (Linux: ss/fuser, macOS: lsof)
    local pid=""
    if command -v ss &>/dev/null; then
        pid=$(ss -tlnp 2>/dev/null | awk -v p=":${port}" '$4 ~ p {match($6,/pid=([0-9]+)/,a); if(a[1]) print a[1]}')
    fi
    if [[ -z "$pid" ]] && command -v lsof &>/dev/null; then
        pid=$(lsof -ti tcp:"${port}" 2>/dev/null | head -1)
    fi
    if [[ -z "$pid" ]] && command -v fuser &>/dev/null; then
        pid=$(fuser "${port}/tcp" 2>/dev/null | awk '{print $1}')
    fi

    if [[ -n "$pid" ]]; then
        log_warn "Port ${port} held by PID ${pid} — killing..."
        kill -9 "$pid" 2>/dev/null || true
        sleep 1
        log_success "PID ${pid} killed — port ${port} is now free"
    else
        log_success "Port ${port} is free"
    fi
}

show_status() {
    log_info "Container Status:"
    local status
    status="$(get_container_status)"
    if [[ "$status" == "running" ]]; then
        log_success "Container '$CONTAINER_NAME' is RUNNING"
        local port
        port="$(docker port "$CONTAINER_NAME" 3000 2>/dev/null || echo "")"
        [[ -n "$port" ]] && log_info "  Accessible at: http://localhost:${DEFAULT_PORT}"
    elif [[ "$status" != "not_found" ]]; then
        log_warn "Container '$CONTAINER_NAME' status: $status"
    else
        log_info "Container '$CONTAINER_NAME' does not exist"
    fi
    echo ""
    log_info "All containers:"
    docker ps --filter "name=${APP_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || true
}

# ── Operations ────────────────────────────────────────────────────────────────

deploy_app() {
    show_header
    echo -e "  ${WHITE}DEPLOY — Full Build & Start${NC}"
    echo -e "  ${GRAY}─────────────────────────────────────────────────────────────${NC}"
    echo ""
    check_docker || return

    # Setup .env
    local env_file="$PROJECT_ROOT/.env"
    local env_template="$PROJECT_ROOT/.env.template"
    if [[ ! -f "$env_file" ]]; then
        if [[ -f "$env_template" ]]; then
            cp "$env_template" "$env_file"
            log_warn ".env not found — copied from .env.template"
            log_warn "Please edit .env with your API keys before continuing!"
            echo ""
            read -rp "  Press Enter after editing .env to continue (or Ctrl+C to abort)..."
        else
            log_warn ".env.template not found. Proceeding without .env"
        fi
    fi

    log_step "Pulling latest base images..."
    docker pull node:22-alpine
    docker pull nginx:1.27-alpine

    log_step "Building Docker image..."
    docker build -t "${IMAGE_NAME}:latest" "$PROJECT_ROOT"
    log_success "Image built successfully"

    log_step "Stopping existing container (if any)..."
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    docker rm "$CONTAINER_NAME" 2>/dev/null || true

    kill_port "${DEFAULT_PORT}"
    log_step "Starting container..."
    local env_arg=""
    [[ -f "$env_file" ]] && env_arg="--env-file $env_file"
    # shellcheck disable=SC2086
    docker run -d \
        --name "$CONTAINER_NAME" \
        --restart unless-stopped \
        -p "${DEFAULT_PORT}:3000" \
        $env_arg \
        "${IMAGE_NAME}:latest"

    log_step "Waiting for health check..."
    sleep 5
    local health
    health="$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "unknown")"
    if [[ "$health" == "healthy" ]]; then
        log_success "Container is healthy!"
    else
        log_info "Health status: $health (may still be starting)"
    fi

    log_success "Deployment complete!"
    log_info "Dashboard: http://localhost:${DEFAULT_PORT}"
    echo ""
}

start_app() {
    show_header
    echo -e "  ${WHITE}START — Start Containers${NC}"
    echo ""
    check_docker || return

    local status
    status="$(get_container_status)"
    if [[ "$status" == "running" ]]; then
        log_warn "Container is already running"
        return
    fi

    if [[ "$status" == "exited" || "$status" == "stopped" ]]; then
        log_step "Starting existing container..."
        docker start "$CONTAINER_NAME"
    else
        log_step "Using docker compose..."
        docker compose -f "$PROJECT_ROOT/docker-compose.yml" up -d
    fi

    log_success "Started! Dashboard: http://localhost:${DEFAULT_PORT}"
}

stop_app() {
    show_header
    echo -e "  ${WHITE}STOP — Stop Containers${NC}"
    echo ""
    check_docker || return

    log_step "Stopping container..."
    docker stop "$CONTAINER_NAME" 2>/dev/null || log_warn "Container was not running"
    log_success "Container stopped"

    read -rp "  Remove container too? (y/N): " choice
    if [[ "$choice" =~ ^[Yy]$ ]]; then
        docker rm "$CONTAINER_NAME" 2>/dev/null || true
        log_success "Container removed"
    fi
}

restart_app() {
    show_header
    echo -e "  ${WHITE}RESTART — Restart Containers${NC}"
    echo ""
    check_docker || return
    log_step "Restarting container..."
    docker restart "$CONTAINER_NAME"
    log_success "Restarted! Dashboard: http://localhost:${DEFAULT_PORT}"
}

pull_and_rebuild() {
    show_header
    echo -e "  ${WHITE}PULL & REBUILD — Pull Latest Code and Rebuild${NC}"
    echo ""
    check_docker || return
    check_git || return

    cd "$PROJECT_ROOT"

    log_step "Fetching latest changes from GitHub..."
    git fetch origin 2>&1 || { log_err "git fetch failed. Check network/credentials."; return; }

    local behind
    behind="$(git rev-list HEAD..origin/main --count 2>/dev/null || echo "0")"

    if [[ "$behind" -gt 0 ]]; then
        log_info "  $behind new commit(s) available"
        read -rp "  Pull and rebuild? (Y/n): " choice
        if [[ ! "$choice" =~ ^[Nn]$ ]]; then
            git pull origin main
            log_success "Code updated"

            log_step "Stopping and removing old container..."
            docker stop "$CONTAINER_NAME" 2>/dev/null || true
            docker rm   "$CONTAINER_NAME" 2>/dev/null || true

            log_step "Removing old Docker image (ensures clean rebuild — no stale layers)..."
            docker rmi "${IMAGE_NAME}:latest" 2>/dev/null || true

            log_step "Rebuilding Docker image (this may take 2-5 minutes)..."
            docker build -t "${IMAGE_NAME}:latest" "$PROJECT_ROOT"

            kill_port "${DEFAULT_PORT}"
            log_step "Starting updated container..."
            local env_file="$PROJECT_ROOT/.env"
            local env_arg=""
            [[ -f "$env_file" ]] && env_arg="--env-file $env_file"
            # shellcheck disable=SC2086
            docker run -d --name "$CONTAINER_NAME" --restart unless-stopped \
                -p "${DEFAULT_PORT}:3000" $env_arg "${IMAGE_NAME}:latest"
            log_success "Update complete! Dashboard: http://localhost:${DEFAULT_PORT}"
        fi
    else
        log_info "Already up to date — forcing clean rebuild anyway..."
        read -rp "  Force rebuild even though code is current? (y/N): " choice
        if [[ "$choice" =~ ^[Yy]$ ]]; then
            docker stop "$CONTAINER_NAME" 2>/dev/null || true
            docker rm   "$CONTAINER_NAME" 2>/dev/null || true
            docker rmi "${IMAGE_NAME}:latest" 2>/dev/null || true
            docker build -t "${IMAGE_NAME}:latest" "$PROJECT_ROOT"
            local env_file="$PROJECT_ROOT/.env"
            local env_arg=""
            [[ -f "$env_file" ]] && env_arg="--env-file $env_file"
            kill_port "${DEFAULT_PORT}"
            # shellcheck disable=SC2086
            docker run -d --name "$CONTAINER_NAME" --restart unless-stopped \
                -p "${DEFAULT_PORT}:3000" $env_arg "${IMAGE_NAME}:latest"
            log_success "Rebuild complete! Dashboard: http://localhost:${DEFAULT_PORT}"
        else
            log_success "Nothing to do."
        fi
    fi
}

update_app() {
    show_header
    echo -e "  ${WHITE}UPDATE — Full Update: Pull + Remove Old Image + Rebuild + Restart${NC}"
    echo -e "  ${GRAY}  This is the recommended way to apply all code and Docker changes.${NC}"
    echo ""
    check_docker || return
    check_git || return

    cd "$PROJECT_ROOT"

    log_step "Pulling latest code from GitHub..."
    git pull origin main 2>&1 || { log_err "git pull failed. Check network/credentials."; return; }
    log_success "Code up to date — $(git log -1 --format='%h %s')"

    log_step "Stopping and removing old container..."
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    docker rm   "$CONTAINER_NAME" 2>/dev/null || true

    log_step "Removing old Docker image (prevents stale layer cache)..."
    docker rmi "${IMAGE_NAME}:latest" 2>/dev/null || true

    log_step "Rebuilding Docker image from scratch (2-5 minutes)..."
    docker build -t "${IMAGE_NAME}:latest" "$PROJECT_ROOT"
    log_success "Image rebuilt successfully"

    kill_port "${DEFAULT_PORT}"
    log_step "Starting updated container on port ${DEFAULT_PORT}..."
    local env_file="$PROJECT_ROOT/.env"
    local env_arg=""
    [[ -f "$env_file" ]] && env_arg="--env-file $env_file"
    # shellcheck disable=SC2086
    docker run -d --name "$CONTAINER_NAME" --restart unless-stopped \
        -p "${DEFAULT_PORT}:3000" $env_arg "${IMAGE_NAME}:latest"

    log_success "Update complete!"
    log_info  "Dashboard: http://localhost:${DEFAULT_PORT}"
    log_info  "Logs:      docker logs ${CONTAINER_NAME} --tail 20"
}

patch_app() {
    show_header
    echo -e "  ${WHITE}PATCH — Apply Hot Patch (rebuild without full stop)${NC}"
    echo ""
    check_docker || return

    log_step "Building new image with tag: patch-${TIMESTAMP}..."
    docker build -t "${IMAGE_NAME}:patch-${TIMESTAMP}" "$PROJECT_ROOT"

    log_step "Swapping container (minimal downtime)..."
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    docker rm "$CONTAINER_NAME" 2>/dev/null || true
    docker tag "${IMAGE_NAME}:patch-${TIMESTAMP}" "${IMAGE_NAME}:latest"

    local env_file="$PROJECT_ROOT/.env"
    local env_arg=""
    [[ -f "$env_file" ]] && env_arg="--env-file $env_file"
    kill_port "${DEFAULT_PORT}"
    # shellcheck disable=SC2086
    docker run -d --name "$CONTAINER_NAME" --restart unless-stopped \
        -p "${DEFAULT_PORT}:3000" $env_arg "${IMAGE_NAME}:latest"

    log_success "Patch applied! Dashboard: http://localhost:${DEFAULT_PORT}"
}

fix_app() {
    show_header
    echo -e "  ${WHITE}FIX — Diagnostics & Auto-Fix${NC}"
    echo ""
    check_docker || return

    log_step "Running diagnostics..."
    echo ""

    # Check 1: Container status
    local status
    status="$(get_container_status)"
    log_info "Container status: $status"

    # Check 2: Port
    if ss -tlnp 2>/dev/null | grep -q ":${DEFAULT_PORT}" || \
       netstat -tlnp 2>/dev/null | grep -q ":${DEFAULT_PORT}"; then
        log_warn "Port ${DEFAULT_PORT} is in use"
    else
        log_success "Port ${DEFAULT_PORT} is available"
    fi

    # Check 3: Image
    if docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^${IMAGE_NAME}:latest$"; then
        log_success "Docker image exists: ${IMAGE_NAME}:latest"
    else
        log_warn "Docker image not found — will rebuild"
    fi

    # Check 4: .env
    local env_file="$PROJECT_ROOT/.env"
    if [[ -f "$env_file" ]]; then
        log_success ".env file found"
        if grep -q "OPENAI_API_KEY=sk-" "$env_file" 2>/dev/null; then
            log_success "OPENAI_API_KEY is configured"
        else
            log_warn "OPENAI_API_KEY not configured in .env"
        fi
    else
        log_warn ".env file not found"
    fi

    # Check 5: Disk space
    local disk_free
    disk_free="$(df -h "$PROJECT_ROOT" | awk 'NR==2{print $4}')"
    log_info "Disk free: $disk_free"

    echo ""
    read -rp "  Auto-fix issues? (Y/n): " choice
    if [[ ! "$choice" =~ ^[Nn]$ ]]; then
        if [[ "$status" != "running" ]]; then
            log_step "Attempting to start container..."
            if ! docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^${IMAGE_NAME}:latest$"; then
                log_step "Building image first..."
                docker build -t "${IMAGE_NAME}:latest" "$PROJECT_ROOT"
            fi
            docker stop "$CONTAINER_NAME" 2>/dev/null || true
            docker rm "$CONTAINER_NAME" 2>/dev/null || true
            kill_port "${DEFAULT_PORT}"
            local env_arg=""
            [[ -f "$env_file" ]] && env_arg="--env-file $env_file"
            # shellcheck disable=SC2086
            docker run -d --name "$CONTAINER_NAME" --restart unless-stopped \
                -p "${DEFAULT_PORT}:3000" $env_arg "${IMAGE_NAME}:latest"
            log_success "Container started"
        fi
        log_step "Pruning unused Docker resources..."
        docker system prune -f
        log_success "Fix complete"
    fi
}

collect_logs() {
    show_header
    echo -e "  ${WHITE}COLLECT LOGS — Gather All Logs and Create ZIP Archive${NC}"
    echo ""
    check_docker || return

    local logs_dir="/tmp/agent-dashboard-logs-${TIMESTAMP}"
    mkdir -p "$logs_dir"
    log_step "Collecting logs to: $logs_dir"

    # Docker container logs
    log_step "Collecting Docker container logs..."
    docker logs "$CONTAINER_NAME" > "$logs_dir/container-stdout.log" 2>&1 || true
    docker logs "$CONTAINER_NAME" --since 24h > "$logs_dir/container-24h.log" 2>&1 || true
    log_success "Container logs collected"

    # Docker inspect
    log_step "Collecting container inspect info..."
    docker inspect "$CONTAINER_NAME" > "$logs_dir/container-inspect.json" 2>&1 || true
    docker stats "$CONTAINER_NAME" --no-stream > "$logs_dir/container-stats.txt" 2>&1 || true
    log_success "Container info collected"

    # Docker system info
    log_step "Collecting Docker system info..."
    docker system df > "$logs_dir/docker-system-df.txt" 2>&1 || true
    docker images > "$logs_dir/docker-images.txt" 2>&1 || true
    docker ps -a > "$logs_dir/docker-ps.txt" 2>&1 || true
    log_success "Docker system info collected"

    # App logs
    local app_logs_dir="$PROJECT_ROOT/.manus-logs"
    if [[ -d "$app_logs_dir" ]]; then
        log_step "Collecting app logs from .manus-logs/..."
        cp -r "$app_logs_dir/." "$logs_dir/app-logs/" 2>/dev/null || true
        log_success "App logs collected"
    fi

    # System info
    log_step "Collecting system info..."
    {
        echo "=== System Information ==="
        echo "Date: $(date)"
        echo "OS: $(uname -a)"
        echo "Hostname: $(hostname)"
        echo "User: $(whoami)"
        echo ""
        echo "=== Docker ==="
        docker --version
        docker compose version 2>/dev/null || true
        echo ""
        echo "=== Node.js ==="
        node --version 2>/dev/null || echo "not installed"
        echo ""
        echo "=== Git ==="
        git --version 2>/dev/null || echo "not installed"
        echo ""
        echo "=== Disk Usage ==="
        df -h
        echo ""
        echo "=== Memory ==="
        free -h 2>/dev/null || vm_stat 2>/dev/null || true
        echo ""
        echo "=== Network Interfaces ==="
        ip addr 2>/dev/null || ifconfig 2>/dev/null || true
        echo ""
        echo "=== Docker Networks ==="
        docker network ls
    } > "$logs_dir/system-info.txt" 2>&1
    log_success "System info collected"

    # Environment (redacted)
    log_step "Collecting environment config (keys redacted)..."
    local env_file="$PROJECT_ROOT/.env"
    if [[ -f "$env_file" ]]; then
        while IFS= read -r line; do
            if [[ "$line" =~ ^([^=]+)=(.+)$ ]]; then
                key="${BASH_REMATCH[1]}"
                if [[ "$key" =~ (KEY|TOKEN|SECRET|PASSWORD) ]]; then
                    echo "${key}=***REDACTED***"
                else
                    echo "$line"
                fi
            else
                echo "$line"
            fi
        done < "$env_file" > "$logs_dir/env-redacted.txt"
        log_success "Environment config collected (keys redacted)"
    fi

    # Nginx logs from container
    log_step "Collecting nginx access/error logs from container..."
    docker exec "$CONTAINER_NAME" cat /var/log/nginx/access.log > "$logs_dir/nginx-access.log" 2>/dev/null || true
    docker exec "$CONTAINER_NAME" cat /var/log/nginx/error.log > "$logs_dir/nginx-error.log" 2>/dev/null || true
    log_success "Nginx logs collected"

    # Create ZIP
    log_step "Creating ZIP archive..."
    local zip_path="$HOME/agent-dashboard-logs-${TIMESTAMP}.zip"
    cd /tmp
    zip -r "$zip_path" "agent-dashboard-logs-${TIMESTAMP}/" -x "*.DS_Store" 2>/dev/null || \
        tar -czf "${zip_path%.zip}.tar.gz" "agent-dashboard-logs-${TIMESTAMP}/"
    log_success "Archive created: $zip_path"

    # Cleanup temp
    rm -rf "$logs_dir"

    echo ""
    log_success "Log collection complete!"
    log_info "Archive: $zip_path"
    log_info "Size: $(du -sh "$zip_path" 2>/dev/null | cut -f1)"
}

cleanup_app() {
    show_header
    echo -e "  ${WHITE}CLEANUP — Remove Containers, Images, and Volumes${NC}"
    echo ""
    check_docker || return

    log_warn "This will remove the container, image, and volumes!"
    read -rp "  Are you sure? Type 'yes' to confirm: " choice
    if [[ "$choice" != "yes" ]]; then
        log_info "Cancelled."
        return
    fi

    log_step "Stopping and removing container..."
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    docker rm "$CONTAINER_NAME" 2>/dev/null || true

    log_step "Removing images..."
    docker rmi "${IMAGE_NAME}:latest" 2>/dev/null || true
    docker images --format "{{.Repository}}:{{.Tag}}" | grep "^${IMAGE_NAME}:patch-" | \
        xargs -r docker rmi 2>/dev/null || true

    log_step "Removing volumes..."
    docker volume rm agent-dashboard-data 2>/dev/null || true
    docker volume rm agent-dashboard-logs 2>/dev/null || true

    log_step "Pruning system..."
    docker system prune -f

    log_success "Cleanup complete"
}

live_logs() {
    show_header
    echo -e "  ${WHITE}LIVE LOGS — Following container logs (Ctrl+C to stop)${NC}"
    echo ""
    check_docker || return
    log_info "Following logs for container: $CONTAINER_NAME"
    echo ""
    docker logs -f --tail 50 "$CONTAINER_NAME"
}

open_browser() {
    local url="http://localhost:${DEFAULT_PORT}"
    if command -v xdg-open &>/dev/null; then
        xdg-open "$url"
    elif command -v open &>/dev/null; then
        open "$url"
    else
        log_info "Open in browser: $url"
    fi
    log_success "Opened $url"
}


apply_docker_patch() {
    show_header
    echo -e "  ${WHITE}APPLY DOCKER PATCH -- git pull + patch + rebuild in one shot${NC}"
    echo ""
    check_docker || return
    check_git || return
    cd "$PROJECT_ROOT"
    log_step "Fetching latest from GitHub (in-place pull, no reclone)..."
    git fetch origin 2>&1 || { log_err "git fetch failed. Check network/credentials."; return; }
    local behind
    behind="$(git rev-list HEAD..origin/main --count 2>/dev/null || echo 0)"
    log_info "Commits behind origin/main: $behind"
    log_step "Pulling latest code..."
    git pull origin main 2>&1 || { log_err "git pull failed."; return; }
    log_success "Code is up to date"
    # Apply patch if it exists and is not yet applied
    local patch_file="$PROJECT_ROOT/patches/docker-fix-v1.0.1.patch"
    if [[ -f "$patch_file" ]]; then
        log_step "Checking if docker patch is already applied..."
        if git apply --check "$patch_file" 2>/dev/null; then
            log_step "Applying Docker fix patch..."
            git apply "$patch_file" && log_success "Patch applied cleanly" || log_warn "Patch apply failed (may already be applied)"
        else
            log_info "Patch already applied or not needed -- skipping"
        fi
    else
        log_info "No patch file found -- skipping patch step"
    fi
    # Ensure .dockerignore exists (critical fix for pnpm-lock.yaml not found error)
    if [[ ! -f "$PROJECT_ROOT/.dockerignore" ]]; then
        log_step "Creating missing .dockerignore to fix build context issue..."
        printf "node_modules\ndist\n.git\n.gitignore\n.manus-logs\n*.log\n.DS_Store\n" > "$PROJECT_ROOT/.dockerignore"
        log_success ".dockerignore created"
    fi
    # Rebuild Docker image
    log_step "Rebuilding Docker image (this may take 2-5 minutes)..."
    docker build -t "${IMAGE_NAME}:latest" "$PROJECT_ROOT" 2>&1 | tail -20
    log_success "Docker image rebuilt successfully"
    # Restart container with zero downtime swap
    log_step "Restarting container..."
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    docker rm "$CONTAINER_NAME" 2>/dev/null || true
    kill_port "${DEFAULT_PORT}"
    local env_arg=""
    [[ -f "$PROJECT_ROOT/.env" ]] && env_arg="--env-file $PROJECT_ROOT/.env"
    # shellcheck disable=SC2086
    docker run -d --name "$CONTAINER_NAME" --restart unless-stopped \
        -p "${DEFAULT_PORT}:3000" $env_arg "${IMAGE_NAME}:latest"
    log_success "Container started!"
    log_info "Dashboard: http://localhost:${DEFAULT_PORT}"
}

# ── Main Menu ─────────────────────────────────────────────────────────────────
show_menu() {
    show_header
    show_status
    echo -e "  ${GRAY}┌─────────────────────────────────────────────────────────────┐${NC}"
    echo -e "  ${GRAY}│  ${WHITE}DEPLOYMENT${GRAY}                                                  │${NC}"
    echo -e "  ${GRAY}│   ${WHITE}[1] Deploy (Full Build + Start)${GRAY}                            │${NC}"
    echo -e "  ${GRAY}│   ${WHITE}[2] Start${GRAY}                                                  │${NC}"
    echo -e "  ${GRAY}│   ${WHITE}[3] Stop${GRAY}                                                   │${NC}"
    echo -e "  ${GRAY}│   ${WHITE}[4] Restart${GRAY}                                                │${NC}"
    echo -e "  ${GRAY}├─────────────────────────────────────────────────────────────┤${NC}"
    echo -e "  ${GRAY}│  ${WHITE}UPDATES & FIXES${GRAY}                                             │${NC}"
    echo -e "  ${GRAY}│   ${GREEN}[5] UPDATE  ← Recommended: pull + rmi + rebuild + restart${GRAY}  │${NC}"
    echo -e "  ${GRAY}│   ${WHITE}[6] Pull & Rebuild (interactive, shows commit count)${GRAY}       │${NC}"
    echo -e "  ${GRAY}│   ${WHITE}[7] Patch (Hot Patch — rebuild only, no pull)${GRAY}               │${NC}"
    echo -e "  ${GRAY}│   ${WHITE}[8] Fix (Diagnostics + Auto-Fix)${GRAY}                           │${NC}"
    echo -e "  ${GRAY}├─────────────────────────────────────────────────────────────┤${NC}"
    echo -e "  ${GRAY}│  ${WHITE}LOGS & MONITORING${GRAY}                                           │${NC}"
    echo -e "  ${GRAY}│   ${WHITE}[9] Collect All Logs + ZIP for Review${GRAY}                      │${NC}"
    echo -e "  ${GRAY}│  ${WHITE}[10] Follow Live Logs${GRAY}                                       │${NC}"
    echo -e "  ${GRAY}├─────────────────────────────────────────────────────────────┤${NC}"
    echo -e "  ${GRAY}│  ${WHITE}OTHER${GRAY}                                                       │${NC}"
    echo -e "  ${GRAY}│  ${WHITE}[11] Open Dashboard in Browser${GRAY}                              │${NC}"
    echo -e "  ${GRAY}│  ${WHITE}[12] Cleanup (Remove All)${GRAY}                                   │${NC}"
    echo -e "  ${GRAY}│  ${WHITE}[13] Apply Docker Patch (git pull + patch + rebuild)${GRAY}        │${NC}"
    echo -e "  ${GRAY}│   ${WHITE}[0] Exit${GRAY}                                                   │${NC}"
    echo -e "  ${GRAY}└─────────────────────────────────────────────────────────────┘${NC}"
    echo ""
}

# ── Entry Point ───────────────────────────────────────────────────────────────
# Handle direct command-line args
if [[ $# -gt 0 ]]; then
    case "$1" in
        deploy)   deploy_app ;;
        start)    start_app ;;
        stop)     stop_app ;;
        restart)  restart_app ;;
        update)   update_app ;;
        pull)     pull_and_rebuild ;;
        patch)    patch_app ;;
        fix)      fix_app ;;
        logs)     collect_logs ;;
        live)     live_logs ;;
        cleanup)  cleanup_app ;;
        apatch)   apply_docker_patch ;;
        status)   show_status ;;
        *)        echo "Usage: $0 [deploy|start|stop|restart|update|pull|patch|fix|logs|live|cleanup|apatch|status]"
                  echo ""
                  echo "  update  ← RECOMMENDED for applying new releases"
                  echo "           Runs: git pull + docker stop + docker rmi + docker build + docker run"
                  ;;
    esac
    exit 0
fi

# Interactive menu
show_splash
while true; do
    show_menu
    read -rp "  Enter choice: " choice
    echo ""
    case "$choice" in
        1)  deploy_app ;;
        2)  start_app ;;
        3)  stop_app ;;
        4)  restart_app ;;
        5)  update_app ;;
        6)  pull_and_rebuild ;;
        7)  patch_app ;;
        8)  fix_app ;;
        9)  collect_logs ;;
        10) live_logs ;;
        11) open_browser ;;
        12) cleanup_app ;;
        13) apply_docker_patch ;;
        0)  log_info "Goodbye!"; exit 0 ;;
        *)  log_warn "Invalid choice. Please enter 0-13." ;;
    esac
    echo ""
    read -rp "  Press Enter to return to menu..."
done
