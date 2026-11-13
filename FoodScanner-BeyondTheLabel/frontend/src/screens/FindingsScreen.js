import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import TrafficLight from '../components/TrafficLight';
import WhyDrawer from '../components/WhyDrawer';
import { colors, gradeColor, levelBg, shadow } from '../theme';

const VERDICT = {
  consistent: ['✓', colors.green, 'Consistent'], contradicted: ['✗', colors.red, 'Contradicted'],
  questionable: ['!', colors.amber, 'Questionable'], unverifiable: ['?', colors.unknown, 'Cannot verify'],
};

export default function FindingsScreen({ route }) {
  const { product, analysis } = route.params || {};
  const [open, setOpen] = useState(null);
  if (!product || !analysis) return <View style={styles.center}><Text>No analysis to show.</Text></View>;

  const personal = analysis.flags.filter((f) => f.type === 'personal');
  const others = analysis.flags.filter((f) => f.type !== 'personal');
  const banner = analysis.personalVerdict;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={styles.hero}>
        <View style={[styles.ring, { borderColor: gradeColor(analysis.grade) }]}>
          <Text style={[styles.score, { color: gradeColor(analysis.grade) }]}>{analysis.score}</Text>
          <Text style={styles.outOf}>/100</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={styles.name}>{product.name}</Text>
          {product.brand ? <Text style={styles.brand}>{product.brand}</Text> : null}
          <Text style={styles.meta}>Grade {analysis.grade}{analysis.nutriScore && analysis.nutriScore.grade ? `  ·  Nutri-Score ${analysis.nutriScore.grade}` : ''}{analysis.nova ? `  ·  NOVA ${analysis.nova}` : ''}</Text>
          <Text style={styles.meta}>Per {product.per === '100ml' ? '100 ml' : '100 g'}{product.isDemo ? '  ·  demo data' : ''}</Text>
        </View>
      </View>

      {banner !== 'ok' ? (
        <View style={[styles.banner, { backgroundColor: banner === 'avoid' ? colors.redBg : colors.amberBg }]}>
          <Text style={styles.bannerTitle}>{banner === 'avoid' ? 'Not suitable for your profile' : 'Check against your profile'}</Text>
          {personal.map((f) => (
            <Pressable key={f.id} onPress={() => setOpen(f)}><Text style={styles.bannerLine}>• {f.title}: {f.detail}</Text></Pressable>
          ))}
        </View>
      ) : null}

      <Text style={styles.h}>Findings</Text>
      {others.map((f) => (
        <Pressable key={f.id} style={[styles.flag, { backgroundColor: levelBg(f.level) }]} onPress={() => setOpen(f)}>
          <TrafficLight level={f.level} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.flagTitle}>{f.title}</Text>
            <Text style={styles.flagDetail}>{f.detail}</Text>
          </View>
          <Text style={styles.chev}>ⓘ</Text>
        </Pressable>
      ))}

      {analysis.claimCheck.length ? <Text style={styles.h}>Label claims</Text> : null}
      {analysis.claimCheck.map((c) => {
        const [icon, color, label] = VERDICT[c.verdict] || VERDICT.unverifiable;
        return (
          <View key={c.claim} style={styles.claim}>
            <Text style={[styles.claimIcon, { color }]}>{icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.flagTitle}>"{c.claim}" <Text style={{ color }}>{label}</Text></Text>
              <Text style={styles.flagDetail}>{c.evidence}</Text>
            </View>
          </View>
        );
      })}

      {analysis.positives.length ? <><Text style={styles.h}>Good to know</Text>{analysis.positives.map((p) => <Text key={p} style={styles.pos}>✓ {p}</Text>)}</> : null}
      <Text style={styles.disclaimer}>{analysis.disclaimer}</Text>
      <WhyDrawer flag={open} onClose={() => setOpen(null)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 16, ...shadow },
  ring: { width: 92, height: 92, borderRadius: 46, borderWidth: 8, alignItems: 'center', justifyContent: 'center' },
  score: { fontSize: 28, fontWeight: '800' },
  outOf: { fontSize: 11, color: colors.muted, marginTop: -4 },
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
  brand: { color: colors.muted },
  meta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  banner: { borderRadius: 12, padding: 12, marginTop: 12 },
  bannerTitle: { fontWeight: '800', marginBottom: 4, color: colors.text },
  bannerLine: { color: colors.text, marginTop: 2 },
  h: { fontSize: 16, fontWeight: '700', marginTop: 20, marginBottom: 8, color: colors.text },
  flag: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 8 },
  flagTitle: { fontWeight: '700', color: colors.text },
  flagDetail: { color: colors.muted, fontSize: 13, marginTop: 2 },
  chev: { fontSize: 18, color: colors.muted, marginLeft: 8 },
  claim: { flexDirection: 'row', backgroundColor: colors.card, padding: 12, borderRadius: 12, marginBottom: 8, alignItems: 'flex-start' },
  claimIcon: { fontSize: 20, fontWeight: '800', width: 28 },
  pos: { color: colors.green, marginBottom: 4 },
  disclaimer: { color: colors.muted, fontSize: 11, marginTop: 20, textAlign: 'center' },
});
