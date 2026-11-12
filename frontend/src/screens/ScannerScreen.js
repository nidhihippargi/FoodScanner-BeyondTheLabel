// Screen 1: hybrid scanner. Barcode mode auto-detects EAN/UPC; OCR mode snaps a photo of the label.
import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import ScannerOverlay from '../components/ScannerOverlay';
import { lookupBarcode, USE_MOCK } from '../services/api';
import { recognizeText } from '../services/vision';
import { useScanHistory } from '../context/ScanHistoryContext';
import { usePreferences } from '../context/PreferenceContext';
import { DECEPTIVE_CEREAL, CLEAN_SNACK } from '../utils/mockData';
import { colors, radius } from '../utils/theme';

export default function ScannerScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const lock = useRef(false); // prevents the camera from firing many scans for one barcode

  const [mode, setMode] = useState('barcode'); // 'barcode' | 'ocr'
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState(null); // { barcode, message }

  const { addScan } = useScanHistory();
  const { activeCount } = usePreferences();

  const handleBarcode = useCallback(async (barcode) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const res = await lookupBarcode(barcode);
      if (res.found) {
        addScan(res.product);
        navigation.navigate('ProductDetail', { product: res.product });
      } else {
        setNotFound(res);
      }
    } catch (e) {
      setNotFound({ barcode, message: 'Something went wrong while looking up this barcode.' });
    } finally {
      setBusy(false);
      setTimeout(() => { lock.current = false; }, 1500); // cool-down before the next scan
    }
  }, [addScan, navigation]);

  const handleShutter = async () => {
    if (busy || !cameraRef.current) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, skipProcessing: true });
      const { text, mocked } = await recognizeText(photo.uri);
      navigation.navigate('OcrReview', { text, imageUri: photo.uri, mocked });
    } finally {
      setBusy(false);
    }
  };

  const pivotToOcr = () => { setNotFound(null); setMode('ocr'); };

  // ---- Permission states ----
  if (!permission) return <View style={styles.center} />;
  if (!permission.granted) {
    return (
      <View style={[styles.center, { padding: 32 }]}>
        <Ionicons name="camera-outline" size={56} color={colors.primary} />
        <Text style={styles.permTitle}>Camera access needed</Text>
        <Text style={styles.permText}>We use the camera to read barcodes and ingredient labels. Photos are not stored.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryText}>Allow camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isFocused ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
          onBarcodeScanned={mode === 'barcode' && !busy ? ({ data }) => handleBarcode(data) : undefined}
        />
      ) : null}

      <ScannerOverlay mode={mode} />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <RoundButton icon={torch ? 'flash' : 'flash-off'} onPress={() => setTorch((t) => !t)} />
        <View style={{ flex: 1 }} />
        <RoundButton icon="time-outline" onPress={() => navigation.navigate('History')} />
        <View>
          <RoundButton icon="person-outline" onPress={() => navigation.navigate('Preferences')} />
          {activeCount > 0 ? <View style={styles.profileBadge}><Text style={styles.profileBadgeText}>{activeCount}</Text></View> : null}
        </View>
      </View>

      {/* Bottom controls */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 12 }]}>
        {USE_MOCK ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.demoRow}>
            <Text style={styles.demoLabel}>DEMO</Text>
            <DemoChip label="Deceptive cereal" onPress={() => handleBarcode(DECEPTIVE_CEREAL.barcode)} />
            <DemoChip label="Clean snack" onPress={() => handleBarcode(CLEAN_SNACK.barcode)} />
            <DemoChip label="Unknown barcode" onPress={() => handleBarcode('0000000000000')} />
          </ScrollView>
        ) : null}

        {mode === 'ocr' ? (
          <TouchableOpacity style={styles.shutter} onPress={handleShutter} disabled={busy}>
            <View style={styles.shutterInner} />
          </TouchableOpacity>
        ) : null}

        <View style={styles.segment}>
          <SegmentTab label="Scan Barcode" icon="barcode-outline" active={mode === 'barcode'} onPress={() => setMode('barcode')} />
          <SegmentTab label="Scan Label (OCR)" icon="document-text-outline" active={mode === 'ocr'} onPress={() => setMode('ocr')} />
        </View>
      </View>

      {busy ? (
        <View style={styles.busy}><ActivityIndicator size="large" color="#fff" /><Text style={styles.busyText}>Working…</Text></View>
      ) : null}

      {/* Barcode-not-found fallback */}
      <Modal visible={!!notFound} transparent animationType="slide" onRequestClose={() => setNotFound(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <Ionicons name="search-outline" size={36} color={colors.amber} />
            <Text style={styles.sheetTitle}>Barcode not found</Text>
            <Text style={styles.sheetText}>{notFound?.message}</Text>
            {notFound?.barcode ? <Text style={styles.code}>{notFound.barcode}</Text> : null}
            <TouchableOpacity style={styles.primaryBtn} onPress={pivotToOcr}>
              <Text style={styles.primaryText}>Barcode not found? Snap ingredient label instead</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setNotFound(null)} style={{ padding: 12 }}>
              <Text style={{ color: colors.muted, fontWeight: '600' }}>Try again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const RoundButton = ({ icon, onPress }) => (
  <TouchableOpacity style={styles.round} onPress={onPress}><Ionicons name={icon} size={22} color="#fff" /></TouchableOpacity>
);
const DemoChip = ({ label, onPress }) => (
  <TouchableOpacity style={styles.chip} onPress={onPress}><Text style={styles.chipText}>{label}</Text></TouchableOpacity>
);
const SegmentTab = ({ label, icon, active, onPress }) => (
  <TouchableOpacity style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
    <Ionicons name={icon} size={18} color={active ? '#fff' : '#DDE'} />
    <Text style={[styles.tabText, active && { color: '#fff' }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  permTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 12 },
  permText: { textAlign: 'center', color: colors.muted, marginVertical: 12, lineHeight: 20 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  round: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  profileBadge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  profileBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', gap: 14 },
  demoRow: { gap: 8, paddingHorizontal: 16, alignItems: 'center' },
  demoLabel: { color: '#fff9', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  chip: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill },
  chipText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  shutter: { width: 74, height: 74, borderRadius: 37, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  segment: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: radius.pill, padding: 4 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.pill },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: '#DDE', fontWeight: '700', fontSize: 13 },
  busy: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  busyText: { color: '#fff', marginTop: 10, fontWeight: '600' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, alignItems: 'center' },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 8 },
  sheetText: { color: colors.muted, textAlign: 'center', marginTop: 6 },
  code: { fontFamily: 'Courier', color: colors.text, marginVertical: 10 },
  primaryBtn: { backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 20, borderRadius: radius.md, marginTop: 12, alignSelf: 'stretch', alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15, textAlign: 'center' },
});
