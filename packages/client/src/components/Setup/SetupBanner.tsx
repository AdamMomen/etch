import { useEffect, useState } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog'
import { Button } from '../ui/button'

interface SetupStatus {
  isFirstTimeSetup: boolean
  configured: boolean
  publicUrls?: {
    appUrl?: string
    livekitUrl?: string
  }
  message?: string
  error?: string
}

/**
 * Setup Banner - Shows configuration status on first visit
 *
 * SECURITY: Credentials are never exposed via the API.
 * Admins access credentials through environment variables or container access.
 */
export function SetupBanner() {
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [hasAcknowledged, setHasAcknowledged] = useState(false)

  useEffect(() => {
    // Check if user has already seen the setup
    const acknowledged = localStorage.getItem('setup-acknowledged')
    if (acknowledged) {
      setHasAcknowledged(true)
      return
    }

    // Fetch setup status
    fetch('/api/setup/status')
      .then((res) => res.json())
      .then((data: SetupStatus) => {
        setSetupStatus(data)
        // Show dialog on first-time setup or if not configured
        if (data.isFirstTimeSetup || !data.configured) {
          setShowDialog(true)
        }
      })
      .catch((err) => {
        console.error('Failed to fetch setup status:', err)
      })
  }, [])

  const handleAcknowledge = () => {
    localStorage.setItem('setup-acknowledged', 'true')
    setHasAcknowledged(true)
    setShowDialog(false)
  }

  if (hasAcknowledged || !setupStatus) {
    return null
  }

  // Show error state if not configured
  if (setupStatus.isFirstTimeSetup || !setupStatus.configured) {
    return (
      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl text-red-600">
              Configuration Required
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {setupStatus.error || setupStatus.message || 'LiveKit is not configured.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 my-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                Setup Instructions:
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                <li>Set LIVEKIT_API_KEY environment variable</li>
                <li>Set LIVEKIT_API_SECRET environment variable</li>
                <li>Set LIVEKIT_URL environment variable</li>
                <li>Restart the application</li>
              </ol>
            </div>
          </div>

          <AlertDialogFooter>
            <Button onClick={handleAcknowledge} variant="outline" className="w-full">
              Dismiss
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  // System is configured - nothing to show
  return null
}
