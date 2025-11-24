import React, { useState, useEffect, createContext, useMemo } from 'react';
import { Text, ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import jwtDecode from 'jwt-decode';

import AnalyticsScreen from './src/screens/AdminDashboard/AnalyticsScreen';
import { ThemeProvider } from './src/context/ThemeContext';

import { registerForPushNotificationsAsync } from './services/pushNotifications';

import OnboardingScreen from './src/screens/OnboardingScreen';
import OtpVerificationScreen from './src/screens/OtpVerificationScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import CourtSelectionScreen from './src/screens/CourtSelectionScreen';
import TimeScreen from './src/screens/TimeScreen';
import TeamSelectionScreen from './src/screens/TeamSelectionScreen';
import BookingConfirmationScreen from './src/screens/BookingConfirmationScreen';
import BookingDetailScreen from './src/screens/BookingDetailScreen';
import BookingHistoryScreen from './src/screens/BookingHistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
// import PaymentScreen from './src/screens/PaymentScreen';
import ContactPage from './src/screens/ContactPage';
import AdminHomeScreen from './src/screens/AdminDashboard/AdminHomeScreen';
import UserManagementScreen from './src/screens/AdminDashboard/UserManagementScreen';
import BookingManagementScreen from './src/screens/AdminDashboard/BookingManagementScreen';
import AdminProfileScreen from './src/screens/AdminDashboard/AdminProfileScreen';

// Create auth context
export const AuthContext = createContext(null);

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Stack navigator components
const BookingStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, animationEnabled: true }}>
    <Stack.Screen name="CourtSelectionMain" component={CourtSelectionScreen} />
    <Stack.Screen name="CalendarMain" component={TimeScreen} />
    <Stack.Screen name="TimeSlotMain" component={TimeScreen} />
    <Stack.Screen name="TeamSelection" component={TeamSelectionScreen} />
    <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
    {/* <Stack.Screen name="PaymentMain" component={PaymentScreen} /> */}
    <Stack.Screen name="BookingDetailMain" component={BookingDetailScreen} />
  </Stack.Navigator>
);

const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="HomeMain" component={HomeScreen} />
    <Stack.Screen name="BookingFlow" component={BookingStack} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProfileMain" component={ProfileScreen} />
    <Stack.Screen name="ChangePasswordMain" component={ChangePasswordScreen} />
  </Stack.Navigator>
);

// Bottom tab navigator for main user screens
const MainUserTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        switch (route.name) {
          case 'HomeTab':
            iconName = 'home';
            break;
          case 'BookingsTab':
            iconName = 'history';
            break;
          case 'ProfileTab':
            iconName = 'person';
            break;
          case 'ContactTab':
            iconName = 'phone';
            break;
          default:
            iconName = 'circle';
        }
        return <MaterialIcons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#8b5cf6',
      tabBarInactiveTintColor: '#d1d5db',
      tabBarStyle: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        height: 60,
        paddingBottom: 8,
        paddingTop: 8,
      },
      tabBarLabel: ({ focused }) => {
        let label = '';
        switch (route.name) {
          case 'HomeTab':
            label = 'Home';
            break;
          case 'BookingsTab':
            label = 'Bookings';
            break;
          case 'ProfileTab':
            label = 'Profile';
            break;
          case 'ContactTab':
            label = 'Contact';
            break;
        }
        return (
          <Text style={{ fontSize: 10, color: focused ? '#8b5cf6' : '#d1d5db', fontWeight: focused ? '600' : '400' }}>
            {label}
          </Text>
        );
      },
    })}
  >
    <Tab.Screen name="HomeTab" component={HomeStack} />
    <Tab.Screen name="BookingsTab" component={BookingHistoryScreen} />
    <Tab.Screen name="ProfileTab" component={ProfileStack} />
    <Tab.Screen name="ContactTab" component={ContactPage} />
  </Tab.Navigator>
);

// Admin stack
const AdminStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, animationEnabled: true }}>
    <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
    <Stack.Screen name="UserManagement" component={UserManagementScreen} />
    <Stack.Screen name="BookingManagement" component={BookingManagementScreen} />
    <Stack.Screen name="Analytics" component={AnalyticsScreen} />
    <Stack.Screen name="AdminProfile" component={AdminProfileScreen} />
  </Stack.Navigator>
);

// Auth stack
const AuthStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      animationEnabled: true,
      cardStyle: { backgroundColor: '#fff' },
    }}
  >
    <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ animationEnabled: false }} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
  </Stack.Navigator>
);

// Splash screen to show loading indicator
const SplashScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
    <ActivityIndicator size="large" color="#8b5cf6" />
    <Text style={{ marginTop: 16, fontSize: 16, color: '#8b5cf6', fontWeight: 'bold' }}>Loading...</Text>
  </View>
);

// Root navigator handles different app flows based on auth & role
const RootNavigator = ({ isSignedIn, userRole, loading }) => {
  if (loading) return <SplashScreen />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isSignedIn ? (
        <Stack.Group screenOptions={{ animationEnabled: false }}>
          <Stack.Screen name="AuthStack" component={AuthStack} />
        </Stack.Group>
      ) : userRole === 'admin' ? (
        <Stack.Group>
          <Stack.Screen name="AdminMainStack" component={AdminStack} />
        </Stack.Group>
      ) : (
        <Stack.Group>
          <Stack.Screen name="MainUserTabs" component={MainUserTabs} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
};

// Helper to validate JWT token expiration
const isTokenValid = (token) => {
  if (!token) return false;
  try {
    const decoded = jwtDecode(token);
    if (!decoded.exp) return false;
    return Date.now() < decoded.exp * 1000; // convert to ms
  } catch {
    return false;
  }
};

const AppContent = () => {
  const [userToken, setUserToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sign in method storing token and user data
  const signIn = async (token, userData) => {
    try {
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      setUserToken(token);
      setUser(userData);
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  // Sign out method clearing storage and state
  const signOut = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      setUserToken(null);
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Check auth state on app launch
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const userDataString = await AsyncStorage.getItem('userData');
        if (token && userDataString && isTokenValid(token)) {
          setUserToken(token);
          setUser(JSON.parse(userDataString));
        } else {
          await AsyncStorage.removeItem('userToken');
          await AsyncStorage.removeItem('userData');
          setUserToken(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Register for push notifications when user logs in
  useEffect(() => {
    if (userToken) {
      registerForPushNotificationsAsync().catch(err => console.error('Push registration error:', err));
    }
  }, [userToken]);

  // Memoize context value to avoid unnecessary re-renders
  const authContextValue = useMemo(() => ({
    user,
    userToken,
    signIn,
    signOut,
    loading,
  }), [user, userToken, loading]);

  const isSignedIn = !!userToken;
  const userRole = user?.role || 'user';

  return (
    <AuthContext.Provider value={authContextValue}>
      <NavigationContainer>
        <RootNavigator isSignedIn={isSignedIn} userRole={userRole} loading={loading} />
      </NavigationContainer>
    </AuthContext.Provider>
  );
};

// Wrap app in theme provider for theming context
const App = () => (
  <ThemeProvider>
    <AppContent />
  </ThemeProvider>
);

export default App;
