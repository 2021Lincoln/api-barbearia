import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, TextInput, Platform, Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { HomeStackParamList } from '../types';
import { agendamentosApi, mensagemDeErro } from '../api/client';
import { Toast } from '../components/Toast';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'Agendamento'>;
  route: RouteProp<HomeStackParamList, 'Agendamento'>;
};

function formatarData(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatarDataBR(date: Date): string {
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}

export default function AgendamentoScreen({ navigation, route }: Props) {
  const { barbearia_id, barbeiro, servico, servicos } = route.params;
  const servicosSelecionados = (servicos && servicos.length > 0)
    ? servicos
    : (servico ? [servico] : []);
  const valorTotal = servicosSelecionados.reduce((acc, s) => acc + s.preco, 0);
  const duracaoTotal = servicosSelecionados.reduce((acc, s) => acc + s.duracao_minutos, 0);
  const nomesServicos = servicosSelecionados.map((s) => s.nome).join(', ');

  const [data, setData] = useState(new Date());
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [horarios, setHorarios] = useState<string[]>([]);
  const [horaSelecionada, setHoraSelecionada] = useState<string | null>(null);
  const [observacao, setObservacao] = useState('');
  const [buscandoHorarios, setBuscandoHorarios] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState({ visivel: false, mensagem: '', tipo: 'erro' as 'erro' | 'sucesso' });

  useEffect(() => { if (barbeiro) buscarHorarios(); }, [data]);

  async function buscarHorarios() {
    if (!barbeiro) return;
    setBuscandoHorarios(true);
    setHoraSelecionada(null);
    try {
      const { data: res } = await agendamentosApi.horariosDisponiveis(
        barbearia_id, barbeiro.id, formatarData(data), duracaoTotal
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
    if (!barbeiro || servicosSelecionados.length === 0) return;

    setSalvando(true);
    try {
      await agendamentosApi.criar({
        data: formatarData(data),
        hora: horaSelecionada,
        barbearia_id,
        barbeiro_id: barbeiro.id,
        servico_id: servicosSelecionados[0].id,
        servico_ids: servicosSelecionados.map((s) => s.id),
        observacao: observacao.trim() || undefined,
      });

      const valorPago = valorTotal.toFixed(2);
      const valorEstorno = (valorTotal * 0.9).toFixed(2);
      Alert.alert(
        'Agendamento Confirmado!',
        `Pagamento de R$ ${valorPago} confirmado.\n\nHorário: ${horaSelecionada}\n\nPolítica:\n• Cancelamento: estorno de R$ ${valorEstorno} (90%)\n• Reagendamento gratuito com +1h de antecedência`,
        [{
          text: 'Ver meus agendamentos',
          onPress: () => {
            navigation.popToTop();
            (navigation.getParent() as any)?.navigate('MeusAgendamentos');
          },
        }]
      );
    } catch (e) {
      setToast({ visivel: true, mensagem: mensagemDeErro(e), tipo: 'erro' });
    } finally {
      setSalvando(false);
    }
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
        {/* Resumo */}
        <View style={styles.resumo}>
          <Text style={styles.resumoTitulo}>Resumo</Text>
          <InfoRow icon="person-outline" label="Barbeiro" valor={barbeiro?.nome ?? '-'} />
          <InfoRow icon="cut-outline" label="Serviços" valor={nomesServicos || '-'} />
          <InfoRow icon="cash-outline" label="Valor" valor={`R$ ${valorTotal.toFixed(2)}`} />
          <InfoRow icon="time-outline" label="Duração" valor={`${duracaoTotal} min`} />
        </View>

        {/* Selecionar data */}
        <Text style={styles.secao}>Data</Text>
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
              if (Platform.OS === 'android') {
                setMostrarCalendario(false);
              }
              if (event.type !== 'dismissed' && d) {
                setData(d);
              }
            }}
            themeVariant="dark"
            accentColor="#e94560"
          />
        )}

        {/* Horários disponíveis */}
        <Text style={styles.secao}>Horário disponível</Text>
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

        {/* Observação */}
        <Text style={styles.secao}>Observação (opcional)</Text>
        <TextInput
          style={styles.textarea}
          placeholder="Ex: Quero o corte mais curto nas laterais..."
          placeholderTextColor="#555"
          multiline
          numberOfLines={3}
          value={observacao}
          onChangeText={setObservacao}
        />
      </ScrollView>

      {/* Footer fixo */}
      <View style={styles.footer}>
        {horaSelecionada && (
          <Text style={styles.resumoHora}>
            <Ionicons name="time-outline" size={14} /> {formatarDataBR(data)} · {horaSelecionada}
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
            : <Text style={styles.btnText}>CONFIRMAR AGENDAMENTO</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

function InfoRow({ icon, label, valor }: { icon: keyof typeof Ionicons.glyphMap; label: string; valor: string }) {
  return (
    <View style={infoStyles.row}>
      <Ionicons name={icon} size={15} color="#e94560" />
      <Text style={infoStyles.label}>{label}:</Text>
      <Text style={infoStyles.valor}>{valor}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  label: { color: '#888', fontSize: 14 },
  valor: { color: '#fff', fontWeight: 'bold', fontSize: 14, flex: 1 },
});

const styles = StyleSheet.create({
  scroll: { padding: 20, gap: 8, paddingBottom: 120 },
  resumo: { backgroundColor: '#16213e', borderRadius: 16, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#0f3460' },
  resumoTitulo: { color: '#e94560', fontWeight: 'bold', fontSize: 14, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
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
  textarea: {
    backgroundColor: '#16213e', color: '#fff', borderRadius: 14,
    padding: 14, fontSize: 14, borderWidth: 1, borderColor: '#0f3460',
    textAlignVertical: 'top', minHeight: 80,
  },
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
