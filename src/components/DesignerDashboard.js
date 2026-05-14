import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'

const API = 'https://my-project-backend-x69d.onrender.com'

const statusStyle = {
  'Pending':     { bg: '#fffbeb', text: '#b45309', dot: '#f59e0b' },
  'Assigned':    { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
  'In Progress': { bg: '#f5f3ff', text: '#6d28d9', dot: '#8b5cf6' },
  'Submitted':   { bg: '#fff7ed', text: '#c2410c', dot: '#f97316' },
  'Completed':   { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e' },
  'Rejected':    { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444' },
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

function isOverdue(endDate, today) {
  if (!endDate || !today) return false
  return endDate < today
}

function Spinner({ size = 16, color = '#fff' }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      border: `2px solid rgba(255,255,255,0.3)`,
      borderTop: `2px solid ${color}`,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      flexShrink: 0,
    }}/>
  )
}

// ★ Requirements modal — shows full requirement text
function RequirementsModal({ text, onClose }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 400, backdropFilter: 'blur(4px)',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: '#fff', borderRadius: 20, width: 520, maxWidth: '95vw',
        boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
        animation: 'slideUp 0.2s ease', overflow: 'hidden',
      }}>
        <div style={{
          padding: '18px 24px',
          background: 'linear-gradient(135deg, #059669, #047857)',
          color: '#fff',
        }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>📋 Full Requirements</div>
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 3 }}>All details for this task</div>
        </div>
        <div style={{ padding: '22px 24px' }}>
          <div style={{
            background: '#f0fdf4', border: '1.5px solid #86efac',
            borderRadius: 12, padding: '16px 18px',
            fontSize: 14, color: '#1e293b', lineHeight: 1.7,
            fontWeight: 500, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {text || '—'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 24px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #059669, #047857)',
                color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DesignerDashboard() {
  const { user, logout } = useAuth()

  const [serverToday, setServerToday]       = useState('')
  const [showTomorrow, setShowTomorrow]     = useState(false)

  const [tasks, setTasks]                   = useState([])
  const [loading, setLoading]               = useState(true)
  const [stats, setStats]                   = useState({ total: 0, pending: 0, inProgress: 0, submitted: 0, completed: 0, rejected: 0 })
  const [startingTask, setStartingTask]     = useState({})

  const [submitTask, setSubmitTask]         = useState(null)
  const [submitFile, setSubmitFile]         = useState(null)
  const [submitNote, setSubmitNote]         = useState('')
  const [submitting, setSubmitting]         = useState(false)
  const [submitResult, setSubmitResult]     = useState(null)
  const [dragOver, setDragOver]             = useState(false)

  const [notifications, setNotifications]   = useState([])
  const [showNotif, setShowNotif]           = useState(false)

  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [leaveDate, setLeaveDate]           = useState('')
  const [leaveReason, setLeaveReason]       = useState('')
  const [leaveSubmitting, setLeaveSubmitting] = useState(false)
  const [leaveStatus, setLeaveStatus]       = useState(null)

  // Progress screenshot upload state
  const [progressFile, setProgressFile]     = useState(null)
  const [progressNote, setProgressNote]     = useState('')
  const [progressUploading, setProgressUploading] = useState(false)
  const [progressResult, setProgressResult] = useState(null)
  const [progressDragOver, setProgressDragOver] = useState(false)
  const [myProgressUploads, setMyProgressUploads] = useState([])

  // ★ Requirements modal state
  const [reqModalText, setReqModalText]     = useState(null)

  const fileRef     = useRef()
  const progressRef = useRef()

  useEffect(() => {
    loadTasks()
    fetchNotifications()
    fetchLeaveStatus()
    recordLogin()
    fetchMyProgressUploads()
  }, [])

  const token       = () => localStorage.getItem('token')
  const headers     = () => ({ Authorization: `Bearer ${token()}` })
  const jsonHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` })

  const recordLogin = async () => {
    try { await fetch(`${API}/api/designer/login-ping`, { method: 'POST', headers: headers() }) }
    catch (_) {}
  }

  const fetchLeaveStatus = async () => {
    try {
      const res  = await fetch(`${API}/api/designer/leave-status`, { headers: headers() })
      const data = await res.json()
      setLeaveStatus(data.status || null)
    } catch (_) {}
  }

  const fetchMyProgressUploads = async () => {
    try {
      const res  = await fetch(`${API}/api/designer/progress-uploads`, { headers: headers() })
      const data = await res.json()
      setMyProgressUploads(data.uploads || [])
    } catch (_) {}
  }

  const loadTasks = async () => {
    setLoading(true)
    try {
      const res  = await fetch(`${API}/api/designer/tasks`, { headers: headers() })
      const data = await res.json()
      const t    = data.tasks || []

      if (data.today)    setServerToday(data.today)
      if (data.tomorrow) setServerTomorrow(data.tomorrow)
      setShowTomorrow(data.showTomorrow || false)

      setTasks(t)
      setStats({
        total:      t.filter(x => x.end_date === data.today).length,
        pending:    t.filter(x => (x.status === 'Pending' || x.status === 'Assigned') && x.end_date === data.today).length,
        inProgress: t.filter(x => x.status === 'In Progress' && x.end_date === data.today).length,
        submitted:  t.filter(x => x.status === 'Submitted' && x.end_date === data.today).length,
        completed:  t.filter(x => x.status === 'Completed' && x.end_date === data.today).length,
        rejected:   t.filter(x => x.status === 'Rejected' && x.end_date === data.today).length,
      })
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const fetchNotifications = async () => {
    try {
      const res  = await fetch(`${API}/api/designer/notifications`, { headers: headers() })
      const data = await res.json()
      setNotifications(data.notifications || [])
    } catch (_) {}
  }

  const handleStartWork = async (taskId) => {
    setStartingTask(prev => ({ ...prev, [taskId]: true }))
    try {
      const res  = await fetch(`${API}/api/designer/task`, {
        method: 'PUT',
        headers: jsonHeaders(),
        body: JSON.stringify({ taskId, status: 'In Progress' })
      })
      const data = await res.json()
      if (data.success) {
        setTasks(prev => prev.map(t => t.task_id === taskId ? { ...t, status: 'In Progress' } : t))
        setStats(prev => ({ ...prev, pending: prev.pending - 1, inProgress: prev.inProgress + 1 }))
        await fetchNotifications()
      }
    } catch (e) { console.error(e) }
    setStartingTask(prev => ({ ...prev, [taskId]: false }))
  }

  const getAllowedFormats = (taskType) => {
    if (taskType === 'Reel')
      return { exts: ['.mp4', '.mov', '.avi'], accept: 'video/mp4,video/quicktime,video/x-msvideo', label: 'MP4, MOV, AVI', icon: '🎬' }
    if (taskType === 'Poster')
      return { exts: ['.png', '.jpg', '.jpeg'], accept: 'image/png,image/jpeg', label: 'PNG, JPG', icon: '🖼️' }
    if (taskType === 'Google Ads' || taskType === 'Ads')
      return { exts: ['.png', '.jpg', '.jpeg', '.gif', '.mp4', '.zip'], accept: 'image/png,image/jpeg,image/gif,video/mp4,application/zip', label: 'PNG, JPG, GIF, MP4, ZIP', icon: '📢' }
    return { exts: [], accept: '*/*', label: 'Any file', icon: '📁' }
  }

  const handleFileSelect = (file) => {
    if (!file) return
    const fmt = getAllowedFormats(submitTask?.task_type)
    if (fmt.exts.length && !fmt.exts.some(ext => file.name.toLowerCase().endsWith(ext))) {
      setSubmitResult({ success: false, error: `Wrong format! "${submitTask?.task_type}" only accepts: ${fmt.label}` })
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    setSubmitResult(null)
    setSubmitFile(file)
  }

  const handleSubmit = async () => {
    if (!submitTask || !submitFile) { setSubmitResult({ success: false, error: 'Please select a file' }); return }
    setSubmitting(true)
    setSubmitResult(null)
    try {
      const formData = new FormData()
      formData.append('file', submitFile)
      formData.append('taskId', submitTask.task_id)
      formData.append('note', submitNote)
      const res  = await fetch(`${API}/api/designer/submit-task`, { method: 'POST', headers: headers(), body: formData })
      const data = await res.json()
      if (data.success || res.ok) {
        setSubmitResult({ success: true, message: '✅ Submitted for review!' })
        setTimeout(() => { setSubmitTask(null); setSubmitFile(null); setSubmitNote(''); setSubmitResult(null) }, 2000)
        await loadTasks()
        await fetchNotifications()
      } else {
        setSubmitResult({ success: false, error: data.error || 'Submit failed' })
      }
    } catch (e) { setSubmitResult({ success: false, error: e.message }) }
    setSubmitting(false)
  }

  // Progress screenshot upload handler
  const handleProgressFileSelect = (file) => {
    if (!file) return
    const allowed = ['.png', '.jpg', '.jpeg', '.webp']
    if (!allowed.some(ext => file.name.toLowerCase().endsWith(ext))) {
      setProgressResult({ success: false, error: 'Only PNG, JPG, JPEG, WEBP images allowed' })
      if (progressRef.current) progressRef.current.value = ''
      return
    }
    setProgressResult(null)
    setProgressFile(file)
  }

  // ★ Fix: clear progress file properly
  const clearProgressFile = () => {
    setProgressFile(null)
    setProgressResult(null)
    if (progressRef.current) progressRef.current.value = ''
  }

  const handleProgressUpload = async () => {
    if (!progressFile) { setProgressResult({ success: false, error: 'Please select a screenshot' }); return }
    setProgressUploading(true)
    setProgressResult(null)
    try {
      const formData = new FormData()
      formData.append('screenshot', progressFile)
      formData.append('note', progressNote)
      const res  = await fetch(`${API}/api/designer/upload-progress`, { method: 'POST', headers: headers(), body: formData })
      const data = await res.json()
      if (data.success || res.ok) {
        setProgressResult({ success: true, message: '✅ Progress screenshot sent to planner!' })
        setProgressFile(null)
        setProgressNote('')
        if (progressRef.current) progressRef.current.value = ''
        await fetchMyProgressUploads()
        setTimeout(() => setProgressResult(null), 3000)
      } else {
        setProgressResult({ success: false, error: data.error || 'Upload failed' })
      }
    } catch (e) { setProgressResult({ success: false, error: e.message }) }
    setProgressUploading(false)
  }

  const handleLeaveSubmit = async () => {
    if (!leaveDate) return
    setLeaveSubmitting(true)
    try {
      const res = await fetch(`${API}/api/designer/leave`, {
        method: 'POST', headers: jsonHeaders(),
        body: JSON.stringify({ leaveDate, reason: leaveReason })
      })
      if (res.ok) {
        setLeaveStatus('pending')
        setShowLeaveModal(false)
        setLeaveDate('')
        setLeaveReason('')
        alert('✅ Leave request submitted!')
      }
    } catch (e) { console.error(e) }
    setLeaveSubmitting(false)
  }

  const unread     = notifications.filter(n => !n.is_read).length
  const initials   = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'D'

  const todayTasks = tasks.filter(t => t.end_date === serverToday)

  const has4PMAlert = showTomorrow && todayTasks.some(t => t.status !== 'Completed' && t.status !== 'Submitted')
   const now = new Date()
const currentHour = now.getHours()

let currentSlot = null

if (currentHour >= 11 && currentHour < 13) currentSlot = 11
else if (currentHour >= 13 && currentHour < 15) currentSlot = 13
else if (currentHour >= 15 && currentHour < 17) currentSlot = 15
else if (currentHour >= 17) currentSlot = 17

const uploadedCurrentSlot = myProgressUploads.some(upload => {
  const uploadHour = new Date(upload.uploaded_at).getHours()

  if (currentSlot === 11) return uploadHour >= 11 && uploadHour < 13
  if (currentSlot === 13) return uploadHour >= 13 && uploadHour < 15
  if (currentSlot === 15) return uploadHour >= 15 && uploadHour < 17
  if (currentSlot === 17) return uploadHour >= 17

  return false
})

const shouldFlicker = currentSlot && !uploadedCurrentSlot
  const S = `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Fraunces:wght@700&display=swap');
    @keyframes spin      { to { transform: rotate(360deg); } }
    @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:0.5} }
    @keyframes slideUp   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    @keyframes blink     { 0%,100%{opacity:1} 50%{opacity:0.4} }
    @keyframes flicker   { 0%,100%{box-shadow:0 0 0px rgba(239,68,68,0);border-color:#e2e8f0;} 50%{box-shadow:0 0 18px 4px rgba(239,68,68,0.22);border-color:#ef4444;} }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    .dash { min-height: 100vh; background: #f4f6fb; font-family: 'Outfit', sans-serif; }
    .header { background: #fff; border-bottom: 1px solid #e8edf4; padding: 0 32px; height: 64px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
    .logo { display: flex; align-items: center; gap: 10px; }
    .logo-icon { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #059669, #0d9488); display: flex; align-items: center; justify-content: center; font-size: 16px; }
    .logo-text { font-family: 'Fraunces', serif; font-size: 17px; font-weight: 700; color: #1e293b; }
    .header-right { display: flex; align-items: center; gap: 12px; position: relative; }
    .avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #059669, #0d9488); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #fff; }
    .logout-btn { padding: 7px 16px; border-radius: 8px; border: 1.5px solid #e2e8f0; background: #fff; color: #64748b; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
    .logout-btn:hover { background: #fef2f2; border-color: #fca5a5; color: #dc2626; }
    .leave-btn { padding: 7px 16px; border-radius: 8px; border: 1.5px solid #fed7aa; background: #fff7ed; color: #c2410c; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
    .notif-btn { position: relative; width: 38px; height: 38px; border-radius: 10px; border: 1.5px solid #e2e8f0; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 17px; }
    .notif-badge { position: absolute; top: -4px; right: -4px; width: 17px; height: 17px; border-radius: 50%; background: #ef4444; color: #fff; font-size: 10px; font-weight: 800; display: flex; align-items: center; justify-content: center; border: 2px solid #fff; }
    .notif-panel { position: absolute; top: 54px; right: 0; width: 360px; background: #fff; border-radius: 16px; border: 1px solid #e8edf4; box-shadow: 0 12px 40px rgba(0,0,0,0.12); z-index: 200; overflow: hidden; animation: slideUp 0.2s ease; }
    .alert-banner { padding: 12px 24px; display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 700; }
    .alert-4pm { background: linear-gradient(135deg, #f97316, #ea580c); color: #fff; }
    .main { max-width: 1200px; margin: 0 auto; padding: 28px 24px; }
    .page-title { font-family: 'Fraunces', serif; font-size: 24px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
    .page-sub { font-size: 13px; color: #94a3b8; margin-bottom: 24px; }
    .stats-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 24px; }
    .stat-card { background: #fff; border-radius: 16px; padding: 18px 12px; border: 1px solid #e8edf4; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 8px rgba(0,0,0,0.03); }
    .stat-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
    .stat-value { font-size: 24px; font-weight: 800; line-height: 1; }
    .stat-icon { width: 36px; height: 36px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 16px; }

    /* ★ Progress upload card — white card, matches dashboard style */
    .progress-upload-card { background: #fff; border-radius: 18px; padding: 22px 28px; margin-bottom: 24px; border: 1px solid #e8edf4; box-shadow: 0 2px 8px rgba(0,0,0,0.03); }
    .upload-reminder { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
    .reminder-icon { width: 44px; height: 44px; border-radius: 14px; background: #fff7ed; border: 1.5px solid #fed7aa; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
    .reminder-text { flex: 1; }
    .reminder-title { font-size: 15px; font-weight: 800; color: #1e293b; margin-bottom: 3px; }
    .reminder-sub { font-size: 12px; color: #94a3b8; }
    .blink-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #f59e0b; margin-right: 6px; animation: blink 1.5s ease-in-out infinite; }
    .progress-upload-zone { border: 2px dashed #e2e8f0; border-radius: 14px; padding: 20px; background: #f8fafc; cursor: pointer; position: relative; transition: all 0.2s; display: flex; align-items: center; gap: 16px;}
    .progress-upload-zone:hover, .progress-upload-zone.drag { border-color: #059669; background: #f0fdf4; animation: none; box-shadow: none; }
    .flicker-active {animation: flicker 2s ease-in-out infinite;}
    .progress-upload-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
    .progress-file-chosen { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #f0fdf4; border-radius: 12px; border: 1.5px solid #86efac; }
    .btn-remove-file { background: #fef2f2; border: 1.5px solid #fecaca; color: #dc2626; cursor: pointer; font-size: 12px; border-radius: 8px; padding: 5px 12px; font-weight: 700; font-family: inherit; flex-shrink: 0; white-space: nowrap; transition: all 0.15s; }
    .btn-remove-file:hover { background: #fee2e2; border-color: #f87171; }
    .my-upload-thumb-wrap { position: relative; width: 64px; height: 64px; flex-shrink: 0; }
    .my-upload-thumb-x { position: absolute; top: -6px; left: -6px; z-index: 10; width: 20px; height: 20px; border-radius: 50%; background: #ef4444; color: #fff; font-size: 11px; font-weight: 900; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.2); transition: all 0.15s; line-height: 1; }
    .my-upload-thumb-x:hover { background: #dc2626; transform: scale(1.1); }
    .progress-note-input { width: 100%; padding: 10px 14px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 13px; font-family: inherit; background: #fff; color: #1e293b; outline: none; margin-top: 12px; }
    .progress-note-input::placeholder { color: #94a3b8; }
    .progress-note-input:focus { border-color: #059669; box-shadow: 0 0 0 3px rgba(5,150,105,0.08); }
    .btn-send-progress { margin-top: 12px; width: 100%; padding: 12px; border-radius: 12px; border: none; background: linear-gradient(135deg, #059669, #047857); color: #fff; font-size: 14px; font-weight: 800; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; }
    .btn-send-progress:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(5,150,105,0.28); }
    .btn-send-progress:disabled { opacity: 0.45; cursor: not-allowed; }
    .progress-result-ok  { margin-top: 10px; padding: 12px; border-radius: 10px; background: #f0fdf4; border: 1px solid #86efac; color: #15803d; font-size: 13px; font-weight: 700; text-align: center; }
    .progress-result-err { margin-top: 10px; padding: 12px; border-radius: 10px; background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; font-size: 13px; font-weight: 700; text-align: center; }
    .my-uploads-row { display: flex; gap: 10px; margin-top: 8px; flex-wrap: wrap; }
    .my-upload-thumb { border-radius: 10px; overflow: hidden; width: 64px; height: 64px; border: 1.5px solid #e2e8f0; background: #f8fafc; display: flex; align-items: center; justify-content: center; position: relative; cursor: pointer; transition: all 0.15s; text-decoration: none; display: block; }
    .my-upload-thumb:hover { border-color: #059669; box-shadow: 0 2px 8px rgba(5,150,105,0.15); }
    .my-upload-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .my-upload-thumb .upload-time { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.6); color: #fff; font-size: 8px; font-weight: 700; text-align: center; padding: 2px; }

    .card { background: #fff; border-radius: 18px; border: 1px solid #e8edf4; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.03); margin-bottom: 20px; }
    .card-header { padding: 18px 24px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; }
    .card-title { font-size: 15px; font-weight: 700; color: #1e293b; }
    .card-sub { font-size: 12px; color: #94a3b8; margin-top: 2px; }
    .btn-refresh { padding: 9px 18px; border-radius: 10px; border: none; background: linear-gradient(135deg, #059669, #047857); color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
    table { width: 100%; border-collapse: collapse; }
    thead th { padding: 11px 16px; text-align: left; font-size: 11px; font-weight: 800; color: #94a3b8; letter-spacing: 0.7px; text-transform: uppercase; background: #f8fafc; border-bottom: 1px solid #e8edf4; }
    tbody tr { border-bottom: 1px solid #f1f5f9; transition: background 0.1s; }
    tbody tr:hover { background: #f0fdf4; }
    tbody td { padding: 12px 16px; font-size: 13px; color: #374151; font-weight: 500; vertical-align: middle; }
    .btn-start { padding: 8px 16px; border-radius: 8px; border: none; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 7px; transition: all 0.2s; min-width: 110px; justify-content: center; }
    .btn-start:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
    .btn-start:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
    .btn-submit { padding: 8px 16px; border-radius: 8px; border: none; background: linear-gradient(135deg, #059669, #047857); color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 5px; transition: all 0.2s; }
    .btn-submit:hover { opacity: 0.9; transform: translateY(-1px); }
    .btn-resubmit { padding: 8px 16px; border-radius: 8px; border: none; background: linear-gradient(135deg, #f97316, #ea580c); color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.2s; }
    .btn-resubmit:hover { opacity: 0.9; transform: translateY(-1px); }
    /* ★ Requirements — clickable pill */
    .req-pill { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 8px; background: #eff6ff; border: 1.5px solid #bfdbfe; color: #1d4ed8; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.15s; white-space: nowrap; max-width: 200px; }
    .req-pill:hover { background: #dbeafe; border-color: #93c5fd; }
    .req-pill-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px; }
    .submitted-chip { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 8px; background: #fff7ed; border: 1.5px solid #fed7aa; color: #c2410c; font-size: 11px; font-weight: 700; animation: pulse 2s infinite; }
    .completed-chip { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 8px; background: #f0fdf4; border: 1.5px solid #86efac; color: #15803d; font-size: 11px; font-weight: 700; }
    .overdue-badge { display: inline-flex; padding: 2px 7px; border-radius: 5px; font-size: 10px; font-weight: 800; background: #fef2f2; color: #dc2626; margin-left: 5px; }
    .section-divider { padding: 10px 16px; background: #f0fdf4; border-bottom: 1px solid #e8edf4; }
    .section-divider-label { font-size: 11px; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.7px; }
    .empty-state { text-align: center; padding: 48px 24px; }
    .empty-icon { font-size: 42px; margin-bottom: 12px; }
    .empty-text { font-size: 14px; color: #94a3b8; font-weight: 500; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 300; backdrop-filter: blur(4px); }
    .modal { background: #fff; border-radius: 20px; width: 520px; max-width: 95vw; box-shadow: 0 24px 60px rgba(0,0,0,0.2); overflow: hidden; animation: slideUp 0.25s ease; }
    .modal-head { padding: 20px 24px; background: linear-gradient(135deg, #059669, #0d9488); color: #fff; }
    .modal-title { font-size: 17px; font-weight: 800; }
    .modal-sub { font-size: 12px; opacity: 0.8; margin-top: 3px; }
    .modal-body { padding: 22px 24px; }
    .format-hint { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 10px; background: #eff6ff; border: 1.5px solid #bfdbfe; margin-bottom: 12px; font-size: 12px; font-weight: 700; color: #1d4ed8; }
    .req-box { background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 10px; padding: 10px 14px; margin-bottom: 12px; font-size: 12px; color: #1d4ed8; font-weight: 600; }
    .upload-zone { border: 2px dashed #86efac; border-radius: 14px; padding: 28px 20px; text-align: center; cursor: pointer; background: #f0fdf4; position: relative; transition: all 0.2s; }
    .upload-zone.drag { border-color: #059669; background: #dcfce7; }
    .upload-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
    .file-chosen { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: #f0fdf4; border-radius: 12px; border: 1.5px solid #86efac; margin-top: 12px; }
    .modal-textarea { width: 100%; min-height: 80px; padding: 12px 14px; border: 1.5px solid #e2e8f0; border-radius: 12px; font-size: 13px; font-family: inherit; resize: vertical; outline: none; margin-top: 12px; }
    .modal-textarea:focus { border-color: #059669; }
    .modal-actions { display: flex; gap: 10px; margin-top: 16px; }
    .btn-save { flex: 1; padding: 13px; border-radius: 10px; border: none; background: linear-gradient(135deg, #059669, #047857); color: #fff; font-size: 14px; font-weight: 800; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-cancel { flex: 0 0 90px; padding: 13px; border-radius: 10px; border: 1.5px solid #e2e8f0; background: #fff; color: #64748b; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; }
    .input-field { width: 100%; padding: 11px 14px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 13px; font-family: inherit; font-weight: 600; color: #1e293b; outline: none; }
    .label { font-size: 12px; font-weight: 700; color: #64748b; margin-bottom: 6px; display: block; }
    .result-success { padding: 14px; border-radius: 12px; background: #f0fdf4; border: 1.5px solid #86efac; color: #15803d; font-size: 14px; font-weight: 700; text-align: center; margin-top: 12px; }
    .result-error { padding: 14px; border-radius: 12px; background: #fef2f2; border: 1.5px solid #fecaca; color: #dc2626; font-size: 14px; font-weight: 700; text-align: center; margin-top: 12px; }
    @media(max-width:900px){ .stats-grid{ grid-template-columns: repeat(3, 1fr); } }
  `

  return (
    <div className="dash">
      <style>{S}</style>

      {has4PMAlert && (
        <div className="alert-banner alert-4pm">
          ⏰ Deadline approaching! Submit pending tasks before 6 PM.
          <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.8 }}>Today: {serverToday}</span>
        </div>
      )}

      <header className="header">
        <div className="logo">
          <div className="logo-icon">🎨</div>
          <span className="logo-text">Agency Automation</span>
        </div>
        <div className="header-right">
          {leaveStatus === 'pending'  && <div style={{ padding: '6px 14px', borderRadius: 8, background: '#fffbeb', border: '1.5px solid #fde68a', color: '#b45309', fontSize: 12, fontWeight: 700 }}>⏳ Leave Pending</div>}
          {leaveStatus === 'approved' && <div style={{ padding: '6px 14px', borderRadius: 8, background: '#f0fdf4', border: '1.5px solid #86efac', color: '#15803d', fontSize: 12, fontWeight: 700 }}>✅ Leave Approved</div>}
          {!leaveStatus && <button className="leave-btn" onClick={() => setShowLeaveModal(true)}>🏖️ Request Leave</button>}

          <button className="notif-btn" onClick={() => setShowNotif(p => !p)}>
            🔔 {unread > 0 && <span className="notif-badge">{unread}</span>}
          </button>

          {showNotif && (
            <div className="notif-panel">
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Notifications</span>
                <button onClick={() => setShowNotif(false)} style={{ fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Close</button>
              </div>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {notifications.length === 0
                  ? <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No notifications</div>
                  : notifications.map(n => (
                    <div key={n.id} style={{ padding: '12px 18px', borderBottom: '1px solid #f8fafc', fontSize: 13, background: n.is_read ? '#fff' : '#f8faff' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{n.message}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
                        {n.created_at ? new Date(n.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="avatar">{initials}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{user?.email}</div>
          </div>
          <button className="logout-btn" onClick={logout}>Logout</button>
        </div>
      </header>

      <main className="main">
        <div className="page-title">🎨 Designer Dashboard</div>
        <div className="page-sub">Start work → Submit file → Admin reviews → ✅ Completed</div>

        {/* ★ PROGRESS SCREENSHOT UPLOAD CARD — Green theme */}
        <div className="progress-upload-card">
          <div className="upload-reminder">
            <div className="reminder-icon">📸</div>
            <div className="reminder-text">
              <div className="reminder-title">
                <span className="blink-dot"/>
                Screenshot reminder — Upload at 11 AM · 1 PM · 3 PM · 5 PM
              </div>
              <div className="reminder-sub">Take a screenshot of your work at these times and send it — planner tracks your progress live</div>
            </div>
            {myProgressUploads.length > 0 && (
              <div style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d', fontSize: 12, fontWeight: 800 }}>
                {myProgressUploads.length} sent today
              </div>
            )}
          </div>

          {/* Upload zone OR file chosen */}
          {!progressFile ? (
            <div
              className={`progress-upload-zone${progressDragOver ? ' drag' : ''}${shouldFlicker ? ' flicker-active' : ''}`}
              onDragOver={e => { e.preventDefault(); setProgressDragOver(true) }}
              onDragLeave={() => setProgressDragOver(false)}
              onDrop={e => { e.preventDefault(); setProgressDragOver(false); handleProgressFileSelect(e.dataTransfer.files[0]) }}
            >
              <input
                type="file"
                className="progress-upload-input"
                ref={progressRef}
                accept="image/png,image/jpeg,image/webp"
                onChange={e => handleProgressFileSelect(e.target.files[0])}
              />
              <div style={{ fontSize: 28 }}>🖼️</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Click or drag & drop screenshot</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>PNG, JPG, WEBP accepted</div>
              </div>
            </div>
          ) : (
            /* ★ FIX: File chosen — with clear "✕ Remove" button so wrong file can be removed */
            <div className="progress-file-chosen">
              <span style={{ fontSize: 22 }}>🖼️</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{progressFile.name}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{(progressFile.size / 1024).toFixed(1)} KB — ready to send</div>
              </div>
              <button
                onClick={clearProgressFile}
                style={{
                  background: '#fef2f2', border: '1.5px solid #fecaca',
                  color: '#dc2626', cursor: 'pointer', fontSize: 12,
                  borderRadius: 8, padding: '5px 12px', fontWeight: 700,
                  fontFamily: 'inherit', flexShrink: 0, whiteSpace: 'nowrap',
                }}
              >✕ Remove</button>
            </div>
          )}

          {/* Optional note */}
          <input
            className="progress-note-input"
            placeholder="Add a note (optional) — e.g. 'Completed logo section'"
            value={progressNote}
            onChange={e => setProgressNote(e.target.value)}
          />

          {/* Send button */}
          <button className="btn-send-progress" onClick={handleProgressUpload} disabled={progressUploading || !progressFile}>
            {progressUploading ? <><Spinner size={14}/> Sending to planner…</> : '📤 Send Progress to Planner →'}
          </button>

          {/* Result */}
          {progressResult && (
            progressResult.success
              ? <div className="progress-result-ok">{progressResult.message}</div>
              : <div className="progress-result-err">❌ {progressResult.error}</div>
          )}

          {/* Today's sent thumbnails */}
          {myProgressUploads.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sent today</div>
              <div className="my-uploads-row">
                {myProgressUploads.slice(0, 8).map((u, i) => (
                  <div key={i} className="my-upload-thumb-wrap">
                    {/* ✕ remove button top-left corner */}
                    <div
                      className="my-upload-thumb-x"
                      title="Remove this screenshot"
                      onClick={() => setMyProgressUploads(prev => prev.filter((_, idx) => idx !== i))}
                    >✕</div>
                    <a href={u.file_link} target="_blank" rel="noopener noreferrer" className="my-upload-thumb">
                      {u.file_link
                        ? <img src={u.file_link} alt="progress" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display='none' }}/>
                        : <span style={{ fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>🖼️</span>}
                      <span className="upload-time">
                        {u.uploaded_at ? new Date(u.uploaded_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </a>
                  </div>
                ))}
                {myProgressUploads.length > 8 && (
                  <div style={{ width: 64, height: 64, borderRadius: 10, background: '#f8fafc', border: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 12, fontWeight: 700 }}>
                    +{myProgressUploads.length - 8}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Stats — today tasks only */}
        <div className="stats-grid">
          {[
            { label: 'Total',       value: stats.total,      icon: '📋', color: '#7c3aed', bg: '#f5f3ff' },
            { label: 'To Do',       value: stats.pending,    icon: '⏳', color: '#d97706', bg: '#fffbeb' },
            { label: 'In Progress', value: stats.inProgress, icon: '⚡', color: '#2563eb', bg: '#eff6ff' },
            { label: 'In Review',   value: stats.submitted,  icon: '📤', color: '#c2410c', bg: '#fff7ed' },
            { label: 'Rejected',    value: stats.rejected,   icon: '❌', color: '#dc2626', bg: '#fef2f2' },
            { label: 'Completed',   value: stats.completed,  icon: '✅', color: '#059669', bg: '#f0fdf4' },
          ].map(s => (
            <div className="stat-card" key={s.label}>
              <div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              </div>
              <div className="stat-icon" style={{ background: s.bg }}>{s.icon}</div>
            </div>
          ))}
        </div>

        {/* ★ Tasks Table — always shows TODAY only, no tomorrow */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">📋 Today's Tasks — {serverToday}</div>
              <div className="card-sub">▶ Start → 📤 Submit → Admin reviews → ✅ Done</div>
            </div>
            <button className="btn-refresh" onClick={loadTasks}>↻ Refresh</button>
          </div>

          {loading
            ? <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <Spinner size={20} color="#059669" /> Loading tasks...
              </div>
            : todayTasks.length === 0
              ? <div className="empty-state"><div className="empty-icon">✅</div><div className="empty-text">No tasks for today!</div></div>
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>{['Task ID','Client','Type','Requirements','Deadline','Status','Action','Admin Note'].map(h => <th key={h}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {todayTasks.map(task => {
                        const overdue    = isOverdue(task.end_date, serverToday) && task.status !== 'Completed'
                        const isStarting = startingTask[task.task_id]
                        return (
                          <tr key={task.id} style={{ background: overdue ? '#fff7f7' : undefined }}>
                            <td><span style={{ fontWeight: 800, color: '#059669', fontSize: 12 }}>{task.task_id || '—'}</span></td>
                            <td style={{ fontWeight: 600, color: '#1e293b' }}>{task.client_name || '—'}</td>
                            <td><Badge label={task.task_type || '—'} style={typeStyle[task.task_type]} /></td>

                            {/* ★ Requirements — clickable pill that opens full details modal */}
                            <td>
                              {task.requirements
                                ? (
                                  <button
                                    className="req-pill"
                                    onClick={() => setReqModalText(task.requirements)}
                                    title="Click to see full requirements"
                                  >
                                    <span style={{ fontSize: 12 }}>📋</span>
                                    <span className="req-pill-text">{task.requirements.slice(0, 30)}{task.requirements.length > 30 ? '…' : ''}</span>
                                    <span style={{ fontSize: 10, opacity: 0.7, flexShrink: 0 }}>View all</span>
                                  </button>
                                )
                                : <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>}
                            </td>

                            <td>
                              <span style={{ color: overdue ? '#dc2626' : '#64748b', fontWeight: overdue ? 700 : 500, fontSize: 13 }}>{task.end_date || '—'}</span>
                              {overdue && <span className="overdue-badge">⚠ Overdue</span>}
                            </td>
                            <td><Badge label={task.status || 'Pending'} style={statusStyle[task.status]} /></td>
                            <td>
                              {task.status === 'Completed' && <div className="completed-chip">✅ Approved</div>}
                              {task.status === 'Submitted' && <div className="submitted-chip">⏳ Admin reviewing…</div>}
                              {task.status === 'Rejected' && (
                                <button className="btn-resubmit" onClick={() => { setSubmitFile(null); setSubmitResult(null); setSubmitTask(task) }}>
                                  🔄 Resubmit
                                </button>
                              )}
                              {(task.status === 'Pending' || task.status === 'Assigned') && (
                                <button className="btn-start" onClick={() => handleStartWork(task.task_id)} disabled={isStarting}>
                                  {isStarting ? <><Spinner size={13} color="#fff" /> Starting…</> : <>▶ Start Work</>}
                                </button>
                              )}
                              {task.status === 'In Progress' && (
                                <button className="btn-submit" onClick={() => { setSubmitFile(null); setSubmitResult(null); setSubmitTask(task) }}>
                                  📤 Submit
                                </button>
                              )}
                            </td>
                            <td>
                              {task.manager_note
                                ? <div style={{ fontSize: 12, color: task.status === 'Rejected' ? '#dc2626' : '#64748b', fontWeight: 600, maxWidth: 160 }}>
                                    {task.status === 'Rejected' && '❌ '}{task.manager_note}
                                  </div>
                                : <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
        </div>
      </main>

      {/* ★ REQUIREMENTS FULL DETAILS MODAL */}
      {reqModalText !== null && (
        <RequirementsModal text={reqModalText} onClose={() => setReqModalText(null)} />
      )}

      {/* SUBMIT MODAL */}
      {submitTask && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !submitting && setSubmitTask(null)}>
          <div className="modal">
            <div className="modal-head">
              <div className="modal-title">📤 Submit Work for Review</div>
              <div className="modal-sub">{submitTask.task_id} — {submitTask.client_name} ({submitTask.task_type})</div>
            </div>
            <div className="modal-body">
              {(() => {
                const fmt = getAllowedFormats(submitTask.task_type)
                return (
                  <div className="format-hint">
                    <span style={{ fontSize: 18 }}>{fmt.icon}</span>
                    <span>{submitTask.task_type} → Accepted: <strong>{fmt.label}</strong></span>
                  </div>
                )
              })()}
              {submitTask.requirements && (
                <div className="req-box">📋 <strong>Requirements:</strong> {submitTask.requirements}</div>
              )}
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>UPLOAD FILE *</div>
              {!submitFile ? (
                <div
                  className={`upload-zone${dragOver ? ' drag' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files[0]) }}
                >
                  <input type="file" className="upload-input" ref={fileRef}
                    accept={getAllowedFormats(submitTask.task_type).accept}
                    onChange={e => handleFileSelect(e.target.files[0])} />
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{getAllowedFormats(submitTask.task_type).icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#15803d' }}>Click or drag & drop</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Accepted: <strong>{getAllowedFormats(submitTask.task_type).label}</strong></div>
                </div>
              ) : (
                <div className="file-chosen">
                  <span style={{ fontSize: 24 }}>📄</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>{submitFile.name}</div>
                    <div style={{ fontSize: 12, color: '#16a34a' }}>{(submitFile.size / 1024).toFixed(1)} KB</div>
                  </div>
                  <button onClick={() => { setSubmitFile(null); if (fileRef.current) fileRef.current.value = '' }}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 18 }}>✕</button>
                </div>
              )}
              <textarea className="modal-textarea" placeholder="Note for admin (optional)…" value={submitNote} onChange={e => setSubmitNote(e.target.value)} />
              {submitResult && (
                submitResult.success
                  ? <div className="result-success">{submitResult.message}</div>
                  : <div className="result-error">❌ {submitResult.error}</div>
              )}
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => { setSubmitTask(null); setSubmitFile(null); setSubmitNote(''); setSubmitResult(null) }} disabled={submitting}>Cancel</button>
                <button className="btn-save" onClick={handleSubmit} disabled={submitting || !submitFile}>
                  {submitting ? <><Spinner size={14} /> Uploading…</> : '📤 Submit for Review →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LEAVE MODAL */}
      {showLeaveModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowLeaveModal(false)}>
          <div className="modal" style={{ width: 420 }}>
            <div className="modal-head" style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}>
              <div className="modal-title">🏖️ Request Leave</div>
              <div className="modal-sub">Tasks will be auto-reassigned if approved</div>
            </div>
            <div className="modal-body">
              <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 13, color: '#c2410c', fontWeight: 600 }}>
                ⚠️ No login by 10:00 AM → tasks auto-reassigned
              </div>
              <div style={{ marginBottom: 14 }}>
                <label className="label">Leave Date *</label>
                <input type="date" className="input-field" value={leaveDate}
                  onChange={e => setLeaveDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]} />
              </div>
              <div>
                <label className="label">Reason (optional)</label>
                <textarea className="modal-textarea" style={{ marginTop: 0 }}
                  placeholder="Personal / Sick / Event…"
                  value={leaveReason} onChange={e => setLeaveReason(e.target.value)} rows={3} />
              </div>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowLeaveModal(false)}>Cancel</button>
                <button style={{ flex: 1, padding: 13, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  onClick={handleLeaveSubmit} disabled={leaveSubmitting || !leaveDate}>
                  {leaveSubmitting ? <><Spinner size={14}/> Sending…</> : '🏖️ Request Leave →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}