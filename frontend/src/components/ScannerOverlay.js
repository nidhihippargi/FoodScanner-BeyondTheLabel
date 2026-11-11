import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/** Targeting frame drawn over the camera. Wide for barcodes, tall for ingredient labels. */
export default function ScannerOverlay({ mode }) {
  const isBarcode = mode === 'barcode';
  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={[styles.frame, isBarcode ? styles.wide : styles.tall]}>
        <View style={[styles.corner, styles.tl]} />
        <View style={[styles.corner, styles.tr]} />
        <View style={[styles.corner, styles.bl]} />
        <View style={[styles.corner, styles.br]} />
        {isBarcode ? <View style={styles.laser} /> : null}
      </View>
      <Text style={styles.hint}>
        {isBarcode ? 'Align the barcode inside the frame' : 'Fill the frame with the ingredients list, then tap the shutter'}
      </Text>
    </View>
  );
}

const C = '#FFFFFF';
const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame: { justifyContent: 'center' },
  wide: { width: '80%', height: 170 },
  tall: { width: '86%', height: 320 },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: C },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 10 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 10 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 10 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 10 },
  laser: { height: 2, backgroundColor: '#FF4D4D', marginHorizontal: 8, opacity: 0.85 },
  hint: { color: C, marginTop: 18, fontSize: 14, textAlign: 'center', paddingHorizontal: 32, textShadowColor: '#000A', textShadowRadius: 4 },
});
