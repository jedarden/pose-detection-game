const express = require('express');
const router = express.Router();

module.exports = (io) => {
  // Health check for API
  router.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      api: 'pose-detection-game',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  // Game state endpoints
  router.get('/game/status', (req, res) => {
    res.json({
      active_rooms: io.sockets.adapter.rooms.size,
      connected_clients: io.engine.clientsCount,
      server_time: Date.now()
    });
  });

  // Room management
  router.post('/room/create', (req, res) => {
    const roomId = 'room_' + Math.random().toString(36).substr(2, 9);
    res.json({
      success: true,
      room_id: roomId,
      message: 'Room created successfully'
    });
  });

  // Player statistics (placeholder)
  router.get('/player/stats/:playerId', (req, res) => {
    const { playerId } = req.params;
    res.json({
      player_id: playerId,
      games_played: 0,
      best_score: 0,
      accuracy: 0,
      last_played: null
    });
  });

  return router;
};