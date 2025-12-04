import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { HomeScreen } from '@/components/HomeScreen'
import { MeetingRoom } from '@/components/MeetingRoom'
import { JoinRoom } from '@/components/JoinRoom'

function App() {
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
