import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeviceSelector, Device } from './DeviceSelector'

describe('DeviceSelector', () => {
  const mockDevices: Device[] = [
    { deviceId: 'device1', label: 'Built-in Microphone' },
    { deviceId: 'device2', label: 'External Microphone' },
    { deviceId: 'device3', label: 'Very Long Device Name That Should Be Truncated' },
  ]

  const defaultProps = {
    devices: mockDevices,
    selectedDeviceId: 'device1',
    onSelect: vi.fn(),
    type: 'audio' as const,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering (AC-2.10.1, AC-2.10.3)', () => {
    it('renders dropdown trigger button', () => {
      render(<DeviceSelector {...defaultProps} />)

      const button = screen.getByRole('button', { name: /select microphone/i })
      expect(button).toBeInTheDocument()
    })

    it('renders "Select camera" label for video type', () => {
      render(<DeviceSelector {...defaultProps} type="video" />)

      const button = screen.getByRole('button', { name: /select camera/i })
      expect(button).toBeInTheDocument()
    })

    it('is disabled when disabled prop is true', () => {
      render(<DeviceSelector {...defaultProps} disabled />)

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })
  })

  describe('dropdown menu (AC-2.10.1, AC-2.10.3)', () => {
    it('shows device list when opened', async () => {
      const user = userEvent.setup()
      render(<DeviceSelector {...defaultProps} />)

      await user.click(screen.getByRole('button'))

      expect(screen.getByText('Built-in Microphone')).toBeInTheDocument()
      expect(screen.getByText('External Microphone')).toBeInTheDocument()
    })

    it('shows "System Default" as first option', async () => {
      const user = userEvent.setup()
      render(<DeviceSelector {...defaultProps} />)

      await user.click(screen.getByRole('button'))

      const menuItems = screen.getAllByRole('menuitem')
      expect(menuItems[0]).toHaveTextContent('System Default')
    })

    it('shows checkmark on selected device', async () => {
      const user = userEvent.setup()
      render(<DeviceSelector {...defaultProps} selectedDeviceId="device1" />)

      await user.click(screen.getByRole('button'))

      // The checkmark should be next to the selected device
      // Find the menu item and check it contains the check icon visually
      const menuItems = screen.getAllByRole('menuitem')
      // device1 is the second item (after System Default)
      const selectedItem = menuItems.find((item) =>
        item.textContent?.includes('Built-in Microphone')
      )
      expect(selectedItem).toBeInTheDocument()
    })

    it('shows checkmark on System Default when selectedDeviceId is null', async () => {
      const user = userEvent.setup()
      render(<DeviceSelector {...defaultProps} selectedDeviceId={null} />)

      await user.click(screen.getByRole('button'))

      // System Default should be selected when no device is specified
      const menuItems = screen.getAllByRole('menuitem')
      expect(menuItems[0]).toHaveTextContent('System Default')
    })

    it('shows checkmark on System Default when selectedDeviceId is "default"', async () => {
      const user = userEvent.setup()
      render(<DeviceSelector {...defaultProps} selectedDeviceId="default" />)

      await user.click(screen.getByRole('button'))

      // System Default should be marked as selected
      const menuItems = screen.getAllByRole('menuitem')
      expect(menuItems[0]).toHaveTextContent('System Default')
    })

    it('shows Microphone Selection label for audio type', async () => {
      const user = userEvent.setup()
      render(<DeviceSelector {...defaultProps} type="audio" />)

      await user.click(screen.getByRole('button'))

      expect(screen.getByText('Microphone Selection')).toBeInTheDocument()
    })

    it('shows Camera Selection label for video type', async () => {
      const user = userEvent.setup()
      render(<DeviceSelector {...defaultProps} type="video" />)

      await user.click(screen.getByRole('button'))

      expect(screen.getByText('Camera Selection')).toBeInTheDocument()
    })
  })

  describe('device selection (AC-2.10.2, AC-2.10.4)', () => {
    it('calls onSelect with device ID when device is clicked', async () => {
      const onSelect = vi.fn()
      const user = userEvent.setup()
      render(<DeviceSelector {...defaultProps} onSelect={onSelect} />)

      await user.click(screen.getByRole('button'))
      await user.click(screen.getByText('External Microphone'))

      expect(onSelect).toHaveBeenCalledWith('device2')
    })

    it('calls onSelect with "default" when System Default is clicked', async () => {
      const onSelect = vi.fn()
      const user = userEvent.setup()
      render(<DeviceSelector {...defaultProps} onSelect={onSelect} />)

      await user.click(screen.getByRole('button'))
      await user.click(screen.getByText('System Default'))

      expect(onSelect).toHaveBeenCalledWith('default')
    })
  })

  describe('empty state', () => {
    it('shows "No devices available" when devices array is empty', async () => {
      const user = userEvent.setup()
      render(<DeviceSelector {...defaultProps} devices={[]} />)

      await user.click(screen.getByRole('button'))

      expect(screen.getByText('No devices available')).toBeInTheDocument()
    })

    it('still shows System Default even when no devices', async () => {
      const user = userEvent.setup()
      render(<DeviceSelector {...defaultProps} devices={[]} />)

      await user.click(screen.getByRole('button'))

      expect(screen.getByText('System Default')).toBeInTheDocument()
    })
  })

  describe('long device names', () => {
    it('truncates long device names with title attribute for tooltip', async () => {
      const user = userEvent.setup()
      render(<DeviceSelector {...defaultProps} />)

      await user.click(screen.getByRole('button'))

      const longNameElement = screen.getByText(
        'Very Long Device Name That Should Be Truncated'
      )
      expect(longNameElement).toHaveAttribute(
        'title',
        'Very Long Device Name That Should Be Truncated'
      )
      expect(longNameElement).toHaveClass('truncate')
    })
  })
})
