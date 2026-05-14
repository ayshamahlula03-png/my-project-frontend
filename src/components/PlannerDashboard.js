import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getPlannerTasks, uploadFileToDrive } from '../services/api'

const API = 'http://localhost:5000'

const statusStyle = {
  'Pending':     { bg: '#fffbeb', text: '#b45309', dot: '#f59e0b' },
  'Assigned':    { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
  'In Progress': { bg: '#f5f3ff', text: '#6d28d9', dot: '#8b5cf6' },
  'Submitted':   { bg: '#fff7ed', text: '#c2410c', dot: '#f97316' },
  'Completed':   { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e' },
}

const typeStyle = {
  'Reel':       { bg: '#fdf2f8', text: '#9d174d' },
  'Poster':     { bg: '#f0fdf4', text: '#166534' },
  'Google Ads': { bg: '#eff6ff', text: '#1e40af' },
  'Ads':        { bg: '#eff6ff', text: '#1e40af' },
}

function Badge({ label, style: st }) {
  if (!st) return <span style={{ fontSize: 12, color: '#94a3b8' }}>{label}</span>
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: st.bg, color: st.text,
    }}>
      {st.dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot, flexShrink: 0 }}/>}
      {label}
    </span>
  )
}

function Spinner({ size = 14, color = '#fff' }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      border: `2px solid rgba(255,255,255,0.3)`,
      borderTop: `2px solid ${color}`,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  )
}

function validateCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return { valid: false, errors: ['CSV is empty or has no data rows'] }
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  const required = ['Task ID', 'Client Name', 'Task Type', 'End Date']
  const missing = required.filter(r => !headers.some(h => h === r || h === r.replace(' ', '_')))
  const errors = []
  if (missing.length > 0) errors.push(`Missing columns: ${missing.join(', ')}`)
  const taskIds = new Set()
  lines.slice(1).forEach((line, i) => {
    if (!line.trim()) return
    const cols = line.split(',').map(c => c.trim().replace(/"/g, ''))
    const taskId = cols[0]
    if (!taskId) errors.push(`Row ${i+2}: Missing Task ID`)
    else if (taskIds.has(taskId)) errors.push(`Row ${i+2}: Duplicate Task ID "${taskId}"`)
    else taskIds.add(taskId)
  })
  return { valid: errors.length === 0, errors, rowCount: lines.length - 1, headers }
}

function getISTDate() {
  const IST = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000))
  return IST.toISOString().split('T')[0]
}

export default function PlannerDashboard() {
  const { user, logout } = useAuth()
  const [tab, setTab]                       = useState('review')
  const [tasks, setTasks]                   = useState([])
  const [submissions, setSubmissions]       = useState([])
  const [loading, setLoading]               = useState(false)
  const [stats, setStats]                   = useState({ total: 0, pending: 0, assigned: 0, submitted: 0 })
  const [selectedFile, setSelectedFile]     = useState(null)
  const [dragging, setDragging]             = useState(false)
  const [uploading, setUploading]           = useState(false)
  const [uploadResult, setUploadResult]     = useState(null)
  const [uploadToken, setUploadToken]       = useState(null)
  const [validation, setValidation]         = useState(null)
  const [notifications, setNotifications]   = useState([])
  const [showNotif, setShowNotif]           = useState(false)

  // Progress screenshots
  const [progressUploads, setProgressUploads]   = useState([])
  const [progressLoading, setProgressLoading]   = useState(false)
  const [showReviewModal, setShowReviewModal]   = useState(false)
  const [selectedProgress, setSelectedProgress] = useState(null)

  // Designer leave requests routed to this planner (when admin on leave)
  const [leaveRequests, setLeaveRequests] = useState([])
  const [leaveLoading, setLeaveLoading]   = useState(false)
  const [actioningId, setActioningId]     = useState(null)

  // Planner's OWN leave
  const [myLeaves, setMyLeaves]           = useState([])
  const [myLeaveStatus, setMyLeaveStatus] = useState(null)
  const [leaveDate, setLeaveDate]         = useState('')
  const [leaveReason, setLeaveReason]     = useState('')
  const [requestingLeave, setRequestingLeave] = useState(false)
  const [leaveSuccess, setLeaveSuccess]   = useState('')
  const [leaveError, setLeaveError]       = useState('')
  const [myLeavesLoading, setMyLeavesLoading] = useState(false)

  const today = getISTDate()

  const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` })
  const jsonHeader = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` })

  useEffect(() => {
    loadTasks()
    loadSubmissions()
    fetchNotifications()
    fetchProgressUploads()
    fetchLeaveRequests()
    fetchMyLeaves()
    fetchMyLeaveStatus()
  }, [])

  const loadTasks = async () => {
    setLoading(true)
    try {
      const data = await getPlannerTasks()
      const t = data.tasks || []
      setTasks(t)
      setStats({
        total:     t.length,
        pending:   t.filter(x => x.status === 'Pending').length,
        assigned:  t.filter(x => x.status === 'Assigned' || x.status === 'In Progress').length,
        submitted: t.filter(x => x.status === 'Submitted').length,
      })
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const loadSubmissions = async () => {
    try {
      const res = await fetch(`${API}/api/manager/pending-submissions`, { headers: authHeader() })
      const data = await res.json()
      setSubmissions(data.submissions || [])
    } catch (e) { console.error(e) }
  }

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API}/api/planner/notifications`, { headers: authHeader() })
      const data = await res.json()
      setNotifications(data.notifications || [])
    } catch (_) {}
  }

  const fetchProgressUploads = async () => {
    setProgressLoading(true)
    try {
      const res = await fetch(`${API}/api/planner/progress-uploads`, { headers: authHeader() })
      const data = await res.json()
      setProgressUploads(data.uploads || [])
    } catch (_) {}
    setProgressLoading(false)
  }

  const fetchLeaveRequests = async () => {
    setLeaveLoading(true)
    try {
      const res = await fetch(`${API}/api/planner/leave-requests`, { headers: authHeader() })
      const data = await res.json()
      setLeaveRequests(data.requests || [])
    } catch (_) {}
    setLeaveLoading(false)
  }

  const fetchMyLeaves = async () => {
    setMyLeavesLoading(true)
    try {
      const res = await fetch(`${API}/api/planner/my-leaves`, { headers: authHeader() })
      const data = await res.json()
      setMyLeaves(data.leaves || [])
    } catch (_) {}
    setMyLeavesLoading(false)
  }

  const fetchMyLeaveStatus = async () => {
    try {
      const res = await fetch(`${API}/api/planner/leave-status`, { headers: authHeader() })
      const data = await res.json()
      setMyLeaveStatus(data.status || null)
    } catch (_) {}
  }

  const handleRequestLeave = async () => {
    if (!leaveDate) return setLeaveError('Please select a date')
    setRequestingLeave(true)
    setLeaveError('')
    setLeaveSuccess('')
    try {
      const res = await fetch(`${API}/api/planner/request-leave`, {
        method: 'POST',
        headers: jsonHeader(),
        body: JSON.stringify({ leaveDate, reason: leaveReason })
      })
      const data = await res.json()
      if (res.ok) {
        setLeaveSuccess(`✅ Leave request sent to Admin for ${leaveDate}`)
        setLeaveDate('')
        setLeaveReason('')
        await fetchMyLeaves()
        await fetchMyLeaveStatus()
      } else {
        setLeaveError(data.error || 'Failed to submit leave request')
      }
    } catch (e) {
      setLeaveError(e.message)
    }
    setRequestingLeave(false)
  }

  const actOnLeave = async (id, action, note = '') => {
    setActioningId(id)
    try {
      const res = await fetch(`${API}/api/planner/leave-requests/${id}/${action}`, {
        method: 'POST',
        headers: jsonHeader(),
        body: JSON.stringify({ note })
      })
      if (!res.ok) throw new Error('Request failed')
      setLeaveRequests(prev => prev.filter(r => r.id !== id))
    } catch (e) {
      alert('Action failed: ' + e.message)
    }
    setActioningId(null)
  }

  const handleFileSelect = async (file) => {
    if (!file) return
    if (!file.name.endsWith('.csv')) {
      setValidation({ valid: false, errors: ['Only .csv files are supported'] })
      return
    }
    setSelectedFile(file)
    setUploadResult(null)
    setUploadToken(null)
    const text = await file.text()
    const result = validateCSV(text)
    setValidation(result)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFileSelect(e.dataTransfer.files[0])
  }

  const handleUpload = async () => {
    if (!selectedFile || !validation?.valid) return
    setUploading(true)
    setUploadResult(null)
    try {
      const result = await uploadFileToDrive(selectedFile, null)
      setUploadToken(result.upload_token || null)
      setUploadResult({ success: true, data: result })
      setSelectedFile(null)
      setValidation(null)
      await loadTasks()
      await fetchNotifications()
    } catch (err) {
      setUploadResult({
        success: false,
        error: err.response?.data?.error || err.message || 'Upload failed'
      })
    }
    setUploading(false)
  }

  const isOverdue = (date) => {
    if (!date) return false
    return date.slice(0, 10) < today
  }

  const unread   = notifications.filter(n => !n.is_read).length
  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'P'

  // ★ Group uploads by designer for the card preview (1 thumb per designer)
  const byDesigner = progressUploads.reduce((acc, u) => {
    const name = u.designer_name || 'Unknown'
    if (!acc[name]) acc[name] = []
    acc[name].push(u)
    return acc
  }, {})

  // designer names list for card thumbnails
  const designerNames = Object.keys(byDesigner)

  const totalLeaveInbox = leaveRequests.length

  const leaveStatusColor = (s) => {
    if (s === 'approved') return { bg: '#f0fdf4', text: '#15803d', border: '#86efac' }
    if (s === 'rejected') return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' }
    return { bg: '#fffbeb', text: '#b45309', border: '#fde68a' }
  }

  const leaveStatusLabel = (s) => {
    if (s === 'approved') return '✅ Approved'
    if (s === 'rejected') return '❌ Rejected'
    return '⏳ Pending'
  }

  const S = `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Fraunces:wght@700&display=swap');
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
    @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    @keyframes fadeIn { from{opacity:0} to{opacity:1} }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    .dash { min-height: 100vh; background: #f4f6fb; font-family: 'Outfit', sans-serif; }
    .header { background: #fff; border-bottom: 1px solid #e8edf4; padding: 0 32px; height: 64px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
    .logo { display: flex; align-items: center; gap: 10px; }
    .logo-icon { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #2563eb, #7c3aed); display: flex; align-items: center; justify-content: center; font-size: 16px; }
    .logo-text { font-family: 'Fraunces', serif; font-size: 17px; font-weight: 700; color: #1e293b; }
    .header-right { display: flex; align-items: center; gap: 12px; position: relative; }
    .avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #2563eb, #7c3aed); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #fff; }
    .logout-btn { padding: 7px 16px; border-radius: 8px; border: 1.5px solid #e2e8f0; background: #fff; color: #64748b; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
    .logout-btn:hover { background: #fef2f2; border-color: #fca5a5; color: #dc2626; }
    .notif-btn { position: relative; width: 38px; height: 38px; border-radius: 10px; border: 1.5px solid #e2e8f0; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 17px; }
    .notif-badge { position: absolute; top: -4px; right: -4px; width: 17px; height: 17px; border-radius: 50%; background: #ef4444; color: #fff; font-size: 10px; font-weight: 800; display: flex; align-items: center; justify-content: center; border: 2px solid #fff; }
    .notif-panel { position: absolute; top: 54px; right: 0; width: 360px; background: #fff; border-radius: 16px; border: 1px solid #e8edf4; box-shadow: 0 12px 40px rgba(0,0,0,0.12); z-index: 200; overflow: hidden; }
    .on-leave-banner { background: linear-gradient(135deg, #fef3c7, #fde68a); border: 1.5px solid #f59e0b; border-radius: 10px; padding: 7px 14px; font-size: 12px; font-weight: 700; color: #92400e; display: flex; align-items: center; gap: 6px; }
    .main { max-width: 1200px; margin: 0 auto; padding: 28px 24px; }
    .page-title { font-family: 'Fraunces', serif; font-size: 24px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
    .page-sub { font-size: 13px; color: #94a3b8; margin-bottom: 24px; }
    .top-row { display: grid; grid-template-columns: 1fr 220px; gap: 16px; margin-bottom: 24px; }

    /* ★ Review Work Card — light theme matching dashboard */
    .review-work-card {
      background: #fff;
      border-radius: 20px;
      padding: 22px 24px;
      border: 1px solid #e8edf4;
      box-shadow: 0 2px 12px rgba(37,99,235,0.06);
      cursor: pointer;
      position: relative;
      overflow: hidden;
      transition: all 0.2s;
    }
    .review-work-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 28px rgba(37,99,235,0.13);
      border-color: #bfdbfe;
    }
    .review-work-card::before {
      content: '';
      position: absolute;
      top: 0; right: 0;
      width: 180px; height: 180px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%);
      pointer-events: none;
    }
    .rw-header { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
    .rw-icon {
      width: 48px; height: 48px; border-radius: 14px;
      background: linear-gradient(135deg, #eff6ff, #f5f3ff);
      border: 1.5px solid #ddd6fe;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; flex-shrink: 0;
    }
    .rw-title { font-family: 'Fraunces', serif; font-size: 18px; font-weight: 700; color: #1e293b; }
    .rw-sub { font-size: 12px; color: #94a3b8; margin-top: 3px; }
    .rw-live-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #22c55e; margin-right: 5px; animation: pulse 1.5s ease-in-out infinite; }
    .rw-new-badge { background: #ef4444; color: #fff; font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 10px; margin-left: 6px; }

    /* ★ 1 thumb per designer on card — shows their latest screenshot */
    .rw-thumb-row { display: flex; gap: 10px; flex-wrap: wrap; }
    .rw-designer-thumb {
      display: flex; flex-direction: column; align-items: center; gap: 5px;
      cursor: pointer;
    }
    .rw-thumb {
      width: 56px; height: 56px; border-radius: 12px; overflow: hidden;
      border: 2px solid #e8edf4;
      background: #f8fafc;
      display: flex; align-items: center; justify-content: center;
      position: relative; flex-shrink: 0;
      transition: all 0.15s;
    }
    .rw-thumb:hover { border-color: #6366f1; box-shadow: 0 4px 12px rgba(99,102,241,0.2); }
    .rw-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .rw-thumb-count {
      position: absolute; bottom: 2px; right: 2px;
      background: rgba(37,99,235,0.85); color: #fff;
      font-size: 9px; font-weight: 800;
      border-radius: 5px; padding: 1px 4px;
    }
    .rw-designer-label { font-size: 10px; font-weight: 700; color: #64748b; text-align: center; max-width: 60px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rw-more {
      width: 56px; height: 56px; border-radius: 12px;
      background: #f1f5f9; border: 2px dashed #cbd5e1;
      display: flex; align-items: center; justify-content: center;
      color: #7c3aed; font-size: 12px; font-weight: 800; flex-shrink: 0;
    }
    .rw-click-hint {
      display: flex; align-items: center; gap: 6px;
      margin-top: 14px; font-size: 12px; color: #6366f1; font-weight: 600;
      padding-top: 14px; border-top: 1px solid #f1f5f9;
    }

    .total-card { background: #fff; border-radius: 20px; padding: 22px; border: 1px solid #e8edf4; box-shadow: 0 2px 8px rgba(0,0,0,0.03); display: flex; flex-direction: column; justify-content: center; }
    .total-label { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    .total-value { font-family: 'Fraunces', serif; font-size: 52px; font-weight: 700; color: #7c3aed; line-height: 1; margin-bottom: 6px; }
    .total-sub { font-size: 12px; color: #94a3b8; }
    .tabs { display: flex; gap: 4px; background: #f1f5f9; border-radius: 12px; padding: 4px; margin-bottom: 20px; flex-wrap: wrap; }
    .tab-btn { flex: 1; padding: 10px 12px; border-radius: 9px; border: none; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.15s; color: #64748b; background: transparent; white-space: nowrap; }
    .tab-btn.active { background: #fff; color: #2563eb; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .card { background: #fff; border-radius: 18px; border: 1px solid #e8edf4; margin-bottom: 20px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.03); }
    .card-header { padding: 18px 24px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; }
    .card-title { font-size: 15px; font-weight: 700; color: #1e293b; }
    .card-sub { font-size: 12px; color: #94a3b8; margin-top: 2px; }
    .card-body { padding: 20px 24px; }
    .upload-zone { border: 2px dashed #bfdbfe; border-radius: 14px; padding: 48px 24px; text-align: center; cursor: pointer; background: #f8fbff; transition: all 0.2s; position: relative; }
    .upload-zone:hover, .upload-zone.drag { border-color: #2563eb; background: #eff6ff; }
    .upload-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
    .file-preview { display: flex; align-items: center; gap: 12px; padding: 14px 18px; background: #f0fdf4; border-radius: 12px; border: 1.5px solid #bbf7d0; margin-bottom: 14px; }
    .val-box { border-radius: 12px; padding: 14px 18px; margin-bottom: 14px; }
    .val-item { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; margin-bottom: 5px; }
    .upload-btn { width: 100%; padding: 14px; border-radius: 12px; border: none; background: linear-gradient(135deg, #2563eb, #7c3aed); color: #fff; font-size: 15px; font-weight: 800; cursor: pointer; font-family: inherit; transition: all 0.2s; margin-top: 14px; box-shadow: 0 6px 20px rgba(37,99,235,0.3); }
    .upload-btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
    .upload-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
    .result-box { margin-top: 14px; padding: 16px 20px; border-radius: 12px; font-size: 13px; font-weight: 700; text-align: center; }
    .token-box { background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 12px; padding: 14px 18px; margin-top: 12px; display: flex; align-items: flex-start; gap: 10px; }
    .info-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 14px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; }
    thead th { padding: 11px 16px; text-align: left; font-size: 11px; font-weight: 800; color: #94a3b8; letter-spacing: 0.7px; text-transform: uppercase; background: #f8fafc; border-bottom: 1px solid #e8edf4; }
    tbody tr { border-bottom: 1px solid #f1f5f9; transition: background 0.1s; }
    tbody tr:hover { background: #fafbff; }
    tbody td { padding: 12px 16px; font-size: 13px; color: #374151; font-weight: 500; }
    .overdue-badge { display: inline-flex; align-items: center; gap: 3px; padding: 2px 7px; border-radius: 5px; font-size: 10px; font-weight: 800; background: #fef2f2; color: #dc2626; margin-left: 5px; }
    .empty-state { text-align: center; padding: 48px 24px; }
    .empty-icon { font-size: 42px; margin-bottom: 12px; }
    .empty-text { font-size: 14px; color: #94a3b8; font-weight: 500; }
    .file-link { color: #7c3aed; text-decoration: none; font-weight: 700; background: #f5f3ff; padding: 6px 14px; border-radius: 8px; font-size: 12px; display: inline-flex; align-items: center; gap: 6px; border: 1.5px solid #ddd6fe; transition: all 0.15s; }
    .file-link:hover { background: #ede9fe; }
    .submission-card { background: #fff7ed; border: 1.5px solid #fed7aa; border-radius: 16px; padding: 16px 20px; margin-bottom: 12px; }
    .review-info-chip { display: inline-flex; align-items: center; gap: 6px; background: #f0f9ff; border: 1.5px solid #bae6fd; border-radius: 20px; padding: 5px 14px; font-size: 11px; font-weight: 700; color: #0369a1; }
    .status-chip-inprogress { display: inline-flex; align-items: center; gap: 6px; background: #f5f3ff; border: 1.5px solid #ddd6fe; border-radius: 20px; padding: 4px 10px; font-size: 11px; font-weight: 700; color: #6d28d9; }
    .status-chip-assigned { display: inline-flex; align-items: center; gap: 6px; background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 20px; padding: 4px 10px; font-size: 11px; font-weight: 700; color: #1d4ed8; }
    .status-chip-completed { display: inline-flex; align-items: center; gap: 5px; background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 20px; padding: 4px 10px; font-size: 11px; font-weight: 700; color: #15803d; }
    .status-chip-rejected { display: inline-flex; align-items: center; gap: 5px; background: #fef2f2; border: 1.5px solid #fecaca; border-radius: 20px; padding: 4px 10px; font-size: 11px; font-weight: 700; color: #dc2626; }
    .admin-note { background: #fef9c3; border: 1px solid #fde68a; border-radius: 8px; padding: 6px 12px; font-size: 11px; color: #92400e; font-weight: 600; margin-top: 6px; display: inline-block; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: flex-start; justify-content: center; z-index: 300; backdrop-filter: blur(6px); padding: 24px; overflow-y: auto; animation: fadeIn 0.2s ease; }
    .review-modal { background: #fff; border-radius: 24px; width: 100%; max-width: 900px; box-shadow: 0 32px 80px rgba(0,0,0,0.18); overflow: hidden; animation: slideUp 0.25s ease; margin: auto; }
    .review-modal-head { padding: 22px 28px; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: #fff; display: flex; align-items: center; justify-content: space-between; }
    .review-modal-title { font-family: 'Fraunces', serif; font-size: 20px; font-weight: 700; }
    .review-modal-sub { font-size: 12px; color: rgba(255,255,255,0.75); margin-top: 4px; }
    .review-modal-body { padding: 24px 28px; }
    .designer-section { margin-bottom: 28px; }
    .designer-name-row { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #f1f5f9; }
    .designer-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #4f46e5); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; color: #fff; flex-shrink: 0; }
    .designer-name { font-size: 15px; font-weight: 800; color: #1e293b; }
    .designer-upload-count { font-size: 11px; color: #94a3b8; margin-left: 6px; font-weight: 600; }
    .screenshots-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
    .screenshot-card { border-radius: 14px; overflow: hidden; border: 1.5px solid #e8edf4; background: #f8fafc; cursor: pointer; transition: all 0.2s; }
    .screenshot-card:hover { border-color: #6366f1; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(99,102,241,0.15); }
    .screenshot-img { width: 100%; height: 110px; object-fit: cover; background: #e8edf4; display: flex; align-items: center; justify-content: center; font-size: 28px; }
    .screenshot-img img { width: 100%; height: 100%; object-fit: cover; }
    .screenshot-info { padding: 8px 10px; }
    .screenshot-time { font-size: 11px; font-weight: 700; color: #64748b; }
    .screenshot-note { font-size: 11px; color: #94a3b8; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .btn-close-modal { padding: 8px 18px; border-radius: 10px; border: 1.5px solid rgba(255,255,255,0.4); background: rgba(255,255,255,0.15); color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
    .btn-close-modal:hover { background: rgba(255,255,255,0.25); }
    .no-uploads-yet { text-align: center; padding: 48px; color: #94a3b8; }

    /* Leave */
    .leave-card { background: #f0f9ff; border: 1.5px solid #bae6fd; border-radius: 16px; padding: 16px 20px; margin-bottom: 12px; }
    .leave-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
    .leave-name { font-size: 15px; font-weight: 800; color: #1e293b; margin-bottom: 4px; }
    .leave-meta { font-size: 12px; color: #64748b; margin-bottom: 8px; }
    .leave-reason { font-size: 12px; color: #475569; background: #fff; padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .leave-actions { display: flex; gap: 8px; flex-shrink: 0; align-items: center; }
    .btn-approve { padding: 10px 18px; border-radius: 10px; border: none; background: linear-gradient(135deg, #059669, #047857); color: #fff; font-size: 13px; font-weight: 800; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 6px; }
    .btn-approve:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-reject { padding: 10px 18px; border-radius: 10px; border: 1.5px solid #fecaca; background: #fff; color: #dc2626; font-size: 13px; font-weight: 800; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 6px; }
    .btn-reject:disabled { opacity: 0.6; cursor: not-allowed; }
    .leave-tab-badge { background: #ef4444; color: #fff; border-radius: 10px; padding: 1px 7px; font-size: 10px; margin-left: 4px; font-weight: 800; }
    .cascade-info { background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 12px; padding: 12px 16px; margin-bottom: 20px; font-size: 12px; color: #1d4ed8; font-weight: 600; line-height: 1.7; }
    .my-leave-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .my-leave-form { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 20px; }
    .my-leave-history { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 20px; }
    .form-label { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px; }
    .form-input { width: 100%; padding: 10px 14px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 13px; font-family: inherit; font-weight: 500; color: #1e293b; background: #fff; outline: none; margin-bottom: 12px; }
    .form-input:focus { border-color: #2563eb; }
    .form-textarea { width: 100%; padding: 10px 14px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 13px; font-family: inherit; font-weight: 500; color: #1e293b; background: #fff; outline: none; resize: vertical; min-height: 72px; margin-bottom: 12px; }
    .form-textarea:focus { border-color: #2563eb; }
    .btn-submit-leave { width: 100%; padding: 12px; border-radius: 10px; border: none; background: linear-gradient(135deg, #2563eb, #7c3aed); color: #fff; font-size: 14px; font-weight: 800; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .btn-submit-leave:disabled { opacity: 0.5; cursor: not-allowed; }
    .today-status-banner { border-radius: 12px; padding: 12px 16px; margin-bottom: 16px; font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
    .my-leave-item { background: #fff; border-radius: 12px; border: 1.5px solid #e2e8f0; padding: 12px 16px; margin-bottom: 10px; }
    .my-leave-item.today { border-color: #fde68a; background: #fefce8; }
    .my-leave-item.upcoming { border-color: #bfdbfe; background: #f0f9ff; }
    .alert-success { background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 10px; padding: 10px 16px; font-size: 13px; font-weight: 700; color: #15803d; margin-bottom: 12px; }
    .alert-error { background: #fef2f2; border: 1.5px solid #fecaca; border-radius: 10px; padding: 10px 16px; font-size: 13px; font-weight: 700; color: #dc2626; margin-bottom: 12px; }
    .section-heading { font-size: 13px; font-weight: 800; color: #1e293b; margin-bottom: 14px; display: flex; align-items: center; gap: 6px; }
    @media(max-width: 900px) {
      .top-row { grid-template-columns: 1fr; }
      .my-leave-section { grid-template-columns: 1fr; }
      .tabs { flex-wrap: wrap; }
    }
  `

  const isOnLeaveToday = myLeaveStatus === 'approved'

  return (
    <div className="dash">
      <style>{S}</style>

      {/* ── HEADER ── */}
      <div className="header">
        <div className="logo">
          <div className="logo-icon">📋</div>
          <div className="logo-text">Agency Automation</div>
        </div>
        <div className="header-right">
          {isOnLeaveToday && (
            <div className="on-leave-banner">🏖️ You are on approved leave today</div>
          )}

          <button className="notif-btn" onClick={() => setShowNotif(p => !p)}>
            🔔
            {unread > 0 && <span className="notif-badge">{unread}</span>}
          </button>

          {showNotif && (
            <div className="notif-panel">
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>Notifications</div>
                <button onClick={() => setShowNotif(false)} style={{ fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Close</button>
              </div>
              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {notifications.length === 0
                  ? <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No updates yet</div>
                  : notifications.map(n => (
                    <div key={n.id} style={{ padding: '12px 18px', borderBottom: '1px solid #f8fafc' }}>
                      <div style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>{n.message}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                        {n.created_at ? new Date(n.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="avatar">{initials}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{user?.email}</div>
          </div>
          <button className="logout-btn" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="main">
        <div className="page-title">📋 Planner Dashboard</div>
        <div className="page-sub">Upload CSV → Auto-assign → View submissions → Admin approves</div>

        {/* TOP ROW */}
        <div className="top-row">

          {/* ★ Review Work Card — light theme, 1 thumb per designer */}
          <div className="review-work-card" onClick={() => { setShowReviewModal(true); fetchProgressUploads() }}>
            <div className="rw-header">
              <div className="rw-icon">👁️</div>
              <div>
                <div className="rw-title">
                  Review Work
                  {progressUploads.length > 0 && (
                    <span className="rw-new-badge">{progressUploads.length} new</span>
                  )}
                </div>
                <div className="rw-sub">
                  <span className="rw-live-dot"/>
                  Designer progress screenshots — live updates
                </div>
              </div>
            </div>

            {progressLoading ? (
              <div style={{ color: '#94a3b8', fontSize: 12 }}>Loading screenshots…</div>
            ) : progressUploads.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: 13 }}>No screenshots uploaded yet today</div>
            ) : (
              /* ★ 1 thumb per designer — shows their latest screenshot with count badge */
              <div className="rw-thumb-row">
                {designerNames.slice(0, 6).map((name, i) => {
                  const uploads = byDesigner[name]
                  const latest  = uploads[0]
                  return (
                    <div key={i} className="rw-designer-thumb">
                      <div className="rw-thumb">
                        {latest?.file_link
                          ? <img src={latest.file_link} alt="" onError={(e) => { e.target.style.display = 'none' }}/>
                          : <span style={{ fontSize: 22 }}>🖼️</span>}
                        {uploads.length > 1 && (
                          <div className="rw-thumb-count">+{uploads.length}</div>
                        )}
                      </div>
                      <div className="rw-designer-label">{name.split(' ')[0]}</div>
                    </div>
                  )
                })}
                {designerNames.length > 6 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <div className="rw-more">+{designerNames.length - 6}</div>
                    <div className="rw-designer-label">more</div>
                  </div>
                )}
              </div>
            )}

            <div className="rw-click-hint">
              <span style={{ fontSize: 14 }}>👆</span>
              <span>Click to view all screenshots grouped by designer</span>
            </div>
          </div>

          <div className="total-card">
            <div className="total-label">Total Tasks</div>
            <div className="total-value">{stats.total}</div>
            <div className="total-sub">{stats.assigned} active · {stats.submitted} in review</div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="tabs">
          <button className={`tab-btn ${tab === 'review' ? 'active' : ''}`} onClick={() => { setTab('review'); loadSubmissions() }}>
            📤 Review Submissions
          </button>
          <button className={`tab-btn ${tab === 'upload' ? 'active' : ''}`} onClick={() => setTab('upload')}>
            ☁️ Upload to Drive
          </button>
          <button className={`tab-btn ${tab === 'tasks' ? 'active' : ''}`} onClick={() => { setTab('tasks'); loadTasks() }}>
            📋 My Tasks
          </button>
          <button className={`tab-btn ${tab === 'leaves' ? 'active' : ''}`} onClick={() => { setTab('leaves'); fetchLeaveRequests() }}>
            🌴 Leave Inbox
            {totalLeaveInbox > 0 && <span className="leave-tab-badge">{totalLeaveInbox}</span>}
          </button>
          <button className={`tab-btn ${tab === 'myleave' ? 'active' : ''}`} onClick={() => { setTab('myleave'); fetchMyLeaves(); fetchMyLeaveStatus() }}>
            🏖️ My Leave
            {myLeaveStatus === 'pending' && <span className="leave-tab-badge" style={{ background: '#f59e0b' }}>!</span>}
          </button>
        </div>

        {/* ── REVIEW SUBMISSIONS TAB ── */}
        {tab === 'review' && (
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">📤 Submitted Work ({submissions.length})</div>
                <div className="card-sub">Designer final submissions — Admin reviews and approves</div>
              </div>
            </div>
            <div className="card-body">
              {submissions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✅</div>
                  <div className="empty-text">No pending submissions</div>
                </div>
              ) : submissions.map(sub => (
                <div key={sub.task_id} className="submission-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>{sub.client_name}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                        Task ID: {sub.task_id}<br/>
                        Designer: {sub.assigned_designer}
                      </div>
                      {sub.requirements && (
                        <div style={{ fontSize: 12, color: '#475569', marginTop: 8 }}>
                          📋 Requirements: {sub.requirements}
                        </div>
                      )}
                      {sub.submitted_date && (
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
                          🕐 Submitted: {new Date(sub.submitted_date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                      {sub.submission_note && (
                        <div style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>
                          📝 Note: "{sub.submission_note}"
                        </div>
                      )}
                      {sub.submission_file_link && (
                        <div style={{ marginTop: 10 }}>
                          <a className="file-link" href={sub.submission_file_link} target="_blank" rel="noreferrer">
                            📎 View Submitted File ↗
                          </a>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="review-info-chip">⏳ Waiting for Admin review</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── UPLOAD TAB ── */}
        {tab === 'upload' && (
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">☁️ Upload CSV to Google Drive</div>
                <div className="card-sub">File is validated → uploaded to Drive → automation runs → designers get assigned</div>
              </div>
            </div>
            <div className="card-body">
              <div className="info-row">
                <span>📁</span>
                <span>Files go to agency-planners Drive folder</span>
                <span style={{ marginLeft: 'auto', color: '#15803d', fontWeight: 700 }}>✓ Connected</span>
              </div>

              {!selectedFile ? (
                <div className={`upload-zone ${dragging ? 'drag' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                >
                  <input type="file" accept=".csv" className="upload-input" onChange={(e) => handleFileSelect(e.target.files[0])}/>
                  <div style={{ fontSize: 42, marginBottom: 10 }}>📁</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Click to browse or drag & drop CSV</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>File will be validated before upload</div>
                </div>
              ) : (
                <div>
                  <div className="file-preview">
                    <span>📄</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{selectedFile.name}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{(selectedFile.size / 1024).toFixed(1)} KB</div>
                    </div>
                    <button onClick={() => { setSelectedFile(null); setValidation(null); setUploadResult(null) }}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 18 }}>✕</button>
                  </div>

                  {validation && (
                    <div className="val-box" style={{ background: validation.valid ? '#f0fdf4' : '#fef2f2', border: `1.5px solid ${validation.valid ? '#bbf7d0' : '#fecaca'}` }}>
                      <div style={{ fontWeight: 800, fontSize: 13, color: validation.valid ? '#15803d' : '#dc2626', marginBottom: 8 }}>
                        {validation.valid ? '✅ CSV Validation Passed' : '❌ CSV Validation Failed'}
                      </div>
                      {validation.valid ? (
                        <div className="val-item" style={{ color: '#15803d' }}>
                          📊 {validation.rowCount} rows found · Columns: {validation.headers?.join(', ')}
                        </div>
                      ) : (
                        validation.errors.map((err, i) => (
                          <div key={i} className="val-item" style={{ color: '#dc2626' }}>⚠️ {err}</div>
                        ))
                      )}
                    </div>
                  )}

                  {validation?.valid && (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 10 }}>📋 Upload Summary</div>
                      {[
                        { label: 'File',        value: `📄 ${selectedFile.name}` },
                        { label: 'Rows',        value: `📊 ${validation.rowCount} tasks` },
                        { label: 'Destination', value: '📁 agency-planners (Drive)' },
                        { label: 'Uploaded by', value: `👤 ${user?.name}` },
                        { label: 'Auto-assign', value: '⚡ Runs after upload' },
                      ].map(r => (
                        <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0' }}>
                          <span style={{ color: '#94a3b8', fontWeight: 600 }}>{r.label}</span>
                          <span style={{ color: '#1e293b', fontWeight: 700 }}>{r.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <button className="upload-btn" onClick={handleUpload} disabled={uploading || !validation?.valid}>
                    {uploading ? '⏳ Uploading & auto-assigning...' : validation?.valid ? '☁️ Upload to Drive & Auto-Assign →' : '❌ Fix CSV errors first'}
                  </button>
                </div>
              )}

              {uploadResult && (
                <div>
                  <div className="result-box" style={{ background: uploadResult.success ? '#f0fdf4' : '#fef2f2', color: uploadResult.success ? '#15803d' : '#dc2626', border: `1.5px solid ${uploadResult.success ? '#bbf7d0' : '#fecaca'}` }}>
                    {uploadResult.success
                      ? `✅ Uploaded! ${uploadResult.data?.stats?.inserted || 0} tasks assigned to designers ⚡`
                      : `❌ ${uploadResult.error}`}
                  </div>
                  {uploadResult.success && uploadToken && (
                    <div className="token-box">
                      <span>🔖</span>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Upload Token</div>
                        <div style={{ fontSize: 12, color: '#1e293b', fontFamily: 'monospace', marginTop: 4 }}>{uploadToken}</div>
                      </div>
                    </div>
                  )}
                  <button onClick={() => { setUploadResult(null); setUploadToken(null) }}
                    style={{ marginTop: 12, width: '100%', padding: '10px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Upload Another File
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MY TASKS TAB — no Refresh button ── */}
        {tab === 'tasks' && (
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">📋 My Tasks</div>
                <div className="card-sub">Tasks created from your CSV uploads — Admin handles approvals</div>
              </div>
              {/* ★ Refresh button removed */}
            </div>

            {loading ? (
              <div className="empty-state"><div className="empty-text">⏳ Loading tasks...</div></div>
            ) : tasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <div className="empty-text">No tasks yet — upload a CSV to get started!</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      {['Task ID', 'Client', 'Type', 'Requirements', 'Deadline', 'Designer', 'Status', 'Submitted File'].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map(task => {
                      const overdue = isOverdue(task.end_date) && task.status !== 'Completed'
                      return (
                        <tr key={task.task_id}>
                          <td>{task.task_id || '—'}</td>
                          <td>{task.client_name || '—'}</td>
                          <td><Badge label={task.task_type} style={typeStyle[task.task_type]}/></td>
                          <td>
                            {task.requirements
                              ? <span title={task.requirements}>{task.requirements.slice(0, 50)}{task.requirements.length > 50 ? '…' : ''}</span>
                              : '—'}
                          </td>
                          <td>
                            <span style={{ color: overdue ? '#dc2626' : '#374151', fontWeight: overdue ? 700 : 500 }}>
                              {task.end_date || '—'}
                            </span>
                            {overdue && <span className="overdue-badge">⚠ Overdue</span>}
                          </td>
                          <td>
                            {task.assigned_designer
                              ? <span style={{ fontWeight: 700 }}>{task.assigned_designer}</span>
                              : <span style={{ color: '#94a3b8' }}>Not assigned</span>}
                          </td>
                          <td>
                            {task.status === 'Completed' && (
                              <div>
                                <div className="status-chip-completed">✅ Approved by Admin</div>
                                {task.reviewed_date && (
                                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                                    {new Date(task.reviewed_date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                )}
                              </div>
                            )}
                            {task.status === 'Submitted' && <div className="review-info-chip">⏳ Admin reviewing...</div>}
                            {task.status === 'In Progress' && (
                              <div className="status-chip-inprogress">
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#8b5cf6', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }}/>
                                Ongoing
                              </div>
                            )}
                            {(task.status === 'Assigned' || task.status === 'Pending') && (
                              <div className="status-chip-assigned">🕐 Not Started</div>
                            )}
                            {task.status === 'Rejected' && (
                              <div>
                                <div className="status-chip-rejected">❌ Revision Needed</div>
                                {task.manager_note && <div className="admin-note">💬 {task.manager_note}</div>}
                              </div>
                            )}
                          </td>
                          <td>
                            {task.submission_file_link
                              ? <a className="file-link" href={task.submission_file_link} target="_blank" rel="noreferrer">📎 View</a>
                              : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── LEAVE INBOX TAB — no Refresh button ── */}
        {tab === 'leaves' && (
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">🌴 Designer Leave Inbox ({totalLeaveInbox})</div>
                <div className="card-sub">Routed here because Admin is on leave for that date</div>
              </div>
              {/* ★ Refresh button removed */}
            </div>
            <div className="card-body">
              <div className="cascade-info">
                ℹ️ <strong>Cascade rule:</strong> When Admin marks leave for a date, designer leave requests for that date are routed to <strong>you</strong> (the planner who uploaded that designer's tasks).
                If you are also on leave, requests go to another available planner automatically.
              </div>

              {leaveLoading ? (
                <div className="empty-state"><div className="empty-text">⏳ Loading…</div></div>
              ) : leaveRequests.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✅</div>
                  <div className="empty-text">No pending leave requests</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
                    Requests appear here only when Admin is on leave for the requested date
                  </div>
                </div>
              ) : leaveRequests.map(req => (
                <div key={req.id} className="leave-card">
                  <div className="leave-row">
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <div className="leave-name">{req.designer_name}</div>
                      <div className="leave-meta">📅 Leave Date: <strong>{req.leave_date}</strong></div>
                      {req.reason && <div className="leave-reason">💬 {req.reason}</div>}
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
                        Requested: {req.requested_at ? new Date(req.requested_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </div>
                    </div>
                    <div className="leave-actions">
                      <button className="btn-approve" disabled={actioningId === req.id} onClick={() => actOnLeave(req.id, 'approve')}>
                        {actioningId === req.id ? <Spinner size={13}/> : '✓'} Approve
                      </button>
                      <button className="btn-reject" disabled={actioningId === req.id} onClick={() => {
                        const note = prompt('Reason for rejection (optional):')
                        if (note !== null) actOnLeave(req.id, 'reject', note)
                      }}>
                        {actioningId === req.id ? <Spinner size={13} color="#dc2626"/> : '✕'} Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MY LEAVE TAB — no Refresh button ── */}
        {tab === 'myleave' && (
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">🏖️ My Leave</div>
                <div className="card-sub">Request leave — Admin will approve or reject</div>
              </div>
              {/* ★ Refresh button removed */}
            </div>
            <div className="card-body">
              {myLeaveStatus && (
                <div className="today-status-banner" style={{ background: leaveStatusColor(myLeaveStatus).bg, border: `1.5px solid ${leaveStatusColor(myLeaveStatus).border}`, color: leaveStatusColor(myLeaveStatus).text }}>
                  📅 Today's leave status: <strong>{leaveStatusLabel(myLeaveStatus)}</strong>
                </div>
              )}
              <div className="cascade-info" style={{ marginBottom: 20 }}>
                ℹ️ <strong>How it works:</strong> When your leave is approved by Admin, designer leave requests for your leave dates will be automatically cascaded to <strong>another available planner</strong>.
              </div>
              <div className="my-leave-section">
                <div className="my-leave-form">
                  <div className="section-heading">➕ Request Leave</div>
                  {leaveSuccess && <div className="alert-success">{leaveSuccess}</div>}
                  {leaveError && <div className="alert-error">❌ {leaveError}</div>}
                  <label className="form-label">Leave Date *</label>
                  <input type="date" className="form-input" value={leaveDate} min={today} onChange={e => { setLeaveDate(e.target.value); setLeaveSuccess(''); setLeaveError('') }}/>
                  <label className="form-label">Reason (optional)</label>
                  <textarea className="form-textarea" placeholder="e.g. Personal work, Medical, Travel…" value={leaveReason} onChange={e => setLeaveReason(e.target.value)}/>
                  <button className="btn-submit-leave" disabled={requestingLeave || !leaveDate} onClick={handleRequestLeave}>
                    {requestingLeave ? <><Spinner size={14}/> Sending…</> : '🏖️ Send Leave Request to Admin'}
                  </button>
                </div>
                <div className="my-leave-history">
                  <div className="section-heading">📅 My Leave History ({myLeaves.length})</div>
                  {myLeavesLoading ? (
                    <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontSize: 13 }}>⏳ Loading…</div>
                  ) : myLeaves.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                      <div style={{ fontSize: 13 }}>No leave requests yet</div>
                    </div>
                  ) : myLeaves.map((l, i) => {
                    const isToday    = l.leave_date === today
                    const isUpcoming = l.leave_date > today
                    const colors     = leaveStatusColor(l.status)
                    return (
                      <div key={i} className={`my-leave-item${isToday ? ' today' : isUpcoming ? ' upcoming' : ''}`}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>📅 {l.leave_date}</span>
                              {isToday    && <span style={{ fontSize: 10, fontWeight: 800, background: '#f59e0b', color: '#fff', padding: '2px 7px', borderRadius: 6 }}>TODAY</span>}
                              {isUpcoming && <span style={{ fontSize: 10, fontWeight: 700, background: '#eff6ff', color: '#2563eb', padding: '2px 7px', borderRadius: 6 }}>UPCOMING</span>}
                            </div>
                            {l.reason && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>💬 {l.reason}</div>}
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>
                              Requested: {l.requested_at ? new Date(l.requested_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                            </div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 8, background: colors.bg, color: colors.text, border: `1.5px solid ${colors.border}`, flexShrink: 0 }}>
                            {leaveStatusLabel(l.status)}
                          </span>
                        </div>
                        {l.reviewed_by && (
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, paddingTop: 6, borderTop: '1px solid #f1f5f9' }}>
                            Reviewed by <strong>{l.reviewed_by}</strong>
                            {l.reviewed_at && ` · ${new Date(l.reviewed_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── REVIEW WORK MODAL — blue/purple header, grouped by designer ── */}
      {showReviewModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowReviewModal(false)}>
          <div className="review-modal">
            <div className="review-modal-head">
              <div>
                <div className="review-modal-title">👁️ Designer Work Progress</div>
                <div className="review-modal-sub">Screenshots uploaded by designers — in-progress work, not final submissions</div>
              </div>
              <button className="btn-close-modal" onClick={() => setShowReviewModal(false)}>✕ Close</button>
            </div>
            <div className="review-modal-body">
              {progressLoading ? (
                <div className="no-uploads-yet">⏳ Loading screenshots…</div>
              ) : progressUploads.length === 0 ? (
                <div className="no-uploads-yet">
                  <div style={{ fontSize: 42, marginBottom: 10 }}>📸</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#64748b' }}>No progress screenshots yet</div>
                  <div style={{ fontSize: 12, marginTop: 6 }}>Designers upload screenshots — check back soon</div>
                </div>
              ) : (
                Object.entries(byDesigner).map(([name, uploads]) => (
                  <div key={name} className="designer-section">
                    <div className="designer-name-row">
                      <div className="designer-avatar">{name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}</div>
                      <div>
                        <span className="designer-name">{name}</span>
                        <span className="designer-upload-count">{uploads.length} screenshot{uploads.length > 1 ? 's' : ''} today</span>
                      </div>
                      {uploads[0]?.uploaded_at && (
                        <div style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                          Last: {new Date(uploads[0].uploaded_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                    <div className="screenshots-grid">
                      {uploads.map((u, i) => (
                        <div key={i} className="screenshot-card" onClick={() => setSelectedProgress(u)}>
                          <div className="screenshot-img">
                            {u.file_link
                              ? <img src={u.file_link} alt="" onError={(e) => { e.target.parentNode.innerHTML = '🖼️' }}/>
                              : '🖼️'}
                          </div>
                          <div className="screenshot-info">
                            <div className="screenshot-time">
                              🕐 {u.uploaded_at ? new Date(u.uploaded_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                            </div>
                            {u.note && <div className="screenshot-note">📝 {u.note}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── LIGHTBOX ── */}
      {selectedProgress && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, cursor: 'pointer', animation: 'fadeIn 0.15s ease' }}
          onClick={() => setSelectedProgress(null)}
        >
          {selectedProgress.file_link
            ? <img src={selectedProgress.file_link} alt="" style={{ maxWidth: '90vw', maxHeight: '88vh', borderRadius: 12, objectFit: 'contain' }}/>
            : <div style={{ color: '#fff' }}>No image available</div>}
          <div style={{ position: 'absolute', top: 20, right: 24, color: '#fff', fontSize: 22, cursor: 'pointer' }}>✕</div>
          {selectedProgress.note && (
            <div style={{ position: 'absolute', bottom: 24, background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 13 }}>
              📝 {selectedProgress.note}
            </div>
          )}
        </div>
      )}
    </div>
  )
}