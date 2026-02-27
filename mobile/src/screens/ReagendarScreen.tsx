import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Platform, Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { agendamentosApi, mensagemDeErro } from '../api/client';
import { Toast } from '../components/Toast';
import { AgendamentosStackParamList } from '../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<AgendamentosStackParamList, 'Reagendar'>;
  route: RouteProp<AgendamentosStackParamList, 'Reagendar'>;
};

function formatarData(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatarDataBR(date: Date): string {
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}

function minutosAte(dataStr: string, horaStr: string): number {
  const dt = new Date(`${dataStr}T${horaStr}:00`);
  return (dt.getTime() - Date.now()) / 60000;
}

export default function ReagendarScreen({ navigation, route }: Props) {
  const { agendamento } = route.params;
  const preco = agendamento.servico?.preco ?? 0;
  const taxa = parseFloat((preco * 0.1).toFixed(2));

  const [data, setData] = useState(new Date());
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [horarios, setHorarios] = useState<string[]>([]);
  const [horaSelecionada, setHoraSelecionada] = useState<string | null>(null);
  const [buscandoHorarios, setBuscandoHorarios] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState({ visivel: false, mensagem: '', tipo: 'erro' as 'erro' | 'sucesso' });

  // Alerta se falta menos de 1h para o agendamento original
  const minutosRestantes = minutosAte(agendamento.data, agendamento.hora);
  const taxaSeraCobraDA = minutosRestantes < 60;

  useEffect(() => { buscarHorarios(); }, [data]);

  async function buscarHorarios() {
    setBuscandoHorarios(true);
    setHoraSelecionada(null);
    try {
      const { data: res } = await agendamentosApi.horariosDisponiveis(
        agendamento.barbearia_id,
        agendamento.barbeiro_id,
        formatarData(data),
      );
      setHorarios(res.horarios_livres);
    } catch {
      setHorarios([]);
    } finally {
      setBuscandoHorarios(false);
    }
  }

  async function confirmar() {
    if (!horaSelecionada) {
      setToast({ visivel: true, mensagem: 'Selecione um horário.', tipo: 'erro' });
      return;
    }

    const confirmMsg = taxaSeraCobraDA
      ? `Atenção: como falta menos de 1h para o horário original, será cobrada uma taxa de 10% (R$ ${taxa.toFixed(2)}).\n\nDeseja prosseguir?`
      : `Reagendar para ${formatarDataBR(data)} às ${horaSelecionada}?`;

    Alert.alert('Confirmar Reagendamento', confirmMsg, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: taxaSeraCobraDA ? `Confirmar (+ R$ ${taxa.toFixed(2)})` : 'Confirmar',
        onPress: async () => {
          setSalvando(true);
          try {
            await agendamentosApi.reagendar(agendamento.id, formatarData(data), horaSelecionada);
            Alert.alert(
              'Reagendamento Confirmado!',
              taxaSeraCobraDA
                ? `Novo horário: ${horaSelecionada}\nTaxa cobrada: R$ ${taxa.toFixed(2)}`
                : `Novo horário: ${horaSelecionada}`,
              [{ text: 'OK', onPress: () => navigation.goBack() }],
            );
          } catch (e) {
            setToast({ visivel: true, mensagem: mensagemDeErro(e), tipo: 'erro' });
          } finally {
            setSalvando(false);
          }
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#1a1a2e' }}>
      <Toast
        visivel={toast.visivel}
        mensagem={toast.mensagem}
        tipo={toast.tipo}
        onHide={() => setToast(p => ({ ...p, visivel: false }))}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Agendamento original */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Agendamento original</Text>
          <Text style={styles.cardValor}>
            {agendamento.data} às {agendamento.hora}
          </Text>
          {agendamento.barbeiro && (
            <Text style={styles.cardSub}>Barbeiro: {agendamento.barbeiro.nome}</Text>
          )}
          {agendamento.servico && (
            <Text style={styles.cardSub}>Serviço: {agendamento.servico.nome} · R$ {preco.toFixed(2)}</Text>
          )}
        </View>

        {/* Aviso de taxa */}
        {taxaSeraCobraDA && (
          <View style={styles.avisoTaxa}>
            <Ionicons name="warning-outline" size={18} color="#f39c12" />
            <Text style={styles.avisoTaxaText}>
              Falta menos de 1h — taxa de 10% (R$ {taxa.toFixed(2)}) será cobrada.
            </Text>
          </View>
        )}

        {/* Selecionar nova data */}
        <Text style={styles.secao}>Nova Data</Text>
        <TouchableOpacity style={styles.dataPicker} onPress={() => setMostrarCalendario(true)}>
          <Ionicons name="calendar-outline" size={20} color="#e94560" />
          <Text style={styles.dataTexto}>{formatarDataBR(data)}</Text>
          <Ionicons name="chevron-down" size={16} color="#555" />
        </TouchableOpacity>

        {mostrarCalendario && (
          <DateTimePicker
            value={data}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            minimumDate={new Date()}
            onChange={(event, d) => {
              if (Platform.OS === 'android') setMostrarCalendario(false);
              if (event.type !== 'dismissed' && d) setData(d);
            }}
            themeVariant="dark"
            accentColor="#e94560"
          />
        )}

        {/* Novos horários */}
        <Text style={styles.secao}>Novo Horário</Text>
        {buscandoHorarios ? (
          <View style={styles.horarioLoading}>
            <ActivityIndicator color="#e94560" />
            <Text style={styles.horarioLoadingText}>Verificando horários...</Text>
          </View>
        ) : horarios.length === 0 ? (
          <View style={styles.semHorarioBox}>
            <Ionicons name="calendar-clear-outline" size={32} color="#555" />
            <Text style={styles.semHorario}>Nenhum horário livre nesta data.</Text>
            <Text style={styles.semHorarioSub}>Tente outra data.</Text>
          </View>
        ) : (
          <View style={styles.horariosGrid}>
            {horarios.map(h => (
              <TouchableOpacity
                key={h}
                style={[styles.horarioBtn, horaSelecionada === h && styles.horarioSel]}
                onPress={() => setHoraSelecionada(h)}
                activeOpacity={0.7}
              >
                <Text style={[styles.horarioText, horaSelecionada === h && styles.horarioTextSel]}>{h}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {horaSelecionada && (
          <Text style={styles.resumoHora}>
            <Ionicons name="time-outline" size={14} /> {formatarDataBR(data)} · {horaSelecionada}
            {taxaSeraCobraDA ? `  (+R$ ${taxa.toFixed(2)})` : '  (sem taxa)'}
          </Text>
        )}
        <TouchableOpacity
          style={[styles.btnConfirmar, (!horaSelecionada || salvando) && styles.btnDisabled]}
          onPress={confirmar}
          disabled={!horaSelecionada || salvando}
          activeOpacity={0.85}
        >
          {salvando
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>CONFIRMAR REAGENDAMENTO</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, gap: 8, paddingBottom: 130 },
  card: {
    backgroundColor: '#16213e', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#0f3460', marginBottom: 8,
  },
  cardLabel: { color: '#e94560', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  cardValor: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  cardSub: { color: '#aaa', fontSize: 13 },
  avisoTaxa: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#2d2010', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#f39c12', marginBottom: 8,
  },
  avisoTaxaText: { color: '#f39c12', fontSize: 13, flex: 1, fontWeight: '600' },
  secao: { fontSize: 14, fontWeight: 'bold', color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, marginTop: 8, marginBottom: 10 },
  dataPicker: {
    backgroundColor: '#16213e', borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#0f3460',
  },
  dataTexto: { flex: 1, color: '#fff', fontSize: 15, textTransform: 'capitalize' },
  horarioLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  horarioLoadingText: { color: '#888' },
  semHorarioBox: { alignItems: 'center', gap: 6, padding: 20 },
  semHorario: { color: '#888', fontWeight: 'bold' },
  semHorarioSub: { color: '#555', fontSize: 13 },
  horariosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  horarioBtn: {
    backgroundColor: '#16213e', borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 16,
    borderWidth: 1.5, borderColor: '#0f3460',
  },
  horarioSel: { backgroundColor: '#e94560', borderColor: '#e94560' },
  horarioText: { color: '#ddd', fontWeight: '600', fontSize: 14 },
  horarioTextSel: { color: '#fff' },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#16213e', padding: 16,
    borderTopWidth: 1, borderTopColor: '#0f3460',
    gap: 8,
  },
  resumoHora: { color: '#aaa', fontSize: 13, textAlign: 'center' },
  btnConfirmar: {
    backgroundColor: '#e94560', borderRadius: 14, padding: 18, alignItems: 'center',
    shadowColor: '#e94560', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  btnDisabled: { backgroundColor: '#444', shadowOpacity: 0 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: 'bold', letterSpacing: 1 },
});
