# Mobile — BarberApp

App React Native com **Expo SDK 51** e **TypeScript**.

## Pré-requisitos

- Node.js 18+
- Expo Go no celular ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779))

## Instalação

```bash
npm install
```

## Iniciar

```bash
npx expo start
```

- Escaneie o QR Code com o Expo Go
- Pressione `a` para Android emulador
- Pressione `i` para iOS Simulator

## Configurar URL do Backend

Edite `src/api/client.ts`:

```typescript
// Emulador Android
export const BASE_URL = 'http://10.0.2.2:8000';

// Celular físico (substitua pelo IP da sua máquina)
export const BASE_URL = 'http://192.168.1.XXX:8000';

// Produção
export const BASE_URL = 'https://minha-api.railway.app';
```

---

## Estrutura

```
src/
├── types/index.ts          # Interfaces: Barbearia, Barbeiro, Servico, Agendamento...
├── api/client.ts           # Axios + interceptor JWT automático
├── context/AuthContext.tsx # Login, registro, logout, token persistido
├── navigation/
│   └── AppNavigator.tsx    # Stack de auth + Bottom Tabs + Stack interno
├── screens/
│   ├── LoginScreen.tsx
│   ├── RegistroScreen.tsx
│   ├── HomeScreen.tsx              # Lista + busca + GPS
│   ├── BarbeariaDetalheScreen.tsx  # Info, barbeiros, serviços
│   ├── AgendamentoScreen.tsx       # Calendário + horários + confirmação
│   ├── MeusAgendamentosScreen.tsx  # Histórico + cancelar
│   └── PerfilScreen.tsx
└── components/
    ├── BarbeariaCard.tsx   # Card na listagem home
    ├── ServicoCard.tsx     # Card de serviço selecionável
    └── AgendamentoCard.tsx # Card no histórico com badge de status
```

---

## Fluxo de Navegação

```
App
├── (sem token)
│   ├── LoginScreen
│   └── RegistroScreen
│
└── (com token) ── Bottom Tabs
    ├── Home (Stack)
    │   ├── HomeScreen          ← lista de barbearias
    │   ├── BarbeariaDetalheScreen
    │   └── AgendamentoScreen
    ├── MeusAgendamentosScreen
    └── PerfilScreen
```

---

## Paleta de Cores

| Uso              | Cor       |
|------------------|-----------|
| Fundo principal  | `#1a1a2e` |
| Fundo card/input | `#16213e` |
| Borda            | `#0f3460` |
| Destaque / CTA   | `#e94560` |
| Estrela / avaliação | `#f5a623` |
| Texto secundário | `#aaa`    |

---

## Gerar Build para Produção

```bash
npm install -g eas-cli
eas login
eas build:configure

# Android
eas build --platform android

# iOS
eas build --platform ios
```

> Atualize `BASE_URL` para a URL do servidor de produção antes de buildar.

---

## Dependências Principais

| Pacote | Versão | Uso |
|--------|--------|-----|
| `expo` | ~51 | SDK base |
| `react-native` | 0.74 | Framework |
| `@react-navigation/native` | ^6 | Navegação |
| `@react-navigation/bottom-tabs` | ^6 | Bottom tabs |
| `@react-navigation/native-stack` | ^6 | Stack navigation |
| `axios` | ^1.7 | Requisições HTTP |
| `@react-native-async-storage/async-storage` | 1.23 | Persistência do token |
| `expo-location` | ~17 | GPS / geolocalização |
| `@expo/vector-icons` | ^14 | Ícones (Ionicons) |
| `@react-native-community/datetimepicker` | 8.0 | Seletor de data |
