import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { BASE_URL } from '../api/client';

export default function PerfilScreen() {
  const { usuario, logout } = useAuth();

  function confirmarLogout() {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ]);
  }

  const iniciais = usuario?.nome
    .split(' ')
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase() ?? '?';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarBox}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{iniciais}</Text>
        </View>
        <Text style={styles.nome}>{usuario?.nome}</Text>
        <Text style={styles.email}>{usuario?.email}</Text>
      </View>

      {/* Dados */}
      <View style={styles.card}>
        <Text style={styles.cardTitulo}>Meus dados</Text>
        <InfoItem icon="person-outline" label="Nome" valor={usuario?.nome ?? '-'} />
        <InfoItem icon="mail-outline" label="E-mail" valor={usuario?.email ?? '-'} />
        <InfoItem icon="call-outline" label="Celular" valor={usuario?.celular ?? '-'} />
      </View>

      {/* Info do app */}
      <View style={styles.card}>
        <Text style={styles.cardTitulo}>Sobre o app</Text>
        <InfoItem icon="server-outline" label="Servidor" valor={BASE_URL} />
        <InfoItem icon="code-slash-outline" label="Versão" valor="1.0.0" />
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.btnLogout} onPress={confirmarLogout} activeOpacity={0.85}>
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={styles.btnLogoutText}>Sair da conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoItem({ icon, label, valor }: { icon: keyof typeof Ionicons.glyphMap; label: string; valor: string }) {
  return (
    <View style={itemStyles.row}>
      <View style={itemStyles.iconBox}>
        <Ionicons name={icon} size={16} color="#e94560" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={itemStyles.label}>{label}</Text>
        <Text style={itemStyles.valor} numberOfLines={1}>{valor}</Text>
      </View>
    </View>
  );
}

const itemStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#0f3460' },
  iconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' },
  label: { color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  valor: { color: '#fff', fontSize: 14, fontWeight: '500', marginTop: 1 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  avatarBox: { alignItems: 'center', paddingVertical: 24 },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#e94560', justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#e94560', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  nome: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  email: { fontSize: 14, color: '#888', marginTop: 2 },
  card: { backgroundColor: '#16213e', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#0f3460' },
  cardTitulo: { color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 'bold' },
  btnLogout: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#c0392b', borderRadius: 14, padding: 16, marginTop: 8,
  },
  btnLogoutText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
