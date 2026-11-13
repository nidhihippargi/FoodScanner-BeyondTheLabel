import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { levelColor } from '../theme';

const LABEL = { red: 'High', amber: 'Medium', green: 'Low', unknown: 'N/A' };

export default function TrafficLight({ level = 'unknown', showLabel = false }) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: levelColor(level) }]} />
      {showLabel ? <Text style={[styles.label, { color: levelColor(level) }]}>{LABEL[level] || 'N/A'}</Text> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 14, height: 14, borderRadius: 7 },
  label: { marginLeft: 6, fontWeight: '700', fontSize: 12 },
});
