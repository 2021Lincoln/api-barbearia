import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AppTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#1a1a2e',
    card: '#16213e',
    text: '#ffffff',
    border: '#0f3460',
    primary: '#e94560',
    notification: '#e94560',
  },
};

import { useAuth } from '../context/AuthContext';
import { RootStackParamList, MainTabParamList, HomeStackParamList } from '../types';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegistroScreen from '../screens/RegistroScreen';
import HomeScreen from '../screens/HomeScreen';
import BarbeariaDetalheScreen from '../screens/BarbeariaDetalheScreen';
import AgendamentoScreen from '../screens/AgendamentoScreen';
import ReagendarScreen from '../screens/ReagendarScreen';
import MeusAgendamentosScreen from '../screens/MeusAgendamentosScreen';
import PerfilScreen from '../screens/PerfilScreen';

export type AgendamentosStackParamList = {
  AgendamentosList: undefined;
  Reagendar: { agendamento: import('../types').Agendamento };
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const AgendamentosStack = createNativeStackNavigator<AgendamentosStackParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1a1a2e' },
        headerTintColor: '#e94560',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <HomeStack.Screen
        name="HomeList"
        component={HomeScreen}
        options={{ title: 'Barbearias' }}
      />
      <HomeStack.Screen
        name="BarbeariaDetalhe"
        component={BarbeariaDetalheScreen}
        options={{ title: 'Detalhes' }}
      />
      <HomeStack.Screen
        name="Agendamento"
        component={AgendamentoScreen}
        options={{ title: 'Agendar Horário' }}
      />
    </HomeStack.Navigator>
  );
}

function AgendamentosStackNavigator() {
  return (
    <AgendamentosStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1a1a2e' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        headerShadowVisible: false,
      }}
    >
      <AgendamentosStack.Screen
        name="AgendamentosList"
        component={MeusAgendamentosScreen}
        options={{ title: 'Agendamentos' }}
      />
      <AgendamentosStack.Screen
        name="Reagendar"
        component={ReagendarScreen}
        options={{ title: 'Reagendar', headerTintColor: '#e94560' }}
      />
    </AgendamentosStack.Navigator>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'MeusAgendamentos') iconName = focused ? 'calendar' : 'calendar-outline';
          else if (route.name === 'Perfil') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#e94560',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#1a1a2e',
          borderTopColor: '#0f3460',
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} options={{ title: 'Início' }} />
      <Tab.Screen
        name="MeusAgendamentos"
        component={AgendamentosStackNavigator}
        options={{ title: 'Agendamentos' }}
      />
      <Tab.Screen
        name="Perfil"
        component={PerfilScreen}
        options={{
          title: 'Perfil',
          headerShown: true,
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerShadowVisible: false,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { token, carregando } = useAuth();

  if (carregando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' }}>
        <ActivityIndicator size="large" color="#e94560" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={AppTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {token ? (
          <RootStack.Screen name="Main" component={MainTabs} />
        ) : (
          <>
            <RootStack.Screen name="Login" component={LoginScreen} />
            <RootStack.Screen name="Registro" component={RegistroScreen} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
