import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Link, Routes, Route, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

// Doctor List Component
const DoctorList = () => {
  const [doctors, setDoctors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [specialty, setSpecialty] = useState('')

  useEffect(() => {
    const loadDoctors = async () => {
      setLoading(true)
      let query = supabase
        .from('doctors')
        .select(`
          *,
          profiles:profiles(full_name, email)
        `)
        .eq('is_active', true)

      if (specialty) {
        query = query.eq('specialty', specialty)
      }

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
        <select
          className="border rounded-lg p-2"
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
        >
          <option value="">All Specialties</option>
          <option value="Cardiology">Cardiology</option>
          <option value="Dermatology">Dermatology</option>
          <option value="Neurology">Neurology</option>
          <option value="Pediatrics">Pediatrics</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading doctors...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doctor) => (
            <div key={doctor.id} className="border rounded-lg p-4 hover:shadow-lg transition">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl">
                  👨‍⚕️
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{doctor.profiles?.full_name}</h3>
                  <p className="text-sm text-gray-600">{doctor.specialty}</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-2">{doctor.bio}</p>
              <div className="flex justify-between items-center mt-3">
                <span className="text-green-600 font-bold">${doctor.consultation_fee}</span>
                <span className="text-sm text-gray-500">{doctor.experience_years} years exp.</span>
              </div>
              <Link
                to={`/patient/book/${doctor.id}`}
                className="mt-3 block text-center bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
              >
                Book Appointment
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Book Appointment Component
const BookAppointment = () => {
  const navigate = useNavigate()
  const [doctorId, setDoctorId] = useState('')
  const [doctor, setDoctor] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const initDoctor = async () => {
      // Get doctor ID from URL
      const pathParts = window.location.pathname.split('/')
      const id = pathParts[pathParts.length - 1]
      setDoctorId(id)
      
      const { data } = await supabase
        .from('doctors')
        .select('*, profiles(full_name, specialty)')
        .eq('id', id)
        .single()
      if (data) setDoctor(data)
    }
    initDoctor()
  }, [])

  useEffect(() => {
    if (!selectedDate || !doctorId) {
      return
    }

    const loadAvailableSlots = async () => {
      // Generate time slots (9 AM to 5 PM)
      const slots = []
      for (let hour = 9; hour <= 17; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`)
        if (hour !== 17) slots.push(`${hour.toString().padStart(2, '0')}:30`)
      }

      // Get booked slots
      const { data: booked } = await supabase
        .from('appointments')
        .select('appointment_time')
        .eq('doctor_id', doctorId)
        .eq('appointment_date', selectedDate)
        .not('status', 'eq', 'cancelled')

      const bookedTimes = booked?.map(b => b.appointment_time) || []
      const available = slots.filter(slot => !bookedTimes.includes(slot))
      setAvailableSlots(available)
    }

    loadAvailableSlots()
  }, [selectedDate, doctorId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTime) {
      toast.error('Please select a time slot')
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
        appointment_time: selectedTime,
        reason: reason,
        status: 'pending'
      })

    if (error) {
      toast.error('Failed to book appointment: ' + error.message)
    } else {
      toast.success('Appointment booked successfully!')
      navigate('/patient/appointments')
    }
    setLoading(false)
  }

  if (!doctor) return <div>Loading...</div>

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Book Appointment</h2>
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <p className="font-semibold">Dr. {doctor.profiles?.full_name}</p>
        <p className="text-gray-600">{doctor.specialty}</p>
        <p className="text-green-600 font-bold mt-2">${doctor.consultation_fee}</p>
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

        {selectedDate && (
          <div>
            <label className="block mb-2 font-medium">Select Time</label>
            <div className="grid grid-cols-4 gap-2">
              {availableSlots.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setSelectedTime(time)}
                  className={`p-2 border rounded-lg text-center ${
                    selectedTime === time
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
            {availableSlots.length === 0 && (
              <p className="text-red-500 text-sm mt-2">No available slots for this date</p>
            )}
          </div>
        )}

        <div>
          <label className="block mb-2 font-medium">Reason for Visit</label>
          <textarea
            className="w-full border rounded-lg p-2"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe your symptoms or reason for visit..."
          />
        </div>

        <button
          type="submit"
          disabled={loading || !selectedTime}
          className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Booking...' : 'Confirm Appointment'}
        </button>
      </form>
    </div>
  )
}

// My Appointments Component
const MyAppointments = () => {
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAppointments = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        doctor:doctors(
          specialty,
          consultation_fee,
          profiles(full_name)
        )
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
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', id)

    if (error) {
      toast.error('Failed to cancel appointment')
    } else {
      toast.success('Appointment cancelled')
      fetchAppointments()
    }
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) return <div>Loading appointments...</div>

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">My Appointments</h2>
      {appointments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No appointments found. Book your first appointment!
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((apt) => (
            <div key={apt.id} className="border rounded-lg p-4 hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">
                    Dr. {apt.doctor?.profiles?.full_name}
                  </h3>
                  <p className="text-gray-600">{apt.doctor?.specialty}</p>
                  <p className="text-sm mt-2">
                    <strong>Date:</strong> {format(new Date(apt.appointment_date), 'MMMM dd, yyyy')}
                    <br />
                    <strong>Time:</strong> {apt.appointment_time}
                  </p>
                  {apt.reason && (
                    <p className="text-sm text-gray-600 mt-2">
                      <strong>Reason:</strong> {apt.reason}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded text-sm ${getStatusColor(apt.status)}`}>
                    {apt.status}
                  </span>
                  {apt.status === 'pending' && (
                    <button
                      onClick={() => cancelAppointment(apt.id)}
                      className="block mt-2 text-sm text-red-600 hover:text-red-800"
                    >
                      Cancel
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

// Main Patient Dashboard
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
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-gray-900">Patient Portal</h1>
              <div className="flex space-x-4">
                <Link to="/patient" className="text-gray-700 hover:text-gray-900 px-3 py-2">
                  Find Doctors
                </Link>
                <Link to="/patient/appointments" className="text-gray-700 hover:text-gray-900 px-3 py-2">
                  My Appointments
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.email}</span>
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

      {/* Main Content */}
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