#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# 7-Agent Price Intelligence Dashboard — Interactive Management Script (Linux/macOS)
# Author: Lalit Nayyar <lalitnayyar@gmail.com> | +971508320336 | +919595353336
# Version: 1.0.0
# Usage: chmod +x manage.sh && ./manage.sh
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
SCRIPT_VERSION="1.0.0"
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

show_status() {
    log_info "Container Status:"
    local status
    status="$(get_container_status)"
    if [[ "$status" == "running" ]]; then
        log_success "Container '$CONTAINER_NAME' is RUNNING"
        local port
        port="$(docker port "$CONTAINER_NAME" 80 2>/dev/null || echo "")"
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

    log_step "Starting container..."
    local env_arg=""
    [[ -f "$env_file" ]] && env_arg="--env-file $env_file"
    # shellcheck disable=SC2086
    docker run -d \
        --name "$CONTAINER_NAME" \
        --restart unless-stopped \
        -p "${DEFAULT_PORT}:80" \
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

            log_step "Rebuilding Docker image..."
            docker build -t "${IMAGE_NAME}:latest" "$PROJECT_ROOT"

            log_step "Restarting container..."
            docker stop "$CONTAINER_NAME" 2>/dev/null || true
            docker rm "$CONTAINER_NAME" 2>/dev/null || true
            local env_file="$PROJECT_ROOT/.env"
            local env_arg=""
            [[ -f "$env_file" ]] && env_arg="--env-file $env_file"
            # shellcheck disable=SC2086
            docker run -d --name "$CONTAINER_NAME" --restart unless-stopped \
                -p "${DEFAULT_PORT}:80" $env_arg "${IMAGE_NAME}:latest"
            log_success "Rebuild complete! Dashboard: http://localhost:${DEFAULT_PORT}"
        fi
    else
        log_success "Already up to date (HEAD matches origin/main)"
    fi
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
    # shellcheck disable=SC2086
    docker run -d --name "$CONTAINER_NAME" --restart unless-stopped \
        -p "${DEFAULT_PORT}:80" $env_arg "${IMAGE_NAME}:latest"

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
            local env_arg=""
            [[ -f "$env_file" ]] && env_arg="--env-file $env_file"
            # shellcheck disable=SC2086
            docker run -d --name "$CONTAINER_NAME" --restart unless-stopped \
                -p "${DEFAULT_PORT}:80" $env_arg "${IMAGE_NAME}:latest"
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
    echo -e "  ${GRAY}│   ${WHITE}[5] Pull Latest Code & Rebuild${GRAY}                             │${NC}"
    echo -e "  ${GRAY}│   ${WHITE}[6] Patch (Hot Patch — rebuild only)${GRAY}                       │${NC}"
    echo -e "  ${GRAY}│   ${WHITE}[7] Fix (Diagnostics + Auto-Fix)${GRAY}                           │${NC}"
    echo -e "  ${GRAY}├─────────────────────────────────────────────────────────────┤${NC}"
    echo -e "  ${GRAY}│  ${WHITE}LOGS & MONITORING${GRAY}                                           │${NC}"
    echo -e "  ${GRAY}│   ${WHITE}[8] Collect All Logs + ZIP for Review${GRAY}                      │${NC}"
    echo -e "  ${GRAY}│   ${WHITE}[9] Follow Live Logs${GRAY}                                       │${NC}"
    echo -e "  ${GRAY}├─────────────────────────────────────────────────────────────┤${NC}"
    echo -e "  ${GRAY}│  ${WHITE}OTHER${GRAY}                                                       │${NC}"
    echo -e "  ${GRAY}│  ${WHITE}[10] Open Dashboard in Browser${GRAY}                              │${NC}"
    echo -e "  ${GRAY}│  ${WHITE}[11] Cleanup (Remove All)${GRAY}                                   │${NC}"
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
        pull)     pull_and_rebuild ;;
        patch)    patch_app ;;
        fix)      fix_app ;;
        logs)     collect_logs ;;
        live)     live_logs ;;
        cleanup)  cleanup_app ;;
        status)   show_status ;;
        *)        echo "Usage: $0 [deploy|start|stop|restart|pull|patch|fix|logs|live|cleanup|status]" ;;
    esac
    exit 0
fi

# Interactive menu
while true; do
    show_menu
    read -rp "  Enter choice: " choice
    echo ""
    case "$choice" in
        1)  deploy_app ;;
        2)  start_app ;;
        3)  stop_app ;;
        4)  restart_app ;;
        5)  pull_and_rebuild ;;
        6)  patch_app ;;
        7)  fix_app ;;
        8)  collect_logs ;;
        9)  live_logs ;;
        10) open_browser ;;
        11) cleanup_app ;;
        0)  log_info "Goodbye!"; exit 0 ;;
        *)  log_warn "Invalid choice. Please enter 0-11." ;;
    esac
    echo ""
    read -rp "  Press Enter to return to menu..."
done
