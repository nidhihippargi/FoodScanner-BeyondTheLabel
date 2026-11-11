import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, tone } from '../utils/theme';

/** Big counter pill: "3 Hidden Sugars Detected". Colour scales with the count. */
export default function SugarBadge({ count }) {
  const level = count === 0 ? 'green' : count <= 1 ? 'amber' : 'red';
  const t = tone(level);
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Ionicons name="cube-outline" size={22} color={t.fg} />
      <Text style={[styles.count, { color: t.fg }]}>{count}</Text>
      <Text style={[styles.label, { color: t.fg }]}>
        Hidden {count === 1 ? 'Sugar' : 'Sugars'} Detected
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.md },
  count: { fontSize: 28, fontWeight: '800' },
  label: { fontSize: 15, fontWeight: '700', flex: 1 },
});
