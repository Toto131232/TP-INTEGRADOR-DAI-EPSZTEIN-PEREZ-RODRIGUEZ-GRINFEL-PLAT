import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const TABS = [
  { key: 'home', label: 'Inicio', Icon: Feather, icon: 'home' },
  { key: 'search', label: 'Buscar', Icon: Feather, icon: 'search' },
  { key: 'library', label: 'Biblioteca', Icon: MaterialCommunityIcons, icon: 'bookshelf' },
  { key: 'stats', label: 'Stats', Icon: Feather, icon: 'bar-chart-2' },
  { key: 'profile', label: 'Perfil', Icon: Feather, icon: 'user' },
];

export default function BottomTabBar({ active, onChange, bottomInset = 0 }) {
  return (
    <View style={[styles.bar, { paddingBottom: bottomInset + 8 }]}>
      {TABS.map(({ key, label, Icon, icon }) => {
        const color = key === active ? colors.primary : colors.textMuted;
        return (
          <Pressable key={key} style={styles.tab} onPress={() => onChange(key)}>
            <Icon name={icon} size={22} color={color} />
            <Text style={[styles.label, { color }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    marginTop: 4,
  },
});
