import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, mensagemDeErro } from '../api/client';
import { Usuario } from '../types';

interface AuthContextData {
  usuario: Usuario | null;
  token: string | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<void>;
  registro: (data: { nome: string; email: string; celular: string; senha: string }) => Promise<void>;
  logout: () => Promise<void>;
  atualizarPerfil: (dados: Partial<Usuario>) => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarSessao();
  }, []);

  async function carregarSessao() {
    try {
      const tokenSalvo = await AsyncStorage.getItem('@barberapp:token');
      if (!tokenSalvo) return; // sem token: vai direto para login

      setToken(tokenSalvo);

      // Busca perfil com timeout curto — se falhar, mantém o token e tenta
      // carregar o perfil na próxima navegação (não bloqueia o app)
      try {
        const { data } = await authApi.me();
        setUsuario(data);
      } catch {
        // Rede indisponível: mantém token, usuário ficará null
        // O app abre normalmente; próxima requisição autenticada pedirá login
      }
    } catch {
      await AsyncStorage.removeItem('@barberapp:token');
      setToken(null);
    } finally {
      setCarregando(false);
    }
  }

  async function login(email: string, senha: string) {
    const { data } = await authApi.login(email, senha);
    await AsyncStorage.setItem('@barberapp:token', data.access_token);
    setToken(data.access_token);

    try {
      const perfil = await authApi.me();
      setUsuario(perfil.data);
    } catch {
      // perfil carregará depois
    }
  }

  async function registro(dados: { nome: string; email: string; celular: string; senha: string }) {
    const { data } = await authApi.registro(dados);
    await AsyncStorage.setItem('@barberapp:token', data.access_token);
    setToken(data.access_token);

    try {
      const perfil = await authApi.me();
      setUsuario(perfil.data);
    } catch {
      // perfil carregará depois
    }
  }

  async function logout() {
    await AsyncStorage.removeItem('@barberapp:token');
    setToken(null);
    setUsuario(null);
  }

  function atualizarPerfil(dados: Partial<Usuario>) {
    setUsuario(prev => prev ? { ...prev, ...dados } : prev);
  }

  return (
    <AuthContext.Provider value={{ usuario, token, carregando, login, registro, logout, atualizarPerfil }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
