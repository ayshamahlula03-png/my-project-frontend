import axios from 'axios'

const API_URL = 'http://localhost:5000'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ============================================
// AUTH API
// ============================================

export const login = async (email, password) => {
  console.log('🔵 API login called with:', { email, password })
  
  try {
    const response = await api.post('/api/login', { 
      email: email,
      password: password
    })
    
    console.log('🟢 API response:', response.data)
    return response.data
  } catch (error) {
    console.log('❌ API error:', error.response?.data || error.message)
    return { 
      success: false, 
      error: error.response?.data?.error || 'Login failed' 
    }
  }
}

// ============================================
// PLANNER API
// ============================================

export const getPlannerTasks = async () => {
  const response = await api.get('/api/planner/tasks')
  return response.data
}

export const uploadCSV = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post('/api/planner/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response.data
}

// ============================================
// DESIGNER API
// ============================================

export const getDesignerTasks = async () => {
  const response = await api.get('/api/designer/tasks')
  return response.data
}

export const updateTaskStatus = async (taskId, status, reason = '') => {
  const response = await api.put('/api/designer/task', { taskId, status, reason })
  return response.data
}

// ============================================
// ADMIN API
// ============================================

export const getAllTasks = async () => {
  const response = await api.get('/api/admin/tasks')
  return response.data
}

export const getAllDesigners = async () => {
  const response = await api.get('/api/admin/designers')
  return response.data
}

export const getAllPlanners = async () => {
  const response = await api.get('/api/admin/planners')
  return response.data
}

export const triggerAutomation = async () => {
  const response = await api.post('/api/admin/run-automation')
  return response.data
}

export const reassignTask = async (taskId, designerId, designerName) => {
  const response = await api.post('/api/admin/reassign', { taskId, designerId, designerName })
  return response.data
}

// ============================================
// DRIVE API
// ============================================

// List folders (root or inside a parent folder)
export const listDriveFolders = async (parentId = null) => {
  const params = parentId ? `?parentId=${parentId}` : ''
  const response = await api.get(`/api/drive/folders${params}`)
  return response.data
}

// List files inside a folder
export const listDriveFiles = async (folderId) => {
  const response = await api.get(`/api/drive/files?folderId=${folderId}`)
  return response.data
}

// Upload file to specific Drive folder + auto-run automation
export const uploadFileToDrive = async (file, folderId) => {
  const formData = new FormData()
  formData.append('file', file)
  if (folderId) {
    formData.append('folderId', folderId)
  }
  const response = await api.post('/api/drive/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response.data
}

// Create new folder in Drive
export const createDriveFolder = async (folderName, parentId = null) => {
  const response = await api.post('/api/drive/create-folder', { folderName, parentId })
  return response.data
}

// Get file view link
export const getFileViewLink = async (fileId) => {
  const response = await api.get(`/api/drive/file/${fileId}`)
  return response.data
}

// ============================================
// LEAVE MANAGEMENT API
// ============================================

// Designer: Record login ping
export const recordLoginPing = async () => {
  const response = await api.post('/api/designer/login-ping')
  return response.data
}

// Designer: Get leave status
export const getLeaveStatus = async () => {
  const response = await api.get('/api/designer/leave-status')
  return response.data
}

// Designer: Request leave
export const requestLeave = async (leaveDate, reason = '') => {
  const response = await api.post('/api/designer/leave', { leaveDate, reason })
  return response.data
}

// Designer: Get notifications
export const getDesignerNotifications = async () => {
  const response = await api.get('/api/designer/notifications')
  return response.data
}

// Planner: Get notifications
export const getPlannerNotifications = async () => {
  const response = await api.get('/api/planner/notifications')
  return response.data
}

// ============================================
// SUBMISSION MANAGEMENT API
// ============================================

// Designer: Submit task with file
export const submitTaskWithFile = async (taskId, file, note = '') => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('taskId', taskId)
  formData.append('note', note)
  
  const response = await api.post('/api/designer/submit-task', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response.data
}

// Manager: Get pending submissions
export const getPendingSubmissions = async () => {
  const response = await api.get('/api/manager/pending-submissions')
  return response.data
}

// Manager: Review submission (approve/reject)
export const reviewSubmission = async (taskId, action, feedback = '') => {
  const response = await api.post('/api/manager/review-submission', { taskId, action, feedback })
  return response.data
}

// ============================================
// ADMIN LEAVE MANAGEMENT API
// ============================================

// Admin: Get pending leave requests
export const getPendingLeaveRequests = async () => {
  const response = await api.get('/api/admin/leave-requests')
  return response.data
}

// Admin: Handle leave request (approve/reject)
export const handleLeaveRequest = async (requestId, action) => {
  const response = await api.post('/api/admin/handle-leave', { requestId, action })
  return response.data
}

// ============================================
// UPLOAD LOGS API
// ============================================

// Admin: Get upload logs
export const getUploadLogs = async () => {
  const response = await api.get('/api/admin/upload-logs')
  return response.data
}

export default api