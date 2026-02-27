import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ToastType = 'sucesso' | 'erro' | 'info';

interface ToastProps {
  visivel: boolean;
  mensagem: string;
  tipo?: ToastType;
  onHide: () => void;
  duracao?: number;
}

const CONFIG: Record<ToastType, { cor: string; icone: keyof typeof Ionicons.glyphMap }> = {
  sucesso: { cor: '#2ecc71', icone: 'checkmark-circle' },
  erro:    { cor: '#e74c3c', icone: 'close-circle' },
  info:    { cor: '#3498db', icone: 'information-circle' },
};

export function Toast({ visivel, mensagem, tipo = 'info', onHide, duracao = 3000 }: ToastProps) {
  const translateY = useRef(new Animated.Value(-120)).current;
  const { cor, icone } = CONFIG[tipo];
  const insets = useSafeAreaInsets();
  const topOffset = insets.top + (Platform.OS === 'android' ? 8 : 4);

  useEffect(() => {
    if (visivel) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(translateY, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }).start(onHide);
      }, duracao);

      return () => clearTimeout(timer);
    }
  }, [visivel]);

  if (!visivel) return null;

  return (
    <Animated.View style={[styles.container, { top: topOffset, transform: [{ translateY }] }]}>
      <View style={[styles.toast, { borderLeftColor: cor }]}>
        <Ionicons name={icone} size={20} color={cor} />
        <Text style={styles.texto} numberOfLines={2}>{mensagem}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  texto: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
  },
});
