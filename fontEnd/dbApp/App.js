import React, { useState, useEffect, createContext, useMemo, useRef } from 'react';
import { Text, ActivityIndicator, View } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode'; // Updated import style for modern versions
import * as Notifications from 'expo-notifications';

// Context & Theme
import { ThemeProvider } from './src/context/ThemeContext';
import { registerForPushNotificationsAsync } from './services/pushNotifications';

// --- CRITICAL PATH FIX ---
// If your 'api' folder is in the root (next to App.js), use './api/axiosConfig'
// If it is inside src, use './src/api/axiosConfig'
import api from './api/axiosConfig'; 

// Screen Imports
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
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import ContactPage from './src/screens/ContactPage';
import AdminHomeScreen from './src/screens/AdminDashboard/AdminHomeScreen';
import UserManagementScreen from './src/screens/AdminDashboard/UserManagementScreen';
import BookingManagementScreen from './src/screens/AdminDashboard/BookingManagementScreen';
import AdminProfileScreen from './src/screens/AdminDashboard/AdminProfileScreen';
import AnalyticsScreen from './src/screens/AdminDashboard/AnalyticsScreen';

// 1. Global Notification Configuration
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const AuthContext = createContext(null);
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// --- Navigators ---

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
    <Stack.Screen name="Analytics" component={AnalyticsScreen} />
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

// --- Main App Content ---

const AppContent = () => {
  const [userToken, setUserToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigationRef = useNavigationContainerRef();
  const responseListener = useRef();

  const isTokenValid = (token) => {
    if (!token) return false;
    try {
      const decoded = jwtDecode(token);
      return Date.now() < decoded.exp * 1000;
    } catch { return false; }
  };

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const userData = await AsyncStorage.getItem('userData');
        if (token && isTokenValid(token)) {
          setUserToken(token);
          setUser(JSON.parse(userData));
        }
      } catch (e) { console.error('Auth boot error', e); }
      setLoading(false);
    };
    bootstrapAsync();
  }, []);

  useEffect(() => {
    if (userToken) {
      registerForPushNotificationsAsync().then(async (pushToken) => {
        if (pushToken) {
          try {
            await api.post('/users/save-push-token', { token: pushToken });
          } catch (err) { console.error('Token sync failed', err); }
        }
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        const { screen, bookingId } = data;

        if (screen === 'BookingDetailMain' && bookingId) {
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

      return () => {
        if (responseListener.current) {
          Notifications.removeNotificationSubscription(responseListener.current);
        }
      };
    }
  }, [userToken]);

  const authContextValue = useMemo(() => ({
    user,
    userToken,
    signIn: async (token, userData) => {
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      setUserToken(token);
      setUser(userData);
    },
    signOut: async () => {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      setUserToken(null);
      setUser(null);
    },
    loading,
  }), [user, userToken, loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={authContextValue}>
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
    </AuthContext.Provider>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}