import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, tone } from '../utils/theme';

const VERDICT = {
  verified: { level: 'green', icon: 'checkmark-circle', label: 'Holds true' },
  partial: { level: 'amber', icon: 'alert-circle', label: 'Partly true' },
  misleading: { level: 'red', icon: 'close-circle', label: 'Misleading' },
};

/** One front-of-pack claim with the back-of-pack evidence beneath it. */
export default function ClaimCard({ claim, verdict, evidence }) {
  const v = VERDICT[verdict] || VERDICT.partial;
  const t = tone(v.level);
  return (
    <View style={[styles.card, { borderLeftColor: t.fg }]}>
      <Text style={styles.label}>FRONT OF PACK SAYS</Text>
      <Text style={styles.claim}>“{claim}”</Text>
      <View style={[styles.evidence, { backgroundColor: t.bg }]}>
        <Ionicons name={v.icon} size={18} color={t.fg} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.verdict, { color: t.fg }]}>{v.label}</Text>
          <Text style={styles.evidenceText}>{evidence}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderLeftWidth: 4, backgroundColor: '#FAFBFA', borderRadius: radius.sm, padding: 10, marginTop: 10 },
  label: { fontSize: 10, letterSpacing: 0.8, color: colors.muted, fontWeight: '700' },
  claim: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 2 },
  evidence: { flexDirection: 'row', gap: 8, padding: 10, borderRadius: radius.sm, marginTop: 8 },
  verdict: { fontSize: 13, fontWeight: '700' },
  evidenceText: { fontSize: 13, color: colors.text, marginTop: 2, lineHeight: 18 },
});
