import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

type SignupRole = 'patient' | 'doctor'

export const Login = () => {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<SignupRole>('patient')
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
        // App.tsx listens to auth changes and routes by role; route to root immediately.
        navigate('/')
        toast.success('Welcome back!')
      }
    } else {
      // SIGNUP - Public signup is only for patients and doctors
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: selectedRole
          }
        }
      })
      
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Account created successfully! Please login.')
        setFullName('')
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
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your full name"
                required={!isLogin}
              />
            </div>
            <label className="block text-sm font-medium text-gray-700">I am a:</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'patient', label: 'Patient', icon: '👤' },
                { value: 'doctor', label: 'Doctor', icon: '👨‍⚕️' }
              ].map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setSelectedRole(role.value as SignupRole)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedRole === role.value
                      ? 'border-red-500 bg-red-50 text-red-700'
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