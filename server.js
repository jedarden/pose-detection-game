const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"]
  }
});

// Configuration
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isDevelopment = NODE_ENV === 'development';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Middleware
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Static files
app.use('/static', express.static(path.join(__dirname, 'public'), {
  maxAge: isDevelopment ? 0 : '1y',
  etag: true,
  lastModified: true
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    memory: process.memoryUsage(),
    port: PORT
  });
});

// Readiness check endpoint
app.get('/ready', (req, res) => {
  // Add any readiness checks here (database connections, etc.)
  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api', require('./src/routes/api')(io));

// Serve the main application
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
    if (err) {
      res.status(500).send('Error loading application');
    }
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Handle pose data
  socket.on('pose-data', (data) => {
    // Broadcast pose data to other clients for multiplayer features
    socket.broadcast.emit('pose-update', {
      id: socket.id,
      poses: data.poses,
      timestamp: Date.now()
    });
  });
  
  // Handle game events
  socket.on('game-event', (event) => {
    console.log('Game event:', event);
    // Process game events and broadcast to relevant clients
    io.emit('game-update', event);
  });
  
  // Handle room joining for multiplayer
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('player-joined', socket.id);
    console.log(`Client ${socket.id} joined room ${roomId}`);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: isDevelopment ? err.message : 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Pose Detection Game server running on port ${PORT}`);
  console.log(`📄 Environment: ${NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  if (isDevelopment) {
    console.log(`🌐 Local: http://localhost:${PORT}`);
  }
});

module.exports = { app, server, io };