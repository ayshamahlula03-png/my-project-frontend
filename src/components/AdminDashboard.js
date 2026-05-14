import { useState, useEffect } from 'react'
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
      {st.dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot, flexShrink: 0 }} />}
      {label}
    </span>
  )
}

function isOverdue(endDate) {
  if (!endDate) return false
  return endDate < getISTDate()
}

function getISTDate() {
  const IST = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000))
  return IST.toISOString().split('T')[0]
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
    }} />
  )
}

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const [tasks, setTasks]         = useState([])
  const [designers, setDesigners] = useState([])
  const [planners, setPlanners]   = useState([])
  const [loading, setLoading]     = useState(true)

  const [search, setSearch]               = useState('')
  const [filterStatus, setFilterStatus]   = useState('All')
  const [filterType, setFilterType]       = useState('All')
  const [filterDesigner, setFilterDesigner] = useState('All')
  const [filterPlanner, setFilterPlanner]   = useState('All')
  const [showTodayOnly, setShowTodayOnly]   = useState(true)

  const [tab, setTab] = useState('tasks')
  const [stats, setStats] = useState({ total: 0, today: 0, pending: 0, inProgress: 0, completed: 0, submitted: 0 })

  // Leave — designer & planner requests
  const [leaveRequests, setLeaveRequests]     = useState([])
  const [processingLeave, setProcessingLeave] = useState(null)

  // Admin own leave
  const [adminLeaves, setAdminLeaves]     = useState([])
  const [adminLeaveDate, setAdminLeaveDate] = useState('')
  const [adminLeaveMsg, setAdminLeaveMsg]   = useState('')
  const [savingLeave, setSavingLeave]       = useState(false)
  const [removingLeave, setRemovingLeave]   = useState(null)

  // Upload logs
  const [uploadLogs, setUploadLogs] = useState([])

  // Review modal
  const [reviewTask, setReviewTask]     = useState(null)
  const [reviewAction, setReviewAction] = useState('')
  const [reviewFeedback, setReviewFeedback] = useState('')
  const [reviewing, setReviewing]       = useState(false)

  // Planner modal
  const [selectedPlanner, setSelectedPlanner] = useState(null)

  const today = getISTDate()
  const token = () => localStorage.getItem('token')
  const headers = () => ({ Authorization: `Bearer ${token()}` })
  const jsonHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` })

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    await Promise.all([loadTasks(), loadDesigners(), loadPlanners(), loadLeaveRequests(), loadUploadLogs(), loadAdminLeaves()])
    setLoading(false)
  }

  const loadTasks = async () => {
    try {
      const res = await fetch(`${API}/api/admin/tasks`, { headers: headers() })
      const data = await res.json()
      const list = data.tasks || []
      setTasks(list)
      setStats({
        total:      list.length,
        today:      list.filter(t => t.end_date === today || t.publish_date === today).length,
        pending:    list.filter(t => t.status === 'Pending' || t.status === 'Assigned').length,
        inProgress: list.filter(t => t.status === 'In Progress').length,
        submitted:  list.filter(t => t.status === 'Submitted').length,
        completed:  list.filter(t => t.status === 'Completed').length,
      })
    } catch (e) { console.error(e) }
  }

  const loadDesigners = async () => {
    try {
      const res = await fetch(`${API}/api/admin/designers`, { headers: headers() })
      const data = await res.json()
      setDesigners(data.designers || [])
    } catch (e) { console.error(e) }
  }

  const loadPlanners = async () => {
    try {
      const res = await fetch(`${API}/api/admin/planners`, { headers: headers() })
      const data = await res.json()
      setPlanners(data.planners || [])
    } catch (e) { console.error(e) }
  }

  const loadLeaveRequests = async () => {
    try {
      const res = await fetch(`${API}/api/admin/leave-requests`, { headers: headers() })
      const data = await res.json()
      setLeaveRequests(data.leave_requests || [])
    } catch (e) { console.error(e) }
  }

  const loadUploadLogs = async () => {
    try {
      const res = await fetch(`${API}/api/admin/upload-logs`, { headers: headers() })
      const data = await res.json()
      setUploadLogs(data.logs || [])
    } catch (e) { console.error(e) }
  }

  const loadAdminLeaves = async () => {
    try {
      const res = await fetch(`${API}/api/admin/leaves`, { headers: headers() })
      const data = await res.json()
      setAdminLeaves(data.leaves || [])
    } catch (e) { console.error(e) }
  }

  const handleReassign = async (taskId, designerId, designerName) => {
    try {
      await fetch(`${API}/api/admin/reassign`, {
        method: 'POST', headers: jsonHeaders(),
        body: JSON.stringify({ taskId, designerId, designerName })
      })
      await loadTasks()
    } catch (e) { console.error(e) }
  }

  const handleLeaveAction = async (requestId, action) => {
    setProcessingLeave(requestId)
    try {
      const res = await fetch(`${API}/api/admin/handle-leave`, {
        method: 'POST', headers: jsonHeaders(),
        body: JSON.stringify({ requestId, action })
      })
      if (res.ok) {
        await loadLeaveRequests()
        await loadTasks()
      } else {
        const d = await res.json()
        alert(d.error || 'Failed')
      }
    } catch (e) { alert(e.message) }
    setProcessingLeave(null)
  }

  const handleReview = async () => {
    if (!reviewTask || !reviewAction) return
    setReviewing(true)
    try {
      const res = await fetch(`${API}/api/manager/review-submission`, {
        method: 'POST', headers: jsonHeaders(),
        body: JSON.stringify({ taskId: reviewTask.task_id, action: reviewAction, feedback: reviewFeedback })
      })
      const data = await res.json()
      if (res.ok) {
        setReviewTask(null)
        setReviewAction('')
        setReviewFeedback('')
        await loadTasks()
      } else {
        alert(data.error || 'Review failed')
      }
    } catch (e) { alert(e.message) }
    setReviewing(false)
  }

  const handleMarkAdminLeave = async () => {
    if (!adminLeaveDate) return alert('Please select a date')
    setSavingLeave(true)
    try {
      const res = await fetch(`${API}/api/admin/mark-leave`, {
        method: 'POST', headers: jsonHeaders(),
        body: JSON.stringify({ date: adminLeaveDate, message: adminLeaveMsg })
      })
      if (res.ok) {
        await loadAdminLeaves()
        setAdminLeaveDate('')
        setAdminLeaveMsg('')
      } else {
        const d = await res.json()
        alert(d.error || 'Failed to mark leave')
      }
    } catch (e) { alert(e.message) }
    setSavingLeave(false)
  }

  const handleRemoveAdminLeave = async (date) => {
    setRemovingLeave(date)
    try {
      await fetch(`${API}/api/admin/leaves/${date}`, {
        method: 'DELETE', headers: headers()
      })
      await loadAdminLeaves()
    } catch (e) { alert(e.message) }
    setRemovingLeave(null)
  }

  const designerTodayCount = (designerName) =>
    tasks.filter(t => t.assigned_designer === designerName &&
      (t.end_date === today || t.publish_date === today)).length

  const filtered = tasks.filter(t => {
    const q = search.toLowerCase()
    const matchQ = !q || (t.task_id||'').toLowerCase().includes(q) ||
      (t.client_name||'').toLowerCase().includes(q) ||
      (t.assigned_designer||'').toLowerCase().includes(q) ||
      (t.planner_name||'').toLowerCase().includes(q)
    const matchS  = filterStatus   === 'All' || t.status        === filterStatus
    const matchT  = filterType     === 'All' || t.task_type     === filterType
    const matchD  = filterDesigner === 'All' || t.assigned_designer === filterDesigner
    const matchP  = filterPlanner  === 'All' || t.planner_name  === filterPlanner
    const matchDate = !showTodayOnly || t.end_date === today || t.publish_date === today
    return matchQ && matchS && matchT && matchD && matchP && matchDate
  })

  const pendingSubmissions = tasks.filter(t => t.status === 'Submitted')

  // Split leave requests: designer leaves vs planner leaves
  const designerLeaveRequests = leaveRequests.filter(r => !r.requester_role || r.requester_role === 'designer')
  const plannerLeaveRequests  = leaveRequests.filter(r => r.requester_role === 'planner')

  const plannerTasks = selectedPlanner
    ? tasks.filter(t => t.planner_name === selectedPlanner.name && (t.end_date === today || t.publish_date === today))
    : []

  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'A'

  // Is admin on leave today?
  const isAdminOnLeaveToday = adminLeaves.some(l => l.date === today)

  const totalLeaveCount = leaveRequests.length

  const S = `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Fraunces:wght@700&display=swap');
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    .dash { min-height: 100vh; background: #f4f6fb; font-family: 'Outfit', sans-serif; }
    .header { background: #fff; border-bottom: 1px solid #e8edf4; padding: 0 32px; height: 64px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
    .logo { display: flex; align-items: center; gap: 10px; }
    .logo-icon { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #7c3aed, #4f46e5); display: flex; align-items: center; justify-content: center; font-size: 16px; }
    .logo-text { font-family: 'Fraunces', serif; font-size: 17px; font-weight: 700; color: #1e293b; }
    .header-right { display: flex; align-items: center; gap: 12px; }
    .avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #7c3aed, #4f46e5); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #fff; }
    .logout-btn { padding: 7px 16px; border-radius: 8px; border: 1.5px solid #e2e8f0; background: #fff; color: #64748b; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
    .logout-btn:hover { background: #fef2f2; border-color: #fca5a5; color: #dc2626; }
    .on-leave-banner { background: linear-gradient(135deg, #fef3c7, #fde68a); border: 1.5px solid #f59e0b; border-radius: 10px; padding: 8px 16px; font-size: 12px; font-weight: 700; color: #92400e; display: flex; align-items: center; gap: 6px; }
    .main { max-width: 1400px; margin: 0 auto; padding: 28px 24px; }
    .page-title { font-family: 'Fraunces', serif; font-size: 24px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
    .page-sub { font-size: 13px; color: #94a3b8; margin-bottom: 24px; }
    .stats-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 14px; margin-bottom: 24px; }
    .stat-card { background: #fff; border-radius: 16px; padding: 18px 16px; border: 1px solid #e8edf4; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 8px rgba(0,0,0,0.03); }
    .stat-label { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
    .stat-value { font-size: 28px; font-weight: 800; line-height: 1; }
    .stat-icon { width: 42px; height: 42px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    .card { background: #fff; border-radius: 18px; border: 1px solid #e8edf4; overflow: hidden; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); }
    .card-header { padding: 18px 24px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; }
    .card-title { font-size: 15px; font-weight: 700; color: #1e293b; }
    .card-sub { font-size: 12px; color: #94a3b8; margin-top: 2px; }
    .card-body { padding: 20px 24px; }
    .tabs { display: flex; gap: 4px; background: #f1f5f9; border-radius: 12px; padding: 4px; margin-bottom: 20px; flex-wrap: wrap; }
    .tab-btn { flex: 1; padding: 10px 14px; border-radius: 9px; border: none; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; color: #64748b; background: transparent; transition: all 0.15s; white-space: nowrap; }
    .tab-btn.active { background: #fff; color: #7c3aed; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .search-bar { width: 100%; padding: 10px 14px 10px 40px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 13px; font-family: inherit; font-weight: 500; color: #1e293b; background: #f8fafc; outline: none; }
    .search-bar:focus { border-color: #7c3aed; background: #fff; }
    .filter-select { padding: 9px 12px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 13px; font-family: inherit; font-weight: 600; color: #374151; background: #f8fafc; outline: none; cursor: pointer; }
    .filter-select:focus { border-color: #7c3aed; }
    .btn-refresh { padding: 9px 18px; border-radius: 10px; border: none; background: linear-gradient(135deg, #059669, #047857); color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
    table { width: 100%; border-collapse: collapse; }
    thead th { padding: 11px 14px; text-align: left; font-size: 11px; font-weight: 800; color: #94a3b8; letter-spacing: 0.7px; text-transform: uppercase; background: #f8fafc; border-bottom: 1px solid #e8edf4; }
    tbody tr { border-bottom: 1px solid #f1f5f9; }
    tbody tr:hover { background: #faf8ff; }
    tbody td { padding: 11px 14px; font-size: 13px; color: #374151; font-weight: 500; vertical-align: middle; }
    .assign-sel { padding: 6px 10px; border-radius: 8px; border: 1.5px solid #e2e8f0; background: #f8fafc; font-size: 12px; font-weight: 600; color: #374151; cursor: pointer; font-family: inherit; outline: none; max-width: 120px; }
    .d-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
    .d-row:last-child { border-bottom: none; }
    .d-av { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, #7c3aed, #4f46e5); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: #fff; flex-shrink: 0; }
    .d-name { font-size: 13px; font-weight: 700; color: #1e293b; flex: 0 0 64px; }
    .d-bar-bg { flex: 1; height: 8px; background: #f1f5f9; border-radius: 99px; overflow: hidden; }
    .d-bar { height: 100%; border-radius: 99px; transition: width 0.5s ease; }
    .d-count { font-size: 13px; font-weight: 800; flex-shrink: 0; min-width: 30px; text-align: right; }
    .p-row { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 10px; cursor: pointer; transition: background 0.1s; border-bottom: 1px solid #f1f5f9; }
    .p-row:last-child { border-bottom: none; }
    .p-row:hover { background: #f5f3ff; }
    .p-av { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, #2563eb, #1d4ed8); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: #fff; flex-shrink: 0; }
    .sub-card { background: #fff7ed; border: 1.5px solid #fed7aa; border-radius: 16px; padding: 16px 20px; margin-bottom: 12px; cursor: pointer; transition: all 0.15s; }
    .sub-card:hover { background: #fff3e6; transform: translateX(3px); box-shadow: 0 4px 16px rgba(249,115,22,0.15); }
    .sub-card.selected { border-color: #f97316; background: #fff3e6; box-shadow: 0 0 0 3px rgba(249,115,22,0.15); }
    .leave-card { border-radius: 16px; padding: 16px 20px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; }
    .leave-card-designer { background: #fff7ed; border: 1.5px solid #fed7aa; }
    .leave-card-planner { background: #f0f9ff; border: 1.5px solid #bae6fd; }
    .leave-type-tag { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 8px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .leave-type-designer { background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; }
    .leave-type-planner { background: #eff6ff; color: '#1d4ed8'; border: 1px solid #bfdbfe; }
    .btn-approve { padding: 8px 20px; border-radius: 8px; border: none; background: linear-gradient(135deg, #059669, #047857); color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 6px; }
    .btn-approve:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-reject { padding: 8px 20px; border-radius: 8px; border: none; background: linear-gradient(135deg, #dc2626, #b91c1c); color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 6px; }
    .btn-reject:disabled { opacity: 0.6; cursor: not-allowed; }
    .log-row { display: flex; align-items: flex-start; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
    .log-row:last-child { border-bottom: none; }
    .log-icon { width: 32px; height: 32px; border-radius: 10px; background: #f0fdf4; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 300; backdrop-filter: blur(4px); }
    .modal { background: #fff; border-radius: 20px; width: 560px; max-width: 95vw; box-shadow: 0 24px 60px rgba(0,0,0,0.2); overflow: hidden; animation: slideUp 0.25s ease; }
    .modal-head { padding: 20px 24px; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #fff; }
    .modal-title { font-size: 17px; font-weight: 800; }
    .modal-sub { font-size: 12px; opacity: 0.8; margin-top: 3px; }
    .modal-body { padding: 22px 24px; }
    .modal-textarea { width: 100%; min-height: 80px; padding: 12px 14px; border: 1.5px solid #e2e8f0; border-radius: 12px; font-size: 13px; font-family: inherit; resize: vertical; outline: none; margin-top: 8px; }
    .modal-textarea:focus { border-color: #7c3aed; }
    .modal-actions { display: flex; gap: 10px; margin-top: 16px; }
    .btn-modal-approve { flex: 1; padding: 13px; border-radius: 10px; border: none; background: linear-gradient(135deg, #059669, #047857); color: #fff; font-size: 14px; font-weight: 800; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .btn-modal-approve:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-modal-reject { flex: 1; padding: 13px; border-radius: 10px; border: none; background: linear-gradient(135deg, #dc2626, #b91c1c); color: #fff; font-size: 14px; font-weight: 800; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .btn-modal-reject:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-cancel { flex: 0 0 90px; padding: 13px; border-radius: 10px; border: 1.5px solid #e2e8f0; background: #fff; color: #64748b; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; }
    .overdue-badge { display: inline-flex; padding: 2px 7px; border-radius: 5px; font-size: 10px; font-weight: 800; background: #fef2f2; color: #dc2626; margin-left: 5px; }
    .empty-state { text-align: center; padding: 48px 24px; }
    .empty-icon { font-size: 42px; margin-bottom: 12px; }
    .empty-text { font-size: 14px; color: #94a3b8; font-weight: 500; }
    .my-leave-card { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 14px 18px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    .my-leave-card.today { background: #fef9c3; border-color: #fde68a; }
    .btn-remove-leave { padding: 7px 14px; border-radius: 8px; border: 1.5px solid #fecaca; background: #fff; color: #dc2626; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 5px; }
    .btn-remove-leave:disabled { opacity: 0.5; cursor: not-allowed; }
    .leave-section-title { font-size: 12px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 12px; margin-top: 20px; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9; }
    .leave-section-title:first-child { margin-top: 0; }
    .cascade-info { background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 12px; padding: 12px 16px; margin-bottom: 20px; font-size: 12px; color: #1d4ed8; font-weight: 600; line-height: 1.6; }
    @media(max-width:900px){ .two-col{ grid-template-columns:1fr; } .stats-grid{ grid-template-columns:repeat(3,1fr); } .tabs{ flex-wrap: wrap; } }
  `

  return (
    <div className="dash">
      <style>{S}</style>

      <header className="header">
        <div className="logo">
          <div className="logo-icon">👑</div>
          <span className="logo-text">Agency Automation</span>
        </div>
        <div className="header-right">
          {isAdminOnLeaveToday && (
            <div className="on-leave-banner">🏖️ You are on leave today — leave requests auto-routed to planners</div>
          )}
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px' }}>
            📅 {today}
          </div>
          <div className="avatar">{initials}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{user?.email}</div>
          </div>
          <button className="logout-btn" onClick={logout}>Logout</button>
        </div>
      </header>

      <main className="main">
        <div className="page-title">👑 Admin Dashboard</div>
        <div className="page-sub">Today: {today} — Full visibility and control</div>

        {/* Stats */}
        <div className="stats-grid">
          {[
            { label: 'All Tasks',   value: stats.total,      icon: '📋', color: '#7c3aed', bg: '#f5f3ff' },
            { label: "Today's",     value: stats.today,      icon: '📅', color: '#2563eb', bg: '#eff6ff' },
            { label: 'Pending',     value: stats.pending,    icon: '⏳', color: '#d97706', bg: '#fffbeb' },
            { label: 'In Progress', value: stats.inProgress, icon: '⚡', color: '#6d28d9', bg: '#f5f3ff' },
            { label: 'In Review',   value: stats.submitted,  icon: '📤', color: '#c2410c', bg: '#fff7ed' },
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

        {/* Designer Workload + Planners */}
        <div className="two-col">
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">🎨 Designer Workload — Today</div>
                <div className="card-sub">Tasks assigned for {today}</div>
              </div>
            </div>
            <div className="card-body">
              {designers.map(d => {
                const count = designerTodayCount(d.name)
                const barColor = count >= 4 ? '#ef4444' : count >= 2 ? '#f59e0b' : '#22c55e'
                const pct = Math.min((count / 5) * 100, 100)
                return (
                  <div className="d-row" key={d.id}>
                    <div className="d-av">{d.name?.slice(0,2).toUpperCase()}</div>
                    <div className="d-name">{d.name}</div>
                    <div className="d-bar-bg">
                      <div className="d-bar" style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                    <div className="d-count" style={{ color: barColor }}>{count}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>
                      {count === 0 ? 'Free' : count === 1 ? 'task' : 'tasks'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">📋 Planners</div>
                <div className="card-sub">Click to see today's tasks & requirements</div>
              </div>
            </div>
            <div className="card-body">
              {planners.map(p => {
                const cnt = tasks.filter(t => t.planner_name === p.name && (t.end_date === today || t.publish_date === today)).length
                return (
                  <div className="p-row" key={p.id} onClick={() => setSelectedPlanner(p)}>
                    <div className="p-av">{p.name?.slice(0,2).toUpperCase()}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>{p.email}</div>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '3px 10px', borderRadius: 20 }}>
                        📅 {cnt} today
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {[
            { id: 'tasks',      label: `📋 Tasks (${filtered.length})` },
            { id: 'review',     label: `📤 Review${pendingSubmissions.length > 0 ? ` (${pendingSubmissions.length})` : ''}` },
            { id: 'leave',      label: `🏖️ Leave${totalLeaveCount > 0 ? ` (${totalLeaveCount})` : ''}` },
            { id: 'logs',       label: '📁 Logs' },
            { id: 'adminLeave', label: '👑 My Leave' },
          ].map(t => (
            <button key={t.id} className={`tab-btn${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TASKS TAB ── */}
        {tab === 'tasks' && (
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">📋 All Tasks</div>
                <div className="card-sub">Reassign, filter, search</div>
              </div>
              <button className="btn-refresh" onClick={loadAll}>↻ Refresh</button>
            </div>
            <div style={{ padding: '14px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14 }}>🔍</span>
                <input className="search-bar" placeholder="Search task, client, designer…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#374151', cursor: 'pointer' }}>
                <input type="checkbox" checked={showTodayOnly} onChange={e => setShowTodayOnly(e.target.checked)} />
                Today only
              </label>
              <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="All">All Status</option>
                {['Pending','Assigned','In Progress','Submitted','Completed','Rejected'].map(s => <option key={s}>{s}</option>)}
              </select>
              <select className="filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="All">All Types</option>
                {['Reel','Poster','Google Ads','Ads'].map(s => <option key={s}>{s}</option>)}
              </select>
              <select className="filter-select" value={filterPlanner} onChange={e => setFilterPlanner(e.target.value)}>
                <option value="All">All Planners</option>
                {planners.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
              <select className="filter-select" value={filterDesigner} onChange={e => setFilterDesigner(e.target.value)}>
                <option value="All">All Designers</option>
                {designers.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <Spinner size={20} color="#7c3aed" /> Loading…
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">📭</div><div className="empty-text">No tasks found</div></div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      {['Task ID','Client','Type','Requirements','Planner','Designer','Date','Status'].map(h => <th key={h}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(task => {
                      const overdue = isOverdue(task.end_date) && task.status !== 'Completed'
                      const isToday = task.end_date === today || task.publish_date === today
                      return (
                        <tr key={task.id} style={{ background: overdue ? '#fff7f7' : undefined }}>
                          <td><span style={{ fontWeight: 800, color: '#7c3aed', fontSize: 12 }}>{task.task_id || '—'}</span></td>
                          <td style={{ fontWeight: 600, color: '#1e293b' }}>{task.client_name || '—'}</td>
                          <td><Badge label={task.task_type || '—'} style={typeStyle[task.task_type]} /></td>
                          <td style={{ maxWidth: 160, fontSize: 12, color: '#64748b' }}>
                            {task.requirements ? <span title={task.requirements}>{task.requirements.slice(0, 45)}{task.requirements.length > 45 ? '…' : ''}</span> : '—'}
                          </td>
                          <td style={{ color: '#64748b', fontWeight: 600 }}>{task.planner_name || '—'}</td>
                          <td>
                            <select className="assign-sel" value={task.assigned_designer || ''}
                              onChange={e => { const d = designers.find(x => x.name === e.target.value); if (d) handleReassign(task.task_id, d.id, d.name) }}>
                              <option value="">Unassigned</option>
                              {designers.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                            </select>
                          </td>
                          <td>
                            <div style={{ color: overdue ? '#dc2626' : '#64748b', fontWeight: overdue ? 700 : 500, fontSize: 12 }}>
                              {task.end_date || task.publish_date || '—'}
                              {isToday && <span style={{ marginLeft: 4, fontSize: 10, background: '#eff6ff', color: '#2563eb', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>TODAY</span>}
                            </div>
                            {overdue && <span className="overdue-badge">⚠ Overdue</span>}
                          </td>
                          <td><Badge label={task.status || 'Pending'} style={statusStyle[task.status]} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── REVIEW TAB ── */}
        {tab === 'review' && (
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">📤 Pending Submissions</div>
                <div className="card-sub">Click a card to approve or reject</div>
              </div>
              <button className="btn-refresh" onClick={loadTasks}>↻ Refresh</button>
            </div>
            <div className="card-body">
              {pendingSubmissions.length === 0
                ? <div className="empty-state"><div className="empty-icon">✅</div><div className="empty-text">No submissions pending</div></div>
                : pendingSubmissions.map(sub => (
                  <div
                    key={sub.id}
                    className={`sub-card${reviewTask?.task_id === sub.task_id ? ' selected' : ''}`}
                    onClick={() => { setReviewTask(sub); setReviewAction(''); setReviewFeedback('') }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>
                          {sub.client_name} &nbsp;
                          <Badge label={sub.task_type} style={typeStyle[sub.task_type]} />
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                          Task: <strong>{sub.task_id}</strong> · Designer: <strong style={{ color: '#059669' }}>{sub.assigned_designer}</strong>
                          {sub.submitted_date && ` · Submitted: ${new Date(sub.submitted_date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                        </div>
                        {sub.submission_note && (
                          <div style={{ fontSize: 12, color: '#c2410c', background: '#fff7ed', padding: '6px 10px', borderRadius: 8, marginTop: 6 }}>
                            📝 "{sub.submission_note}"
                          </div>
                        )}
                        {sub.submission_file_link && (
                          <a href={sub.submission_file_link} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, color: '#7c3aed', fontWeight: 700, fontSize: 12, background: '#f5f3ff', padding: '5px 12px', borderRadius: 6, textDecoration: 'none' }}>
                            📎 View File
                          </a>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#c2410c', fontWeight: 700, background: '#fff7ed', padding: '6px 12px', borderRadius: 8, flexShrink: 0 }}>
                        Click to review →
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── LEAVE TAB ── */}
        {tab === 'leave' && (
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">🏖️ Leave Requests ({totalLeaveCount})</div>
                <div className="card-sub">Designer and planner leave requests</div>
              </div>
              <button className="btn-refresh" onClick={loadLeaveRequests}>↻ Refresh</button>
            </div>
            <div className="card-body">

              {/* Cascade info box */}
              <div className="cascade-info">
                ℹ️ <strong>Leave Cascade Logic:</strong> Designer leave → Admin approves.
                If Admin is on leave → routes to the task's Planner.
                If that Planner is also on leave → routes to another available Planner.
                When you mark your own leave below, future designer leave requests will automatically route to the correct planner.
              </div>

              {totalLeaveCount === 0 ? (
                <div className="empty-state"><div className="empty-icon">✅</div><div className="empty-text">No pending leave requests</div></div>
              ) : (
                <>
                  {/* Designer Leave Requests */}
                  {designerLeaveRequests.length > 0 && (
                    <>
                      <div className="leave-section-title">🎨 Designer Leave Requests ({designerLeaveRequests.length})</div>
                      {designerLeaveRequests.map(req => (
                        <div className="leave-card leave-card-designer" key={req.id}>
                          <div style={{ flex: 1, minWidth: 240 }}>
                            <div className="leave-type-tag leave-type-designer">🎨 Designer</div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>{req.designer_name}</div>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                              📅 <strong>{req.leave_date}</strong>
                            </div>
                            {req.reason && (
                              <div style={{ fontSize: 12, color: '#c2410c', marginTop: 6, background: '#fff', padding: '6px 10px', borderRadius: 8, border: '1px solid #fed7aa' }}>
                                💬 {req.reason}
                              </div>
                            )}
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                              Requested: {new Date(req.requested_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                            <button className="btn-approve" onClick={() => handleLeaveAction(req.id, 'approve')}
                              disabled={processingLeave === req.id}>
                              {processingLeave === req.id ? <Spinner size={12}/> : '✅'} Approve
                            </button>
                            <button className="btn-reject" onClick={() => handleLeaveAction(req.id, 'reject')}
                              disabled={processingLeave === req.id}>
                              {processingLeave === req.id ? <Spinner size={12}/> : '❌'} Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Planner Leave Requests */}
                  {plannerLeaveRequests.length > 0 && (
                    <>
                      <div className="leave-section-title">📋 Planner Leave Requests ({plannerLeaveRequests.length})</div>
                      {plannerLeaveRequests.map(req => (
                        <div className="leave-card leave-card-planner" key={req.id}>
                          <div style={{ flex: 1, minWidth: 240 }}>
                            <div className="leave-type-tag leave-type-planner">📋 Planner</div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>{req.designer_name}</div>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                              📅 <strong>{req.leave_date}</strong>
                            </div>
                            {req.reason && (
                              <div style={{ fontSize: 12, color: '#1d4ed8', marginTop: 6, background: '#fff', padding: '6px 10px', borderRadius: 8, border: '1px solid #bfdbfe' }}>
                                💬 {req.reason}
                              </div>
                            )}
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                              Requested: {new Date(req.requested_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                            <button className="btn-approve" onClick={() => handleLeaveAction(req.id, 'approve')}
                              disabled={processingLeave === req.id}>
                              {processingLeave === req.id ? <Spinner size={12}/> : '✅'} Approve
                            </button>
                            <button className="btn-reject" onClick={() => handleLeaveAction(req.id, 'reject')}
                              disabled={processingLeave === req.id}>
                              {processingLeave === req.id ? <Spinner size={12}/> : '❌'} Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── LOGS TAB ── */}
        {tab === 'logs' && (
          <div className="card">
            <div className="card-header">
              <div><div className="card-title">📁 Upload Logs</div><div className="card-sub">CSV upload history</div></div>
              <button className="btn-refresh" onClick={loadUploadLogs}>↻ Refresh</button>
            </div>
            <div className="card-body">
              {uploadLogs.length === 0
                ? <div className="empty-state"><div className="empty-icon">📭</div><div className="empty-text">No upload logs yet</div></div>
                : uploadLogs.map((log, i) => (
                  <div className="log-row" key={i}>
                    <div className="log-icon">{log.status === 'success' ? '✅' : '❌'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{log.file_name || 'Unknown file'}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                        By <span style={{ fontWeight: 700, color: '#7c3aed' }}>{log.uploaded_by || '—'}</span>
                        {log.rows_synced != null && <> · <span style={{ color: '#059669', fontWeight: 700 }}>{log.rows_synced} tasks assigned</span></>}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>
                      {log.created_at ? new Date(log.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── ADMIN LEAVE TAB ── */}
        {tab === 'adminLeave' && (
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">👑 My Leave Days</div>
                <div className="card-sub">
                  When you mark a leave day, designer leave requests for that date are automatically routed to the task's planner
                </div>
              </div>
            </div>
            <div className="card-body">

              <div className="cascade-info" style={{ marginBottom: 20 }}>
                ℹ️ <strong>How cascade works when you're on leave:</strong><br/>
                Designer's leave request → routed to <strong>the planner who uploaded that designer's tasks</strong> (e.g., Karthik).<br/>
                If that planner is also on leave → routed to <strong>another available planner</strong> (e.g., Preethi).
              </div>

              {/* Mark leave form */}
              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: 20, marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 14 }}>➕ Mark a Leave Day</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: '0 0 200px' }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>DATE *</label>
                    <input
                      type="date"
                      className="search-bar"
                      style={{ paddingLeft: 14 }}
                      value={adminLeaveDate}
                      min={today}
                      onChange={e => setAdminLeaveDate(e.target.value)}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>NOTE (optional)</label>
                    <input
                      type="text"
                      className="search-bar"
                      style={{ paddingLeft: 14 }}
                      placeholder="e.g. Personal work, Travel..."
                      value={adminLeaveMsg}
                      onChange={e => setAdminLeaveMsg(e.target.value)}
                    />
                  </div>
                  <button
                    className="btn-approve"
                    style={{ height: 40, padding: '0 20px', flexShrink: 0 }}
                    disabled={savingLeave || !adminLeaveDate}
                    onClick={handleMarkAdminLeave}
                  >
                    {savingLeave ? <><Spinner size={12}/> Saving…</> : '➕ Mark Leave'}
                  </button>
                </div>
              </div>

              {/* Leave list */}
              <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 14 }}>
                📅 Marked Leave Days ({adminLeaves.length})
              </div>

              {adminLeaves.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <div className="empty-text">No leave days marked yet</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
                    Mark leave days above so the system can auto-route requests when you're away
                  </div>
                </div>
              ) : (
                adminLeaves.map((l, i) => (
                  <div key={i} className={`my-leave-card${l.date === today ? ' today' : ''}`}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>📅 {l.date}</span>
                        {l.date === today && (
                          <span style={{ fontSize: 10, fontWeight: 800, background: '#f59e0b', color: '#fff', padding: '2px 8px', borderRadius: 6 }}>
                            TODAY
                          </span>
                        )}
                        {l.date > today && (
                          <span style={{ fontSize: 10, fontWeight: 700, background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 6 }}>
                            UPCOMING
                          </span>
                        )}
                        {l.date < today && (
                          <span style={{ fontSize: 10, fontWeight: 700, background: '#f1f5f9', color: '#94a3b8', padding: '2px 8px', borderRadius: 6 }}>
                            PAST
                          </span>
                        )}
                      </div>
                      {l.message && (
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>💬 {l.message}</div>
                      )}
                    </div>
                    <button
                      className="btn-remove-leave"
                      disabled={removingLeave === l.date}
                      onClick={() => handleRemoveAdminLeave(l.date)}
                    >
                      {removingLeave === l.date ? <Spinner size={12} color="#dc2626"/> : '✕'} Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── REVIEW MODAL ── */}
      {reviewTask && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !reviewing && setReviewTask(null)}>
          <div className="modal">
            <div className="modal-head">
              <div className="modal-title">📋 Review Submission</div>
              <div className="modal-sub">{reviewTask.task_id} — {reviewTask.client_name} ({reviewTask.task_type})</div>
            </div>
            <div className="modal-body">
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <div><span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>DESIGNER</span><div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginTop: 3 }}>{reviewTask.assigned_designer}</div></div>
                  <div><span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>TYPE</span><div style={{ marginTop: 3 }}><Badge label={reviewTask.task_type} style={typeStyle[reviewTask.task_type]} /></div></div>
                  <div><span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>DEADLINE</span><div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginTop: 3 }}>{reviewTask.end_date}</div></div>
                </div>
                {reviewTask.requirements && (
                  <div style={{ marginTop: 12, fontSize: 12, color: '#1d4ed8', background: '#eff6ff', padding: '8px 12px', borderRadius: 8, fontWeight: 600 }}>
                    📋 Requirements: {reviewTask.requirements}
                  </div>
                )}
                {reviewTask.submission_note && (
                  <div style={{ marginTop: 10, fontSize: 12, color: '#c2410c', background: '#fff7ed', padding: '8px 12px', borderRadius: 8 }}>
                    📝 Designer note: "{reviewTask.submission_note}"
                  </div>
                )}
                {reviewTask.submission_file_link && (
                  <div style={{ marginTop: 10 }}>
                    <a href={reviewTask.submission_file_link} target="_blank" rel="noopener noreferrer"
                      style={{ color: '#7c3aed', fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      📎 View Submitted File →
                    </a>
                  </div>
                )}
              </div>

              {reviewAction === 'reject' && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>FEEDBACK FOR DESIGNER *</label>
                  <textarea className="modal-textarea" placeholder="What needs to be changed or fixed?" rows={3}
                    value={reviewFeedback} onChange={e => setReviewFeedback(e.target.value)} />
                </div>
              )}

              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setReviewTask(null)} disabled={reviewing}>Cancel</button>
                <button className="btn-modal-reject"
                  onClick={() => reviewAction === 'reject' ? handleReview() : setReviewAction('reject')}
                  disabled={reviewing || (reviewAction === 'reject' && !reviewFeedback)}>
                  {reviewing && reviewAction === 'reject' ? <><Spinner size={14}/> Rejecting…</> : '❌ Reject'}
                </button>
                <button className="btn-modal-approve"
                  onClick={() => { setReviewAction('approve'); setTimeout(handleReview, 50) }}
                  disabled={reviewing || reviewAction === 'reject'}>
                  {reviewing && reviewAction === 'approve' ? <><Spinner size={14}/> Approving…</> : '✅ Approve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PLANNER TASKS MODAL ── */}
      {selectedPlanner && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelectedPlanner(null)}>
          <div className="modal" style={{ maxWidth: 700, width: '95vw', maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="modal-head">
              <div className="modal-title">📋 {selectedPlanner.name}'s Tasks — Today</div>
              <div className="modal-sub">{today} · {plannerTasks.length} tasks</div>
            </div>
            <div className="modal-body">
              {plannerTasks.length === 0
                ? <div className="empty-state"><div className="empty-icon">📭</div><div className="empty-text">No tasks today for {selectedPlanner.name}</div></div>
                : <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          {['Task ID','Client','Type','Requirements','Designer','Status'].map(h => <th key={h}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {plannerTasks.map(task => (
                          <tr key={task.id}>
                            <td><span style={{ fontWeight: 800, color: '#7c3aed', fontSize: 12 }}>{task.task_id}</span></td>
                            <td style={{ fontWeight: 600, color: '#1e293b' }}>{task.client_name}</td>
                            <td><Badge label={task.task_type} style={typeStyle[task.task_type]} /></td>
                            <td style={{ maxWidth: 180, fontSize: 12, color: '#64748b' }}>
                              {task.requirements ? <span title={task.requirements}>{task.requirements.slice(0,55)}{task.requirements.length>55?'…':''}</span> : '—'}
                            </td>
                            <td style={{ fontWeight: 700 }}>{task.assigned_designer || '—'}</td>
                            <td><Badge label={task.status} style={statusStyle[task.status]} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>}
              <div style={{ marginTop: 16, textAlign: 'right' }}>
                <button onClick={() => setSelectedPlanner(null)} className="btn-cancel" style={{ flex: 'none' }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}