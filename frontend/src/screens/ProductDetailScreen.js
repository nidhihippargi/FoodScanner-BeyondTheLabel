// Screen 3: product analysis & evidence dashboard, built from collapsible cards.
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Image, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CollapsibleCard from '../components/CollapsibleCard';
import DisclaimerBanner from '../components/DisclaimerBanner';
import ClaimCard from '../components/ClaimCard';
import SugarBadge from '../components/SugarBadge';
import NutritionTable from '../components/NutritionTable';
import { usePreferences } from '../context/PreferenceContext';
import { detectSugars, detectAdditives, additiveRiskForIngredient, scoreProduct } from '../utils/analysis';
import { getNutritionView, getPerServing } from '../utils/normalizer';
import { buildAlerts } from '../utils/alerts';
import { SUGAR_ALIASES } from '../utils/sugarAliases';
import { colors, radius, tone, RATING_LABEL } from '../utils/theme';

export default function ProductDetailScreen({ route }) {
  const { product } = route.params;
  const { prefs } = usePreferences();

  // Everything below is derived from the product, so mock, backend and OCR results render identically.
  const sugars = useMemo(() => detectSugars(product.ingredients), [product]);
  const hiddenSugars = sugars.filter((s) => s.hidden);
  const additives = useMemo(() => product.additives || detectAdditives(product.ingredients.join(', ')), [product]);
  const { score, rating } = useMemo(() => {
    const s = scoreProduct({ ...product, additives });
    return { score: product.healthScore ?? s.score, rating: product.rating ?? s.rating };
  }, [product, additives]);
  const alerts = useMemo(() => buildAlerts(product, prefs), [product, prefs]);

  const hasServing = !!getPerServing(product.nutrition);
  const [normalized, setNormalized] = useState(!hasServing);
  const nutrition = getNutritionView(product.nutrition, normalized ? 'normalized' : 'packaged');

  const t = tone(rating);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* 1. Header card */}
      <View style={[styles.card, styles.header]}>
        <View style={styles.headerRow}>
          {product.image ? (
            <Image source={{ uri: product.image }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]}><Ionicons name="nutrition-outline" size={30} color={colors.muted} /></View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{product.name}</Text>
            <Text style={styles.brand}>{product.brand}</Text>
            <View style={[styles.rating, { backgroundColor: t.bg }]}>
              <View style={[styles.dot, { backgroundColor: t.fg }]} />
              <Text style={[styles.ratingText, { color: t.fg }]}>{RATING_LABEL[rating]}</Text>
            </View>
          </View>
          <View style={[styles.scoreRing, { borderColor: t.fg }]}>
            <Text style={[styles.score, { color: t.fg }]}>{score}</Text>
            <Text style={styles.scoreMax}>/100</Text>
          </View>
        </View>
        <DisclaimerBanner />
      </View>

      {/* Preference alerts sit right under the header so they are seen first */}
      {alerts.map((a) => {
        const at = tone(a.severity);
        return (
          <View key={a.id} style={[styles.alert, { backgroundColor: at.bg, borderColor: at.fg }]}>
            <Ionicons name="warning" size={20} color={at.fg} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.alertTitle, { color: at.fg }]}>{a.title}</Text>
              <Text style={styles.alertText}>{a.detail}</Text>
            </View>
          </View>
        );
      })}

      {/* 2. Front vs back of pack */}
      <CollapsibleCard title="Front vs. Back of Pack" icon="eye-outline">
        {product.claims?.length ? (
          product.claims.map((c, i) => <ClaimCard key={i} {...c} />)
        ) : (
          <Text style={styles.muted}>No front-of-pack claims were captured for this product. Scan the front label or use a barcode for a claim check.</Text>
        )}
      </CollapsibleCard>

      {/* 3. Hidden sugar revealer */}
      <CollapsibleCard title="Hidden Sugar Revealer" icon="cube-outline">
        <SugarBadge count={hiddenSugars.length} />
        {sugars.length === 0 ? (
          <Text style={[styles.muted, { marginTop: 10 }]}>No sugar aliases found in the ingredient list.</Text>
        ) : (
          <View style={{ marginTop: 10 }}>
            {sugars.map((s) => (
              <View key={s.index} style={styles.sugarRow}>
                <View style={[styles.sugarTag, { backgroundColor: tone(s.topThree ? 'red' : 'amber').bg }]}>
                  <Text style={[styles.sugarTagText, { color: tone(s.topThree ? 'red' : 'amber').fg }]}>{s.alias}</Text>
                </View>
                <Text style={styles.sugarMeta}>
                  ingredient #{s.index + 1}{s.topThree ? ' (top 3 by weight)' : ''}{s.hidden ? '' : ' · plain sugar'}
                </Text>
              </View>
            ))}
          </View>
        )}
        <Text style={styles.footnote}>Checked against {SUGAR_ALIASES.length} common sugar names. Ingredients are listed from largest to smallest amount.</Text>
      </CollapsibleCard>

      {/* 4. Serving size normalizer */}
      <CollapsibleCard title="Serving Size Normalizer" icon="swap-horizontal-outline">
        <View style={styles.toggleRow}>
          <Text style={[styles.toggleLabel, !normalized && styles.toggleActive]} numberOfLines={2}>
            As Packaged{product.nutrition?.servingLabel ? ` (${product.nutrition.servingLabel})` : ''}
          </Text>
          <Switch
            value={normalized}
            onValueChange={setNormalized}
            disabled={!nutrition.canToggle}
            trackColor={{ true: colors.primary, false: '#C8D0CB' }}
          />
          <Text style={[styles.toggleLabel, normalized && styles.toggleActive, { textAlign: 'right' }]}>Normalized (per 100 g / ml)</Text>
        </View>
        <NutritionTable rows={nutrition.rows} basisLabel={nutrition.basisLabel} />
        <Text style={styles.footnote}>Dots show traffic-light levels judged per 100 g, so they stay the same when you switch views.</Text>
      </CollapsibleCard>

      {/* 5. Ingredients & additives */}
      <CollapsibleCard title="Ingredients & Additives" icon="list-outline">
        <View style={styles.chips}>
          {product.ingredients.map((ing, i) => {
            const sugar = sugars.find((s) => s.index === i);
            const addRisk = additiveRiskForIngredient(ing);
            const level = sugar ? (sugar.topThree ? 'red' : 'amber') : addRisk === 'high' ? 'red' : addRisk === 'moderate' ? 'amber' : null;
            const ct = level ? tone(level) : { fg: colors.text, bg: '#EEF1EF' };
            return (
              <View key={i} style={[styles.chip, { backgroundColor: ct.bg }]}>
                <Text style={[styles.chipText, { color: ct.fg, fontWeight: level ? '700' : '500' }]}>{i + 1}. {ing}</Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.subhead}>Additive Decoder</Text>
        {additives.length === 0 ? (
          <Text style={styles.muted}>No INS / E-number additives found.</Text>
        ) : (
          additives.map((a) => <AdditiveRow key={a.code} additive={a} />)
        )}
      </CollapsibleCard>
    </ScrollView>
  );
}

/** Tap a row to reveal the plain-English explanation (RN has no hover tooltips). */
function AdditiveRow({ additive }) {
  const [open, setOpen] = useState(false);
  const t = tone(additive.risk === 'high' ? 'red' : additive.risk === 'moderate' ? 'amber' : 'green');
  return (
    <TouchableOpacity style={styles.additive} onPress={() => setOpen((o) => !o)} activeOpacity={0.7}>
      <View style={styles.additiveTop}>
        <View style={[styles.dot, { backgroundColor: t.fg }]} />
        <Text style={styles.additiveName}>{additive.code} – {additive.name}</Text>
        <Ionicons name="help-circle-outline" size={18} color={colors.muted} />
      </View>
      <Text style={styles.additiveFn}>{additive.function}</Text>
      {open ? <Text style={styles.additiveExplain}>{additive.explanation}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  card: { backgroundColor: colors.card, borderRadius: radius.md, marginHorizontal: 16, marginTop: 12, borderWidth: 1, borderColor: colors.border },
  header: { padding: 14 },
  headerRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  thumb: { width: 72, height: 72, borderRadius: radius.sm },
  thumbPlaceholder: { backgroundColor: '#EEF1EF', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 18, fontWeight: '800', color: colors.text },
  brand: { fontSize: 13, color: colors.muted, marginTop: 2 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, marginTop: 8 },
  ratingText: { fontSize: 12, fontWeight: '800' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  scoreRing: { width: 64, height: 64, borderRadius: 32, borderWidth: 5, alignItems: 'center', justifyContent: 'center' },
  score: { fontSize: 20, fontWeight: '900', lineHeight: 22 },
  scoreMax: { fontSize: 9, color: colors.muted },
  alert: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 10, padding: 12, borderRadius: radius.md, borderWidth: 1 },
  alertTitle: { fontWeight: '800', fontSize: 14 },
  alertText: { color: colors.text, fontSize: 13, marginTop: 2 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 6 },
  footnote: { color: colors.muted, fontSize: 12, marginTop: 12, lineHeight: 16 },
  sugarRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  sugarTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  sugarTagText: { fontWeight: '800', fontSize: 13, textTransform: 'capitalize' },
  sugarMeta: { flex: 1, fontSize: 12, color: colors.muted },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  toggleLabel: { flex: 1, fontSize: 12, color: colors.muted },
  toggleActive: { color: colors.text, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill },
  chipText: { fontSize: 13 },
  subhead: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 18, marginBottom: 4 },
  additive: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  additiveTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  additiveName: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  additiveFn: { fontSize: 12, color: colors.muted, marginLeft: 18, marginTop: 2 },
  additiveExplain: { fontSize: 13, color: colors.text, backgroundColor: '#F1F4F2', padding: 10, borderRadius: radius.sm, marginTop: 8, marginLeft: 18, lineHeight: 18 },
});
