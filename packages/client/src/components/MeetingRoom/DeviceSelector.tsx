import { Check, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface Device {
  deviceId: string
  label: string
}

interface DeviceSelectorProps {
  devices: Device[]
  selectedDeviceId: string | null
  onSelect: (deviceId: string) => void
  type: 'audio' | 'video'
  disabled?: boolean
  className?: string
}

/**
 * DeviceSelector - Dropdown component for selecting audio/video devices.
 *
 * Features:
 * - "System Default" option always appears first
 * - Checkmark indicates currently selected device
 * - Long device names truncated with ellipsis
 * - Uses shadcn/ui DropdownMenu
 */
export function DeviceSelector({
  devices,
  selectedDeviceId,
  onSelect,
  type,
  disabled = false,
  className,
}: DeviceSelectorProps) {
  const label = type === 'audio' ? 'Microphone' : 'Camera'

  // Create list with System Default as first option
  const deviceList: Device[] = [
    { deviceId: 'default', label: 'System Default' },
    ...devices.filter((d) => d.deviceId !== 'default'),
  ]

  // Determine what's currently selected for display
  const isDefaultSelected = !selectedDeviceId || selectedDeviceId === 'default'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-6 w-6 rounded-full hover:bg-accent/50',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
          aria-label={`Select ${label.toLowerCase()}`}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>{label} Selection</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {deviceList.map((device) => {
          const isSelected =
            device.deviceId === 'default'
              ? isDefaultSelected
              : device.deviceId === selectedDeviceId

          return (
            <DropdownMenuItem
              key={device.deviceId}
              onClick={() => onSelect(device.deviceId)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <span className="w-4 h-4 flex items-center justify-center">
                {isSelected && <Check className="h-4 w-4" />}
              </span>
              <span className="truncate flex-1" title={device.label}>
                {device.label}
              </span>
            </DropdownMenuItem>
          )
        })}
        {devices.length === 0 && (
          <DropdownMenuItem disabled className="text-muted-foreground">
            No devices available
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
