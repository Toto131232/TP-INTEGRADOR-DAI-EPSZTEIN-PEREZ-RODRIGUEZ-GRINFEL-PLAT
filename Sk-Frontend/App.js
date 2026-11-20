import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TabBar from './src/components/TabBar';
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import PlaylistDetailScreen from './src/screens/PlaylistDetailScreen';
import PlaceholderScreen from './src/screens/PlaceholderScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
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
  // Biblioteca: sección elegida y playlist abierta (null = se ve la lista). Viven acá porque
  // LibraryScreen se desmonta al cambiar de pestaña: así, si desde el detalle de una playlist
  // vas a Buscar y volvés a Biblioteca, seguís viendo esa playlist.
  const [seccionBiblioteca, setSeccionBiblioteca] = useState('canciones');
  const [playlistAbierta, setPlaylistAbierta] = useState(null);

  const renderScreen = () => {
    switch (tab) {
      case 'inicio':
        return <HomeScreen onNavigate={setTab} />;
      case 'buscar':
        return <SearchScreen />;
      case 'biblioteca':
        return playlistAbierta ? (
          <PlaylistDetailScreen
            key={playlistAbierta}
            idPlaylist={playlistAbierta}
            onBack={() => setPlaylistAbierta(null)}
            onNavigate={setTab}
          />
        ) : (
          <LibraryScreen
            onNavigate={setTab}
            seccion={seccionBiblioteca}
            onChangeSeccion={setSeccionBiblioteca}
            onOpenPlaylist={setPlaylistAbierta}
          />
        );
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
      <View style={styles.screen}>{renderScreen()}</View>
      <TabBar active={tab} onChange={setTab} />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  screen: { flex: 1 },
});
