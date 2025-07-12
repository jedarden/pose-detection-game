import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CameraSelector from './CameraSelector';
import type { CameraSelectorProps } from '../types';

const mockDevices: MediaDeviceInfo[] = [
  {
    deviceId: 'device1',
    label: 'Front Camera',
    kind: 'videoinput',
    groupId: 'group1',
    toJSON: () => ({})
  },
  {
    deviceId: 'device2', 
    label: 'Back Camera',
    kind: 'videoinput',
    groupId: 'group2',
    toJSON: () => ({})
  }
];

const defaultProps: CameraSelectorProps = {
  onDeviceSelect: jest.fn(),
  devices: mockDevices,
  selectedDeviceId: undefined
};

describe('CameraSelector Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders camera selector with devices', () => {
    render(<CameraSelector {...defaultProps} />);
    
    expect(screen.getByLabelText('Select Camera')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Front Camera')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Back Camera')).toBeInTheDocument();
  });

  test('calls onDeviceSelect when device is changed', async () => {
    const user = userEvent.setup();
    const mockOnDeviceSelect = jest.fn();
    
    render(
      <CameraSelector 
        {...defaultProps} 
        onDeviceSelect={mockOnDeviceSelect}
      />
    );
    
    const select = screen.getByLabelText('Select Camera');
    await user.selectOptions(select, 'device2');
    
    expect(mockOnDeviceSelect).toHaveBeenCalledWith('device2');
  });

  test('shows selected device when selectedDeviceId is provided', () => {
    render(
      <CameraSelector 
        {...defaultProps} 
        selectedDeviceId="device2"
      />
    );
    
    const select = screen.getByLabelText('Select Camera') as HTMLSelectElement;
    expect(select.value).toBe('device2');
  });

  test('shows no devices message when devices array is empty', () => {
    render(
      <CameraSelector 
        {...defaultProps} 
        devices={[]}
      />
    );
    
    expect(screen.getByText('No cameras available')).toBeInTheDocument();
  });

  test('shows loading state when devices are being fetched', () => {
    render(
      <CameraSelector 
        {...defaultProps} 
        devices={[]}
      />
    );
    
    expect(screen.getByText('Loading cameras...')).toBeInTheDocument();
  });

  test('handles device permission errors gracefully', () => {
    render(
      <CameraSelector 
        {...defaultProps}
        devices={[]}
      />
    );
    
    expect(screen.getByText('Camera access denied. Please enable camera permissions.')).toBeInTheDocument();
  });
});