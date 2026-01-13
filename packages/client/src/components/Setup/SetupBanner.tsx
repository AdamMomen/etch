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

interface SetupCredentials {
  apiKey: string
  apiSecret: string
  wsUrl: string
  httpUrl: string
}

interface SetupStatus {
  isFirstTimeSetup: boolean
  credentials?: SetupCredentials
  publicUrls?: {
    appUrl?: string
    livekitUrl?: string
  }
  message?: string
  warnings?: string[]
  error?: string
}

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
        // Show dialog if we have credentials to display
        if (data.credentials && !data.isFirstTimeSetup) {
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (hasAcknowledged || !setupStatus || !setupStatus.credentials) {
    return null
  }

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl">
            🎉 Setup Complete!
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            Your Etch video conferencing system has been deployed successfully.
            Here are your auto-generated LiveKit credentials:
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 my-4">
          {/* API Key */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              API Key
            </label>
            <div className="flex gap-2">
              <code className="flex-1 bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm break-all">
                {setupStatus.credentials.apiKey}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(setupStatus.credentials!.apiKey)}
              >
                Copy
              </Button>
            </div>
          </div>

          {/* API Secret */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              API Secret
            </label>
            <div className="flex gap-2">
              <code className="flex-1 bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm break-all">
                {setupStatus.credentials.apiSecret}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  copyToClipboard(setupStatus.credentials!.apiSecret)
                }
              >
                Copy
              </Button>
            </div>
          </div>

          {/* Internal URLs */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              LiveKit WebSocket URL (Internal)
            </label>
            <code className="block bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm break-all">
              {setupStatus.credentials.wsUrl}
            </code>
          </div>

          {/* Warnings */}
          {setupStatus.warnings && setupStatus.warnings.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                ⚠️ Important Security Notes:
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                {setupStatus.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
              📋 Next Steps:
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700 dark:text-blue-300">
              <li>Save these credentials in a secure password manager</li>
              <li>Configure your domain in Coolify for external access</li>
              <li>Set up SSL/TLS certificates for production use</li>
              <li>Consider adding authentication for admin endpoints</li>
            </ol>
          </div>

          {/* Message */}
          {setupStatus.message && (
            <p className="text-sm text-gray-600 dark:text-gray-400 italic">
              {setupStatus.message}
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <Button onClick={handleAcknowledge} className="w-full">
            I&apos;ve Saved These Credentials
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
