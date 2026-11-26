import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TabBar from './src/components/TabBar';
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import PlaylistDetailScreen from './src/screens/PlaylistDetailScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import SongDetailScreen from './src/screens/SongDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import StatsScreen from './src/screens/StatsScreen';
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
  // La Home es la primera pantalla que se ve al entrar.
  const [tab, setTab] = useState('inicio');
  // Biblioteca: sección elegida y playlist abierta (null = se ve la lista). Viven acá porque
  // LibraryScreen se desmonta al cambiar de pestaña: así, si desde el detalle de una playlist
  // vas a Buscar y volvés a Biblioteca, seguís viendo esa playlist.
  const [seccionBiblioteca, setSeccionBiblioteca] = useState('canciones');
  const [playlistAbierta, setPlaylistAbierta] = useState(null);
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
        return playlistAbierta ? (
          <PlaylistDetailScreen
            key={playlistAbierta}
            idPlaylist={playlistAbierta}
            onBack={() => setPlaylistAbierta(null)}
            onNavigate={cambiarTab}
            onOpenSong={abrirCancion}
          />
        ) : (
          <LibraryScreen
            onNavigate={cambiarTab}
            onOpenSong={abrirCancion}
            seccion={seccionBiblioteca}
            onChangeSeccion={setSeccionBiblioteca}
            onOpenPlaylist={setPlaylistAbierta}
          />
        );
      case 'stats':
        return <StatsScreen />;
      case 'perfil':
        return <ProfileScreen />;
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
