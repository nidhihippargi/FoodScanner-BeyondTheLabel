// App root: providers (safe area, preferences, history) wrapping the navigator.
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PreferenceProvider } from './src/context/PreferenceContext';
import { ScanHistoryProvider } from './src/context/ScanHistoryContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <PreferenceProvider>
        <ScanHistoryProvider>
          <StatusBar style="auto" />
          <AppNavigator />
        </ScanHistoryProvider>
      </PreferenceProvider>
    </SafeAreaProvider>
  );
}
