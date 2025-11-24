import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import api from '../api/axiosConfig'; // Make sure this path is correct
import Constants from 'expo-constants'; // <-- 1. IMPORT CONSTANTS

// This handles notifications that arrive while the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  // 1. Get permission from the user
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Error', 'Please enable push notifications to receive updates.');
    return;
  }

  // 2. Get the unique Expo Push Token
  try {
    // --- THIS IS THE FIX ---
    // Get the projectId from expo-constants
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    if (!projectId) {
      Alert.alert('Project ID Error', 'No projectId found in app.json. Please run "npx eas project:init"');
      return;
    }

    // Pass the projectId to the function
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    // --- END OF FIX ---
    
    console.log('My Expo Push Token:', token);
  } catch (error) {
    console.error('Error getting push token', error);
  }

  // 3. Send the token to your backend
  if (token) {
    try {
      await api.post('/users/save-push-token', { token });
      console.log('Token saved to server successfully.');
    } catch (error) {
      console.error('Error saving push token to server', error);
    }
  }

  return token;
}