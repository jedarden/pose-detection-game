# 🚀 Deployment Guide for Pose Detection Game

This guide covers deployment options for the Pose Detection Game using Docker and various environments.

## 📋 Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (for local development)
- Git

## 🏠 Local Development

### Quick Start
```bash
# Clone the repository
git clone <repository-url>
cd pose-detection-game

# Start with Docker Compose (recommended)
./deploy.sh local

# Or manually with npm
npm install
npm run dev
```

The application will be available at:
- **Application**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **API Status**: http://localhost:3000/api/health

### Environment Configuration

Copy the example environment file and customize:
```bash
cp .env.example .env
```

Key environment variables:
- `PORT`: Application port (default: 3000)
- `NODE_ENV`: Environment (development/staging/production)
- `LOG_LEVEL`: Logging level (debug/info/warn/error)

## 🐳 Docker Deployment

### Single Container (Development)
```bash
# Build and run
docker build -t pose-detection-game .
docker run -p 3000:3000 pose-detection-game
```

### Docker Compose (Recommended)
```bash
# Development environment
docker-compose up -d

# Production environment
docker-compose -f docker-compose.prod.yml up -d
```

### Configuration Options

The Docker image supports configurable ports through environment variables:
```bash
# Run on custom port
PORT=8080 docker-compose up -d
```

## 🌐 Production Deployment

### Using the Deployment Script
```bash
# Deploy to production (requires confirmation)
./deploy.sh production

# Deploy to staging
./deploy.sh staging

# Check deployment health
./deploy.sh health
```

### Manual Production Setup

1. **Build Production Image**:
   ```bash
   docker build --target production -t pose-detection-game:prod .
   ```

2. **Deploy with Production Compose**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Configure SSL/TLS**:
   - Place SSL certificates in `./nginx/ssl/`
   - Update `nginx/nginx.prod.conf` with your domain
   - Restart nginx service

## 🔍 Health Monitoring

### Built-in Health Checks

The application includes comprehensive health monitoring:

- **Health Endpoint**: `/health`
- **Readiness Endpoint**: `/ready`
- **API Health**: `/api/health`

### Docker Health Checks

The Dockerfile includes automated health checks that run every 30 seconds:
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3000}/health || exit 1
```

### Custom Health Check Script

Use the comprehensive health check script:
```bash
# Run health check
./monitoring/docker-healthcheck.sh
```

## 🔧 Performance Optimization

### Production Optimizations

The production setup includes:

- **Multi-stage Docker build** for smaller images
- **Nginx reverse proxy** with caching and compression
- **Resource limits** and auto-scaling
- **Security headers** and rate limiting
- **Log aggregation** and monitoring

### Resource Requirements

**Minimum Requirements**:
- CPU: 1 core
- RAM: 512MB
- Storage: 2GB

**Recommended for Production**:
- CPU: 2 cores
- RAM: 1GB
- Storage: 10GB
- Load balancer for high availability

## 🚀 CI/CD Pipeline

### GitHub Actions

The repository includes a complete CI/CD pipeline (`.github/workflows/ci-cd.yml`):

- **Testing**: Runs on Node.js 16, 18, 20
- **Security**: Automated vulnerability scanning
- **Building**: Multi-platform Docker images
- **Deployment**: Automated staging and production deployment

### Pipeline Stages

1. **Test & Lint**: Code quality and functionality tests
2. **Security Scan**: Dependency and vulnerability checks
3. **Build**: Docker image creation and registry push
4. **Deploy**: Environment-specific deployment
5. **Health Check**: Post-deployment validation

## 🔒 Security Considerations

### Production Security

- **Non-root user**: Application runs as `nodejs` user
- **Security headers**: Helmet.js with CSP
- **Rate limiting**: Nginx-based request throttling
- **SSL/TLS**: HTTPS-only in production
- **Dependency scanning**: Automated vulnerability checks

### Environment Isolation

- **Secrets management**: Use environment variables
- **Network isolation**: Docker networks
- **Resource limits**: Container constraints
- **Log security**: No sensitive data in logs

## 📊 Monitoring & Logging

### Application Monitoring

- **Health endpoints**: Automated health checks
- **Performance metrics**: Memory and CPU usage
- **Error tracking**: Structured error logging
- **WebSocket monitoring**: Connection status

### Log Management

Logs are structured and include:
- **Application logs**: `/app/logs/`
- **Nginx logs**: `/var/log/nginx/`
- **Docker logs**: `docker-compose logs`

### Metrics Collection

The application exposes metrics for:
- Request latency
- Active connections
- Error rates
- Resource usage

## 🛠️ Troubleshooting

### Common Issues

**Port Already in Use**:
```bash
# Check what's using the port
sudo lsof -i :3000

# Use different port
PORT=8080 ./deploy.sh local
```

**Docker Build Fails**:
```bash
# Clean Docker cache
docker system prune -a

# Build with no cache
docker build --no-cache -t pose-detection-game .
```

**Health Check Fails**:
```bash
# Check container logs
docker-compose logs pose-detection-game

# Run manual health check
curl -f http://localhost:3000/health
```

### Debug Mode

Enable debug mode for troubleshooting:
```bash
# Set debug environment
NODE_ENV=development LOG_LEVEL=debug ./deploy.sh local
```

## 📈 Scaling

### Horizontal Scaling

For high traffic deployments:

1. **Load Balancer**: Use nginx or cloud load balancer
2. **Multiple Replicas**: Scale with Docker Swarm or Kubernetes
3. **Session Store**: Use Redis for session management
4. **Database**: Add persistent storage if needed

### Example Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pose-detection-game
spec:
  replicas: 3
  selector:
    matchLabels:
      app: pose-detection-game
  template:
    metadata:
      labels:
        app: pose-detection-game
    spec:
      containers:
      - name: app
        image: pose-detection-game:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## 🤝 Support

For deployment issues:

1. Check the logs: `docker-compose logs`
2. Verify health endpoints: `curl http://localhost:3000/health`
3. Review configuration: Environment variables and compose files
4. Run diagnostics: `./monitoring/docker-healthcheck.sh`

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Configuration Guide](https://nginx.org/en/docs/)
- [Node.js Production Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

---

**Happy Deploying! 🚀**