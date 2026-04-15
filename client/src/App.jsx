import { useState, useEffect, createContext, useContext } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'

const AuthContext = createContext(null)

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/me', { credentials: 'include' })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (username, password) => {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error)
    }
    const data = await res.json()
    setUser(data.user)
  }

  const register = async (username, email, password) => {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, email, password })
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error)
    }
    const data = await res.json()
    setUser(data.user)
  }

  const logout = async () => {
    await fetch('/api/logout', {
      method: 'POST',
      credentials: 'include'
    })
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

function useAuth() {
  return useContext(AuthContext)
}

function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await login(username, password)
      navigate('/home')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>Login</h2>
        {error && <p style={styles.error}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Username</label>
            <input style={styles.input} type="text" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <input style={styles.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" style={styles.btnPrimary}>Login</button>
        </form>
        <p style={styles.link}>Don't have an account? <a href="/register">Register</a></p>
      </div>
    </div>
  )
}

function Register() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await register(username, email, password)
      navigate('/home')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>Register</h2>
        {error && <p style={styles.error}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Username</label>
            <input style={styles.input} type="text" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input style={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <input style={styles.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" style={styles.btnSuccess}>Register</button>
        </form>
        <p style={styles.link}>Already have an account? <a href="/login">Login</a></p>
      </div>
    </div>
  )
}

function Home() {
  const { user, logout } = useAuth()
  const [projects, setProjects] = useState([])
  const [newProject, setNewProject] = useState({ name: '', description: '' })
  const [message, setMessage] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [allUsers, setAllUsers] = useState([])
  const [projectMembers, setProjectMembers] = useState({})
  const [projectCreator, setProjectCreator] = useState({})
  const [showMembersModal, setShowMembersModal] = useState(null)
  const [newMember, setNewMember] = useState({ username: '', role: 'member' })

  useEffect(() => {
    loadProjects()
    loadUsers()
  }, [])

  const loadProjects = async () => {
    const res = await fetch('/api/projects', { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      setProjects(data.projects)
    }
  }

  const loadUsers = async () => {
    const res = await fetch('/api/users', { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      setAllUsers(data.users)
    }
  }

  const loadProjectMembers = async (projectId) => {
    const res = await fetch(`/api/projects/${projectId}/members`, { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      setProjectMembers(prev => ({ ...prev, [projectId]: data.members }))
      setProjectCreator(prev => ({ ...prev, [projectId]: data.creator }))
    }
  }

  const createProject = async (e) => {
    e.preventDefault()
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(newProject)
    })
    if (res.ok) {
      setMessage('Project created!')
      setNewProject({ name: '', description: '' })
      setShowCreateForm(false)
      loadProjects()
      setTimeout(() => setMessage(''), 5000)
    }
  }

  const deleteProject = async (id) => {
    if (!confirm('Delete this project?')) return
    const res = await fetch(`/api/projects/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    if (res.ok) {
      setMessage('Project deleted')
      loadProjects()
      setTimeout(() => setMessage(''), 5000)
    }
  }

  const openMembersModal = async (projectId) => {
    await loadProjectMembers(projectId)
    setShowMembersModal(projectId)
  }

  const addMember = async (projectId) => {
    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(newMember)
    })
    if (res.ok) {
      setMessage('Member added!')
      loadProjectMembers(projectId)
      loadProjects()
      setNewMember({ username: '', role: 'member' })
      setTimeout(() => setMessage(''), 5000)
    } else {
      const data = await res.json()
      setMessage(data.error)
      setTimeout(() => setMessage(''), 5000)
    }
  }

  const removeMember = async (projectId, memberId) => {
    const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    if (res.ok) {
      setMessage('Member removed')
      loadProjectMembers(projectId)
      loadProjects()
      setTimeout(() => setMessage(''), 5000)
    }
  }

  return (
    <div>
      <nav style={styles.nav}>
        <div style={styles.navLeft}>
          <strong>Project Management System</strong>
          <button onClick={() => setShowCreateForm(!showCreateForm)} style={styles.btnNav}>
            + New Project
          </button>
        </div>
        <div style={styles.navRight}>
          <span style={styles.username}>{user?.username}</span>
          <button onClick={logout} style={styles.btnLogout}>Logout</button>
        </div>
      </nav>

      {showCreateForm && (
        <div style={styles.createModal}>
          <div style={styles.createForm}>
            <div style={styles.createFormHeader}>
              <h3>Create New Project</h3>
              <button onClick={() => setShowCreateForm(false)} style={styles.closeBtn}>&times;</button>
            </div>
            <form onSubmit={createProject}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Project Name</label>
                <input style={styles.input} type="text" value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })} required />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Description (optional)</label>
                <textarea style={styles.textarea} value={newProject.description} onChange={e => setNewProject({ ...newProject, description: e.target.value })} rows={3} />
              </div>
              <button type="submit" style={styles.btnPrimary}>Create Project</button>
            </form>
          </div>
        </div>
      )}

      {showMembersModal && (
        <div style={styles.createModal}>
          <div style={styles.createForm}>
            <div style={styles.createFormHeader}>
              <h3>Members: {projects.find(p => p.id === showMembersModal)?.name || 'Project'}</h3>
              <button onClick={() => setShowMembersModal(null)} style={styles.closeBtn}>&times;</button>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Add Member</label>
              <div style={styles.addMemberRow}>
                <select style={styles.select} value={newMember.username} onChange={e => setNewMember({ ...newMember, username: e.target.value })}>
                  <option value="">Select user...</option>
                  {allUsers.filter(u => {
                    const currentMembers = projectMembers[showMembersModal] || []
                    return u.username !== user?.username &&
                           u.username !== projectCreator[showMembersModal]?.username &&
                           !currentMembers.some(m => m.username === u.username)
                  }).map(u => (
                    <option key={u.id} value={u.username}>{u.username}</option>
                  ))}
                </select>
                <button onClick={() => addMember(showMembersModal)} style={styles.btnSmall}>Add</button>
              </div>
            </div>
            <div style={styles.membersList}>
              {projectCreator[showMembersModal] && (
                <div key="creator" style={styles.memberItem}>
                  <span>{projectCreator[showMembersModal].username} (owner)</span>
                </div>
              )}
              {(projectMembers[showMembersModal] || []).map(member => (
                <div key={member.id} style={styles.memberItem}>
                  <span>{member.username} ({member.role})</span>
                  <button onClick={() => removeMember(showMembersModal, member.id)} style={styles.btnDangerSmall}>&times;</button>
                </div>
              ))}
              {(projectMembers[showMembersModal] || []).length === 0 && !projectCreator[showMembersModal] && (
                <p style={styles.empty}>No members yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={styles.content}>
        {message && <div style={styles.success}>{message}</div>}

        <div style={styles.threeColumn}>
          <div style={styles.sideBox}></div>

          <div style={styles.mainColumn}>
            <h2>Your Projects</h2>
            {projects.length > 0 ? (
              <div style={styles.grid}>
                {projects.map(project => (
                  <div key={project.id} style={styles.cardProject}>
                    <h3>{project.name}</h3>
                    <p>{project.description || 'No description'}</p>
                    <p style={styles.meta}>Created: {project.created_at ? new Date(project.created_at).toLocaleString() : 'N/A'}</p>
                    <p style={styles.meta}>Members: {project.member_count || 0}</p>
                    <div style={styles.projectButtons}>
                      <button onClick={() => openMembersModal(project.id)} style={styles.btnSecondary}>Members</button>
                      {project.created_by === user?.id && (
                        <button onClick={() => deleteProject(project.id)} style={styles.btnDanger}>Delete</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={styles.empty}>You don't have any projects yet. Click "+ New Project" in the navbar to create one!</p>
            )}
          </div>

          <div style={styles.sideBox}></div>
        </div>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <div>Loading...</div>
  if (!user) return <Navigate to="/login" />

  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/home" />} />
      </Routes>
    </AuthProvider>
  )
}

const styles = {
  container: { fontFamily: 'sans-serif', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f4f7f6', margin: 0 },
  card: { background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '300px' },
  formGroup: { marginBottom: '1rem' },
  label: { display: 'block', marginBottom: '0.5rem', color: '#666', fontWeight: 'normal' },
  input: { width: '100%', padding: '0.5rem', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' },
  textarea: { width: '100%', padding: '0.5rem', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem', fontFamily: 'inherit' },
  btnPrimary: { width: '100%', padding: '0.75rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' },
  btnSuccess: { width: '100%', padding: '0.75rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' },
  btnDanger: { padding: '0.5rem 1rem', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' },
  btnSecondary: { padding: '0.5rem 1rem', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', marginRight: '0.5rem' },
  btnSmall: { padding: '0.4rem 0.8rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' },
  btnDangerSmall: { padding: '0.2rem 0.5rem', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' },
  projectButtons: { display: 'flex', marginTop: '0.5rem' },
  btnNav: { marginLeft: '1rem', padding: '0.4rem 0.8rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' },
  btnLogout: { background: 'transparent', color: 'white', border: '1px solid white', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer' },
  error: { color: '#dc3545', fontSize: '0.9rem', textAlign: 'center', marginBottom: '1rem' },
  success: { background: '#d4edda', color: '#155724', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', textAlign: 'center' },
  link: { textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem' },
  nav: { background: '#333', color: 'white', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 },
  navLeft: { display: 'flex', alignItems: 'center' },
  navRight: { display: 'flex', alignItems: 'center', gap: '1rem' },
  username: { marginRight: '0.5rem' },
  content: { padding: '2rem', width: '100%', boxSizing: 'border-box' },
  createModal: { position: 'fixed', top: '60px', right: '1rem', zIndex: 1000 },
  createForm: { background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', width: '300px' },
  createFormHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  closeBtn: { background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#666', lineHeight: 1 },
  threeColumn: { display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '1rem' },
  sideBox: { background: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', minHeight: '400px' },
  select: { padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.9rem', flex: 1 },
  addMemberRow: { display: 'flex', gap: '0.5rem' },
  membersList: { marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem' },
  memberItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f0f0f0' },
  mainColumn: { minWidth: 0 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' },
  cardProject: { background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  meta: { fontSize: '0.8rem', color: '#999', marginBottom: '1rem' },
  empty: { textAlign: 'center', padding: '3rem', color: '#666' }
}