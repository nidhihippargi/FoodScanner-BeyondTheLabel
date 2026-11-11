// Screen 4: dietary preferences. Saved locally; matching alerts show on the analysis dashboard.
import React from 'react';
import { View, Text, Switch, ScrollView, StyleSheet } from 'react-native';
import { usePreferences } from '../context/PreferenceContext';
import DisclaimerBanner from '../components/DisclaimerBanner';
import { colors, radius } from '../utils/theme';

export default function PreferencesScreen() {
  const { prefs, setPref, setAllergen } = usePreferences();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.intro}>Set what matters to you. Scanned products that clash will show an alert at the top of their analysis.</Text>

      <Section title="Diet">
        <Row label="Vegetarian" value={prefs.vegetarian} onChange={(v) => setPref('vegetarian', v)} />
        <Row label="Vegan" value={prefs.vegan} onChange={(v) => setPref('vegan', v)} />
        <Row label="Gluten-free" value={prefs.glutenFree} onChange={(v) => setPref('glutenFree', v)} last />
      </Section>

      <Section title="Sugar">
        <Row label="Low-sugar focus" hint="Alerts when a product has more than 5 g sugars per 100 g" value={prefs.lowSugar} onChange={(v) => setPref('lowSugar', v)} last />
      </Section>

      <Section title="Allergen filters">
        <Row label="Peanuts" value={prefs.allergens.peanuts} onChange={(v) => setAllergen('peanuts', v)} />
        <Row label="Soy" value={prefs.allergens.soy} onChange={(v) => setAllergen('soy', v)} />
        <Row label="Dairy" value={prefs.allergens.dairy} onChange={(v) => setAllergen('dairy', v)} />
        <Row label="Tree nuts" value={prefs.allergens.treeNuts} onChange={(v) => setAllergen('treeNuts', v)} last />
      </Section>

      <DisclaimerBanner />
    </ScrollView>
  );
}

const Section = ({ title, children }) => (
  <View style={{ marginTop: 20 }}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.card}>{children}</View>
  </View>
);

const Row = ({ label, hint, value, onChange, last }) => (
  <View style={[styles.row, !last && styles.rowBorder]}>
    <View style={{ flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
    <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary, false: '#C8D0CB' }} />
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  intro: { color: colors.muted, lineHeight: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: colors.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  card: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { fontSize: 16, color: colors.text, fontWeight: '600' },
  hint: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
