import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { Login } from './components/Login'
import { PatientDashboard } from './components/patient/PatientDashboard'
import { DoctorDashboard } from './components/doctor/DoctorDashboard'
import { AdminDashboard } from './components/admin/AdminDashboard'
import './App.css'

const SESSION_GUARD_KEY = 'appointment_system_session_guard_version'
const SESSION_GUARD_VERSION = '2026-03-28-auth-state-v1'

const clearStaleAuthStateOnce = async () => {
  try {
    const currentVersion = window.localStorage.getItem(SESSION_GUARD_KEY)
    if (currentVersion === SESSION_GUARD_VERSION) return

    // Force a one-time local sign-out and remove stale auth artifacts from older builds.
    await supabase.auth.signOut()

    const localKeys: string[] = []
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i)
      if (key && (key.startsWith('sb-') || key.startsWith('supabase.auth.'))) {
        localKeys.push(key)
      }
    }
    localKeys.forEach((key) => window.localStorage.removeItem(key))

    const sessionKeys: string[] = []
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const key = window.sessionStorage.key(i)
      if (key && (key.startsWith('sb-') || key.startsWith('supabase.auth.'))) {
        sessionKeys.push(key)
      }
    }
    sessionKeys.forEach((key) => window.sessionStorage.removeItem(key))

    window.localStorage.setItem(SESSION_GUARD_KEY, SESSION_GUARD_VERSION)
  } catch {
    // Non-blocking guard; app should continue even if storage operations fail.
  }
}

function App() {
  const [session, setSession] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [roleResolved, setRoleResolved] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchUserRole = async (user: any) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user?.id)
        .maybeSingle()

      if (!error && data) {
        setUserRole(data.role)
      } else {
        const metadataRole = user?.user_metadata?.role
        if (metadataRole === 'admin' || metadataRole === 'doctor' || metadataRole === 'patient') {
          setUserRole(metadataRole)
        } else {
          setUserRole(null)
        }
      }
    } catch {
      const metadataRole = user?.user_metadata?.role
      if (metadataRole === 'admin' || metadataRole === 'doctor' || metadataRole === 'patient') {
        setUserRole(metadataRole)
      } else {
        setUserRole(null)
      }
    } finally {
      setRoleResolved(true)
    }
  }

  useEffect(() => {
    let isMounted = true
    const loadingTimeout = setTimeout(() => {
      if (isMounted) {
        setLoading(false)
      }
    }, 8000)

    const initAuth = async () => {
      try {
        await clearStaleAuthStateOnce()

        // Get initial session
        const { data: { session } } = await supabase.auth.getSession()
        if (!isMounted) return

        setSession(session)
        if (session?.user) {
          setRoleResolved(false)
          await fetchUserRole(session.user)
        } else {
          setUserRole(null)
          setRoleResolved(true)
        }
      } catch {
        if (!isMounted) return
        setSession(null)
        setUserRole(null)
        setRoleResolved(true)
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
            setRoleResolved(false)
            await fetchUserRole(session.user)
          } else {
            setUserRole(null)
            setRoleResolved(true)
          }
        } catch {
          if (!isMounted) return
          setUserRole(null)
          setRoleResolved(true)
        } finally {
          if (isMounted) setLoading(false)
        }
      }
    )

    return () => {
      isMounted = false
      clearTimeout(loadingTimeout)
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
          !session ? <Login /> : !roleResolved ? (
            <div className="min-h-screen flex items-center justify-center text-gray-600">Preparing dashboard...</div>
          ) : !userRole ? <Login /> : <Navigate to={getDashboardPath()} />
        } />
        
        <Route path="/patient/*" element={
          !session ? <Navigate to="/login" /> : !roleResolved ? (
            <div className="min-h-screen flex items-center justify-center text-gray-600">Loading patient dashboard...</div>
          ) : userRole === 'patient' ? <PatientDashboard /> : <Navigate to="/login" />
        } />
        
        <Route path="/doctor/*" element={
          !session ? <Navigate to="/login" /> : !roleResolved ? (
            <div className="min-h-screen flex items-center justify-center text-gray-600">Loading doctor dashboard...</div>
          ) : userRole === 'doctor' ? <DoctorDashboard /> : <Navigate to="/login" />
        } />
        
        <Route path="/admin/*" element={
          !session ? <Navigate to="/login" /> : !roleResolved ? (
            <div className="min-h-screen flex items-center justify-center text-gray-600">Loading admin dashboard...</div>
          ) : userRole === 'admin' ? <AdminDashboard /> : <Navigate to="/login" />
        } />
        
        <Route path="/" element={<Navigate to={session ? getDashboardPath() : '/login'} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  )
}

export default App