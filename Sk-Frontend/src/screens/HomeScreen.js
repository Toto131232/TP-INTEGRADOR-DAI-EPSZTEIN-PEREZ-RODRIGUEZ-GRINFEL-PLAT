import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import WeeklySummary from '../components/WeeklySummary';
import FavoriteCard from '../components/FavoriteCard';
import MiniPlayer from '../components/MiniPlayer';
import BottomTabBar from '../components/BottomTabBar';
import { colors } from '../theme/colors';
import { favorites, featured, nowPlaying, user, weeklyStats } from '../data/homeMock';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

// Agrupa los favoritos de a dos para armar la grilla de 2 columnas.
function chunkPairs(list) {
  const rows = [];
  for (let i = 0; i < list.length; i += 2) rows.push(list.slice(i, i + 2));
  return rows;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('home');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.hello}>Hola, {user.name}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.initials}</Text>
          </View>
        </View>

        <WeeklySummary stats={weeklyStats} />

        <Text style={styles.sectionTitle}>Tus favoritos</Text>
        <View style={styles.grid}>
          {chunkPairs(favorites).map((row) => (
            <View key={row[0].id} style={styles.gridRow}>
              {row.map((item) => (
                <FavoriteCard key={item.id} item={item} />
              ))}
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Destacado de hoy</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredList}
          style={styles.featuredScroll}
        >
          {featured.map((item) => (
            <Pressable key={item.id} style={[styles.featuredCard, { backgroundColor: item.color }]} />
          ))}
        </ScrollView>
      </ScrollView>

      <MiniPlayer track={nowPlaying} />
      <BottomTabBar active={activeTab} onChange={setActiveTab} bottomInset={insets.bottom} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 12,
    paddingTop: 24,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    color: colors.textMuted,
    fontSize: 13,
  },
  hello: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 2,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.textDark,
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 10,
  },
  grid: {
    gap: 8,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  featuredScroll: {
    marginHorizontal: -12,
  },
  featuredList: {
    paddingHorizontal: 12,
    gap: 10,
  },
  featuredCard: {
    width: 118,
    height: 72,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
});
