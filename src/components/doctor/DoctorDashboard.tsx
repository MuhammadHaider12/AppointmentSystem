import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Link, Routes, Route, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

// Today's Appointments Component
const TodayAppointments = () => {
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTodayAppointments = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const today = format(new Date(), 'yyyy-MM-dd')

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:profiles!patient_id(full_name, email, phone)
      `)
      .eq('doctor_id', user?.id)
      .eq('appointment_date', today)
      .order('appointment_time', { ascending: true })

    if (!error && data) setAppointments(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchTodayAppointments()
  }, [])

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id)

    if (error) {
      toast.error('Failed to update status')
    } else {
      toast.success(`Appointment ${status}`)
      fetchTodayAppointments()
    }
  }

  if (loading) return <div>Loading appointments...</div>

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Today's Appointments</h2>
      {appointments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No appointments scheduled for today
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((apt) => (
            <div key={apt.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">🩺</span>
                    <div>
                      <h3 className="font-semibold text-lg">{apt.patient?.full_name}</h3>
                      <p className="text-gray-600">{apt.patient?.email}</p>
                      <p className="text-sm text-gray-500">Time: {apt.appointment_time}</p>
                    </div>
                  </div>
                  {apt.reason && (
                    <p className="mt-2 text-gray-700">
                      <strong>Reason:</strong> {apt.reason}
                    </p>
                  )}
                </div>
                <div className="flex space-x-2">
                  {apt.status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateStatus(apt.id, 'confirmed')}
                        className="bg-green-500 text-white px-3 py-1 rounded text-sm"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => updateStatus(apt.id, 'cancelled')}
                        className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {apt.status === 'confirmed' && (
                    <button
                      onClick={() => updateStatus(apt.id, 'completed')}
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                    >
                      Complete
                    </button>
                  )}
                  <span className={`px-2 py-1 rounded text-sm ${
                    apt.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    apt.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {apt.status}
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

// All Appointments Component
const AllAppointments = () => {
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const loadAppointments = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      let query = supabase
        .from('appointments')
        .select(`
          *,
          patient:profiles!patient_id(full_name, email)
        `)
        .eq('doctor_id', user?.id)
        .order('appointment_date', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query
      if (!error && data) setAppointments(data)
      setLoading(false)
    }

    loadAppointments()
  }, [filter])

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">All Appointments</h2>
        <select
          className="border rounded-lg p-2"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => (
            <div key={apt.id} className="border rounded-lg p-3">
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold">{apt.patient?.full_name}</p>
                  <p className="text-sm text-gray-600">
                    {format(new Date(apt.appointment_date), 'MMM dd, yyyy')} at {apt.appointment_time}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-sm ${
                  apt.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                  apt.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  apt.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {apt.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Availability Manager Component
const AvailabilityManager = () => {
  const [availability, setAvailability] = useState<any[]>([])
  const [newSlot, setNewSlot] = useState({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00'
  })

  const fetchAvailability = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('doctor_availability')
      .select('*')
      .eq('doctor_id', user?.id)
    
    if (data) setAvailability(data)
  }

  useEffect(() => {
    fetchAvailability()
  }, [])

  const addAvailability = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('doctor_availability')
      .insert({
        doctor_id: user?.id,
        ...newSlot
      })

    if (error) {
      toast.error('Failed to add availability')
    } else {
      toast.success('Availability added')
      fetchAvailability()
    }
  }

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Manage Availability</h2>
      
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-3">Add New Availability Slot</h3>
        <div className="grid grid-cols-3 gap-3">
          <select
            className="border rounded p-2"
            value={newSlot.day_of_week}
            onChange={(e) => setNewSlot({...newSlot, day_of_week: parseInt(e.target.value)})}
          >
            {days.map((day, idx) => (
              <option key={idx} value={idx}>{day}</option>
            ))}
          </select>
          <input
            type="time"
            value={newSlot.start_time}
            onChange={(e) => setNewSlot({...newSlot, start_time: e.target.value})}
            className="border rounded p-2"
          />
          <input
            type="time"
            value={newSlot.end_time}
            onChange={(e) => setNewSlot({...newSlot, end_time: e.target.value})}
            className="border rounded p-2"
          />
        </div>
        <button
          onClick={addAvailability}
          className="mt-3 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add Slot
        </button>
      </div>

      <div className="space-y-2">
        {availability.map((slot) => (
          <div key={slot.id} className="border rounded p-3 flex justify-between">
            <span>{days[slot.day_of_week]}: {slot.start_time} - {slot.end_time}</span>
            <button className="text-red-500 text-sm">Remove</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// Main Doctor Dashboard
export const DoctorDashboard = () => {
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
              <h1 className="text-xl font-bold text-gray-900">Doctor Portal</h1>
              <div className="flex space-x-4">
                <Link to="/doctor" className="text-gray-700 hover:text-gray-900 px-3 py-2">
                  Today
                </Link>
                <Link to="/doctor/appointments" className="text-gray-700 hover:text-gray-900 px-3 py-2">
                  All Appointments
                </Link>
                <Link to="/doctor/availability" className="text-gray-700 hover:text-gray-900 px-3 py-2">
                  Availability
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Dr. {user?.email?.split('@')[0]}</span>
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
          <Route path="/" element={<TodayAppointments />} />
          <Route path="/appointments" element={<AllAppointments />} />
          <Route path="/availability" element={<AvailabilityManager />} />
        </Routes>
      </div>
    </div>
  )
}