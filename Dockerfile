# Multi-stage Docker build for Pose Detection Game
# Stage 1: Build the React application
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build the React application
RUN npm run build

# Stage 2: Production image with nginx
FROM nginx:alpine AS production

# Install additional runtime dependencies
RUN apk add --no-cache \
    curl \
    && rm -rf /var/cache/apk/*

# Copy built React app from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Create nginx configuration for SPA
COPY nginx.conf /etc/nginx/nginx.conf

# Create nginx user for proper permissions and directories
RUN chown -R nginx:nginx /usr/share/nginx/html

# Note: Running nginx as root is required for binding to port 3000
# The nginx worker processes will still run as nginx user

# Expose configurable port (default 3000)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]