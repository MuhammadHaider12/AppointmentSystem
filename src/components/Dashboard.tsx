import { useEffect, useState } from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

// Simple components
const DoctorList = () => {
  const [doctors, setDoctors] = useState<any[]>([])
  
  useEffect(() => {
    fetchDoctors()
  }, [])

  const fetchDoctors = async () => {
    const { data, error } = await supabase
      .from('doctors')
      .select('*, profiles(full_name)')
    
    if (!error && data) setDoctors(data)
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Available Doctors</h2>
      <div className="grid gap-4">
        {doctors.map(doctor => (
          <div key={doctor.id} className="border p-4 rounded-lg">
            <h3 className="text-xl font-semibold">{doctor.profiles?.full_name}</h3>
            <p className="text-gray-600">{doctor.specialty}</p>
            <p className="text-sm">{doctor.bio}</p>
            <p className="text-green-600 font-bold mt-2">${doctor.consultation_fee}</p>
            <Link 
              to={`/dashboard/book/${doctor.id}`}
              className="inline-block mt-2 bg-blue-500 text-white px-4 py-2 rounded"
            >
              Book Appointment
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}

const MyAppointments = () => {
  const [appointments, setAppointments] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)

  const fetchAppointments = async (userId: string) => {
    const { data, error } = await supabase
      .from('appointments')
      .select('*, doctor:doctors(profiles(full_name), specialty)')
      .eq('patient_id', userId)
      .order('appointment_date', { ascending: true })
    
    if (!error && data) setAppointments(data)
  }

  useEffect(() => {
    const loadUserAndAppointments = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) fetchAppointments(user.id)
    }

    loadUserAndAppointments()
  }, [])

  const cancelAppointment = async (id: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', id)
    
    if (error) toast.error('Failed to cancel')
    else {
      toast.success('Appointment cancelled')
      if (user) fetchAppointments(user.id)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">My Appointments</h2>
      <div className="space-y-4">
        {appointments.map(apt => (
          <div key={apt.id} className="border p-4 rounded-lg">
            <p><strong>Doctor:</strong> {apt.doctor?.profiles?.full_name}</p>
            <p><strong>Specialty:</strong> {apt.doctor?.specialty}</p>
            <p><strong>Date:</strong> {apt.appointment_date}</p>
            <p><strong>Time:</strong> {apt.appointment_time}</p>
            <p><strong>Status:</strong> 
              <span className={`ml-2 px-2 py-1 rounded text-sm ${
                apt.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                apt.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {apt.status}
              </span>
            </p>
            {apt.status === 'pending' && (
              <button
                onClick={() => cancelAppointment(apt.id)}
                className="mt-2 bg-red-500 text-white px-3 py-1 rounded text-sm"
              >
                Cancel
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const BookAppointment = () => {
  // Simplified booking component
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Book Appointment</h2>
      <p>Booking form will be here</p>
    </div>
  )
}

export const Dashboard = () => {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between">
          <h1 className="text-xl font-bold">Doctor Appointment System</h1>
          <div className="space-x-4">
            <Link to="/dashboard" className="text-gray-700 hover:text-gray-900">Home</Link>
            <Link to="/dashboard/doctors" className="text-gray-700 hover:text-gray-900">Doctors</Link>
            <Link to="/dashboard/appointments" className="text-gray-700 hover:text-gray-900">My Appointments</Link>
            <button onClick={handleLogout} className="text-red-600 hover:text-red-800">Logout</button>
          </div>
        </div>
      </nav>
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<DoctorList />} />
          <Route path="/doctors" element={<DoctorList />} />
          <Route path="/appointments" element={<MyAppointments />} />
          <Route path="/book/:doctorId" element={<BookAppointment />} />
        </Routes>
      </div>
    </div>
  )
}