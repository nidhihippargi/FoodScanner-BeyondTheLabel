import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, tone } from '../utils/theme';

/** Rows come from getNutritionView(). The coloured dot is the per-100 g traffic light. */
export default function NutritionTable({ rows, basisLabel }) {
  return (
    <View>
      <Text style={styles.basis}>{basisLabel}</Text>
      {rows.map((r) => (
        <View key={r.key} style={styles.row}>
          <View style={[styles.dot, { backgroundColor: r.level ? tone(r.level).fg : 'transparent' }]} />
          <Text style={styles.name}>{r.label}</Text>
          <Text style={styles.value}>{r.value == null ? '–' : `${r.value} ${r.unit}`}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  basis: { fontSize: 12, color: colors.muted, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.border },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  name: { flex: 1, fontSize: 15, color: colors.text },
  value: { fontSize: 15, fontWeight: '700', color: colors.text },
});
