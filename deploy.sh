#!/bin/bash

# Pose Detection Game Deployment Script
# This script handles deployment for different environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="pose-detection-game"
DEFAULT_PORT=3000

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_help() {
    cat << EOF
Pose Detection Game Deployment Script

Usage: $0 [OPTIONS] COMMAND

Commands:
    local       Deploy locally using Docker
    dev         Deploy development environment
    staging     Deploy to staging environment
    production  Deploy to production environment
    stop        Stop running containers
    clean       Clean up containers and images
    logs        Show container logs
    health      Check application health

Options:
    -p, --port PORT     Set the port (default: 3000)
    -e, --env ENV       Set environment file
    -h, --help          Show this help message
    -v, --verbose       Enable verbose output

Examples:
    $0 local                    # Deploy locally on port 3000
    $0 local --port 8080        # Deploy locally on port 8080
    $0 dev --env .env.dev       # Deploy dev with custom env file
    $0 production               # Deploy to production
    $0 logs                     # Show logs
    $0 health                   # Check health

EOF
}

check_requirements() {
    log_info "Checking requirements..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed or not in PATH"
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info &> /dev/null; then
        log_error "Docker is not running"
        exit 1
    fi
    
    log_success "All requirements satisfied"
}

build_image() {
    local tag=${1:-latest}
    log_info "Building Docker image with tag: $tag"
    
    docker build \
        --build-arg NODE_ENV=${NODE_ENV:-production} \
        --build-arg PORT=${PORT:-$DEFAULT_PORT} \
        -t ${PROJECT_NAME}:${tag} \
        .
    
    log_success "Docker image built successfully"
}

deploy_local() {
    log_info "Deploying locally on port ${PORT:-$DEFAULT_PORT}"
    
    # Create .env if it doesn't exist
    if [ ! -f .env ]; then
        log_info "Creating default .env file"
        cat > .env << EOF
NODE_ENV=development
PORT=${PORT:-$DEFAULT_PORT}
LOG_LEVEL=debug
CORS_ORIGIN=*
EOF
    fi
    
    # Build and run with docker-compose
    PORT=${PORT:-$DEFAULT_PORT} docker-compose up --build -d
    
    log_success "Application deployed locally"
    log_info "Access the application at: http://localhost:${PORT:-$DEFAULT_PORT}"
    log_info "Health check: http://localhost:${PORT:-$DEFAULT_PORT}/health"
}

deploy_dev() {
    log_info "Deploying development environment"
    
    export NODE_ENV=development
    export PORT=${PORT:-$DEFAULT_PORT}
    
    docker-compose up --build -d
    
    log_success "Development environment deployed"
}

deploy_staging() {
    log_info "Deploying to staging environment"
    
    export NODE_ENV=staging
    export PORT=${PORT:-$DEFAULT_PORT}
    
    # Use production compose file for staging
    docker-compose -f docker-compose.prod.yml up --build -d
    
    log_success "Staging environment deployed"
}

deploy_production() {
    log_info "Deploying to production environment"
    
    # Confirmation prompt
    read -p "Are you sure you want to deploy to production? (y/N): " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        log_warning "Production deployment cancelled"
        exit 0
    fi
    
    export NODE_ENV=production
    export PORT=${PORT:-$DEFAULT_PORT}
    
    # Build production image
    build_image "production"
    
    # Deploy with production compose
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait for health check
    log_info "Waiting for application to start..."
    sleep 30
    
    # Health check
    if health_check; then
        log_success "Production deployment successful"
    else
        log_error "Production deployment failed health check"
        exit 1
    fi
}

stop_services() {
    log_info "Stopping services..."
    
    docker-compose down
    docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
    
    log_success "Services stopped"
}

clean_up() {
    log_info "Cleaning up containers and images..."
    
    # Stop all containers
    stop_services
    
    # Remove containers
    docker-compose rm -f 2>/dev/null || true
    
    # Remove images
    docker rmi ${PROJECT_NAME}:latest 2>/dev/null || true
    docker rmi ${PROJECT_NAME}:production 2>/dev/null || true
    
    # Remove unused volumes
    docker volume prune -f
    
    log_success "Cleanup completed"
}

show_logs() {
    log_info "Showing container logs..."
    docker-compose logs -f --tail=100
}

health_check() {
    local port=${PORT:-$DEFAULT_PORT}
    local max_attempts=30
    local attempt=1
    
    log_info "Performing health check on port $port..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f "http://localhost:$port/health" &>/dev/null; then
            log_success "Health check passed"
            return 0
        fi
        
        log_info "Attempt $attempt/$max_attempts failed, retrying in 2 seconds..."
        sleep 2
        ((attempt++))
    done
    
    log_error "Health check failed after $max_attempts attempts"
    return 1
}

# Parse command line arguments
VERBOSE=false
PORT=$DEFAULT_PORT
ENV_FILE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--port)
            PORT="$2"
            shift 2
            ;;
        -e|--env)
            ENV_FILE="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        local|dev|staging|production|stop|clean|logs|health)
            COMMAND="$1"
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Enable verbose output if requested
if [ "$VERBOSE" = true ]; then
    set -x
fi

# Load environment file if specified
if [ -n "$ENV_FILE" ] && [ -f "$ENV_FILE" ]; then
    log_info "Loading environment from $ENV_FILE"
    source "$ENV_FILE"
fi

# Export PORT for docker-compose
export PORT

# Execute command
case "${COMMAND:-}" in
    local)
        check_requirements
        deploy_local
        ;;
    dev)
        check_requirements
        deploy_dev
        ;;
    staging)
        check_requirements
        deploy_staging
        ;;
    production)
        check_requirements
        deploy_production
        ;;
    stop)
        stop_services
        ;;
    clean)
        clean_up
        ;;
    logs)
        show_logs
        ;;
    health)
        health_check
        ;;
    "")
        log_error "No command specified"
        show_help
        exit 1
        ;;
    *)
        log_error "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac