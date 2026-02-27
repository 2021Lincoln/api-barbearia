import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView, TextInput as RNTextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { mensagemDeErro } from '../api/client';
import { Toast } from '../components/Toast';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Login'> };

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [toast, setToast] = useState({ visivel: false, mensagem: '', tipo: 'erro' as 'erro' | 'sucesso' });
  const senhaRef = useRef<RNTextInput>(null);

  // Validação inline
  const emailValido = email.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  function mostrarErro(msg: string) {
    setToast({ visivel: true, mensagem: msg, tipo: 'erro' });
  }

  async function handleLogin() {
    if (!email || !senha) { mostrarErro('Preencha e-mail e senha.'); return; }
    if (!emailValido) { mostrarErro('E-mail inválido.'); return; }

    setCarregando(true);
    try {
      await login(email.trim().toLowerCase(), senha);
    } catch (e) {
      mostrarErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'android' ? 24 : 0}
    >
      <Toast
        visivel={toast.visivel}
        mensagem={toast.mensagem}
        tipo={toast.tipo}
        onHide={() => setToast(p => ({ ...p, visivel: false }))}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>✂️</Text>
          </View>
          <Text style={styles.logoText}>BarberApp</Text>
          <Text style={styles.subtitle}>Seu estilo, na hora certa</Text>
        </View>

        {/* Formulário */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Entrar</Text>

          {/* Email */}
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>E-mail</Text>
            <View style={[styles.inputBox, !emailValido && styles.inputErro]}>
              <Ionicons name="mail-outline" size={18} color="#555" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                placeholderTextColor="#555"
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={() => senhaRef.current?.focus()}
              />
            </View>
            {!emailValido && <Text style={styles.erroInline}>E-mail inválido</Text>}
          </View>

          {/* Senha */}
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Senha</Text>
            <View style={styles.inputBox}>
              <Ionicons name="lock-closed-outline" size={18} color="#555" style={styles.inputIcon} />
              <TextInput
                ref={senhaRef}
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#555"
                secureTextEntry={!senhaVisivel}
                returnKeyType="done"
                value={senha}
                onChangeText={setSenha}
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setSenhaVisivel(v => !v)} style={styles.eyeBtn}>
                <Ionicons name={senhaVisivel ? 'eye-off-outline' : 'eye-outline'} size={18} color="#555" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Botão */}
          <TouchableOpacity
            style={[styles.btn, carregando && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={carregando}
            activeOpacity={0.85}
          >
            {carregando
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>ENTRAR</Text>
            }
          </TouchableOpacity>

          {/* Cadastro */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Não tem conta?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Registro')}>
              <Text style={styles.link}> Cadastre-se</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#e94560', justifyContent: 'center', alignItems: 'center',
    marginBottom: 14, shadowColor: '#e94560', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },
  logoEmoji: { fontSize: 36 },
  logoText: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 14, color: '#888', marginTop: 4 },
  form: {
    backgroundColor: '#16213e', borderRadius: 20,
    padding: 24, borderWidth: 1, borderColor: '#0f3460',
  },
  formTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 20 },
  inputWrapper: { marginBottom: 16 },
  label: { color: '#aaa', fontSize: 13, marginBottom: 6, fontWeight: '500' },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1a2e', borderRadius: 12,
    borderWidth: 1, borderColor: '#0f3460', paddingHorizontal: 14,
  },
  inputErro: { borderColor: '#e74c3c' },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 14 },
  eyeBtn: { padding: 4 },
  erroInline: { color: '#e74c3c', fontSize: 12, marginTop: 4 },
  btn: {
    backgroundColor: '#e94560', borderRadius: 12,
    padding: 17, alignItems: 'center', marginTop: 8,
    shadowColor: '#e94560', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: 'bold', letterSpacing: 1.5 },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { color: '#888' },
  link: { color: '#e94560', fontWeight: 'bold' },
});
