import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useApp } from '../context/AppContext';
import { analyze, scanOcr } from '../services/api';
import { colors, shadow } from '../theme';

const FIELDS = [
  ['energyKcal', 'Energy', 'kcal'], ['sugar', 'Sugar', 'g'], ['sodium', 'Sodium', 'mg'], ['fat', 'Total fat', 'g'],
  ['saturatedFat', 'Saturated fat', 'g'], ['carbs', 'Carbs', 'g'], ['protein', 'Protein', 'g'], ['fiber', 'Fibre', 'g'],
];
const levelColor = { high: colors.green, medium: colors.amber, low: colors.red };

export default function OcrReviewScreen({ route, navigation }) {
  const { preferences, addHistory } = useApp();
  const params = route.params || {};
  const [text, setText] = useState(params.text || '');
  const [parsed, setParsed] = useState(null); // { ocr, product }
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(false);

  const parse = useCallback(async (t) => {
    if (!t || t.trim().length < 5) { Alert.alert('Add more text', 'Type or paste the nutrition label text first.'); return; }
    setBusy(true);
    try {
      const data = await scanOcr(t);
      setParsed(data);
      const v = {}; FIELDS.forEach(([k]) => { v[k] = data.product.nutrition[k] == null ? '' : String(data.product.nutrition[k]); });
      setValues(v);
    } catch (e) { Alert.alert('Could not read label', e.message); } finally { setBusy(false); }
  }, []);

  useEffect(() => { if ((params.text || '').trim().length >= 5) parse(params.text); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    if (!parsed) return;
    const nutrition = { ...parsed.product.nutrition };
    FIELDS.forEach(([k]) => { const n = parseFloat(String(values[k]).replace(',', '.')); nutrition[k] = Number.isFinite(n) ? n : null; });
    setBusy(true);
    try {
      const r = await analyze({ product: { ...parsed.product, nutrition }, preferences });
      addHistory({ scanId: r.scanId, productName: r.product.name, score: r.analysis.score, grade: r.analysis.grade, product: r.product, analysis: r.analysis });
      navigation.replace('Findings', { product: r.product, analysis: r.analysis });
    } catch (e) { Alert.alert('Analysis failed', e.message); } finally { setBusy(false); }
  };

  const ocr = parsed && parsed.ocr;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      {params.ocrUnavailable ? (
        <View style={styles.notice}><Text style={styles.noticeText}>On-device text recognition isn't available in this build (it needs a development build, not Expo Go). Paste or type the label text below.</Text></View>
      ) : null}

      <Text style={styles.h}>Label text</Text>
      <TextInput style={styles.area} multiline value={text} onChangeText={setText} placeholder={'Energy 450 kcal\nSugar 22 g\nSodium 640 mg\nIngredients: ...'} textAlignVertical="top" />
      <Pressable style={styles.secondary} onPress={() => parse(text)} disabled={busy}><Text style={styles.secondaryText}>Read / re-read label</Text></Pressable>

      {ocr ? (
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.h2}>OCR confidence</Text>
            <Text style={[styles.badge, { backgroundColor: levelColor[ocr.level] }]}>{ocr.level.toUpperCase()} · {Math.round(ocr.confidence * 100)}%</Text>
          </View>
          {ocr.missing.length ? <Text style={styles.warn}>Not detected: {ocr.missing.join(', ')}. Please fill these in.</Text> : <Text style={styles.okText}>All key nutrients detected. Check the numbers below.</Text>}
          <View style={styles.grid}>
            {FIELDS.map(([k, label, unit]) => (
              <View key={k} style={styles.cell}>
                <Text style={styles.label}>{label} ({unit})</Text>
                <TextInput style={styles.input} keyboardType="decimal-pad" value={values[k] ?? ''} onChangeText={(v) => setValues((s) => ({ ...s, [k]: v }))} placeholder="-" />
              </View>
            ))}
          </View>
          {parsed.product.additives.length ? <Text style={styles.meta}>Additives found: {parsed.product.additives.join(', ')}</Text> : null}
          {parsed.product.claims.length ? <Text style={styles.meta}>Claims found: {parsed.product.claims.join(', ')}</Text> : null}
          <Text style={styles.meta}>Values are per {parsed.product.per === '100ml' ? '100 ml' : '100 g'} ({parsed.product.basisNote || 'as printed'}).</Text>
        </View>
      ) : null}

      <Pressable style={[styles.primary, (!parsed || busy) && { opacity: 0.5 }]} disabled={!parsed || busy} onPress={submit}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Analyse</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  notice: { backgroundColor: colors.amberBg, borderRadius: 12, padding: 12, marginBottom: 12 },
  noticeText: { color: colors.text },
  h: { fontWeight: '700', fontSize: 16, marginBottom: 8, color: colors.text },
  h2: { fontWeight: '700', fontSize: 15, color: colors.text },
  area: { minHeight: 140, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12 },
  secondary: { borderWidth: 1, borderColor: colors.primary, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 10 },
  secondaryText: { color: colors.primary, fontWeight: '700' },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginTop: 16, ...shadow },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge: { color: '#fff', fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, overflow: 'hidden', fontSize: 12 },
  warn: { color: colors.red, marginBottom: 8 },
  okText: { color: colors.green, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  cell: { width: '50%', padding: 4 },
  label: { fontSize: 12, color: colors.muted, marginBottom: 2 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, height: 40, backgroundColor: '#fff' },
  meta: { color: colors.muted, fontSize: 12, marginTop: 8 },
  primary: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
