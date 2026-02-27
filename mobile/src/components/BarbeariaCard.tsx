import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Barbearia } from '../types';

interface Props {
  barbearia: Barbearia;
  onPress: () => void;
}

export default function BarbeariaCard({ barbearia, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={{ position: 'relative' }}>
        {barbearia.foto_url ? (
          <Image source={{ uri: barbearia.foto_url }} style={styles.imagem} />
        ) : (
          <View style={[styles.imagem, styles.imagemPlaceholder]}>
            <Text style={{ fontSize: 36 }}>✂️</Text>
          </View>
        )}
        <View style={[styles.badge, { backgroundColor: barbearia.aberta_agora ? '#27ae60' : '#c0392b' }]}>
          <Text style={styles.badgeText}>{barbearia.aberta_agora ? 'Aberta' : 'Fechada'}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.nome} numberOfLines={1}>{barbearia.nome}</Text>

        <View style={styles.row}>
          <Ionicons name="star" size={12} color="#f5a623" />
          <Text style={styles.avaliacao}>{(barbearia.avaliacao ?? 5.0).toFixed(1)}</Text>
          <Text style={styles.separador}>·</Text>
          <Ionicons name="time-outline" size={12} color="#aaa" />
          <Text style={styles.info}>{barbearia.horario_abertura}–{barbearia.horario_fechamento}</Text>
        </View>

        <View style={styles.row}>
          <Ionicons name="location-outline" size={12} color="#aaa" />
          <Text style={styles.endereco} numberOfLines={1}>{barbearia.endereco_completo}</Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#e94560" style={{ alignSelf: 'center' }} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#16213e', borderRadius: 16, overflow: 'hidden',
    flexDirection: 'row', borderWidth: 1, borderColor: '#0f3460',
  },
  imagem: { width: 90, height: 90 },
  imagemPlaceholder: { backgroundColor: '#0f3460', justifyContent: 'center', alignItems: 'center' },
  body: { flex: 1, padding: 12, gap: 4, justifyContent: 'center' },
  nome: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  avaliacao: { color: '#f5a623', fontSize: 12, fontWeight: 'bold' },
  separador: { color: '#555', marginHorizontal: 2 },
  info: { color: '#aaa', fontSize: 12 },
  endereco: { color: '#888', fontSize: 11, flex: 1 },
  badge: {
    position: 'absolute', bottom: 6, left: 6,
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase' },
});
