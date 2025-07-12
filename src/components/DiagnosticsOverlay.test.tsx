import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DiagnosticsOverlay from './DiagnosticsOverlay';
import type { DiagnosticsOverlayProps, DiagnosticsData } from '../types';

const mockDiagnosticsData: DiagnosticsData = {
  fps: 30,
  detectionTime: 50,
  memoryUsage: 75,
  modelLoaded: true,
  cameraActive: true,
  errors: []
};

const defaultProps: DiagnosticsOverlayProps = {
  data: mockDiagnosticsData,
  isVisible: true,
  onToggle: jest.fn()
};

describe('DiagnosticsOverlay Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders diagnostics data when visible', () => {
    render(<DiagnosticsOverlay {...defaultProps} />);
    
    expect(screen.getByText('Diagnostics')).toBeInTheDocument();
    expect(screen.getByText('FPS: 30')).toBeInTheDocument();
    expect(screen.getByText('Detection Time: 50ms')).toBeInTheDocument();
    expect(screen.getByText('Memory: 75%')).toBeInTheDocument();
  });

  test('shows model status correctly', () => {
    render(<DiagnosticsOverlay {...defaultProps} />);
    
    expect(screen.getByText('Model: Loaded')).toBeInTheDocument();
  });

  test('shows camera status correctly', () => {
    render(<DiagnosticsOverlay {...defaultProps} />);
    
    expect(screen.getByText('Camera: Active')).toBeInTheDocument();
  });

  test('displays errors when present', () => {
    const dataWithErrors = {
      ...mockDiagnosticsData,
      errors: ['Camera not found', 'Model load failed']
    };
    
    render(
      <DiagnosticsOverlay 
        {...defaultProps} 
        data={dataWithErrors}
      />
    );
    
    expect(screen.getByText('Errors:')).toBeInTheDocument();
    expect(screen.getByText('Camera not found')).toBeInTheDocument();
    expect(screen.getByText('Model load failed')).toBeInTheDocument();
  });

  test('shows no errors message when no errors', () => {
    render(<DiagnosticsOverlay {...defaultProps} />);
    
    expect(screen.getByText('No errors')).toBeInTheDocument();
  });

  test('calls onToggle when close button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnToggle = jest.fn();
    
    render(
      <DiagnosticsOverlay 
        {...defaultProps} 
        onToggle={mockOnToggle}
      />
    );
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);
    
    expect(mockOnToggle).toHaveBeenCalledTimes(1);
  });

  test('does not render when not visible', () => {
    render(
      <DiagnosticsOverlay 
        {...defaultProps} 
        isVisible={false}
      />
    );
    
    expect(screen.queryByText('Diagnostics')).not.toBeInTheDocument();
  });

  test('shows performance warnings for low FPS', () => {
    const lowFpsData = {
      ...mockDiagnosticsData,
      fps: 10
    };
    
    render(
      <DiagnosticsOverlay 
        {...defaultProps} 
        data={lowFpsData}
      />
    );
    
    expect(screen.getByText('Low FPS detected')).toBeInTheDocument();
  });

  test('shows performance warnings for high detection time', () => {
    const highDetectionTimeData = {
      ...mockDiagnosticsData,
      detectionTime: 200
    };
    
    render(
      <DiagnosticsOverlay 
        {...defaultProps} 
        data={highDetectionTimeData}
      />
    );
    
    expect(screen.getByText('High detection time')).toBeInTheDocument();
  });

  test('shows memory warning for high usage', () => {
    const highMemoryData = {
      ...mockDiagnosticsData,
      memoryUsage: 90
    };
    
    render(
      <DiagnosticsOverlay 
        {...defaultProps} 
        data={highMemoryData}
      />
    );
    
    expect(screen.getByText('High memory usage')).toBeInTheDocument();
  });
});