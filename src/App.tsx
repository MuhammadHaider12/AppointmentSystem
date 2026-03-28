import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { Login } from './components/Login'
import { PatientDashboard } from './components/patient/PatientDashboard'
import { DoctorDashboard } from './components/doctor/DoctorDashboard'
import { AdminDashboard } from './components/admin/AdminDashboard'
import './App.css'

function App() {
  const [session, setSession] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (!error && data) {
        setUserRole(data.role)
      } else {
        setUserRole(null)
      }
    } catch {
      setUserRole(null)
    }
  }

  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession()
        if (!isMounted) return

        setSession(session)
        if (session?.user) {
          await fetchUserRole(session.user.id)
        } else {
          setUserRole(null)
        }
      } catch {
        if (!isMounted) return
        setSession(null)
        setUserRole(null)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          if (!isMounted) return

          setSession(session)
          if (session?.user) {
            await fetchUserRole(session.user.id)
          } else {
            setUserRole(null)
          }
        } catch {
          if (!isMounted) return
          setUserRole(null)
        } finally {
          if (isMounted) setLoading(false)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2">🏥</div>
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    )
  }

  // Role-based redirect
  const getDashboardPath = () => {
    switch (userRole) {
      case 'admin': return '/admin'
      case 'doctor': return '/doctor'
      case 'patient': return '/patient'
      default: return '/login'
    }
  }

  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={
          !session || !userRole ? <Login /> : <Navigate to={getDashboardPath()} />
        } />
        
        <Route path="/patient/*" element={
          session && userRole === 'patient' ? <PatientDashboard /> : <Navigate to="/login" />
        } />
        
        <Route path="/doctor/*" element={
          session && userRole === 'doctor' ? <DoctorDashboard /> : <Navigate to="/login" />
        } />
        
        <Route path="/admin/*" element={
          session && userRole === 'admin' ? <AdminDashboard /> : <Navigate to="/login" />
        } />
        
        <Route path="/" element={<Navigate to={session ? getDashboardPath() : '/login'} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  )
}

export default App