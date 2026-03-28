import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { Link, Routes, Route, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

// Today's Appointments Component
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
        patient:profiles!patient_id(full_name, email, phone)
      `)
      .eq('doctor_id', user?.id)
      .eq('appointment_date', today)
      .order('appointment_time', { ascending: true })

    if (!error && data) setAppointments(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTodayAppointments()
  }, [fetchTodayAppointments])

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id)

    if (error) {
      toast.error('Failed to update status')
    } else {
      toast.success(`Appointment marked ${status === 'not_checked' ? 'not checked' : status}`)
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
                  {apt.status === 'confirmed' && (
                    <>
                      <button
                        onClick={() => updateStatus(apt.id, 'checked')}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                      >
                        Mark Checked
                      </button>
                      <button
                        onClick={() => updateStatus(apt.id, 'not_checked')}
                        className="bg-orange-500 text-white px-3 py-1 rounded text-sm"
                      >
                        Not Checked
                      </button>
                    </>
                  )}
                  <span className={`px-2 py-1 rounded text-sm ${
                    apt.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    apt.status === 'checked' ? 'bg-blue-100 text-blue-800' :
                    apt.status === 'not_checked' ? 'bg-orange-100 text-orange-800' :
                    apt.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    apt.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {apt.status === 'not_checked' ? 'not checked' : apt.status}
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
  const [cancelingId, setCancelingId] = useState<string | null>(null)

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

  const cancelWithReason = async (apt: any) => {
    const reason = window.prompt('Enter cancellation reason for patient:')
    if (!reason || !reason.trim()) {
      toast.error('Cancellation reason is required')
      return
    }

    setCancelingId(apt.id)
    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        notes: `Doctor cancellation reason: ${reason.trim()}`
      })
      .eq('id', apt.id)

    if (!error) {
      await supabase
        .from('time_slots')
        .update({ is_available: true, appointment_id: null })
        .eq('doctor_id', apt.doctor_id)
        .eq('slot_date', apt.appointment_date)
        .eq('slot_time', apt.appointment_time)
        .eq('appointment_id', apt.id)
    }

    if (error) {
      toast.error('Failed to cancel appointment')
    } else {
      toast.success('Appointment cancelled with reason')
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

      const { data, error: refreshError } = await query
      if (!refreshError && data) setAppointments(data)
    }
    setCancelingId(null)
  }

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
          <option value="checked">Checked</option>
          <option value="not_checked">Not Checked</option>
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
                  {apt.notes && (
                    <p className="text-xs text-red-600 mt-1">{apt.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {(apt.status === 'pending' || apt.status === 'confirmed') && (
                    <button
                      onClick={() => cancelWithReason(apt)}
                      disabled={cancelingId === apt.id}
                      className="bg-red-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                    >
                      {cancelingId === apt.id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  )}
                  <span className={`px-2 py-1 rounded text-sm ${
                    apt.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    apt.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    apt.status === 'checked' ? 'bg-blue-100 text-blue-800' :
                    apt.status === 'not_checked' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {apt.status === 'not_checked' ? 'not checked' : apt.status}
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

// Availability Manager Component
const AvailabilityManager = () => {
  const [availability, setAvailability] = useState<any[]>([])
  const [newSlot, setNewSlot] = useState({
    slot_date: format(new Date(), 'yyyy-MM-dd'),
    slot_time: '09:00:00'
  })

  const fetchAvailability = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('time_slots')
      .select('*')
      .eq('doctor_id', user?.id)
      .order('slot_date', { ascending: true })
      .order('slot_time', { ascending: true })
    
    if (data) setAvailability(data)
  }, [])

  useEffect(() => {
    fetchAvailability()
  }, [fetchAvailability])

  const addAvailability = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('time_slots')
      .insert({
        doctor_id: user?.id,
        slot_date: newSlot.slot_date,
        slot_time: newSlot.slot_time,
        is_available: true
      })

    if (error) {
      toast.error('Failed to add availability')
    } else {
      toast.success('Availability added')
      fetchAvailability()
    }
  }

  const removeAvailability = async (id: string) => {
    const { error } = await supabase
      .from('time_slots')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to remove slot')
    } else {
      toast.success('Slot removed')
      fetchAvailability()
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Manage Availability</h2>
      
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-3">Add Available Slot</h3>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            value={newSlot.slot_date}
            onChange={(e) => setNewSlot({ ...newSlot, slot_date: e.target.value })}
            className="border rounded p-2"
            min={format(new Date(), 'yyyy-MM-dd')}
          />
          <input
            type="time"
            value={newSlot.slot_time.slice(0, 5)}
            onChange={(e) => setNewSlot({ ...newSlot, slot_time: `${e.target.value}:00` })}
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
            <span>
              {format(new Date(slot.slot_date), 'MMM dd, yyyy')}: {String(slot.slot_time).slice(0, 5)}
              {!slot.is_available && ' (booked)'}
            </span>
            <button
              onClick={() => removeAvailability(slot.id)}
              className="text-red-500 text-sm"
            >
              Remove
            </button>
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