import { useState, useCallback, useEffect } from 'react'
import { Check, Copy, Link } from 'lucide-react'
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
import { generateInviteLink, copyToClipboard } from '@/lib/invite'
import { useSettingsStore } from '@/stores/settingsStore'

export interface InviteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roomId: string
}

export function InviteModal({ open, onOpenChange, roomId }: InviteModalProps) {
  const [copied, setCopied] = useState(false)
  const inviteDomain = useSettingsStore((state) => state.inviteDomain)

  // Reset copied state when modal closes
  useEffect(() => {
    if (!open) {
      setCopied(false)
    }
  }, [open])

  // Generate the invite link using configurable domain from settings
  const inviteLink = generateInviteLink(roomId, inviteDomain ? { domain: inviteDomain } : undefined)

  const handleCopy = useCallback(async () => {
    const success = await copyToClipboard(inviteLink)

    if (success) {
      setCopied(true)
      toast.success('Link copied!')

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } else {
      toast.error('Failed to copy link')
    }
  }, [inviteLink])


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Invite to Meeting
          </DialogTitle>
          <DialogDescription>
            Share this link with others to invite them to your meeting.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Input
            value={inviteLink}
            readOnly
            className="flex-1 font-mono text-sm"
            aria-label="Invite link"
          />
          <Button
            onClick={handleCopy}
            className="shrink-0"
            aria-label={copied ? 'Link copied' : 'Copy link'}
          >
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Tip: Press{' '}
          <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">
            {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+I
          </kbd>{' '}
          to quickly open this dialog.
        </p>
      </DialogContent>
    </Dialog>
  )
}
