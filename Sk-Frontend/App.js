import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from './src/screens/HomeScreen';

// TEMPORAL: la Home es la primera pantalla hasta que exista el inicio de sesión.
export default function App() {
  return (
    <SafeAreaProvider>
      <HomeScreen />
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
