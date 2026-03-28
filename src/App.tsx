import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import './App.css'

// Components (we'll create these next)
import { Login } from './components/Login'
import { Dashboard } from './components/Dashboard'

function App() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route 
          path="/login" 
          element={!session ? <Login /> : <Navigate to="/dashboard" />} 
        />
        <Route 
          path="/dashboard/*" 
          element={session ? <Dashboard /> : <Navigate to="/login" />} 
        />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  )
}

export default App