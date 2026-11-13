import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../utils/theme';

/** Card with a tappable header that expands/collapses its children. `right` is an optional header badge. */
export default function CollapsibleCard({ title, icon, right, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.header} onPress={() => setOpen((o) => !o)} activeOpacity={0.7}>
        {icon ? <Ionicons name={icon} size={20} color={colors.primary} /> : null}
        <Text style={styles.title}>{title}</Text>
        {right}
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />
      </TouchableOpacity>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.md, marginHorizontal: 16, marginTop: 12, borderWidth: 1, borderColor: colors.border },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text },
  body: { paddingHorizontal: 14, paddingBottom: 14 },
});
