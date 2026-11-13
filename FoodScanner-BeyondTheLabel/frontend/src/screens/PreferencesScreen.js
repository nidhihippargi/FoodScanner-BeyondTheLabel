import React from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import Chip from '../components/Chip';
import { useApp } from '../context/AppContext';
import { colors } from '../theme';

// Ids must match verification/rules.js and verifier.js
const SECTIONS = [
  ['allergens', 'Allergens to avoid', [['milk', 'Milk'], ['peanut', 'Peanut'], ['tree nuts', 'Tree nuts'], ['gluten', 'Gluten / wheat'], ['soy', 'Soy'], ['egg', 'Egg'], ['fish', 'Fish'], ['shellfish', 'Shellfish'], ['sesame', 'Sesame'], ['mustard', 'Mustard']]],
  ['diets', 'Diet', [['vegetarian', 'Vegetarian'], ['vegan', 'Vegan']]],
  ['conditions', 'Health considerations', [['diabetes', 'Diabetes'], ['hypertension', 'High blood pressure'], ['pku', 'PKU'], ['gout', 'Gout'], ['children', 'Buying for children']]],
];

export default function PreferencesScreen() {
  const { preferences, togglePref } = useApp();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.intro}>Saved on this device. Your selections are applied to every scan.</Text>
      {SECTIONS.map(([group, title, opts]) => (
        <View key={group} style={{ marginBottom: 16 }}>
          <Text style={styles.h}>{title}</Text>
          <View style={styles.wrap}>
            {opts.map(([id, label]) => <Chip key={id} label={label} selected={(preferences[group] || []).includes(id)} onPress={() => togglePref(group, id)} />)}
          </View>
        </View>
      ))}
      <Text style={styles.note}>This app gives general information, not medical advice. Always read the physical label if you have a serious allergy.</Text>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  intro: { color: colors.muted, marginBottom: 16 },
  h: { fontWeight: '700', fontSize: 16, marginBottom: 8, color: colors.text },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  note: { color: colors.muted, fontSize: 12, marginTop: 8 },
});
