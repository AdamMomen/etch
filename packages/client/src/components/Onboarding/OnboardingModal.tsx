import { useState, useEffect } from 'react'
import {
  Monitor,
  Cloud,
  Server,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
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
import { useCore } from '@/hooks/useCore'
import type { PermissionState } from '@/lib/core'

interface OnboardingModalProps {
  open: boolean
  onComplete: () => void
}

type Step = 'welcome' | 'permissions' | 'server'
type ServerType = 'cloud' | 'selfhosted'

export function OnboardingModal({ open, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState<Step>('welcome')
  const [serverType, setServerType] = useState<ServerType | null>(null)
  const [serverUrl, setServerUrl] = useState('')
  const [permissionState, setPermissionState] = useState<PermissionState | null>(null)
  const [coreReady, setCoreReady] = useState(false)
  const [requestingPermission, setRequestingPermission] = useState(false)

  const { setApiBaseUrl, setHasCompletedOnboarding } = useSettingsStore()
  const { start, checkPermissions, requestScreenRecordingPermission, client } =
    useCore()

  // Start core and check permissions when entering permissions step
  useEffect(() => {
    if (step !== 'permissions') return

    let unsubscribe: (() => void) | undefined

    const init = async () => {
      try {
        console.log('[Onboarding] Setting up message listener...')
        // Listen for permission state updates first
        unsubscribe = client.onMessage((msg) => {
          console.log('[Onboarding] Received message:', msg.type)
          if (msg.type === 'permission_state') {
            setPermissionState(msg.state)
            setRequestingPermission(false)
          }
        })

        // Start core if not running
        console.log('[Onboarding] Core running?', client.isRunning())
        if (!client.isRunning()) {
          console.log('[Onboarding] Starting core...')
          await start()
          console.log('[Onboarding] Core started!')
        }
        console.log('[Onboarding] Setting coreReady = true')
        setCoreReady(true)

        // Check permissions after core is ready
        console.log('[Onboarding] Checking permissions...')
        await checkPermissions()
        console.log('[Onboarding] Permissions checked')
      } catch (error) {
        console.error('[Onboarding] Failed to start core:', error)
      }
    }

    init()

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [step, start, checkPermissions, client])

  const handleRequestPermission = async () => {
    if (!coreReady) {
      console.warn('Core not ready yet')
      return
    }
    try {
      setRequestingPermission(true)
      await requestScreenRecordingPermission()
      // Re-check permissions after request (macOS may show system dialog)
      setTimeout(() => {
        checkPermissions()
      }, 2000)
    } catch (error) {
      console.error('Failed to request permission:', error)
      setRequestingPermission(false)
    }
  }

  const handleServerSelect = (type: ServerType) => {
    setServerType(type)
    if (type === 'cloud') {
      setServerUrl('')
    }
  }

  const handleComplete = () => {
    if (serverUrl.trim()) {
      // Ensure URL ends with /api
      let url = serverUrl.trim()
      if (!url.endsWith('/api')) {
        url = url.replace(/\/$/, '') + '/api'
      }
      setApiBaseUrl(url)
    }
    setHasCompletedOnboarding(true)
    onComplete()
  }

  const isScreenRecordingGranted =
    permissionState?.screen_recording === 'granted'

  const canProceedFromPermissions = coreReady && isScreenRecordingGranted

  const canComplete =
    (serverType === 'cloud' || serverType === 'selfhosted') &&
    serverUrl.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {step === 'welcome' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Welcome to Etch</DialogTitle>
              <DialogDescription>
                Let's get you set up in just a few steps.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-6">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Monitor className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Screen Sharing</h3>
                  <p className="text-sm text-muted-foreground">
                    Share your screen with real-time annotations
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Cloud className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Flexible Hosting</h3>
                  <p className="text-sm text-muted-foreground">
                    Connect to LiveKit Cloud or your self-hosted server
                  </p>
                </div>
              </div>
            </div>

            <Button className="w-full" onClick={() => setStep('permissions')}>
              Get Started
            </Button>
          </>
        )}

        {step === 'permissions' && (
          <>
            <DialogHeader>
              <DialogTitle>Permissions</DialogTitle>
              <DialogDescription>
                Etch needs screen recording permission to share your screen.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-6">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Monitor className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Screen Recording</p>
                    <p className="text-sm text-muted-foreground">
                      Required for screen sharing
                    </p>
                  </div>
                </div>
                {isScreenRecordingGranted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : !coreReady ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <Button
                    size="sm"
                    onClick={handleRequestPermission}
                    disabled={requestingPermission}
                  >
                    {requestingPermission ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Grant'
                    )}
                  </Button>
                )}
              </div>

              {!isScreenRecordingGranted && coreReady && (
                <p className="text-xs text-muted-foreground">
                  Clicking Grant will open System Settings. Enable Etch in Privacy
                  & Security {'>'} Screen Recording, then return here.
                </p>
              )}

              {permissionState?.screen_recording === 'denied' && (
                <div className="space-y-2">
                  <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <p>
                      Permission denied. Please enable Screen Recording in System
                      Settings {'>'} Privacy & Security {'>'} Screen Recording.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => checkPermissions()}
                    className="w-full"
                  >
                    Check Again
                  </Button>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep('welcome')}
              >
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={() => setStep('server')}
                disabled={!canProceedFromPermissions}
              >
                Continue
              </Button>
            </div>
          </>
        )}

        {step === 'server' && (
          <>
            <DialogHeader>
              <DialogTitle>Server Configuration</DialogTitle>
              <DialogDescription>
                How would you like to connect?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-6">
              {/* Cloud Option */}
              <button
                className={`flex w-full items-start gap-4 rounded-lg border p-4 text-left transition-colors ${
                  serverType === 'cloud'
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => handleServerSelect('cloud')}
              >
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <Cloud className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">LiveKit Cloud</h3>
                  <p className="text-sm text-muted-foreground">
                    Connect to a hosted Etch server using LiveKit Cloud. Get the
                    server URL from your host.
                  </p>
                </div>
                {serverType === 'cloud' && (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                )}
              </button>

              {/* Self-hosted Option */}
              <button
                className={`flex w-full items-start gap-4 rounded-lg border p-4 text-left transition-colors ${
                  serverType === 'selfhosted'
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => handleServerSelect('selfhosted')}
              >
                <div className="rounded-lg bg-purple-500/10 p-2">
                  <Server className="h-5 w-5 text-purple-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Self-Hosted</h3>
                  <p className="text-sm text-muted-foreground">
                    Connect to your own Etch server running on your
                    infrastructure.
                  </p>
                </div>
                {serverType === 'selfhosted' && (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                )}
              </button>

              {/* URL Input for Self-hosted */}
              {serverType === 'selfhosted' && (
                <div className="space-y-2 pl-4">
                  <label htmlFor="server-url" className="text-sm font-medium">
                    Server URL
                  </label>
                  <Input
                    id="server-url"
                    type="url"
                    placeholder="https://etch.example.com"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the base URL of your Etch server (without /api)
                  </p>
                </div>
              )}

              {/* URL Input for Cloud */}
              {serverType === 'cloud' && (
                <div className="space-y-2 pl-4">
                  <label htmlFor="cloud-url" className="text-sm font-medium">
                    Server URL
                  </label>
                  <Input
                    id="cloud-url"
                    type="url"
                    placeholder="https://etch.example.com"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the URL provided by your host
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep('permissions')}
              >
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={handleComplete}
                disabled={!canComplete}
              >
                Finish Setup
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
