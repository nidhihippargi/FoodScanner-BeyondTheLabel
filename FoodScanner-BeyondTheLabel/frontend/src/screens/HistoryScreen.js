import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert } from 'react-native';
import { useApp } from '../context/AppContext';
import { colors, gradeColor, shadow } from '../theme';

export default function HistoryScreen({ navigation }) {
  const { history, clearHistory } = useApp();
  const confirmClear = () => Alert.alert('Clear history?', 'This removes all saved scans from this device.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Clear', style: 'destructive', onPress: clearHistory }]);
  return (
    <View style={styles.screen}>
      <FlatList
        data={history}
        keyExtractor={(i) => i.scanId || i.createdAt}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>No scans yet. Scan a product to see it here.</Text>}
        ListFooterComponent={history.length ? <Pressable onPress={confirmClear}><Text style={styles.clear}>Clear history</Text></Pressable> : null}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => navigation.navigate('Findings', { product: item.product, analysis: item.analysis })}>
            <View style={[styles.badge, { backgroundColor: gradeColor(item.grade) }]}><Text style={styles.badgeText}>{item.grade}</Text></View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.name} numberOfLines={1}>{item.productName}</Text>
              <Text style={styles.meta}>Score {item.score}/100 · {new Date(item.createdAt).toLocaleString()}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: 12, borderRadius: 14, marginBottom: 10, ...shadow },
  badge: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  name: { fontWeight: '700', color: colors.text },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  clear: { color: colors.red, textAlign: 'center', marginTop: 12, fontWeight: '600' },
});
