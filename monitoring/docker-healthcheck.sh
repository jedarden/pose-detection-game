#!/bin/bash

# Docker Health Check Script for Pose Detection Game
# This script performs comprehensive health checks for the application

set -e

# Configuration
HEALTH_ENDPOINT="http://localhost:${PORT:-3000}/health"
READY_ENDPOINT="http://localhost:${PORT:-3000}/ready"
TIMEOUT=10
MAX_RETRIES=3

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1"
}

log_success() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${GREEN}SUCCESS:${NC} $1"
}

log_warning() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${YELLOW}WARNING:${NC} $1"
}

log_error() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${RED}ERROR:${NC} $1"
}

# Check if curl is available
if ! command -v curl &> /dev/null; then
    log_error "curl is not installed"
    exit 1
fi

# Health check function
check_health() {
    local endpoint=$1
    local description=$2
    local retry_count=0
    
    while [ $retry_count -lt $MAX_RETRIES ]; do
        log_info "Checking $description (attempt $((retry_count + 1))/$MAX_RETRIES)"
        
        if curl -f -s --max-time $TIMEOUT "$endpoint" > /dev/null 2>&1; then
            log_success "$description check passed"
            return 0
        else
            retry_count=$((retry_count + 1))
            if [ $retry_count -lt $MAX_RETRIES ]; then
                log_warning "$description check failed, retrying in 2 seconds..."
                sleep 2
            fi
        fi
    done
    
    log_error "$description check failed after $MAX_RETRIES attempts"
    return 1
}

# Check detailed health information
check_detailed_health() {
    log_info "Fetching detailed health information..."
    
    local response
    response=$(curl -f -s --max-time $TIMEOUT "$HEALTH_ENDPOINT" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        echo "$response" | grep -q '"status":"healthy"'
        if [ $? -eq 0 ]; then
            log_success "Application reports healthy status"
            
            # Extract additional information
            local uptime
            uptime=$(echo "$response" | grep -o '"uptime":[0-9.]*' | cut -d':' -f2)
            if [ -n "$uptime" ]; then
                log_info "Application uptime: ${uptime} seconds"
            fi
            
            return 0
        else
            log_error "Application reports unhealthy status"
            return 1
        fi
    else
        log_error "Failed to fetch health information"
        return 1
    fi
}

# Check memory usage
check_memory() {
    log_info "Checking memory usage..."
    
    local response
    response=$(curl -f -s --max-time $TIMEOUT "$HEALTH_ENDPOINT" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        local rss
        rss=$(echo "$response" | grep -o '"rss":[0-9]*' | cut -d':' -f2)
        
        if [ -n "$rss" ]; then
            local rss_mb=$((rss / 1024 / 1024))
            log_info "RSS Memory usage: ${rss_mb} MB"
            
            # Check if memory usage is too high (over 500MB)
            if [ $rss_mb -gt 500 ]; then
                log_warning "High memory usage detected: ${rss_mb} MB"
            fi
        fi
    fi
}

# Check process existence
check_process() {
    log_info "Checking if Node.js process is running..."
    
    if pgrep -f "node.*server.js" > /dev/null; then
        log_success "Node.js process is running"
        return 0
    else
        log_error "Node.js process not found"
        return 1
    fi
}

# Main health check routine
main() {
    log_info "Starting comprehensive health check..."
    
    # Basic health check
    if ! check_health "$HEALTH_ENDPOINT" "Basic health"; then
        exit 1
    fi
    
    # Readiness check
    if ! check_health "$READY_ENDPOINT" "Readiness"; then
        log_warning "Readiness check failed, but health check passed"
    fi
    
    # Detailed health check
    if ! check_detailed_health; then
        exit 1
    fi
    
    # Memory check
    check_memory
    
    # Process check (only if running inside container)
    if [ -f /.dockerenv ]; then
        if ! check_process; then
            exit 1
        fi
    fi
    
    log_success "All health checks passed"
    exit 0
}

# Run main function
main "$@"