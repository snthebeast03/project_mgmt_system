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

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    const res = await fetch('/api/projects', { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      setProjects(data.projects)
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

  return (
    <div>
      <nav style={styles.nav}>
        <div style={styles.navLeft}>
          <strong>Project Mgmt System</strong>
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

      <div style={styles.content}>
        {message && <div style={styles.success}>{message}</div>}

        <h2>Your Projects</h2>
        {projects.length > 0 ? (
          <div style={styles.grid}>
            {projects.map(project => (
              <div key={project.id} style={styles.cardProject}>
                <h3>{project.name}</h3>
                <p>{project.description || 'No description'}</p>
                <p style={styles.meta}>Created: {project.created_at?.slice(0, 10)}</p>
                <button onClick={() => deleteProject(project.id)} style={styles.btnDanger}>Delete</button>
              </div>
            ))}
          </div>
        ) : (
          <p style={styles.empty}>You don't have any projects yet. Click "+ New Project" in the navbar to create one!</p>
        )}
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
  btnNav: { marginLeft: '1rem', padding: '0.4rem 0.8rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' },
  btnLogout: { background: 'transparent', color: 'white', border: '1px solid white', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer' },
  error: { color: '#dc3545', fontSize: '0.9rem', textAlign: 'center', marginBottom: '1rem' },
  success: { background: '#d4edda', color: '#155724', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', textAlign: 'center' },
  link: { textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem' },
  nav: { background: '#333', color: 'white', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 },
  navLeft: { display: 'flex', alignItems: 'center' },
  navRight: { display: 'flex', alignItems: 'center', gap: '1rem' },
  username: { marginRight: '0.5rem' },
  content: { padding: '2rem', maxWidth: '800px', margin: '0 auto' },
  createModal: { position: 'fixed', top: '60px', right: '1rem', zIndex: 1000 },
  createForm: { background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', width: '300px' },
  createFormHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  closeBtn: { background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#666', lineHeight: 1 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' },
  cardProject: { background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  meta: { fontSize: '0.8rem', color: '#999', marginBottom: '1rem' },
  empty: { textAlign: 'center', padding: '3rem', color: '#666' }
}