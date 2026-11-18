import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TabBar from './src/components/TabBar';
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import PlaceholderScreen from './src/screens/PlaceholderScreen';
import { colors } from './src/theme';

export default function App() {
  // La Home es la primera pantalla que se ve al abrir la app.
  const [tab, setTab] = useState('inicio');

  const renderScreen = () => {
    switch (tab) {
      case 'inicio':
        return <HomeScreen onNavigate={setTab} />;
      case 'buscar':
        return <SearchScreen />;
      case 'biblioteca':
        return <PlaceholderScreen title="Biblioteca" />;
      case 'stats':
        return <PlaceholderScreen title="Stats" />;
      case 'perfil':
        return <ProfileScreen onNavigate={setTab} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <View style={styles.screen}>{renderScreen()}</View>
        <TabBar active={tab} onChange={setTab} />
      </View>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  screen: { flex: 1 },
});
