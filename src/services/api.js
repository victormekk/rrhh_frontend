import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    if (status === 401) {
      // El aviso se guarda para que la pantalla de login lo muestre tras la redirección.
      const aviso = error.response?.data?.codigo === 'cuenta_deshabilitada'
        ? error.response.data.message
        : localStorage.getItem('token') ? 'Su sesión expiró. Inicie sesión nuevamente.' : ''
      if (aviso) sessionStorage.setItem('avisoLogin', aviso)
      localStorage.removeItem('token')
      if (window.location.pathname !== '/login') window.location.href = '/login'
    }
    if (status >= 500) {
      error.friendlyMessage = 'Error interno del servidor. Intente más tarde.'
    }
    return Promise.reject(error)
  },
)

export default api
