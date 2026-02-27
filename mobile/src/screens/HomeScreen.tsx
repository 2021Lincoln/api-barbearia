import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList, Barbearia } from '../types';
import { barbeariasApi, mensagemDeErro } from '../api/client';
import BarbeariaCard from '../components/BarbeariaCard';
import { BarbeariaCardSkeleton } from '../components/Skeleton';

type Props = { navigation: NativeStackNavigationProp<HomeStackParamList, 'HomeList'> };

export default function HomeScreen({ navigation }: Props) {
  const [barbearias, setBarbearias] = useState<Barbearia[]>([]);
  const [filtradas, setFiltradas] = useState<Barbearia[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [localizacao, setLocalizacao] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => { iniciar(); }, []);

  async function iniciar() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        // Timeout de 6s para não travar o app em caso de GPS lento
        const pos = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 6000)
          ),
        ]);
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocalizacao(loc);
        await carregar(loc.lat, loc.lng);
      } else {
        await carregar();
      }
    } catch {
      // Localização negada ou timeout → carrega sem filtro geográfico
      await carregar();
    }
  }

  async function carregar(lat?: number, lng?: number) {
    setErro(null);
    setCarregando(true);
    try {
      const { data } = await barbeariasApi.listar(lat, lng, 50);
      setBarbearias(data);
      setFiltradas(data);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await carregar(localizacao?.lat, localizacao?.lng);
    setRefreshing(false);
  }, [localizacao]);

  useEffect(() => {
    if (!busca.trim()) {
      setFiltradas(barbearias);
    } else {
      const t = busca.toLowerCase();
      setFiltradas(barbearias.filter(b =>
        b.nome.toLowerCase().includes(t)
        || b.endereco_completo.toLowerCase().includes(t)
        || (b.bairro ?? '').toLowerCase().includes(t)
        || (b.cidade ?? '').toLowerCase().includes(t)
      ));
    }
  }, [busca, barbearias]);

  return (
    <View style={styles.container}>
      {/* Barra de busca */}
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar barbearia ou bairro..."
          placeholderTextColor="#555"
          value={busca}
          onChangeText={setBusca}
        />
        {busca.length > 0 && (
          <TouchableOpacity onPress={() => setBusca('')}>
            <Ionicons name="close-circle" size={18} color="#555" />
          </TouchableOpacity>
        )}
      </View>

      {localizacao && !carregando && (
        <View style={styles.locRow}>
          <Ionicons name="navigate" size={12} color="#e94560" />
          <Text style={styles.locText}>Barbearias próximas de você</Text>
        </View>
      )}

      {/* Estado de erro */}
      {erro && !carregando && (
        <View style={styles.erroBox}>
          <Ionicons name="cloud-offline-outline" size={40} color="#555" />
          <Text style={styles.erroText}>{erro}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => carregar(localizacao?.lat, localizacao?.lng)}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Skeleton loading */}
      {carregando && !erro && (
        <View style={styles.lista}>
          {[1, 2, 3, 4].map(i => <BarbeariaCardSkeleton key={i} />)}
        </View>
      )}

      {/* Lista real */}
      {!carregando && !erro && (
        <FlatList
          data={filtradas}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <BarbeariaCard
              barbearia={item}
              onPress={() => navigation.navigate('BarbeariaDetalhe', { barbearia_id: item.id })}
            />
          )}
          contentContainerStyle={styles.lista}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e94560" />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>✂️</Text>
              <Text style={styles.emptyText}>Nenhuma barbearia encontrada.</Text>
              {busca.length > 0 && (
                <TouchableOpacity onPress={() => setBusca('')}>
                  <Text style={styles.retryText}>Limpar busca</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#16213e', borderRadius: 14,
    margin: 16, marginBottom: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#0f3460',
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 18, marginBottom: 4 },
  locText: { color: '#888', fontSize: 12 },
  lista: { padding: 16, gap: 12 },
  erroBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  erroText: { color: '#888', fontSize: 15, textAlign: 'center' },
  retryBtn: { marginTop: 4 },
  retryText: { color: '#e94560', fontWeight: 'bold', fontSize: 14 },
  empty: { alignItems: 'center', gap: 10, paddingTop: 60 },
  emptyText: { color: '#aaa', fontSize: 16 },
});
