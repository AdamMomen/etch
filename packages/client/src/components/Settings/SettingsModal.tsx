import { useState } from 'react'
import { Sun, Moon, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSettingsStore } from '@/stores/settingsStore'

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const {
    displayName,
    setDisplayName,
    apiBaseUrl,
    setApiBaseUrl,
    theme,
    setTheme,
    clearPreferences,
  } = useSettingsStore()

  const [localDisplayName, setLocalDisplayName] = useState(displayName)
  const [localApiBaseUrl, setLocalApiBaseUrl] = useState(apiBaseUrl)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const handleDisplayNameChange = (value: string) => {
    setLocalDisplayName(value)
  }

  const handleDisplayNameBlur = () => {
    if (localDisplayName.trim() !== displayName) {
      setDisplayName(localDisplayName.trim())
    }
  }

  const handleApiBaseUrlChange = (value: string) => {
    setLocalApiBaseUrl(value)
  }

  const handleApiBaseUrlBlur = () => {
    const trimmed = localApiBaseUrl.trim()
    if (trimmed !== apiBaseUrl) {
      setApiBaseUrl(trimmed)
      toast.success('API URL updated. Changes will apply to new connections.')
    }
  }

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const handleClearPreferences = () => {
    clearPreferences()
    setLocalDisplayName('')
    setLocalApiBaseUrl(import.meta.env.VITE_API_URL || 'http://localhost:3000/api')
    setShowClearConfirm(false)
    toast.success('All preferences have been reset to defaults')
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Save settings when closing
      if (localDisplayName.trim() !== displayName) {
        setDisplayName(localDisplayName.trim())
      }
      const trimmedUrl = localApiBaseUrl.trim()
      if (trimmedUrl !== apiBaseUrl) {
        setApiBaseUrl(trimmedUrl)
      }
      setShowClearConfirm(false)
    } else {
      // Sync local state when opening
      setLocalDisplayName(displayName)
      setLocalApiBaseUrl(apiBaseUrl)
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your application preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Display Name */}
          <div className="space-y-2">
            <label
              htmlFor="settings-display-name"
              className="text-sm font-medium"
            >
              Display Name
            </label>
            <Input
              id="settings-display-name"
              type="text"
              placeholder="Enter your display name"
              value={localDisplayName}
              onChange={(e) => handleDisplayNameChange(e.target.value)}
              onBlur={handleDisplayNameBlur}
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              This name will be shown to other participants in meetings
            </p>
          </div>

          {/* API Server URL */}
          <div className="space-y-2">
            <label
              htmlFor="settings-api-url"
              className="text-sm font-medium"
            >
              API Server URL
            </label>
            <Input
              id="settings-api-url"
              type="text"
              placeholder="http://localhost:3000/api"
              value={localApiBaseUrl}
              onChange={(e) => handleApiBaseUrlChange(e.target.value)}
              onBlur={handleApiBaseUrlBlur}
            />
            <p className="text-xs text-muted-foreground">
              The server URL for creating and joining rooms. Required for production builds.
            </p>
          </div>

          {/* Theme Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-muted-foreground">
                {theme === 'dark' ? 'Dark mode' : 'Light mode'}
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleThemeToggle}
              aria-label={
                theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
              }
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          </div>

          {/* Clear Preferences */}
          <div className="border-t pt-4">
            {showClearConfirm ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  This will reset all settings to their defaults. Are you sure?
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleClearPreferences}
                    className="flex-1"
                  >
                    Yes, clear all
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowClearConfirm(true)}
                className="w-full gap-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Clear All Preferences
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
