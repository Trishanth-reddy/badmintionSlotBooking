import React, { useContext, useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

// --- CONTEXT IMPORTS ---
import { ThemeProvider } from './src/context/ThemeContext';
// ✅ IMPORT FROM NEW FILE (Breaks the cycle)
import { AuthContext, AuthProvider } from './src/context/AuthContext'; 

// --- SERVICE & HELPER IMPORTS ---
// ✅ Import navigation ref to connect it
import { navigationRef } from './src/navigation/RootNavigation';
// ✅ Import Push Notification Service
// ✅ Correct (matches your screenshot)
import { registerForPushNotificationsAsync } from './services/pushNotifications';
// --- SCREEN IMPORTS ---
import OnboardingScreen from './src/screens/OnboardingScreen';
import OtpVerificationScreen from './src/screens/OtpVerificationScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import CourtSelectionScreen from './src/screens/CourtSelectionScreen';
import TimeScreen from './src/screens/TimeScreen';
import OpenMatchesScreen from './src/screens/OpenMatchesScreen';
import TeamSelectionScreen from './src/screens/TeamSelectionScreen';
import BookingConfirmationScreen from './src/screens/BookingConfirmationScreen';
import BookingDetailScreen from './src/screens/BookingDetailScreen';
import BookingHistoryScreen from './src/screens/BookingHistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ContactPage from './src/screens/ContactPage';
import AdminHomeScreen from './src/screens/AdminDashboard/AdminHomeScreen';
import UserManagementScreen from './src/screens/AdminDashboard/UserManagementScreen';
import BookingManagementScreen from './src/screens/AdminDashboard/BookingManagementScreen';
import AdminProfileScreen from './src/screens/AdminDashboard/AdminProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// --- NAVIGATORS ---

const BookingStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="CourtSelectionMain" component={CourtSelectionScreen} />
    <Stack.Screen name="TimeSlotMain" component={TimeScreen} />
    <Stack.Screen name="TeamSelection" component={TeamSelectionScreen} />
    <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
    <Stack.Screen name="BookingDetailMain" component={BookingDetailScreen} />
  </Stack.Navigator>
);

const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="HomeMain" component={HomeScreen} />
    <Stack.Screen name="OpenMatches" component={OpenMatchesScreen} /> 
    <Stack.Screen name="BookingFlow" component={BookingStack} />
  </Stack.Navigator>
);

const MainUserTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: '#8b5cf6',
      tabBarInactiveTintColor: '#d1d5db',
      tabBarIcon: ({ color, size }) => {
        const icons = { HomeTab: 'home', BookingsTab: 'history', ProfileTab: 'person', ContactTab: 'phone' };
        return <MaterialIcons name={icons[route.name]} size={size} color={color} />;
      },
    })}
  >
    <Tab.Screen name="HomeTab" component={HomeStack} options={{ title: 'Home' }} />
    <Tab.Screen name="BookingsTab" component={BookingHistoryScreen} options={{ title: 'Bookings' }} />
    <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profile' }} />
    <Tab.Screen name="ContactTab" component={ContactPage} options={{ title: 'Contact' }} />
  </Tab.Navigator>
);

const AdminStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
    <Stack.Screen name="BookingManagement" component={BookingManagementScreen} />
    <Stack.Screen name="UserManagement" component={UserManagementScreen} />
    <Stack.Screen name="AdminProfile" component={AdminProfileScreen} />
  </Stack.Navigator>
);

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
  </Stack.Navigator>
);

// --- MAIN CONTENT WRAPPER ---
// This component consumes the AuthContext provided by App() below
const AppContent = () => {
  const { userToken, user, loading } = useContext(AuthContext); 
  const responseListener = useRef();

  // Notification Logic
  useEffect(() => {
    if (userToken) {
      registerForPushNotificationsAsync();

      // Listen for when user taps a notification
      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        const { screen, bookingId } = data;

        // Navigate using the global ref if needed
        if (screen === 'BookingDetailMain' && bookingId && navigationRef.isReady()) {
          navigationRef.navigate('MainUserTabs', {
            screen: 'HomeTab',
            params: {
              screen: 'BookingFlow',
              params: {
                screen: 'BookingDetailMain',
                params: { id: bookingId }
              }
            }
          });
        }
      });
    }

    // Cleanup
    // ✅ PASTE THIS - The correct way to clean up
return () => {
  if (responseListener.current) {
    responseListener.current.remove();
  }
};
  }, [userToken]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    // ✅ CONNECT THE NAVIGATION REF HERE
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!userToken ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : user?.role === 'admin' ? (
          <Stack.Screen name="AdminRoot" component={AdminStack} />
        ) : (
          <Stack.Screen name="MainUserTabs" component={MainUserTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// --- ROOT APP COMPONENT ---
export default function App() {
  return (
    <ThemeProvider>
      {/* ✅ WRAP ENTIRE APP IN AUTH PROVIDER */}
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}