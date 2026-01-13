import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSettingsStore } from '@/stores/settingsStore'

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useSettingsStore()

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={className}
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
  )
}
