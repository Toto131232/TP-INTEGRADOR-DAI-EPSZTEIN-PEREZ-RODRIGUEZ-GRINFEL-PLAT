import { StatusBar } from 'expo-status-bar';
import SearchScreen from './src/screens/SearchScreen';

export default function App() {
  return (
    <>
      <SearchScreen />
      <StatusBar style="light" />
    </>
  );
}
