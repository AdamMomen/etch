import { Button } from '@/components/ui/button'
import { Video, Users, Pencil } from 'lucide-react'

function App() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="flex flex-col items-center gap-8 text-center">
        <div className="flex items-center gap-3">
          <Video className="h-12 w-12 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">NAMELESS</h1>
        </div>

        <p className="max-w-md text-lg text-muted-foreground">
          Open-source, self-hosted meeting platform with real-time screen
          annotations
        </p>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Button size="lg" className="gap-2">
            <Users className="h-5 w-5" />
            Create Meeting
          </Button>
          <Button size="lg" variant="outline" className="gap-2">
            <Pencil className="h-5 w-5" />
            Join Meeting
          </Button>
        </div>

        <div className="mt-8 flex gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            Self-hosted
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            Real-time
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-purple-500" />
            Annotations
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
