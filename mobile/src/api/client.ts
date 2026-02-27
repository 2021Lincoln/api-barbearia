import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// ─── URL dinâmica: funciona em emulador E celular físico ──────────────────────
function getBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;
  if (__DEV__) {
    // Expo Go injeta o IP do servidor de desenvolvimento em Constants.expoConfig.hostUri
    // Exemplo: "192.168.1.100:8081" → host = "192.168.1.100"
    const hostUri = Constants.expoConfig?.hostUri ?? '';
    const host = hostUri.split(':')[0];

    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      // Celular físico ou emulador via WiFi → usa o IP real da máquina
      return `http://${host}:8000`;
    }

    // Emulador Android: 10.0.2.2 é o alias para o localhost da máquina host
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:8000';
    }

    // Simulador iOS: localhost funciona diretamente
    return 'http://192.168.1.167:8000';
  }
  return 'https://sua-api-producao.com'; 
}

export const BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 12000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Interceptor de request: injeta token JWT automaticamente ─────────────────
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('@barberapp:token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Interceptor de response: trata erros globalmente ────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expirado — limpa sessão
      await AsyncStorage.removeItem('@barberapp:token');
    }
    return Promise.reject(error);
  }
);

// ─── Helpers de mensagem de erro legível ─────────────────────────────────────
export function mensagemDeErro(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return 'Servidor demorou para responder. Verifique se o backend está rodando.';
    }
    if (!error.response) {
      return `Sem conexão com o servidor (${BASE_URL}). Verifique se o backend está rodando e na mesma rede.`;
    }
    const detail = (error.response.data as any)?.detail;
    if (detail) return typeof detail === 'string' ? detail : JSON.stringify(detail);
    if (error.response.status === 401) return 'Sessão expirada. Faça login novamente.';
    if (error.response.status === 404) return 'Recurso não encontrado.';
    if (error.response.status === 409) return 'Horário já está ocupado. Escolha outro.';
    if (error.response.status >= 500) return 'Erro interno no servidor. Tente novamente.';
  }
  return 'Algo deu errado. Tente novamente.';
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, senha: string) =>
    api.post<{ access_token: string }>('/auth/login', { email, senha }),

  registro: (data: { nome: string; email: string; celular: string; senha: string }) =>
    api.post<{ access_token: string }>('/auth/registro', data),

  me: () => api.get('/auth/me'),
};

// ─── Barbearias ───────────────────────────────────────────────────────────────
export const barbeariasApi = {
  listar: (lat?: number, lng?: number, raio_km?: number) =>
    api.get('/barbearias/', { params: { lat, lng, raio_km } }),

  obter: (id: number) => api.get(`/barbearias/${id}`),
};

// ─── Agendamentos ─────────────────────────────────────────────────────────────
export const agendamentosApi = {
  horariosDisponiveis: (
    barbearia_id: number,
    barbeiro_id: number,
    data: string,
    duracao_minutos?: number
  ) =>
    api.get('/agendamentos/horarios-disponiveis', {
      params: { barbearia_id, barbeiro_id, data, duracao_minutos },
    }),

  criar: (data: {
    data: string;
    hora: string;
    barbearia_id: number;
    barbeiro_id: number;
    servico_id?: number;
    servico_ids?: number[];
    observacao?: string;
  }) => api.post('/agendamentos/', data),

  meus: () => api.get('/agendamentos/meus'),

  cancelar: (id: number) =>
    api.patch(`/agendamentos/${id}/status`, { status: 'cancelado' }),

  reagendar: (id: number, nova_data: string, nova_hora: string) =>
    api.patch(`/agendamentos/${id}/reagendar`, { nova_data, nova_hora }),
};

export default api;
