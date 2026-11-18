import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TabBar from './src/components/TabBar';
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import PlaceholderScreen from './src/screens/PlaceholderScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import SongDetailScreen from './src/screens/SongDetailScreen';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { colors } from './src/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <View style={styles.root}>
          <Root />
        </View>
      </AuthProvider>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}

// Sin sesión se muestran login / registro; con sesión, la app con el tab bar.
function Root() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }
  return status === 'authenticated' ? <MainApp /> : <AuthScreens />;
}

function AuthScreens() {
  const [screen, setScreen] = useState('login');
  return screen === 'login' ? (
    <LoginScreen onGoToRegister={() => setScreen('register')} />
  ) : (
    <RegisterScreen onBack={() => setScreen('login')} />
  );
}

function MainApp() {
  const { signOut } = useAuth();
  // La Home es la primera pantalla que se ve al entrar.
  const [tab, setTab] = useState('inicio');
  // Canción abierta en el detalle (se muestra encima de la pestaña actual,
  // así al volver la búsqueda sigue como estaba)
  const [detalle, setDetalle] = useState(null);

  const abrirCancion = useCallback((song) => setDetalle(song), []);
  const cerrarDetalle = useCallback(() => setDetalle(null), []);
  const cambiarTab = useCallback((t) => {
    setDetalle(null);
    setTab(t);
  }, []);

  const renderScreen = () => {
    switch (tab) {
      case 'inicio':
        return <HomeScreen onNavigate={cambiarTab} onOpenSong={abrirCancion} />;
      case 'buscar':
        return <SearchScreen onOpenSong={abrirCancion} />;
      case 'biblioteca':
        return <PlaceholderScreen title="Biblioteca" />;
      case 'stats':
        return <PlaceholderScreen title="Stats" />;
      case 'perfil':
        return <PlaceholderScreen title="Perfil" onLogout={signOut} />;
      default:
        return null;
    }
  };

  return (
    <>
      <View style={styles.screen}>
        {renderScreen()}
        {detalle && (
          <View style={StyleSheet.absoluteFill}>
            <SongDetailScreen key={detalle.deezerId} song={detalle} onBack={cerrarDetalle} />
          </View>
        )}
      </View>
      <TabBar active={tab} onChange={cambiarTab} />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  screen: { flex: 1 },
});
