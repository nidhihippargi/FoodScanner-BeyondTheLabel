// Recent scans. Tap to reopen the full analysis.
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useScanHistory } from '../context/ScanHistoryContext';
import { scoreProduct } from '../utils/analysis';
import { colors, radius, tone } from '../utils/theme';

export default function HistoryScreen({ navigation }) {
  const { history, clearHistory } = useScanHistory();

  if (!history.length) {
    return (
      <View style={styles.empty}>
        <Ionicons name="time-outline" size={48} color={colors.muted} />
        <Text style={styles.emptyText}>No scans yet. Scan a barcode or label to get started.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <TouchableOpacity onPress={clearHistory} style={{ alignSelf: 'flex-end', marginBottom: 8 }}>
            <Text style={{ color: colors.red, fontWeight: '700' }}>Clear history</Text>
          </TouchableOpacity>
        }
        renderItem={({ item }) => {
          const { score, rating } = scoreProduct(item);
          const t = tone(item.rating ?? rating);
          return (
            <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('ProductDetail', { product: item })}>
              <View style={[styles.score, { backgroundColor: t.bg }]}><Text style={[styles.scoreText, { color: t.fg }]}>{item.healthScore ?? score}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.meta}>{item.brand} · {new Date(item.scannedAt).toLocaleDateString()}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: 32 },
  emptyText: { color: colors.muted, textAlign: 'center', marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
  score: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  scoreText: { fontWeight: '900', fontSize: 16 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
