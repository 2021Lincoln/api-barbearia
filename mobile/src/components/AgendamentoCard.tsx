import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Agendamento } from '../types';

const STATUS_CONFIG = {
  pendente:   { cor: '#f5a623', icone: 'time-outline',         label: 'Pendente' },
  confirmado: { cor: '#2ecc71', icone: 'checkmark-circle-outline', label: 'Confirmado' },
  concluido:  { cor: '#3498db', icone: 'ribbon-outline',        label: 'Concluído' },
  cancelado:  { cor: '#e74c3c', icone: 'close-circle-outline',  label: 'Cancelado' },
} as const;

interface Props {
  agendamento: Agendamento;
  onCancelar?: () => void;
}

export default function AgendamentoCard({ agendamento, onCancelar }: Props) {
  const cfg = STATUS_CONFIG[agendamento.status] ?? STATUS_CONFIG.pendente;
  const dataFormatada = new Date(agendamento.data + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short',
  });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: cfg.cor + '22', borderColor: cfg.cor }]}>
          <Ionicons name={cfg.icone as any} size={14} color={cfg.cor} />
          <Text style={[styles.badgeText, { color: cfg.cor }]}>{cfg.label}</Text>
        </View>
        <Text style={styles.dataHora}>{dataFormatada} · {agendamento.hora}</Text>
      </View>

      <Text style={styles.barbearia}>{agendamento.barbearia?.nome ?? `Barbearia #${agendamento.barbearia_id}`}</Text>

      <View style={styles.row}>
        <Text style={styles.info}>✂️ {agendamento.servico?.nome ?? `Serviço #${agendamento.servico_id}`}</Text>
        {agendamento.servico?.preco !== undefined && (
          <Text style={styles.preco}>R$ {agendamento.servico.preco.toFixed(2)}</Text>
        )}
      </View>

      <Text style={styles.info}>💈 {agendamento.barbeiro?.nome ?? `Barbeiro #${agendamento.barbeiro_id}`}</Text>

      {onCancelar && (
        <TouchableOpacity style={styles.btnCancelar} onPress={onCancelar}>
          <Text style={styles.btnCancelarText}>Cancelar agendamento</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#16213e', borderRadius: 16, padding: 16, gap: 8, borderWidth: 1, borderColor: '#0f3460' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  dataHora: { color: '#aaa', fontSize: 12 },
  barbearia: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  info: { color: '#aaa', fontSize: 13 },
  preco: { color: '#e94560', fontWeight: 'bold', fontSize: 14 },
  btnCancelar: { marginTop: 4, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#c0392b', alignItems: 'center' },
  btnCancelarText: { color: '#e74c3c', fontSize: 13, fontWeight: '600' },
});
