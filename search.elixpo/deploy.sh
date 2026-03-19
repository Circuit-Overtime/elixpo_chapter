#!/bin/bash

# Usage:
#   ./deploy.sh start              # Start single container
#   ./deploy.sh start 3            # Start with 3 containers
#   ./deploy.sh scale 5            # Scale to 5 containers
#   ./deploy.sh stop               # Stop all containers
#   ./deploy.sh logs               # View nginx logs
#   ./deploy.sh logs app           # View app logs
#   ./deploy.sh health             # Check all services
#   ./deploy.sh restart            # Restart all services
#   ./deploy.sh clean              # Clean up volumes
#   ./deploy.sh backup             # Backup Redis data

set -e
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

COMPOSE_FILE="docker-compose.yml"

# Only validate container count for commands that use it
case "${1:-help}" in
    start|scale|stary|quick)
        CONTAINER_COUNT=${2:-3}
        if ! [[ "$CONTAINER_COUNT" =~ ^[0-9]+$ ]]; then
            echo -e "${RED}✗${NC} Container count must be a number"
            exit 1
        fi
        ;;
esac

info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

check_env() {
    if [ ! -f ".env" ]; then
        error ".env file not found in root directory"
        info "Use the root .env file with:"
        echo "  TOKEN=your_token"
        echo "  MODEL=your_model"
        echo "  IMAGE_MODEL=your_image_model"
        echo "  HF_TOKEN=your_hf_token"
        exit 1
    fi
}

check_docker() {
    if ! command -v docker compose &> /dev/null; then
        error "docker compose is not installed"
        exit 1
    fi
}

start_services() {
    local count=$1
    check_env
    check_docker

    info "Starting lixSearch with $count container(s)..."

    if [ "$count" -eq 1 ]; then
        docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
    else
        docker compose -f "$COMPOSE_FILE" up -d --remove-orphans --scale lixsearch-app="$count"
    fi

    info "Waiting for services to be healthy (90 seconds)..."
    sleep 90

    success "Services started"
    show_status
}

build_image() {
    local no_cache=${1:-false}
    check_docker

    info "Building lixSearch image..."
    
    if [ "$no_cache" = "true" ]; then
        info "Building with --no-cache flag (smallest image)..."
        docker compose -f "$COMPOSE_FILE" build --no-cache
    else
        docker compose -f "$COMPOSE_FILE" build
    fi

    success "Image built successfully"
}

scale_containers() {
    local count=$1
    if ! [[ "$count" =~ ^[0-9]+$ ]]; then
        error "Scale count must be a number"
        exit 1
    fi
    check_docker

    info "Scaling to $count container(s)..."
    docker compose -f "$COMPOSE_FILE" up -d --remove-orphans --scale lixsearch-app="$count"

    sleep 10
    success "Scaled to $count container(s)"
    show_status
}

stop_services() {
    check_docker
    info "Stopping all services..."
    docker compose -f "$COMPOSE_FILE" down
    success "Services stopped"
}

clean_volumes() {
    check_docker
    warning "This will delete all data (Redis, Chroma, Nginx cache)"
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        info "Removing containers and volumes..."
        docker compose -f "$COMPOSE_FILE" down -v
        success "Cleaned up"
    fi
}

show_status() {
    echo ""
    docker compose -f "$COMPOSE_FILE" ps
    echo ""
}

show_logs() {
    local service=${1:-nginx}
    check_docker

    case "$service" in
        app|lixsearch)
            docker compose -f "$COMPOSE_FILE" logs -f lixsearch-app
            ;;
        redis)
            docker compose -f "$COMPOSE_FILE" logs -f redis
            ;;
        chroma)
            docker compose -f "$COMPOSE_FILE" logs -f chroma-server
            ;;
        *)
            docker compose -f "$COMPOSE_FILE" logs -f nginx
            ;;
    esac
}

check_health() {
    check_docker
    echo ""
    info "Service Status:"
    show_status

    echo ""
    info "Health Checks:"

    if curl -s http://localhost/api/health > /dev/null 2>&1; then
        success "Nginx & API: HEALTHY"
    else
        error "Nginx & API: UNREACHABLE"
    fi

    if docker compose -f "$COMPOSE_FILE" exec redis redis-cli ping > /dev/null 2>&1; then
        success "Redis: HEALTHY"
    else
        error "Redis: UNREACHABLE"
    fi

    if docker compose -f "$COMPOSE_FILE" exec chroma-server curl -s http://localhost:8000/api/version > /dev/null 2>&1; then
        success "Chroma: HEALTHY"
    else
        error "Chroma: UNREACHABLE"
    fi

    echo ""
}

restart_services() {
    check_docker
    info "Restarting all services..."
    docker compose -f "$COMPOSE_FILE" restart
    sleep 10
    success "Services restarted"
    check_health
}

backup_redis() {
    check_docker
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_dir="backups"

    mkdir -p "$backup_dir"

    info "Backing up Redis data..."
    docker compose -f "$COMPOSE_FILE" exec redis redis-cli BGSAVE > /dev/null 2>&1

    sleep 2

    docker compose -f "$COMPOSE_FILE" cp redis:/data/dump.rdb \
        "$backup_dir/redis_dump_${timestamp}.rdb" 2>/dev/null || true

    success "Redis backed up to $backup_dir/redis_dump_${timestamp}.rdb"

    ls -t "$backup_dir"/redis_dump_* | tail -n +11 | xargs -r rm
}

test_scaling() {
    check_docker

    echo ""
    info "Testing scalability from 1 to 5 containers..."

    for count in 1 2 3 5; do
        info "Scaling to $count container(s)..."
        scale_containers "$count"

        sleep 5
        response=$(curl -s -w "\n%{http_code}" http://localhost/api/health)
        status=$(echo "$response" | tail -n1)

        if [ "$status" = "200" ]; then
            success "✓ $count container(s) - healthy"
        else
            error "✗ $count container(s) - unhealthy (HTTP $status)"
        fi
    done

    info "Scaling test complete"
    echo ""
}

show_help() {
    cat << EOF
${BLUE}lixSearch Production Deployment Helper${NC}

${YELLOW}Usage:${NC}
  ./deploy.sh COMMAND [ARGS]

${YELLOW}Commands:${NC}
  build [no-cache]  Build image (add 'no-cache' for --no-cache flag)
  stary [N]         Build with cache + start (default 3 containers)
  quick [N]         Rebuild app only + rolling restart (infra/dep changes)
  hotfix            Copy code into running containers + restart (fastest, code-only)
  start [N]         Start services (N containers, default 3)
  scale N           Scale to N containers
  stop              Stop all services
  restart           Restart all services
  health            Check service health
  logs [SERVICE]    Show logs (nginx|app|redis|chroma)
  backup            Backup Redis data
  clean             Remove all data (volumes)
  test-scale        Test scalability (1→2→3→5 containers)
  help              Show this help message

${YELLOW}Examples:${NC}
  ./deploy.sh build                       # Build with cache
  ./deploy.sh build no-cache              # Build smallest image (no-cache)
  ./deploy.sh start                       # Start single container
  ./deploy.sh start 3                     # Start with 3 containers
  ./deploy.sh scale 5                     # Scale to 5 containers
  ./deploy.sh logs app                    # View app logs
  ./deploy.sh health                      # Check all services
  ./deploy.sh backup                      # Backup Redis

${YELLOW}Environment:${NC}
  Use the root .env file with required variables:
    TOKEN=your_token
    MODEL=your_model
    IMAGE_MODEL=your_image_model
    HF_TOKEN=your_hf_token

${YELLOW}Quick Start:${NC}
  1. Ensure .env exists in root directory
  2. ./deploy.sh build no-cache
  3. ./deploy.sh start 3
  4. ./deploy.sh health

EOF
}

case "${1:-help}" in
    build)
        build_image "$2"
        ;;
    start)
        start_services "$CONTAINER_COUNT"
        ;;
    stary)
        info "Build + start with ${CONTAINER_COUNT} containers..."
        build_image "false"
        start_services "$CONTAINER_COUNT"
        ;;
    quick)
        info "Quick restart — rebuild app image only, rolling restart..."
        check_env
        check_docker
        docker compose -f "$COMPOSE_FILE" build lixsearch-app
        docker compose -f "$COMPOSE_FILE" up -d --remove-orphans --no-deps --scale lixsearch-app="${CONTAINER_COUNT}" lixsearch-app
        info "Waiting for health..."
        sleep 30
        success "App containers restarted (${CONTAINER_COUNT} replicas)"
        show_status
        ;;
    hotfix)
        info "Hotfix — copying code into running containers (no rebuild)..."
        check_docker
        containers=$(docker compose -f "$COMPOSE_FILE" ps -q lixsearch-app 2>/dev/null)
        if [ -z "$containers" ]; then
            error "No running app containers found"
            exit 1
        fi
        count=0
        for cid in $containers; do
            cname=$(docker inspect --format '{{.Name}}' "$cid" | sed 's|^/||')
            docker cp lixsearch/. "$cid":/app/lixsearch/
            docker cp openapi.yaml "$cid":/app/openapi.yaml
            docker cp public/. "$cid":/app/public/
            info "  Updated $cname"
            count=$((count + 1))
        done
        # Also update ipc-service if running
        ipc_cid=$(docker compose -f "$COMPOSE_FILE" ps -q ipc-service 2>/dev/null)
        if [ -n "$ipc_cid" ]; then
            docker cp lixsearch/. "$ipc_cid":/app/lixsearch/
            info "  Updated ipc-service"
        fi
        info "Restarting $count app container(s)..."
        docker compose -f "$COMPOSE_FILE" restart lixsearch-app
        sleep 15
        success "Hotfix applied to $count container(s)"
        show_status
        ;;
    scale)
        if [ -z "$2" ]; then
            error "scale requires a number (e.g., ./deploy.sh scale 3)"
            exit 1
        fi
        scale_containers "$2"
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    health)
        check_health
        ;;
    logs)
        show_logs "$2"
        ;;
    backup)
        backup_redis
        ;;
    clean)
        clean_volumes
        ;;
    test-scale)
        test_scaling
        ;;
    status)
        show_status
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
