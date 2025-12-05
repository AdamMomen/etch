import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { HomeScreen } from '@/components/HomeScreen'
import { MeetingRoom } from '@/components/MeetingRoom'
import { JoinRoom } from '@/components/JoinRoom'
import { useSettingsStore } from '@/stores/settingsStore'

function App() {
  const theme = useSettingsStore((state) => state.theme)

  // Apply theme class to document root
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light')
    document.documentElement.classList.add(theme)
  }, [theme])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/room/:roomId" element={<MeetingRoom />} />
        <Route path="/join/:roomId" element={<JoinRoom />} />
      </Routes>
      <Toaster position="bottom-right" richColors />
    </BrowserRouter>
  )
}

export default App
