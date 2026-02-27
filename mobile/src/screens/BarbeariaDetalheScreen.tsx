import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Image, Alert, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { HomeStackParamList, Barbearia, Barbeiro, Servico } from '../types';
import { barbeariasApi } from '../api/client';
import ServicoCard from '../components/ServicoCard';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'BarbeariaDetalhe'>;
  route: RouteProp<HomeStackParamList, 'BarbeariaDetalhe'>;
};

export default function BarbeariaDetalheScreen({ navigation, route }: Props) {
  const { barbearia_id } = route.params;
  const [barbearia, setBarbearia] = useState<Barbearia | null>(null);
  const [barbeiroSelecionado, setBarbeiroSelecionado] = useState<Barbeiro | null>(null);
  const [servicosSelecionados, setServicosSelecionados] = useState<Servico[]>([]);
  const [carregando, setCarregando] = useState(true);

  const servicosDisponiveis = useMemo(() => {
    const todos = barbearia?.servicos ?? [];
    if (!barbeiroSelecionado) return todos;
    const ids = barbeiroSelecionado.servico_ids ?? [];
    if (ids.length === 0) return [];
    return todos.filter((s) => ids.includes(s.id));
  }, [barbearia, barbeiroSelecionado]);

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    setServicosSelecionados((prev) =>
      prev.filter((s) => servicosDisponiveis.some((disp) => disp.id === s.id))
    );
  }, [servicosDisponiveis]);

  async function carregar() {
    try {
      const { data } = await barbeariasApi.obter(barbearia_id);
      setBarbearia(data);
      navigation.setOptions({ title: data.nome });
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar a barbearia.');
    } finally {
      setCarregando(false);
    }
  }

  function irParaAgendamento() {
    if (!barbeiroSelecionado) { Alert.alert('Atenção', 'Selecione um barbeiro.'); return; }
    if (servicosSelecionados.length === 0) { Alert.alert('Atenção', 'Selecione ao menos um serviço.'); return; }
    navigation.navigate('Agendamento', {
      barbearia_id,
      barbeiro: barbeiroSelecionado,
      servico: servicosSelecionados[0],
      servicos: servicosSelecionados,
    });
  }

  function toggleServico(servico: Servico) {
    setServicosSelecionados((prev) =>
      prev.some((s) => s.id === servico.id)
        ? prev.filter((s) => s.id !== servico.id)
        : [...prev, servico]
    );
  }

  if (carregando) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#e94560" /></View>
  );
  if (!barbearia) return null;

  return (
    <View style={{ flex: 1, backgroundColor: '#1a1a2e' }}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Capa */}
        {barbearia.foto_url ? (
          <Image source={{ uri: barbearia.foto_url }} style={styles.capa} />
        ) : (
          <View style={[styles.capa, styles.capaPlaceholder]}>
            <Text style={{ fontSize: 48 }}>✂️</Text>
          </View>
        )}

        {/* Info principal */}
        <View style={styles.info}>
          <View style={styles.row}>
            <Text style={styles.nome}>{barbearia.nome}</Text>
            <View style={[styles.statusBadge, { backgroundColor: barbearia.aberta_agora ? '#27ae60' : '#c0392b' }]}>
              <Text style={styles.statusBadgeText}>{barbearia.aberta_agora ? 'Aberta' : 'Fechada'}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <Ionicons name="star" size={14} color="#f5a623" />
            <Text style={styles.avaliacao}>{(barbearia.avaliacao ?? 5.0).toFixed(1)}</Text>
            <Text style={styles.horario}>  ·  {barbearia.horario_abertura} – {barbearia.horario_fechamento}</Text>
          </View>
          <TouchableOpacity
            style={styles.row}
            onPress={() => Linking.openURL(`https://maps.google.com/?q=${barbearia.latitude},${barbearia.longitude}`)}
            activeOpacity={0.7}
          >
            <Ionicons name="location-outline" size={14} color="#e94560" />
            <Text style={[styles.endereco, { color: '#e94560', textDecorationLine: 'underline' }]}>
              {barbearia.endereco_completo}
            </Text>
            <Ionicons name="open-outline" size={12} color="#e94560" />
          </TouchableOpacity>
        </View>

        {/* Barbeiros */}
        <Text style={styles.secao}>Escolha o Barbeiro</Text>
        {(barbearia.barbeiros ?? []).length === 0 ? (
          <Text style={styles.semDados}>Nenhum barbeiro disponível.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll} contentContainerStyle={{ paddingRight: 16 }}>
            {(barbearia.barbeiros ?? []).map(b => (
              <TouchableOpacity
                key={b.id}
                style={[styles.barbeiroCard, barbeiroSelecionado?.id === b.id && styles.selecionado]}
                onPress={() => setBarbeiroSelecionado(b)}
                activeOpacity={0.75}
              >
                {b.foto_url ? (
                  <Image
                    source={{ uri: b.foto_url }}
                    style={[styles.avatar, barbeiroSelecionado?.id === b.id && styles.avatarSel]}
                  />
                ) : (
                  <View style={[styles.avatar, barbeiroSelecionado?.id === b.id && styles.avatarSel]}>
                    <Text style={{ fontSize: 28 }}>💈</Text>
                  </View>
                )}
                <Text style={styles.barbeiroNome} numberOfLines={2}>{b.nome}</Text>
                <Text style={styles.especialidade} numberOfLines={1}>
                  {b.especialidade?.trim() || 'Todas'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Serviços */}
        <Text style={styles.secao}>Escolha o Serviço</Text>
        {servicosDisponiveis.length === 0 ? (
          <Text style={[styles.semDados, { marginHorizontal: 16 }]}>Nenhum serviço disponível.</Text>
        ) : (
          <View style={styles.servicosList}>
            {servicosDisponiveis.map(s => (
              <ServicoCard
                key={s.id}
                servico={s}
                selecionado={servicosSelecionados.some((sel) => sel.id === s.id)}
                onPress={() => toggleServico(s)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Botão agendar */}
      <View style={styles.footer}>
        {(barbeiroSelecionado || servicosSelecionados.length > 0) && (
          <View style={styles.resumoBox}>
            {barbeiroSelecionado && (
              <Text style={styles.resumoItem}>💈 {barbeiroSelecionado.nome}</Text>
            )}
            {servicosSelecionados.length > 0 && (
              <Text style={styles.resumoItem}>
                ✂️ {servicosSelecionados.length} serviço(s) · <Text style={{ color: '#e94560', fontWeight: 'bold' }}>
                  R$ {servicosSelecionados.reduce((acc, s) => acc + s.preco, 0).toFixed(2)}
                </Text>
              </Text>
            )}
          </View>
        )}
        <TouchableOpacity
          style={[styles.btnAgendar, (!barbeiroSelecionado || servicosSelecionados.length === 0) && styles.btnAgendarDisabled]}
          onPress={irParaAgendamento}
          activeOpacity={0.85}
        >
          <Ionicons name="calendar-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.btnAgendarText}>AGENDAR HORÁRIO</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 140 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' },
  capa: { width: '100%', height: 200 },
  capaPlaceholder: { backgroundColor: '#16213e', justifyContent: 'center', alignItems: 'center' },
  info: { padding: 16 },
  nome: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 6, flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  statusBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3, marginLeft: 8 },
  statusBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  avaliacao: { color: '#f5a623', marginLeft: 4, fontWeight: 'bold' },
  horario: { color: '#aaa', fontSize: 13 },
  endereco: { color: '#aaa', fontSize: 13, marginLeft: 4, flex: 1 },
  secao: { fontSize: 17, fontWeight: 'bold', color: '#fff', paddingHorizontal: 16, marginTop: 12, marginBottom: 12 },
  hScroll: { paddingLeft: 16, marginBottom: 8 },
  barbeiroCard: {
    backgroundColor: '#16213e', borderRadius: 16, padding: 12,
    alignItems: 'center', marginRight: 12, width: 100,
    borderWidth: 2, borderColor: 'transparent',
  },
  selecionado: { borderColor: '#e94560' },
  avatar: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#0f3460', justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  avatarSel: { backgroundColor: '#3d1520' },
  barbeiroNome: { color: '#fff', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  especialidade: { color: '#e94560', fontSize: 11, textAlign: 'center', marginTop: 3, fontWeight: '600' },
  semDados: { color: '#555', fontSize: 14, paddingHorizontal: 16, marginBottom: 12 },
  servicosList: { gap: 8, paddingBottom: 8 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#16213e', padding: 16, borderTopWidth: 1, borderTopColor: '#0f3460',
    gap: 10,
  },
  resumoBox: { gap: 2 },
  resumoItem: { color: '#aaa', fontSize: 13 },
  btnAgendar: {
    backgroundColor: '#e94560', borderRadius: 14, padding: 17,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
    shadowColor: '#e94560', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  btnAgendarDisabled: { backgroundColor: '#555', shadowOpacity: 0, elevation: 0 },
  btnAgendarText: { color: '#fff', fontSize: 15, fontWeight: 'bold', letterSpacing: 1 },
});
