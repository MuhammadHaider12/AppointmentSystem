import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Routes, Route, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'

// Dashboard Stats Component
const DashboardStats = () => {
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalDoctors: 0,
    totalAppointments: 0,
    pendingAppointments: 0,
    totalRevenue: 0
  })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    // Get total patients
    const { count: patients } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'patient')

    // Get total doctors
    const { count: doctors } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'doctor')

    // Get appointments stats
    const { data: appointments } = await supabase
      .from('appointments')
      .select('status, doctor:doctors!doctor_id(consultation_fee)')

    const totalAppointments = appointments?.length || 0
    const pendingAppointments = appointments?.filter(a => a.status === 'pending').length || 0
    const totalRevenue = appointments?.reduce((sum, a) => {
      const doctor = Array.isArray(a.doctor) ? a.doctor[0] : a.doctor
      const fee = Number(doctor?.consultation_fee || 0)
      return sum + fee
    }, 0) || 0

    setStats({
      totalPatients: patients || 0,
      totalDoctors: doctors || 0,
      totalAppointments,
      pendingAppointments,
      totalRevenue
    })
  }

  const statCards = [
    { title: 'Total Patients', value: stats.totalPatients, icon: '👥', color: 'bg-blue-500' },
    { title: 'Total Doctors', value: stats.totalDoctors, icon: '👨‍⚕️', color: 'bg-green-500' },
    { title: 'Total Appointments', value: stats.totalAppointments, icon: '📅', color: 'bg-purple-500' },
    { title: 'Pending Appointments', value: stats.pendingAppointments, icon: '⏳', color: 'bg-yellow-500' },
    { title: 'Total Revenue', value: `$${stats.totalRevenue}`, icon: '💰', color: 'bg-indigo-500' }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      {statCards.map((stat, idx) => (
        <div key={idx} className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">{stat.title}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </div>
            <div className={`${stat.color} w-10 h-10 rounded-full flex items-center justify-center text-white text-xl`}>
              {stat.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Manage Doctors Component
const ManageDoctors = () => {
  const [doctors, setDoctors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    specialty: '',
    experience_years: 0,
    consultation_fee: 0,
    bio: ''
  })

  useEffect(() => {
    fetchDoctors()
  }, [])

  const fetchDoctors = async () => {
    const { data, error } = await supabase
      .from('doctors')
      .select(`
        *,
        profiles:profiles(full_name, email, phone)
      `)
      .order('created_at', { ascending: false })

    if (!error && data) setDoctors(data)
    setLoading(false)
  }

  const addDoctor = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.full_name,
          role: 'doctor'
        }
      }
    })

    if (authError) {
      toast.error('Failed to create doctor account')
      setLoading(false)
      return
    }

    if (authData.user) {
      // Add doctor details
      const { error: doctorError } = await supabase
        .from('doctors')
        .insert({
          id: authData.user.id,
          specialty: formData.specialty,
          experience_years: formData.experience_years,
          consultation_fee: formData.consultation_fee,
          bio: formData.bio
        })

      if (doctorError) {
        toast.error('Failed to add doctor details')
      } else {
        toast.success('Doctor added successfully')
        setShowAddForm(false)
        setFormData({
          email: '',
          password: '',
          full_name: '',
          specialty: '',
          experience_years: 0,
          consultation_fee: 0,
          bio: ''
        })
        fetchDoctors()
      }
    }
    setLoading(false)
  }

  const toggleDoctorStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('doctors')
      .update({ is_active: !currentStatus })
      .eq('id', id)

    if (error) {
      toast.error('Failed to update doctor status')
    } else {
      toast.success(`Doctor ${!currentStatus ? 'activated' : 'deactivated'}`)
      fetchDoctors()
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Manage Doctors</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          + Add Doctor
        </button>
      </div>

      {/* Add Doctor Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Add New Doctor</h3>
            <form onSubmit={addDoctor} className="space-y-3">
              <input
                type="text"
                placeholder="Full Name"
                className="w-full border rounded p-2"
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                required
              />
              <input
                type="email"
                placeholder="Email"
                className="w-full border rounded p-2"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full border rounded p-2"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
              <input
                type="text"
                placeholder="Specialty"
                className="w-full border rounded p-2"
                value={formData.specialty}
                onChange={(e) => setFormData({...formData, specialty: e.target.value})}
                required
              />
              <input
                type="number"
                placeholder="Experience Years"
                className="w-full border rounded p-2"
                value={formData.experience_years}
                onChange={(e) => setFormData({...formData, experience_years: parseInt(e.target.value)})}
              />
              <input
                type="number"
                placeholder="Consultation Fee ($)"
                className="w-full border rounded p-2"
                value={formData.consultation_fee}
                onChange={(e) => setFormData({...formData, consultation_fee: parseInt(e.target.value)})}
              />
              <textarea
                placeholder="Bio"
                className="w-full border rounded p-2"
                rows={3}
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
              />
              <div className="flex space-x-2">
                <button type="submit" className="flex-1 bg-blue-500 text-white py-2 rounded">Add</button>
                <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 bg-gray-300 py-2 rounded">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Doctors List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doctor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Specialty</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Experience</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {doctors.map((doctor) => (
              <tr key={doctor.id}>
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium">{doctor.profiles?.full_name}</div>
                    <div className="text-sm text-gray-500">{doctor.profiles?.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4">{doctor.specialty}</td>
                <td className="px-6 py-4">{doctor.experience_years} years</td>
                <td className="px-6 py-4">${doctor.consultation_fee}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-sm ${
                    doctor.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {doctor.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => toggleDoctorStatus(doctor.id, doctor.is_active)}
                    className={`text-sm ${
                      doctor.is_active ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {doctor.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Manage Appointments Component
const ManageAppointments = () => {
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAppointments()
  }, [])

  const fetchAppointments = async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:profiles!patient_id(full_name, email),
        doctor:doctors(profiles(full_name), specialty)
      `)
      .order('created_at', { ascending: false })

    if (!error && data) setAppointments(data)
    setLoading(false)
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">All Appointments</h2>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doctor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {appointments.map((apt) => (
              <tr key={apt.id}>
                <td className="px-6 py-4">{apt.patient?.full_name}</td>
                <td className="px-6 py-4">{apt.doctor?.profiles?.full_name}</td>
                <td className="px-6 py-4">
                  {apt.appointment_date} at {apt.appointment_time}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-sm ${
                    apt.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    apt.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {apt.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Main Admin Dashboard
export const AdminDashboard = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    getUser()
  }, [])

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-gray-900">Admin Portal</h1>
              <div className="flex space-x-4">
                <Link to="/admin" className="text-gray-700 hover:text-gray-900 px-3 py-2">
                  Dashboard
                </Link>
                <Link to="/admin/doctors" className="text-gray-700 hover:text-gray-900 px-3 py-2">
                  Manage Doctors
                </Link>
                <Link to="/admin/appointments" className="text-gray-700 hover:text-gray-900 px-3 py-2">
                  All Appointments
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Admin: {user?.email}</span>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<DashboardStats />} />
          <Route path="/doctors" element={<ManageDoctors />} />
          <Route path="/appointments" element={<ManageAppointments />} />
        </Routes>
      </div>
    </div>
  )
}