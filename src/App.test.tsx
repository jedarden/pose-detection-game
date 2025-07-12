import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// Mock the child components
jest.mock('./components/CameraSelector', () => {
  return function MockCameraSelector() {
    return <div data-testid="camera-selector">Camera Selector</div>;
  };
});

jest.mock('./components/PoseDetector', () => {
  return function MockPoseDetector() {
    return <div data-testid="pose-detector">Pose Detector</div>;
  };
});

jest.mock('./components/GameCanvas', () => {
  return function MockGameCanvas() {
    return <div data-testid="game-canvas">Game Canvas</div>;
  };
});

jest.mock('./components/DiagnosticsOverlay', () => {
  return function MockDiagnosticsOverlay() {
    return <div data-testid="diagnostics-overlay">Diagnostics Overlay</div>;
  };
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('App Component', () => {
  test('renders main game interface', () => {
    renderWithRouter(<App />);
    
    expect(screen.getByText('Pose Detection Game')).toBeInTheDocument();
  });

  test('renders camera selector component', () => {
    renderWithRouter(<App />);
    
    expect(screen.getByTestId('camera-selector')).toBeInTheDocument();
  });

  test('renders pose detector component', () => {
    renderWithRouter(<App />);
    
    expect(screen.getByTestId('pose-detector')).toBeInTheDocument();
  });

  test('renders game canvas component', () => {
    renderWithRouter(<App />);
    
    expect(screen.getByTestId('game-canvas')).toBeInTheDocument();
  });

  test('renders diagnostics overlay component', () => {
    renderWithRouter(<App />);
    
    expect(screen.getByTestId('diagnostics-overlay')).toBeInTheDocument();
  });

  test('has proper layout structure', () => {
    renderWithRouter(<App />);
    
    const mainContainer = screen.getByRole('main');
    expect(mainContainer).toBeInTheDocument();
    expect(mainContainer).toHaveClass('app-container');
  });
});