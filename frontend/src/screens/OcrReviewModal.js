
// Screen 2: lets the user review and correct OCR results before analysis.

import React, { useState } from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { analyzeIngredients } from '../services/api';
import { useScanHistory } from '../context/ScanHistoryContext';
import { colors, radius } from '../utils/theme';

export default function OcrReviewModal({ route, navigation }) {
  const {
    text: original = '',
    imageUri,
    parsedData = null,
    warnings = [],
    engine = null,
  } = route.params || {};

  const [text, setText] = useState(original);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const inputRef = React.useRef(null);
  const { addScan } = useScanHistory();

  // -----------------------------------------
  // ANALYZE REVIEWED INGREDIENTS
  // -----------------------------------------

  const analyze = async () => {
    if (!text.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      // Pass edited ingredients and extracted Vision data.
      const product = await analyzeIngredients(text, parsedData);

      addScan(product);

      // Replace so Back returns to the scanner.
      navigation.replace('ProductDetail', { product });

    } catch (e) {
      setError(
        e.message || 'Analysis failed. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------
  // REVIEW UI
  // -----------------------------------------

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Captured image and instructions */}

        <View style={styles.hintRow}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.thumb}
            />
          ) : null}

          <View style={styles.hintContent}>
            <Text style={styles.hintTitle}>
              Review your ingredients
            </Text>

            <Text style={styles.hint}>
              Check the extracted text carefully. Correct mistakes caused by
              glare, curved packaging or unclear printing.
            </Text>
          </View>
        </View>

        {/* OCR engine information */}

        {engine ? (
          <Text style={styles.engineNote}>
            Text recognition: {engine}
          </Text>
        ) : null}

        {/* Extraction warnings */}

        {warnings.length > 0 ? (
          <View style={styles.warningBox}>
            <View style={styles.warningHeading}>
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color={colors.amber}
              />

              <Text style={styles.warningTitle}>
                Please review these warnings
              </Text>
            </View>

            {warnings.map((warning, index) => {
              const message =
                typeof warning === 'string'
                  ? warning
                  : warning?.message || 'Some label information may need review.';

              return (
                <Text
                  key={index}
                  style={styles.warningText}
                >
                  {'\u2022'} {message}
                </Text>
              );
            })}
          </View>
        ) : null}

        {/* Extracted product name */}

        {parsedData?.productName ? (
          <View style={styles.productInfo}>
            <Text style={styles.sectionLabel}>
              DETECTED PRODUCT
            </Text>

            <Text style={styles.productName}>
              {parsedData.productName}
            </Text>
          </View>
        ) : null}

        {/* Editable ingredients */}

        <Text style={styles.sectionLabel}>
          INGREDIENTS
        </Text>

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

        {/* Nutrition extraction information */}

        {parsedData?.rawNutrition ? (
          <View style={styles.nutritionInfo}>
            <Text style={styles.sectionLabel}>
              NUTRITION INFORMATION
            </Text>

            <Text style={styles.nutritionText}>
              {parsedData.nutritionBasis === 'per_100g'
                ? 'Nutrition values extracted per 100 g.'
                : parsedData.nutritionBasis === 'per_serving'
                  ? `Nutrition values extracted per serving${parsedData.servingSize ? ` (${parsedData.servingSize})` : ''}.`
                  : 'Nutrition information was detected, but its serving basis is unclear. It will not be used for nutrition analysis.'}
            </Text>
          </View>
        ) : null}

        {/* Editing controls */}

        <View style={styles.actions}>
          <SecondaryBtn
            icon="create-outline"
            label="Edit / Fix Text"
            onPress={() => inputRef.current?.focus()}
          />

          <SecondaryBtn
            icon="trash-outline"
            label="Clear"
            onPress={() => setText('')}
          />
        </View>

        {/* Error message */}

        {error ? (
          <Text style={styles.error}>
            {error}
          </Text>
        ) : null}

        {/* Analyze button */}

        <TouchableOpacity
          style={[
            styles.primary,
            (!text.trim() || loading) && { opacity: 0.5 },
          ]}
          onPress={analyze}
          disabled={loading || !text.trim()}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>
              Analyze Ingredients
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// -----------------------------------------
// REUSABLE BUTTON
// -----------------------------------------

const SecondaryBtn = ({ icon, label, onPress }) => (
  <TouchableOpacity
    style={styles.secondary}
    onPress={onPress}
  >
    <Ionicons
      name={icon}
      size={18}
      color={colors.primary}
    />

    <Text style={styles.secondaryText}>
      {label}
    </Text>
  </TouchableOpacity>
);

// -----------------------------------------
// STYLES
// -----------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  content: {
    flexGrow: 1,
    padding: 16,
  },

  hintRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },

  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
  },

  hintContent: {
    flex: 1,
  },

  hintTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },

  hint: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },

  engineNote: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 8,
  },

  warningBox: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.amber,
    borderRadius: radius.md,
    padding: 12,
    marginTop: 14,
  },

  warningHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },

  warningTitle: {
    color: colors.amber,
    fontWeight: '800',
    fontSize: 13,
  },

  warningText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },

  productInfo: {
    marginTop: 16,
    marginBottom: 12,
  },

  sectionLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 6,
  },

  productName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },

  input: {
    minHeight: 180,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginTop: 4,
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },

  nutritionInfo: {
    marginTop: 8,
  },

  nutritionText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },

  error: {
    color: colors.red,
    marginTop: 10,
    lineHeight: 20,
  },

  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },

  secondary: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },

  secondaryText: {
    color: colors.primary,
    fontWeight: '700',
  },

  primary: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },

  primaryText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
});
