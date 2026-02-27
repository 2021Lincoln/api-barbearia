import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Usuario } from '../types'
import { adminApi, masterApi } from '../api/client'

type UserType = 'admin' | 'super_admin'

interface AuthContextData {
  usuario: Usuario | null
  userType: UserType | null
  loading: boolean
  login: (email: string, senha: string) => Promise<UserType>
  logout: () => void
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [userType, setUserType] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    const storedType = localStorage.getItem('admin_user_type') as UserType | null
    if (token && storedType) {
      const meApi = storedType === 'super_admin' ? masterApi.me : adminApi.me
      meApi()
        .then((res) => {
          setUsuario(res.data)
          setUserType(storedType)
        })
        .catch(() => {
          localStorage.removeItem('admin_token')
          localStorage.removeItem('admin_user_type')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  async function login(email: string, senha: string): Promise<UserType> {
    // Tenta login como admin; se 403, tenta como super_admin
    try {
      const res = await adminApi.login(email, senha)
      localStorage.setItem('admin_token', res.data.access_token)
      localStorage.setItem('admin_user_type', 'admin')
      const me = await adminApi.me()
      setUsuario(me.data)
      setUserType('admin')
      return 'admin'
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 403 || status === 401) {
        // Tenta como super_admin
        const res = await masterApi.login(email, senha)
        localStorage.setItem('admin_token', res.data.access_token)
        localStorage.setItem('admin_user_type', 'super_admin')
        const me = await masterApi.me()
        setUsuario(me.data)
        setUserType('super_admin')
        return 'super_admin'
      }
      throw err
    }
  }

  function logout() {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user_type')
    setUsuario(null)
    setUserType(null)
  }

  return (
    <AuthContext.Provider value={{ usuario, userType, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
