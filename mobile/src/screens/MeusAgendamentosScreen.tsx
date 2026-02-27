import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Agendamento } from '../types';
import { agendamentosApi, mensagemDeErro } from '../api/client';
import AgendamentoCard from '../components/AgendamentoCard';
import { Toast } from '../components/Toast';
import { AgendamentosStackParamList } from '../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<AgendamentosStackParamList, 'AgendamentosList'>;
};

export default function MeusAgendamentosScreen({ navigation }: Props) {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [toast, setToast] = useState({ visivel: false, mensagem: '', tipo: 'sucesso' as 'sucesso' | 'erro' });

  // Recarrega sempre que a aba receber foco (ex: após fazer um agendamento)
  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [])
  );

  async function carregar() {
    setErro(null);
    setCarregando(true);
    try {
      const { data } = await agendamentosApi.meus();
      setAgendamentos(data);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await carregar();
    setRefreshing(false);
  }, []);

  async function cancelar(agendamento: Agendamento) {
    const valorEstorno = agendamento.servico
      ? (agendamento.servico.preco * 0.9).toFixed(2)
      : null;

    const mensagem = valorEstorno
      ? `Será estornado R$ ${valorEstorno} (90% do valor pago).\n\nDeseja cancelar?`
      : 'Tem certeza que deseja cancelar?';

    Alert.alert('Cancelar agendamento', mensagem, [
      { text: 'Não', style: 'cancel' },
      {
        text: 'Sim, cancelar',
        style: 'destructive',
        onPress: async () => {
          try {
            await agendamentosApi.cancelar(agendamento.id);
            setAgendamentos(prev =>
              prev.map(a => a.id === agendamento.id ? { ...a, status: 'cancelado' } : a)
            );
            setToast({ visivel: true, mensagem: 'Agendamento cancelado.', tipo: 'sucesso' });
          } catch {
            setToast({ visivel: true, mensagem: 'Não foi possível cancelar.', tipo: 'erro' });
          }
        },
      },
    ]);
  }

  if (carregando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e94560" />
        <Text style={styles.loadingText}>Carregando agendamentos...</Text>
      </View>
    );
  }

  if (erro) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={48} color="#555" />
        <Text style={styles.erroText}>{erro}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={carregar}>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ativos = agendamentos.filter(a => a.status === 'pendente' || a.status === 'confirmado');
  const historico = agendamentos.filter(a => a.status === 'concluido' || a.status === 'cancelado');

  return (
    <View style={{ flex: 1, backgroundColor: '#1a1a2e' }}>
      <Toast
        visivel={toast.visivel}
        mensagem={toast.mensagem}
        tipo={toast.tipo}
        onHide={() => setToast(p => ({ ...p, visivel: false }))}
      />

      <FlatList
        data={[...ativos, ...historico]}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e94560" />}
        ListHeaderComponent={() => (
          ativos.length > 0 ? <Text style={styles.secao}>Próximos ({ativos.length})</Text> : null
        )}
        renderItem={({ item, index }) => {
          const isFirstHistorico = index === ativos.length && historico.length > 0;
          const podeAcionar = item.status === 'pendente' || item.status === 'confirmado';
          return (
            <>
              {isFirstHistorico && (
                <Text style={[styles.secao, { marginTop: 12 }]}>Histórico</Text>
              )}
              <AgendamentoCard
                agendamento={item}
                onCancelar={podeAcionar ? () => cancelar(item) : undefined}
              />
              {podeAcionar && (
                <TouchableOpacity
                  style={styles.reagendarBtn}
                  onPress={() => navigation.navigate('Reagendar', { agendamento: item })}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh-outline" size={14} color="#e94560" style={{ marginRight: 4 }} />
                  <Text style={styles.reagendarBtnText}>Reagendar</Text>
                </TouchableOpacity>
              )}
            </>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 56 }}>📅</Text>
            <Text style={styles.emptyTitle}>Sem agendamentos</Text>
            <Text style={styles.emptyText}>Vá até a aba Início e agende seu horário!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e', gap: 12 },
  loadingText: { color: '#aaa', marginTop: 8 },
  erroText: { color: '#888', fontSize: 15, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { marginTop: 4 },
  retryText: { color: '#e94560', fontWeight: 'bold', fontSize: 14 },
  secao: { fontSize: 13, fontWeight: 'bold', color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  empty: { alignItems: 'center', gap: 10, paddingTop: 80 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  emptyText: { color: '#888', fontSize: 14, textAlign: 'center' },
  reagendarBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#16213e', borderRadius: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: '#e94560', marginTop: -6,
  },
  reagendarBtnText: { color: '#e94560', fontSize: 13, fontWeight: '600' },
});
