import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../utils/theme';

/** Always-visible informational disclaimer (FSSAI/WHO, not medical advice). */
export default function DisclaimerBanner() {
  return (
    <View style={styles.box}>
      <Ionicons name="information-circle" size={18} color={colors.muted} />
      <Text style={styles.text}>
        Informational analysis based on public guidelines (FSSAI/WHO). Not intended as medical advice.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', gap: 8, backgroundColor: '#EEF1EF', padding: 10, borderRadius: radius.sm, marginTop: 12 },
  text: { flex: 1, fontSize: 12, color: colors.muted, lineHeight: 16 },
});
