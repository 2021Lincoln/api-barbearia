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

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Registro'> };

function formatarCelular(v: string): string {
  const nums = v.replace(/\D/g, '').slice(0, 11);
  if (nums.length <= 2) return `(${nums}`;
  if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
  return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
}

export default function RegistroScreen({ navigation }: Props) {
  const { registro } = useAuth();
  const [form, setForm] = useState({ nome: '', email: '', celular: '', senha: '', confirmar: '' });
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [toast, setToast] = useState({ visivel: false, mensagem: '', tipo: 'erro' as 'erro' | 'sucesso' });

  const emailRef = useRef<RNTextInput>(null);
  const celularRef = useRef<RNTextInput>(null);
  const senhaRef = useRef<RNTextInput>(null);
  const confirmarRef = useRef<RNTextInput>(null);

  function update(field: keyof typeof form, value: string) {
    if (field === 'celular') value = formatarCelular(value);
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function mostrarErro(msg: string) {
    setToast({ visivel: true, mensagem: msg, tipo: 'erro' });
  }

  // Validações inline
  const emailValido = form.email.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const senhaForte = form.senha.length === 0 || form.senha.length >= 6;
  const senhasIguais = form.confirmar.length === 0 || form.senha === form.confirmar;

  async function handleRegistro() {
    if (!form.nome.trim()) { mostrarErro('Informe seu nome completo.'); return; }
    if (!form.email || !emailValido) { mostrarErro('E-mail inválido.'); return; }
    if (!form.celular || form.celular.replace(/\D/g, '').length < 10) {
      mostrarErro('Informe um celular válido.'); return;
    }
    if (!senhaForte) { mostrarErro('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (form.senha !== form.confirmar) { mostrarErro('As senhas não coincidem.'); return; }

    setCarregando(true);
    try {
      await registro({
        nome: form.nome.trim(),
        email: form.email.trim().toLowerCase(),
        celular: form.celular.replace(/\D/g, ''),
        senha: form.senha,
      });
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
        <View style={styles.header}>
          <Text style={styles.titulo}>Criar Conta</Text>
          <Text style={styles.subtitulo}>Preencha os dados para começar</Text>
        </View>

        <View style={styles.form}>
          {/* Nome */}
          <Field label="Nome completo" icon="person-outline">
            <TextInput
              style={styles.input} placeholder="João da Silva" placeholderTextColor="#555"
              returnKeyType="next" value={form.nome}
              onChangeText={v => update('nome', v)}
              onSubmitEditing={() => emailRef.current?.focus()}
            />
          </Field>

          {/* Email */}
          <Field label="E-mail" icon="mail-outline" erro={!emailValido ? 'E-mail inválido' : undefined}>
            <TextInput
              ref={emailRef} style={styles.input}
              placeholder="seu@email.com" placeholderTextColor="#555"
              keyboardType="email-address" autoCapitalize="none"
              returnKeyType="next" value={form.email}
              onChangeText={v => update('email', v)}
              onSubmitEditing={() => celularRef.current?.focus()}
            />
          </Field>

          {/* Celular */}
          <Field label="Celular (WhatsApp)" icon="call-outline">
            <TextInput
              ref={celularRef} style={styles.input}
              placeholder="(11) 99999-9999" placeholderTextColor="#555"
              keyboardType="phone-pad" returnKeyType="next"
              value={form.celular}
              onChangeText={v => update('celular', v)}
              onSubmitEditing={() => senhaRef.current?.focus()}
            />
          </Field>

          {/* Senha */}
          <Field
            label="Senha"
            icon="lock-closed-outline"
            erro={!senhaForte ? 'Mínimo 6 caracteres' : undefined}
            extra={
              <TouchableOpacity onPress={() => setSenhaVisivel(v => !v)}>
                <Ionicons name={senhaVisivel ? 'eye-off-outline' : 'eye-outline'} size={18} color="#555" />
              </TouchableOpacity>
            }
          >
            <TextInput
              ref={senhaRef} style={styles.input}
              placeholder="••••••••" placeholderTextColor="#555"
              secureTextEntry={!senhaVisivel} returnKeyType="next"
              value={form.senha}
              onChangeText={v => update('senha', v)}
              onSubmitEditing={() => confirmarRef.current?.focus()}
            />
          </Field>

          {/* Confirmar senha */}
          <Field
            label="Confirmar senha"
            icon="shield-checkmark-outline"
            erro={!senhasIguais ? 'Senhas não coincidem' : undefined}
          >
            <TextInput
              ref={confirmarRef} style={styles.input}
              placeholder="••••••••" placeholderTextColor="#555"
              secureTextEntry={!senhaVisivel} returnKeyType="done"
              value={form.confirmar}
              onChangeText={v => update('confirmar', v)}
              onSubmitEditing={handleRegistro}
            />
          </Field>

          <TouchableOpacity
            style={[styles.btn, carregando && styles.btnDisabled]}
            onPress={handleRegistro}
            disabled={carregando}
            activeOpacity={0.85}
          >
            {carregando
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>CRIAR CONTA</Text>
            }
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Já tem conta?</Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.link}> Entrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Componente auxiliar para campos
function Field({
  label, icon, erro, extra, children,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  erro?: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  const styles = fieldStyles;
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.box, erro ? styles.boxErro : undefined]}>
        <Ionicons name={icon} size={18} color="#555" style={styles.icon} />
        {children}
        {extra}
      </View>
      {erro && <Text style={styles.erroText}>{erro}</Text>}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  label: { color: '#aaa', fontSize: 13, marginBottom: 6, fontWeight: '500' },
  box: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1a2e', borderRadius: 12,
    borderWidth: 1, borderColor: '#0f3460', paddingHorizontal: 14,
  },
  boxErro: { borderColor: '#e74c3c' },
  icon: { marginRight: 8 },
  erroText: { color: '#e74c3c', fontSize: 12, marginTop: 4 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 48 },
  header: { marginBottom: 24 },
  titulo: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  subtitulo: { color: '#888', fontSize: 14, marginTop: 4 },
  form: {
    backgroundColor: '#16213e', borderRadius: 20,
    padding: 24, borderWidth: 1, borderColor: '#0f3460',
  },
  input: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 14 },
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
