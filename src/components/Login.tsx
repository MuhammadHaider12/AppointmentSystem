import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

type Role = 'patient' | 'doctor' | 'admin'

export const Login = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<Role>('patient')
  const [loading, setLoading] = useState(false)
  const [isLogin, setIsLogin] = useState(true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (isLogin) {
      // LOGIN
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      })
      
      if (error) {
        toast.error(error.message)
        setLoading(false)
        return
      }

      if (data.user) {
        // Fetch user profile to get role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single()

        if (profileError) {
          toast.error('Error fetching user role')
          setLoading(false)
          return
        }

        // Redirect based on role
        switch (profile.role) {
          case 'admin':
            navigate('/admin')
            break
          case 'doctor':
            navigate('/doctor')
            break
          default:
            navigate('/patient')
        }
        
        toast.success(`Welcome back, ${profile.role}!`)
      }
    } else {
      // SIGNUP - Create account with selected role
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            full_name: email.split('@')[0],
            role: selectedRole
          }
        }
      })
      
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Account created successfully! Please login.')
        setIsLogin(true) // Switch to login form
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-8 bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="mt-2 text-gray-600">
            {isLogin 
              ? 'Sign in to manage your appointments' 
              : 'Choose your role to get started'}
          </p>
        </div>

        {/* Role Selection (only for signup) */}
        {!isLogin && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">I am a:</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'patient', label: 'Patient', icon: '👤', color: 'blue' },
                { value: 'doctor', label: 'Doctor', icon: '👨‍⚕️', color: 'green' },
                { value: 'admin', label: 'Admin', icon: '👑', color: 'purple' }
              ].map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setSelectedRole(role.value as Role)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedRole === role.value
                      ? `border-${role.color}-500 bg-${role.color}-50 text-${role.color}-700`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{role.icon}</div>
                  <div className="text-sm font-medium">{role.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="you@example.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        {/* Toggle between Login/Signup */}
        <div className="text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {isLogin 
              ? "Don't have an account? Sign Up" 
              : "Already have an account? Sign In"}
          </button>
        </div>

        {/* Demo Credentials */}
        <div className="border-t pt-4 mt-4">
          <p className="text-xs text-gray-500 text-center">
            Demo Credentials:
            <br />
            Patient: patient@example.com / patient123
            <br />
            Doctor: doctor@example.com / doctor123
            <br />
            Admin: admin@example.com / admin123
          </p>
        </div>
      </div>
    </div>
  )
}