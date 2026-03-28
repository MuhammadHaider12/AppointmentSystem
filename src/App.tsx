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

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        await fetchUserRole(session.user.id)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        if (session?.user) {
          await fetchUserRole(session.user.id)
        } else {
          setUserRole(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    
    if (!error && data) {
      setUserRole(data.role)
    }
  }

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
          !session ? <Login /> : <Navigate to={getDashboardPath()} />
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
      </Routes>
    </Router>
  )
}

export default App