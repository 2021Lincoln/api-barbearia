import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Servico } from '../types';

interface Props {
  servico: Servico;
  selecionado?: boolean;
  onPress: () => void;
}

export default function ServicoCard({ servico, selecionado, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.card, selecionado && styles.selecionado]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.nome}>{servico.nome}</Text>
        {servico.descricao && <Text style={styles.descricao} numberOfLines={1}>{servico.descricao}</Text>}
        <View style={styles.row}>
          <Ionicons name="time-outline" size={13} color="#aaa" />
          <Text style={styles.duracao}>{servico.duracao_minutos} min</Text>
        </View>
      </View>

      <View style={styles.preco}>
        <Text style={styles.precoText}>R$ {servico.preco.toFixed(2)}</Text>
        {selecionado && <Ionicons name="checkmark-circle" size={22} color="#e94560" />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#16213e', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16,
    borderWidth: 1.5, borderColor: '#0f3460',
  },
  selecionado: { borderColor: '#e94560' },
  nome: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  descricao: { color: '#888', fontSize: 12, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  duracao: { color: '#aaa', fontSize: 12 },
  preco: { alignItems: 'flex-end', gap: 4 },
  precoText: { color: '#e94560', fontWeight: 'bold', fontSize: 15 },
});
