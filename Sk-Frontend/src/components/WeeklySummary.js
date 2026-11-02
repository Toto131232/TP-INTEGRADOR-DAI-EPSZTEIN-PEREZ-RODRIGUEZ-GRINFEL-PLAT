import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

function StatBox({ value, label }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function WeeklySummary({ stats }) {
  const progress = stats.total > 0 ? stats.listened / stats.total : 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Tu semana en SKMusic</Text>
        <Pressable hitSlop={8}>
          <Text style={styles.link}>Ver stats</Text>
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <StatBox value={stats.inLibrary} label="en biblioteca" />
        <StatBox value={stats.rated} label="calificadas" />
        <StatBox value={stats.reviews} label="reseñas" />
      </View>

      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>Progreso: biblioteca escuchada</Text>
        <Text style={styles.progressValue}>
          {stats.listened} de {stats.total}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  link: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.cardInner,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  statValue: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  progressValue: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.track,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
});
