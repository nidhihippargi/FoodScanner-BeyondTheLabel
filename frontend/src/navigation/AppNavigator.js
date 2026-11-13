// Bottom tabs (Scan / History / Profile) inside a native stack that also hosts
// Product Detail and the OCR Review modal.
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import ScannerScreen from '../screens/ScannerScreen';
import HistoryScreen from '../screens/HistoryScreen';
import PreferencesScreen from '../screens/PreferencesScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import OcrReviewModal from '../screens/OcrReviewModal';
import { colors } from '../utils/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const ICONS = { Scan: 'scan', History: 'time', Preferences: 'person' };

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.primary,
        tabBarIcon: ({ color, size }) => <Ionicons name={ICONS[route.name]} size={size} color={color} />,
        headerTitleStyle: { fontWeight: '800' },
      })}
    >
      {/* Scanner draws its own top bar over the camera, so hide the header there. */}
      <Tab.Screen name="Scan" component={ScannerScreen} options={{ headerShown: false }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: 'Recent Scans' }} />
      <Tab.Screen name="Preferences" component={PreferencesScreen} options={{ title: 'My Preferences' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Analysis' }} />
        <Stack.Screen name="OcrReview" component={OcrReviewModal} options={{ title: 'Review Label Text', presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
