import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useApp } from '../context/AppContext';
import { analyze, scanBarcode } from '../services/api';
import { colors, shadow } from '../theme';

const DEMOS = [
  ['Maggi', '8901058851298'], ['Lay\'s', '8901491101837'], ['Coca-Cola', '5449000000996'], ['Bournvita', '8901000000019'],
];

function recognizeText(uri) {
  // ML Kit needs a dev build (not Expo Go). Missing/failed native module -> manual entry on the review screen.
  try {
    const mod = require('@react-native-ml-kit/text-recognition');
    const TR = mod.default || mod;
    return TR.recognize(uri).then((r) => ({ text: (r && r.text) || '', available: true })).catch(() => ({ text: '', available: false }));
  } catch (e) {
    return Promise.resolve({ text: '', available: false });
  }
}

export default function ScanScreen({ navigation }) {
  const { preferences, addHistory } = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState('barcode');
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState('');
  const lock = useRef(false);
  const cameraRef = useRef(null);

  const runBarcode = async (code) => {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try {
      const scanned = await scanBarcode(code);
      const result = await analyze({ product: scanned.product, preferences });
      addHistory({ scanId: result.scanId, productName: result.product.name, score: result.analysis.score, grade: result.analysis.grade, product: result.product, analysis: result.analysis });
      navigation.navigate('Findings', { product: result.product, analysis: result.analysis });
    } catch (e) {
      const buttons = [{ text: 'OK' }];
      if (e.code === 'PRODUCT_NOT_FOUND') buttons.unshift({ text: 'Scan label instead', onPress: () => setMode('ocr') });
      Alert.alert('Could not analyse product', e.message, buttons);
    } finally {
      setBusy(false);
      setTimeout(() => { lock.current = false; }, 1500);
    }
  };

  const capture = async () => {
    if (lock.current || !cameraRef.current) return;
    lock.current = true; setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, skipProcessing: true });
      const { text, available } = await recognizeText(photo.uri);
      navigation.navigate('OcrReview', { text, ocrUnavailable: !available });
    } catch (e) {
      Alert.alert('Camera error', e.message);
    } finally { setBusy(false); lock.current = false; }
  };

  const granted = permission && permission.granted;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <View style={styles.toggle}>
        {[['barcode', 'Barcode'], ['ocr', 'Label (OCR)']].map(([k, label]) => (
          <Pressable key={k} style={[styles.tab, mode === k && styles.tabOn]} onPress={() => setMode(k)}>
            <Text style={[styles.tabText, mode === k && styles.tabTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.cameraBox}>
        {granted ? (
          <CameraView
            ref={cameraRef} style={StyleSheet.absoluteFill} facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={mode === 'barcode' && !busy ? ({ data }) => runBarcode(data) : undefined}
          />
        ) : (
          <View style={styles.perm}>
            <Text style={styles.permText}>Camera access is needed to scan.</Text>
            <Pressable style={styles.btn} onPress={requestPermission}><Text style={styles.btnText}>Allow camera</Text></Pressable>
          </View>
        )}
        {granted ? <View pointerEvents="none" style={mode === 'barcode' ? styles.frameBar : styles.frameLabel} /> : null}
        {busy ? <View style={styles.busy}><ActivityIndicator size="large" color="#fff" /></View> : null}
      </View>

      {mode === 'ocr' ? (
        <Pressable style={[styles.btn, !granted && styles.disabled]} disabled={!granted || busy} onPress={capture}>
          <Text style={styles.btnText}>Capture nutrition label</Text>
        </Pressable>
      ) : <Text style={styles.hint}>Point the camera at a product barcode.</Text>}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Enter barcode manually</Text>
        <View style={{ flexDirection: 'row' }}>
          <TextInput style={styles.input} value={manual} onChangeText={setManual} placeholder="e.g. 8901058851298" keyboardType="number-pad" maxLength={14} />
          <Pressable style={[styles.go, (!manual || busy) && styles.disabled]} disabled={!manual || busy} onPress={() => runBarcode(manual)}>
            <Text style={styles.btnText}>Go</Text>
          </Pressable>
        </View>
        <Text style={styles.cardTitle2}>Try a demo product</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {DEMOS.map(([n, code]) => (
            <Pressable key={code} style={styles.demo} disabled={busy} onPress={() => runBarcode(code)}><Text style={styles.demoText}>{n}</Text></Pressable>
          ))}
        </View>
        <Pressable onPress={() => navigation.navigate('OcrReview', { text: '', ocrUnavailable: false })}>
          <Text style={styles.link}>Or type / paste label text</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  toggle: { flexDirection: 'row', backgroundColor: '#E6ECE7', borderRadius: 12, padding: 4, marginBottom: 12 },
  tab: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 10 },
  tabOn: { backgroundColor: colors.card, ...shadow },
  tabText: { color: colors.muted, fontWeight: '600' },
  tabTextOn: { color: colors.primary },
  cameraBox: { height: 300, borderRadius: 16, overflow: 'hidden', backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  perm: { alignItems: 'center', padding: 20 },
  permText: { color: '#fff', marginBottom: 12 },
  frameBar: { width: '70%', height: 110, borderWidth: 2, borderColor: '#fff', borderRadius: 10 },
  frameLabel: { width: '85%', height: '75%', borderWidth: 2, borderColor: '#fff', borderRadius: 10 },
  busy: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  btn: { backgroundColor: colors.primary, padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  btnText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.5 },
  hint: { textAlign: 'center', color: colors.muted, marginTop: 10 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginTop: 16, ...shadow },
  cardTitle: { fontWeight: '700', marginBottom: 8, color: colors.text },
  cardTitle2: { fontWeight: '700', marginTop: 16, marginBottom: 8, color: colors.text },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, height: 44, backgroundColor: '#fff' },
  go: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 18, marginLeft: 8, justifyContent: 'center' },
  demo: { backgroundColor: '#E8F5E9', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 8 },
  demoText: { color: colors.primary, fontWeight: '600' },
  link: { color: colors.primary, marginTop: 8, fontWeight: '600' },
});
