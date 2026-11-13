import React from 'react';
import { Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/context/AppContext';
import { colors } from './src/theme';
import ScanScreen from './src/screens/ScanScreen';
import OcrReviewScreen from './src/screens/OcrReviewScreen';
import FindingsScreen from './src/screens/FindingsScreen';
import PreferencesScreen from './src/screens/PreferencesScreen';
import HistoryScreen from './src/screens/HistoryScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const icon = (e) => ({ focused }) => <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{e}</Text>;

function Tabs() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: colors.primary, headerTitleStyle: { fontWeight: '700' } }}>
      <Tab.Screen name="Scan" component={ScanScreen} options={{ tabBarIcon: icon('📷') }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ tabBarIcon: icon('🕘') }} />
      <Tab.Screen name="Preferences" component={PreferencesScreen} options={{ tabBarIcon: icon('🥗'), title: 'My Diet' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <Stack.Navigator>
            <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
            <Stack.Screen name="OcrReview" component={OcrReviewScreen} options={{ title: 'Review label text' }} />
            <Stack.Screen name="Findings" component={FindingsScreen} options={{ title: 'Nutrition findings' }} />
          </Stack.Navigator>
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  );
}
