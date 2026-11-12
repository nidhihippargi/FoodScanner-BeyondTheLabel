import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { colors, levelBg, levelColor } from '../theme';
import TrafficLight from './TrafficLight';

/** Bottom-sheet "Why this matters" drawer for one flag from the verification engine. */
export default function WhyDrawer({ flag, onClose }) {
  return (
    <Modal visible={!!flag} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      {flag ? (
        <View style={styles.sheet}>
          <ScrollView>
            <View style={styles.head}>
              <TrafficLight level={flag.level} />
              <Text style={styles.title}>{flag.title}</Text>
            </View>
            <Text style={styles.detail}>{flag.detail}</Text>
            <View style={[styles.box, { backgroundColor: levelBg(flag.level), borderColor: levelColor(flag.level) }]}>
              <Text style={styles.boxTitle}>Why this matters</Text>
              <Text style={styles.body}>{flag.why}</Text>
            </View>
            {flag.benchmark ? <Text style={styles.meta}>Benchmark: {flag.benchmark}</Text> : null}
            {flag.source ? <Text style={styles.meta}>Source: {flag.source}</Text> : null}
          </ScrollView>
          <Pressable style={styles.btn} onPress={onClose}><Text style={styles.btnText}>Got it</Text></Pressable>
        </View>
      ) : null}
    </Modal>
  );
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: colors.card, padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '700', marginLeft: 10, flex: 1, color: colors.text },
  detail: { fontSize: 15, color: colors.text, marginBottom: 12 },
  box: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  boxTitle: { fontWeight: '700', marginBottom: 4, color: colors.text },
  body: { color: colors.text, lineHeight: 20 },
  meta: { color: colors.muted, fontSize: 12, marginBottom: 4 },
  btn: { backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 },
  btnText: { color: '#fff', fontWeight: '700' },
});
