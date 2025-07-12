import React from 'react';
import { render, screen } from '@testing-library/react';
import GameCanvas from './GameCanvas';
import type { GameCanvasProps, Pose, GameState } from '../types';

const mockPose: Pose = {
  keypoints: [
    { x: 100, y: 200, score: 0.9, name: 'nose' },
    { x: 150, y: 250, score: 0.8, name: 'left_eye' },
    { x: 50, y: 250, score: 0.8, name: 'right_eye' }
  ],
  score: 0.85
};

const mockGameState: GameState = {
  isPlaying: true,
  score: 100,
  level: 1,
  currentPose: mockPose,
  targetPose: 'wave',
  timeRemaining: 30,
  isGameOver: false
};

const defaultProps: GameCanvasProps = {
  pose: mockPose,
  gameState: mockGameState,
  width: 640,
  height: 480
};

describe('GameCanvas Component', () => {
  test('renders canvas element with correct dimensions', () => {
    render(<GameCanvas {...defaultProps} />);
    
    const canvas = screen.getByTestId('game-canvas');
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute('width', '640');
    expect(canvas).toHaveAttribute('height', '480');
  });

  test('displays game score', () => {
    render(<GameCanvas {...defaultProps} />);
    
    expect(screen.getByText('Score: 100')).toBeInTheDocument();
  });

  test('displays time remaining', () => {
    render(<GameCanvas {...defaultProps} />);
    
    expect(screen.getByText('Time: 30s')).toBeInTheDocument();
  });

  test('displays current level', () => {
    render(<GameCanvas {...defaultProps} />);
    
    expect(screen.getByText('Level: 1')).toBeInTheDocument();
  });

  test('displays target pose instruction', () => {
    render(<GameCanvas {...defaultProps} />);
    
    expect(screen.getByText('Target: wave')).toBeInTheDocument();
  });

  test('shows game over message when game is over', () => {
    const gameOverState = {
      ...mockGameState,
      isGameOver: true,
      isPlaying: false
    };
    
    render(
      <GameCanvas 
        {...defaultProps} 
        gameState={gameOverState}
      />
    );
    
    expect(screen.getByText('Game Over!')).toBeInTheDocument();
    expect(screen.getByText('Final Score: 100')).toBeInTheDocument();
  });

  test('shows paused message when game is paused', () => {
    const pausedState = {
      ...mockGameState,
      isPlaying: false,
      isGameOver: false
    };
    
    render(
      <GameCanvas 
        {...defaultProps} 
        gameState={pausedState}
      />
    );
    
    expect(screen.getByText('Game Paused')).toBeInTheDocument();
  });

  test('renders without pose data', () => {
    render(
      <GameCanvas 
        {...defaultProps} 
        pose={null}
      />
    );
    
    const canvas = screen.getByTestId('game-canvas');
    expect(canvas).toBeInTheDocument();
  });

  test('updates canvas when pose changes', () => {
    const { rerender } = render(<GameCanvas {...defaultProps} />);
    
    const newPose: Pose = {
      keypoints: [
        { x: 200, y: 300, score: 0.7, name: 'nose' }
      ],
      score: 0.7
    };
    
    rerender(
      <GameCanvas 
        {...defaultProps} 
        pose={newPose}
      />
    );
    
    expect(screen.getByTestId('game-canvas')).toBeInTheDocument();
  });
});