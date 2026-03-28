import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { Routes, Route, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'

const DashboardStats = () => {
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalDoctors: 0,
    totalAdmins: 0,
    totalAppointments: 0,
    pendingAppointments: 0,
    pendingPatients: 0
  })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    const { count: patients } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'patient')

    const { count: doctors } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'doctor')

    const { count: admins } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin')

    const { data: appointments } = await supabase
      .from('appointments')
      .select('patient_id, status')

    const totalAppointments = appointments?.length || 0
    const pendingAppointments = appointments?.filter((a) => a.status === 'pending').length || 0
    const pendingPatients = new Set(
      (appointments || [])
        .filter((a) => a.status === 'pending')
        .map((a) => a.patient_id)
        .filter(Boolean)
    ).size

    setStats({
      totalPatients: patients || 0,
      totalDoctors: doctors || 0,
      totalAdmins: admins || 0,
      totalAppointments,
      pendingAppointments,
      pendingPatients
    })
  }

  const statCards = [
    { title: 'Total Patients', value: stats.totalPatients, icon: '👥', color: 'bg-blue-500' },
    { title: 'Total Doctors', value: stats.totalDoctors, icon: '👨‍⚕️', color: 'bg-green-500' },
    { title: 'Total Admins', value: stats.totalAdmins, icon: '🛡️', color: 'bg-slate-600' },
    { title: 'Total Appointments', value: stats.totalAppointments, icon: '📅', color: 'bg-purple-500' },
    { title: 'Pending Appointments', value: stats.pendingAppointments, icon: '⏳', color: 'bg-yellow-500' },
    { title: 'Patients with Pending', value: stats.pendingPatients, icon: '🧾', color: 'bg-orange-500' }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
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

const ManageAdmins = () => {
  const [admins, setAdmins] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [email, setEmail] = useState('')

  useEffect(() => {
    fetchAdmins()
  }, [])

  const fetchAdmins = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, created_at')
      .eq('role', 'admin')
      .order('created_at', { ascending: false })

    if (!error && data) setAdmins(data)
    setLoading(false)
  }

  const addAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', email)
      .maybeSingle()

    if (findError) {
      toast.error('Failed to find user by email')
      setSaving(false)
      return
    }

    if (!user) {
      toast.error('No user found with this email. Ask them to sign up first.')
      setSaving(false)
      return
    }

    if (user.role === 'admin') {
      toast.success('User is already an admin')
      setSaving(false)
      setShowAddForm(false)
      setEmail('')
      return
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('id', user.id)

    if (updateError) {
      toast.error('Failed to promote user to admin')
    } else {
      toast.success('Admin added successfully')
      setShowAddForm(false)
      setEmail('')
      fetchAdmins()
    }

    setSaving(false)
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Manage Admins</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          + Add Admin
        </button>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Add New Admin</h3>
            <form onSubmit={addAdmin} className="space-y-3">
              <input
                type="email"
                placeholder="Existing user email"
                className="w-full border rounded p-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500">This promotes an existing user account to admin.</p>
              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-500 text-white py-2 rounded disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Promote to Admin'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-gray-300 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {admins.map((admin) => (
              <tr key={admin.id}>
                <td className="px-6 py-4">{admin.full_name || 'N/A'}</td>
                <td className="px-6 py-4">{admin.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const ManageDoctors = () => {
  const [doctors, setDoctors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
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
      .from('users')
      .select('id, full_name, email, phone, specialty, experience_years, consultation_fee, bio, is_active')
      .eq('role', 'doctor')
      .order('created_at', { ascending: false })

    if (!error && data) setDoctors(data)
    setLoading(false)
  }

  const addDoctor = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', formData.email)
      .maybeSingle()

    if (findError) {
      toast.error('Failed to find user by email')
      setSaving(false)
      return
    }

    if (!user) {
      toast.error('No user found with this email. Ask them to sign up first.')
      setSaving(false)
      return
    }

    if (!formData.specialty.trim()) {
      toast.error('Specialty is required')
      setSaving(false)
      return
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({
        role: 'doctor',
        full_name: formData.full_name.trim() || null,
        phone: formData.phone.trim() || null,
        specialty: formData.specialty.trim(),
        experience_years: formData.experience_years,
        consultation_fee: formData.consultation_fee,
        bio: formData.bio.trim() || null,
        is_active: true
      })
      .eq('id', user.id)

    if (updateError) {
      toast.error('Failed to save doctor details')
    } else {
      toast.success('Doctor profile saved successfully')
      setShowAddForm(false)
      setFormData({ full_name: '', email: '', phone: '', specialty: '', experience_years: 0, consultation_fee: 0, bio: '' })
      fetchDoctors()
    }

    setSaving(false)
  }

  const toggleDoctorStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('users')
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

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Add New Doctor</h3>
            <form onSubmit={addDoctor} className="space-y-3">
              <input
                type="text"
                placeholder="Doctor full name"
                className="w-full border rounded p-2"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
              <input
                type="email"
                placeholder="Doctor account email"
                className="w-full border rounded p-2"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Phone Number"
                className="w-full border rounded p-2"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <input
                type="text"
                placeholder="Specialty"
                className="w-full border rounded p-2"
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                required
              />
              <input
                type="number"
                placeholder="Experience Years"
                className="w-full border rounded p-2"
                value={formData.experience_years}
                onChange={(e) => setFormData({ ...formData, experience_years: parseInt(e.target.value) || 0 })}
              />
              <input
                type="number"
                placeholder="Consultation Fee ($)"
                className="w-full border rounded p-2"
                value={formData.consultation_fee}
                onChange={(e) => setFormData({ ...formData, consultation_fee: parseInt(e.target.value) || 0 })}
              />
              <textarea
                placeholder="Bio"
                className="w-full border rounded p-2"
                rows={3}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              />
              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-500 text-white py-2 rounded disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Doctor'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-gray-300 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doctor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Specialty</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
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
                    <div className="font-medium">{doctor.full_name}</div>
                    <div className="text-sm text-gray-500">{doctor.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4">{doctor.specialty}</td>
                <td className="px-6 py-4">{doctor.phone || '-'}</td>
                <td className="px-6 py-4">{doctor.experience_years || 0} years</td>
                <td className="px-6 py-4">${doctor.consultation_fee || 0}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-sm ${doctor.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {doctor.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => toggleDoctorStatus(doctor.id, doctor.is_active)}
                    className={`text-sm ${doctor.is_active ? 'text-red-600' : 'text-green-600'}`}
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

const ManageAppointments = ({ defaultFilter = 'all' }: { defaultFilter?: string }) => {
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [filter, setFilter] = useState(defaultFilter)
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [patients, setPatients] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_id: '',
    appointment_date: '',
    appointment_time: '09:00',
    reason: '',
    status: 'approved'
  })

  const fetchAppointments = useCallback(async () => {
    let query = supabase
      .from('appointments')
      .select(`
        *,
        patient:users!patient_id(full_name, email),
        doctor:users!doctor_id(full_name, email, specialty)
      `)
      .order('created_at', { ascending: false })

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

  const openAddAppointment = async () => {
    const [{ data: patientsData }, { data: doctorsData }] = await Promise.all([
      supabase
        .from('users')
        .select('id, full_name, email')
        .eq('role', 'patient')
        .eq('is_active', true)
        .order('full_name', { ascending: true }),
      supabase
        .from('users')
        .select('id, full_name, email')
        .eq('role', 'doctor')
        .eq('is_active', true)
        .order('full_name', { ascending: true })
    ])

    setPatients(patientsData || [])
    setDoctors(doctorsData || [])
    setFormData({
      patient_id: patientsData?.[0]?.id || '',
      doctor_id: doctorsData?.[0]?.id || '',
      appointment_date: '',
      appointment_time: '09:00',
      reason: '',
      status: 'approved'
    })
    setShowAddForm(true)
  }

  const createAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.patient_id || !formData.doctor_id || !formData.appointment_date || !formData.reason.trim()) {
      toast.error('Please fill all required fields')
      return
    }

    setSaving(true)
    const { data: authData } = await supabase.auth.getUser()
    const isApproved = formData.status === 'approved'

    const payload: any = {
      patient_id: formData.patient_id,
      doctor_id: formData.doctor_id,
      appointment_date: formData.appointment_date,
      appointment_time: `${formData.appointment_time}:00`,
      reason: formData.reason.trim(),
      status: formData.status
    }

    if (isApproved) {
      payload.approved_by = authData.user?.id
      payload.approved_at = new Date().toISOString()
      payload.rejection_reason = null
    }

    const { error } = await supabase
      .from('appointments')
      .insert(payload)

    if (error) {
      toast.error('Failed to add appointment')
    } else {
      toast.success('Appointment added successfully')
      setShowAddForm(false)
      fetchAppointments()
    }

    setSaving(false)
  }

  const updateAppointmentStatus = async (apt: any, status: 'approved' | 'rejected') => {
    setUpdatingId(apt.id)

    const payload: any = {
      status,
      approved_by: (await supabase.auth.getUser()).data.user?.id,
      approved_at: new Date().toISOString()
    }

    if (status === 'rejected') {
      const rejectionReason = window.prompt('Enter rejection reason for patient:')
      if (!rejectionReason || !rejectionReason.trim()) {
        toast.error('Rejection reason is required')
        setUpdatingId(null)
        return
      }
      payload.rejection_reason = rejectionReason.trim()
    } else {
      payload.rejection_reason = null
    }

    const { error } = await supabase
      .from('appointments')
      .update(payload)
      .eq('id', apt.id)

    if (error) {
      toast.error(`Failed to ${status === 'approved' ? 'accept' : 'reject'} appointment`)
    } else {
      toast.success(status === 'approved' ? 'Appointment accepted' : 'Appointment rejected')
      fetchAppointments()
    }
    setUpdatingId(null)
  }

  const statusBadge = (apt: any) => {
    const s = apt.status
    const classes =
      s === 'approved'
        ? 'bg-green-100 text-green-800'
        : s === 'pending'
          ? 'bg-yellow-100 text-yellow-800'
          : s === 'completed'
            ? 'bg-blue-100 text-blue-800'
            : s === 'rejected'
              ? 'bg-red-100 text-red-800'
              : 'bg-gray-100 text-gray-800'

    return (
      <span className={`px-2 py-1 rounded text-sm ${classes}`}>
        {s}
      </span>
    )
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Appointments</h2>
        <div className="flex gap-2">
          <button
            onClick={openAddAppointment}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            + Add Appointment
          </button>
          <select
            className="border rounded-lg p-2"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="pending">Pending Requests</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-xl font-bold mb-4">Add Appointment</h3>
            <form onSubmit={createAppointment} className="space-y-3">
              <select
                className="w-full border rounded p-2"
                value={formData.patient_id}
                onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                required
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>
                ))}
              </select>
              <select
                className="w-full border rounded p-2"
                value={formData.doctor_id}
                onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
                required
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>{d.full_name} ({d.email})</option>
                ))}
              </select>
              <input
                type="date"
                className="w-full border rounded p-2"
                value={formData.appointment_date}
                onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                required
              />
              <input
                type="time"
                className="w-full border rounded p-2"
                value={formData.appointment_time}
                onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                required
              />
              <textarea
                className="w-full border rounded p-2"
                rows={3}
                placeholder="Reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                required
              />
              <select
                className="w-full border rounded p-2"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
              </select>

              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="flex-1 bg-blue-500 text-white py-2 rounded disabled:opacity-50">
                  {saving ? 'Saving...' : 'Add'}
                </button>
                <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 bg-gray-300 py-2 rounded">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doctor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doctor Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {appointments.map((apt) => (
              <tr key={apt.id}>
                <td className="px-6 py-4">{apt.patient?.full_name}</td>
                <td className="px-6 py-4">{apt.doctor?.full_name}</td>
                <td className="px-6 py-4">{apt.doctor?.email}</td>
                <td className="px-6 py-4">{apt.appointment_date} at {apt.appointment_time}</td>
                <td className="px-6 py-4">{statusBadge(apt)}</td>
                <td className="px-6 py-4">
                  {apt.status === 'pending' ? (
                    <div className="flex gap-2">
                      <button
                        disabled={updatingId === apt.id}
                        onClick={() => updateAppointmentStatus(apt, 'approved')}
                        className="bg-green-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                      >
                        {updatingId === apt.id ? 'Updating...' : 'Accept'}
                      </button>
                      <button
                        disabled={updatingId === apt.id}
                        onClick={() => updateAppointmentStatus(apt, 'rejected')}
                        className="bg-red-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">No action</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

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
                <Link to="/admin" className="text-gray-700 hover:text-gray-900 px-3 py-2">Dashboard</Link>
                <Link to="/admin/requests" className="text-gray-700 hover:text-gray-900 px-3 py-2">Requests</Link>
                <Link to="/admin/admins" className="text-gray-700 hover:text-gray-900 px-3 py-2">Manage Admins</Link>
                <Link to="/admin/doctors" className="text-gray-700 hover:text-gray-900 px-3 py-2">Manage Doctors</Link>
                <Link to="/admin/appointments" className="text-gray-700 hover:text-gray-900 px-3 py-2">All Appointments</Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Admin: {user?.email}</span>
              <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600">Logout</button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<DashboardStats />} />
          <Route path="/requests" element={<ManageAppointments defaultFilter="pending" />} />
          <Route path="/admins" element={<ManageAdmins />} />
          <Route path="/doctors" element={<ManageDoctors />} />
          <Route path="/appointments" element={<ManageAppointments defaultFilter="all" />} />
        </Routes>
      </div>
    </div>
  )
}
