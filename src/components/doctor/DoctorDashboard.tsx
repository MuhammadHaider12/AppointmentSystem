import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { Link, Routes, Route, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const TodayAppointments = () => {
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTodayAppointments = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const today = format(new Date(), 'yyyy-MM-dd')

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:users!patient_id(full_name, email, phone)
      `)
      .eq('doctor_id', user?.id)
      .eq('appointment_date', today)
      .eq('status', 'approved')
      .order('appointment_time', { ascending: true })

    if (!error && data) setAppointments(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTodayAppointments()
  }, [fetchTodayAppointments])

  const markCompleted = async (id: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'completed' })
      .eq('id', id)

    if (error) {
      toast.error('Failed to update appointment')
    } else {
      toast.success('Appointment marked completed')
      fetchTodayAppointments()
    }
  }

  if (loading) return <div>Loading appointments...</div>

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Today's Appointments</h2>
      {appointments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No appointments scheduled for today</div>
      ) : (
        <div className="space-y-4">
          {appointments.map((apt) => (
            <div key={apt.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{apt.patient?.full_name}</h3>
                  <p className="text-gray-600">{apt.patient?.email}</p>
                  <p className="text-sm text-gray-500">Time: {apt.appointment_time}</p>
                  {apt.reason && (
                    <p className="mt-2 text-gray-700"><strong>Reason:</strong> {apt.reason}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {apt.status === 'approved' && (
                    <button
                      onClick={() => markCompleted(apt.id)}
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                    >
                      Mark Checked
                    </button>
                  )}
                  <span className={`px-2 py-1 rounded text-sm ${
                    apt.status === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : apt.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : apt.status === 'completed'
                          ? 'bg-blue-100 text-blue-800'
                          : apt.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                  }`}>
                    {apt.status === 'completed' ? 'checked' : apt.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const AllAppointments = () => {
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [cancelingId, setCancelingId] = useState<string | null>(null)

  const fetchAppointments = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()

    let query = supabase
      .from('appointments')
      .select(`
        *,
        patient:users!patient_id(full_name, email)
      `)
      .eq('doctor_id', user?.id)
      .order('appointment_date', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const { data, error } = await query
    if (!error && data) setAppointments(data)
    setLoading(false)
  }, [filter])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const cancelWithReason = async (apt: any) => {
    const reason = window.prompt('Enter cancellation reason for patient:')
    if (!reason || !reason.trim()) {
      toast.error('Cancellation reason is required')
      return
    }

    setCancelingId(apt.id)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancelled_by: user?.id,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason.trim(),
        notes: `Doctor cancellation reason: ${reason.trim()}`
      })
      .eq('id', apt.id)

    if (error) {
      toast.error('Failed to cancel appointment')
    } else {
      toast.success('Appointment cancelled')
      fetchAppointments()
    }
    setCancelingId(null)
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">All Appointments</h2>
        <select className="border rounded-lg p-2" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="space-y-3">
        {appointments.map((apt) => (
          <div key={apt.id} className="border rounded-lg p-3">
            <div className="flex justify-between">
              <div>
                <p className="font-semibold">{apt.patient?.full_name}</p>
                <p className="text-sm text-gray-600">{format(new Date(apt.appointment_date), 'MMM dd, yyyy')} at {apt.appointment_time}</p>
                {apt.cancellation_reason && <p className="text-xs text-red-600 mt-1">{apt.cancellation_reason}</p>}
                {apt.rejection_reason && <p className="text-xs text-red-600 mt-1">{apt.rejection_reason}</p>}
              </div>
              <div className="flex items-center gap-2">
                {(apt.status === 'pending' || apt.status === 'approved') && (
                  <button
                    onClick={() => cancelWithReason(apt)}
                    disabled={cancelingId === apt.id}
                    className="bg-red-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                  >
                    {cancelingId === apt.id ? 'Cancelling...' : 'Cancel'}
                  </button>
                )}
                <span className={`px-2 py-1 rounded text-sm ${
                  apt.status === 'approved'
                    ? 'bg-green-100 text-green-800'
                    : apt.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : apt.status === 'completed'
                        ? 'bg-blue-100 text-blue-800'
                        : apt.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                }`}>
                  {apt.status === 'completed' ? 'checked' : apt.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const DoctorProfile = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    specialty: '',
    experience_years: 0,
    consultation_fee: 0,
    bio: ''
  })

  const fetchProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('users')
      .select('full_name, phone, specialty, experience_years, consultation_fee, bio')
      .eq('id', user?.id)
      .maybeSingle()

    if (!error && data) {
      setFormData({
        full_name: data.full_name || '',
        phone: data.phone || '',
        specialty: data.specialty || '',
        experience_years: data.experience_years || 0,
        consultation_fee: data.consultation_fee || 0,
        bio: data.bio || ''
      })
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.specialty.trim()) {
      toast.error('Specialty is required')
      return
    }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('users')
      .update({
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim() || null,
        specialty: formData.specialty.trim(),
        experience_years: formData.experience_years,
        consultation_fee: formData.consultation_fee,
        bio: formData.bio.trim() || null
      })
      .eq('id', user?.id)

    if (error) {
      toast.error('Failed to save profile')
    } else {
      toast.success('Profile updated successfully')
      fetchProfile()
    }
    setSaving(false)
  }

  if (loading) return <div>Loading profile...</div>

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">Doctor Profile</h2>
      <form onSubmit={saveProfile} className="bg-white rounded-lg shadow p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              value={formData.specialty}
              onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Fee</label>
            <input
              type="number"
              min={0}
              className="w-full border rounded p-2"
              value={formData.consultation_fee}
              onChange={(e) => setFormData({ ...formData, consultation_fee: parseInt(e.target.value, 10) || 0 })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Experience (years)</label>
          <input
            type="number"
            min={0}
            className="w-full border rounded p-2"
            value={formData.experience_years}
            onChange={(e) => setFormData({ ...formData, experience_years: parseInt(e.target.value, 10) || 0 })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
          <textarea
            rows={4}
            className="w-full border rounded p-2"
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            placeholder="Add your professional summary"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  )
}

const AvailabilityManager = () => {
  const [loading, setLoading] = useState(true)
  const [availableDays, setAvailableDays] = useState<string[]>([])
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  const fetchAvailability = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('users')
      .select('available_days, available_time_start, available_time_end')
      .eq('id', user?.id)
      .maybeSingle()

    if (data) {
      setAvailableDays(data.available_days || [])
      setStartTime(data.available_time_start ? String(data.available_time_start).slice(0, 5) : '09:00')
      setEndTime(data.available_time_end ? String(data.available_time_end).slice(0, 5) : '17:00')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAvailability()
  }, [fetchAvailability])

  const toggleDay = (day: string) => {
    if (availableDays.includes(day)) {
      setAvailableDays(availableDays.filter((d) => d !== day))
    } else {
      setAvailableDays([...availableDays, day])
    }
  }

  const saveAvailability = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('users')
      .update({
        available_days: availableDays,
        available_time_start: `${startTime}:00`,
        available_time_end: `${endTime}:00`
      })
      .eq('id', user?.id)

    if (error) {
      toast.error('Failed to save availability')
    } else {
      toast.success('Availability updated')
    }
  }

  if (loading) return <div>Loading availability...</div>

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Manage Availability</h2>
      <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-4">
        <div>
          <p className="font-medium mb-2">Available Days</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {days.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`px-3 py-2 rounded border ${availableDays.includes(day) ? 'bg-blue-500 text-white border-blue-500' : 'bg-white'}`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input type="time" className="border rounded p-2" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          <input type="time" className="border rounded p-2" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>

        <button onClick={saveAvailability} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Save Availability</button>
      </div>
    </div>
  )
}

export const DoctorDashboard = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)

  const getUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }, [])

  useEffect(() => {
    getUser()
  }, [getUser])

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
              <h1 className="text-xl font-bold text-gray-900">Doctor Portal</h1>
              <div className="flex space-x-4">
                <Link to="/doctor" className="text-gray-700 hover:text-gray-900 px-3 py-2">Today</Link>
                <Link to="/doctor/appointments" className="text-gray-700 hover:text-gray-900 px-3 py-2">All Appointments</Link>
                <Link to="/doctor/profile" className="text-gray-700 hover:text-gray-900 px-3 py-2">Profile</Link>
                <Link to="/doctor/availability" className="text-gray-700 hover:text-gray-900 px-3 py-2">Availability</Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Dr. {user?.email?.split('@')[0]}</span>
              <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600">Logout</button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<TodayAppointments />} />
          <Route path="/appointments" element={<AllAppointments />} />
          <Route path="/profile" element={<DoctorProfile />} />
          <Route path="/availability" element={<AvailabilityManager />} />
        </Routes>
      </div>
    </div>
  )
}
