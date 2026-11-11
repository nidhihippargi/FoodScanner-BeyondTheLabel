// Screen 2: lets the user fix OCR mistakes (glare, foil, curved packs) before analysis.
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { analyzeIngredients } from '../services/api';
import { useScanHistory } from '../context/ScanHistoryContext';
import { colors, radius } from '../utils/theme';

export default function OcrReviewModal({ route, navigation }) {
  const { text: original = '', imageUri, mocked } = route.params || {};
  const [text, setText] = useState(original);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = React.useRef(null);
  const { addScan } = useScanHistory();

  const analyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const product = await analyzeIngredients(text);
      addScan(product);
      navigation.replace('ProductDetail', { product }); // replace so Back returns to the scanner
    } catch (e) {
      setError('Analysis failed. Check your connection and try again.');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.hintRow}>
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.thumb} /> : null}
        <Text style={styles.hint}>
          Check the text below. Glare and curved packaging can cause mistakes, such as “l” for “I” or “0” for “O”.
        </Text>
      </View>
      {mocked ? <Text style={styles.mockNote}>Demo text shown: on-device ML Kit needs a dev build (see README).</Text> : null}

      <TextInput
        ref={inputRef}
        style={styles.input}
        multiline
        value={text}
        onChangeText={setText}
        placeholder="Ingredients will appear here. You can also type or paste them."
        placeholderTextColor={colors.muted}
        textAlignVertical="top"
        autoCorrect={false}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <SecondaryBtn icon="create-outline" label="Edit / Fix Text" onPress={() => inputRef.current?.focus()} />
        <SecondaryBtn icon="trash-outline" label="Clear" onPress={() => setText('')} />
      </View>

      <TouchableOpacity style={[styles.primary, !text.trim() && { opacity: 0.5 }]} onPress={analyze} disabled={loading || !text.trim()}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Analyze Ingredients</Text>}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const SecondaryBtn = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.secondary} onPress={onPress}>
    <Ionicons name={icon} size={18} color={colors.primary} />
    <Text style={styles.secondaryText}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  hintRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  thumb: { width: 56, height: 56, borderRadius: radius.sm },
  hint: { flex: 1, color: colors.muted, fontSize: 13, lineHeight: 18 },
  mockNote: { color: colors.amber, fontSize: 12, marginTop: 8 },
  input: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 14, marginTop: 12, fontSize: 15, color: colors.text, lineHeight: 22 },
  error: { color: colors.red, marginTop: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  secondary: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary },
  secondaryText: { color: colors.primary, fontWeight: '700' },
  primary: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: radius.md, alignItems: 'center', marginTop: 12, marginBottom: 8 },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
