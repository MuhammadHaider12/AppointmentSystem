import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Link, Routes, Route, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const DoctorList = () => {
  const [doctors, setDoctors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [specialty, setSpecialty] = useState('')

  useEffect(() => {
    const loadDoctors = async () => {
      setLoading(true)
      let query = supabase
        .from('users')
        .select('id, full_name, email, specialty, bio, consultation_fee, experience_years, rating, is_active')
        .eq('role', 'doctor')
        .eq('is_active', true)

      if (specialty) query = query.eq('specialty', specialty)

      const { data, error } = await query
      if (!error && data) setDoctors(data)
      setLoading(false)
    }

    loadDoctors()
  }, [specialty])

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Available Doctors</h2>
        <select className="border rounded-lg p-2" value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
          <option value="">All Specialties</option>
          <option value="Cardiology">Cardiology</option>
          <option value="Dermatology">Dermatology</option>
          <option value="Neurology">Neurology</option>
          <option value="Pediatrics">Pediatrics</option>
          <option value="General Practice">General Practice</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading doctors...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doctor) => (
            <div key={doctor.id} className="border rounded-lg p-4 hover:shadow-lg transition">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl">👨‍⚕️</div>
                <div>
                  <h3 className="font-semibold text-lg">{doctor.full_name}</h3>
                  <p className="text-sm text-gray-600">{doctor.specialty}</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-2">{doctor.bio}</p>
              <div className="flex justify-between items-center mt-3">
                <span className="text-green-600 font-bold">${doctor.consultation_fee || 0}</span>
                <span className="text-sm text-gray-500">{doctor.experience_years || 0} years exp.</span>
              </div>
              <Link to={`/patient/book/${doctor.id}`} className="mt-3 block text-center bg-blue-500 text-white py-2 rounded hover:bg-blue-600">
                Request Appointment
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const BookAppointment = () => {
  const navigate = useNavigate()
  const [doctorId, setDoctorId] = useState('')
  const [doctor, setDoctor] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('09:00')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const initDoctor = async () => {
      const pathParts = window.location.pathname.split('/')
      const id = pathParts[pathParts.length - 1]
      setDoctorId(id)

      const { data } = await supabase
        .from('users')
        .select('id, full_name, specialty, consultation_fee, available_days, available_time_start, available_time_end')
        .eq('id', id)
        .eq('role', 'doctor')
        .maybeSingle()

      if (data) setDoctor(data)
    }
    initDoctor()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!reason.trim()) {
      toast.error('Please enter reason for visit')
      return
    }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('appointments')
      .insert({
        patient_id: user?.id,
        doctor_id: doctorId,
        appointment_date: selectedDate,
        appointment_time: `${selectedTime}:00`,
        reason: reason.trim(),
        status: 'pending'
      })

    if (error) {
      toast.error('Failed to request appointment: ' + error.message)
    } else {
      toast.success('Appointment request sent. Waiting for admin approval.')
      navigate('/patient/appointments')
    }
    setLoading(false)
  }

  if (!doctor) return <div>Loading...</div>

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Request Appointment</h2>
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <p className="font-semibold">Dr. {doctor.full_name}</p>
        <p className="text-gray-600">{doctor.specialty}</p>
        <p className="text-green-600 font-bold mt-2">${doctor.consultation_fee || 0}</p>
        {doctor.available_days?.length ? (
          <p className="text-sm text-gray-600 mt-2">Available: {doctor.available_days.join(', ')}</p>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-2 font-medium">Select Date</label>
          <input
            type="date"
            className="w-full border rounded-lg p-2"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={format(new Date(), 'yyyy-MM-dd')}
            required
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">Select Time</label>
          <input
            type="time"
            className="w-full border rounded-lg p-2"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">Reason for Visit</label>
          <textarea
            className="w-full border rounded-lg p-2"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe your symptoms or reason for visit..."
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>
    </div>
  )
}

const MyAppointments = () => {
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAppointments = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        doctor:users!doctor_id(full_name, specialty, consultation_fee)
      `)
      .eq('patient_id', user?.id)
      .order('appointment_date', { ascending: true })

    if (!error && data) setAppointments(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchAppointments()
  }, [])

  const cancelAppointment = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancelled_by: user?.id,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: 'Cancelled by patient'
      })
      .eq('id', id)
      .eq('status', 'pending')

    if (error) {
      toast.error('Failed to cancel appointment')
    } else {
      toast.success('Appointment cancelled')
      fetchAppointments()
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    if (status === 'completed') return 'checked'
    return status
  }

  if (loading) return <div>Loading appointments...</div>

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">My Appointments History</h2>
      {appointments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No appointments found. Book your first appointment!</div>
      ) : (
        <div className="space-y-4">
          {appointments.map((apt) => (
            <div key={apt.id} className="border rounded-lg p-4 hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">Dr. {apt.doctor?.full_name}</h3>
                  <p className="text-gray-600">{apt.doctor?.specialty}</p>
                  <p className="text-sm mt-2">
                    <strong>Date:</strong> {format(new Date(apt.appointment_date), 'MMMM dd, yyyy')}
                    <br />
                    <strong>Time:</strong> {apt.appointment_time}
                  </p>
                  {apt.reason && (
                    <p className="text-sm text-gray-600 mt-2"><strong>Reason:</strong> {apt.reason}</p>
                  )}
                  {apt.rejection_reason && (
                    <p className="text-sm text-red-600 mt-2"><strong>Rejection:</strong> {apt.rejection_reason}</p>
                  )}
                  {apt.cancellation_reason && (
                    <p className="text-sm text-red-600 mt-2"><strong>Cancellation:</strong> {apt.cancellation_reason}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded text-sm ${getStatusColor(apt.status)}`}>
                    {getStatusLabel(apt.status)}
                  </span>
                  {apt.status === 'pending' && (
                    <button
                      onClick={() => cancelAppointment(apt.id)}
                      className="block mt-2 text-sm text-red-600 hover:text-red-800"
                    >
                      Cancel Request
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export const PatientDashboard = () => {
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
              <h1 className="text-xl font-bold text-gray-900">Patient Portal</h1>
              <div className="flex space-x-4">
                <Link to="/patient" className="text-gray-700 hover:text-gray-900 px-3 py-2">Find Doctors</Link>
                <Link to="/patient/appointments" className="text-gray-700 hover:text-gray-900 px-3 py-2">My Appointments</Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.email}</span>
              <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600">Logout</button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<DoctorList />} />
          <Route path="/appointments" element={<MyAppointments />} />
          <Route path="/book/:doctorId" element={<BookAppointment />} />
        </Routes>
      </div>
    </div>
  )
}
