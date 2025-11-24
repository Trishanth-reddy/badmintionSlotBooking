import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Dimensions,
  ActivityIndicator,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { AuthContext } from '../../App';
import api from '../../api/axiosConfig';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// Helper functions outside component
const getDaysLeft = (endDate) => {
  if (!endDate) return 0;
  const today = new Date();
  const end = new Date(endDate);
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

const formatSubDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// Memoized subscription card component
const SubscriptionCard = React.memo(({ subscription, daysLeft, onCancel }) => (
  <>
    <View style={styles.subscriptionCard}>
      <LinearGradient
        colors={['#8b5cf6', '#ec4899']}
        style={styles.subscriptionGradient}
      >
        <View style={styles.subscriptionContent}>
          <View>
            <Text style={styles.subscriptionLabel}>Current Subscription</Text>
            <Text style={styles.subscriptionType}>{subscription.planName}</Text>
          </View>
          <View style={styles.subscriptionBadge}>
            <Text style={styles.subscriptionBadgeText}>Active</Text>
          </View>
        </View>

        <View style={styles.daysLeftContainer}>
          <MaterialIcons
            name="access-time"
            size={18}
            color="rgba(255, 255, 255, 0.9)"
          />
          <Text style={styles.daysLeftText}>{daysLeft} days remaining</Text>
        </View>
      </LinearGradient>
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Subscription Details</Text>
      <View style={styles.detailsCard}>
        <View style={styles.detailsRow}>
          <Text style={styles.detailsLabel}>Plan Amount</Text>
          <Text style={styles.detailsValue}>₹{subscription.amount}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.detailsRow}>
          <Text style={styles.detailsLabel}>Start Date</Text>
          <Text style={styles.detailsValue}>
            {formatSubDate(subscription.startDate)}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.detailsRow}>
          <Text style={styles.detailsLabel}>End Date</Text>
          <Text style={styles.detailsValue}>
            {formatSubDate(subscription.expiryDate)}
          </Text>
        </View>
      </View>
    </View>

    <TouchableOpacity
      style={styles.cancelSubscriptionButton}
      onPress={onCancel}
      activeOpacity={0.7}
    >
      <MaterialIcons name="close" size={18} color="#dc2626" />
      <Text style={styles.cancelSubscriptionText}>Cancel Subscription</Text>
    </TouchableOpacity>
  </>
));

// Memoized no subscription card component
const NoSubscriptionCard = React.memo(({ onSubscribe }) => (
  <View style={styles.noSubscriptionCard}>
    <MaterialIcons name="card-giftcard" size={48} color="#d1d5db" />
    <Text style={styles.noSubscriptionTitle}>No Active Subscription</Text>
    <Text style={styles.noSubscriptionText}>
      Subscribe to get access to booking features.
    </Text>
    <TouchableOpacity
      style={styles.subscribeButton}
      onPress={onSubscribe}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={['#8b5cf6', '#ec4899']}
        style={styles.subscribeButtonGradient}
      >
        <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
        <MaterialIcons name="arrow-forward" size={18} color="#fff" />
      </LinearGradient>
    </TouchableOpacity>
  </View>
));

// Memoized stats component
const StatsSection = React.memo(({ totalBookings, hoursPlayed }) => (
  <View style={styles.statsContainer}>
    <Text style={styles.sectionTitle}>Your Stats</Text>
    <View style={styles.statsGrid}>
      <View style={styles.statCard}>
        <MaterialIcons name="event-note" size={32} color="#8b5cf6" />
        <Text style={styles.statNumber}>{totalBookings}</Text>
        <Text style={styles.statLabel}>Total Bookings</Text>
      </View>
      <View style={styles.statCard}>
        <MaterialIcons name="timer" size={32} color="#ec4899" />
        <Text style={styles.statNumber}>{hoursPlayed}</Text>
        <Text style={styles.statLabel}>Hours Played</Text>
      </View>
    </View>
  </View>
));

// Memoized personal info component
const PersonalInfoSection = React.memo(({ email, phone, city }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Personal Information</Text>
    <View style={styles.infoCard}>
      <View style={styles.infoRow}>
        <MaterialIcons name="email" size={20} color="#8b5cf6" />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{email}</Text>
        </View>
      </View>
      <View style={styles.infoRow}>
        <MaterialIcons name="phone" size={20} color="#8b5cf6" />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Phone</Text>
          <Text style={styles.infoValue}>{phone}</Text>
        </View>
      </View>
      <View style={styles.infoRow}>
        <MaterialIcons name="location-on" size={20} color="#8b5cf6" />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>City</Text>
          <Text style={styles.infoValue}>{city}</Text>
        </View>
      </View>
    </View>
  </View>
));

// Memoized settings section
const SettingsSection = React.memo(
  ({ onChangePassword, onNotifications, onPrivacyPolicy }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Settings</Text>
      <TouchableOpacity
        style={styles.settingOption}
        onPress={onChangePassword}
        activeOpacity={0.7}
      >
        <MaterialIcons name="lock-reset" size={22} color="#8b5cf6" />
        <Text style={styles.settingLabel}>Change Password</Text>
        <MaterialIcons name="chevron-right" size={22} color="#d1d5db" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.settingOption}
        onPress={onNotifications}
        activeOpacity={0.7}
      >
        <MaterialIcons name="notifications" size={22} color="#8b5cf6" />
        <Text style={styles.settingLabel}>Notifications</Text>
        <MaterialIcons name="chevron-right" size={22} color="#d1d5db" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.settingOption}
        onPress={onPrivacyPolicy}
        activeOpacity={0.7}
      >
        <MaterialIcons name="privacy-tip" size={22} color="#8b5cf6" />
        <Text style={styles.settingLabel}>Privacy Policy</Text>
        <MaterialIcons name="chevron-right" size={22} color="#d1d5db" />
      </TouchableOpacity>
    </View>
  )
);

const ProfileScreen = ({ navigation }) => {
  const authContext = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [profileImage, setProfileImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false); // <-- NEW STATE
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const [userData, setUserData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    memberSince: '',
    totalBookings: 0,
    hoursPlayed: 0,
  });

  const loadUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/profile');
      if (response.data?.data) {
        const user = response.data.data;
        setUserData((prev) => ({
          ...prev,
          name: user.fullName || '',
          email: user.email || '',
          phone: user.phone || '',
          city: user.city || 'N/A',
          memberSince: user.createdAt
            ? new Date(user.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
              })
            : 'N/A',
        }));
        if (user.profilePicture) {
          setProfileImage(user.profilePicture);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Could not load profile data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUserStats = useCallback(async () => {
    try {
      const response = await api.get('/stats/my-stats');
      if (response.data.success) {
        setUserData((prev) => ({
          ...prev,
          totalBookings: response.data.data.totalBookings || 0,
          hoursPlayed: response.data.data.hoursPlayed || 0,
        }));
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, []);

  const loadSubscription = useCallback(async () => {
    try {
      setSubscriptionLoading(true);
      const response = await api.get('/subscriptions/my-subscription');
      if (response.data.success) {
        setSubscription(response.data.data);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setSubscription(null);
      } else {
        console.error('Error loading subscription:', error);
      }
    } finally {
      setSubscriptionLoading(false);
    }
  }, []);

  // Load all data in parallel on screen focus
  useFocusEffect(
    useCallback(() => {
      if (authContext.userToken) {
        Promise.all([loadUserProfile(), loadSubscription(), loadUserStats()]);
      } else {
        setLoading(false);
      }
    }, [authContext.userToken, loadUserProfile, loadSubscription, loadUserStats])
  );

  // In ProfileScreen.js

// In ProfileScreen.js

const uploadImage = useCallback(async (localUri) => {
  setIsUploading(true);
  const formData = new FormData();

  const filename = localUri.split('/').pop();
  const match = /\.(\w+)$/.exec(filename);
  // Use a fallback for the type
  const type = match ? `image/${match[1]}` : `image/jpeg`;

  // --- FIX #2 (The Key) ---
  // The key 'profilePicture' MUST match your backend's upload.single('profilePicture')
  formData.append('profilePicture', {
    uri: localUri,
    name: filename,
    type: type,
  });

  try {
    // --- FIX #1 (The Method) ---
    // Changed from api.put to api.post to match your routes/users.js
    const response = await api.post('/users/profile-picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data', // This header is essential
      },
    });

    if (response.data.success) {
      // Set the new Cloudinary URL from the server
      setProfileImage(response.data.profilePicture);
    } else {
      Alert.alert('Upload Failed', response.data.message || 'Server error');
    }
  } catch (error) {
    // This will now log more useful error details
    if (error.response) {
      // The request was made and the server responded with a non-2xx status
      console.error('Error uploading image (response):', error.response.data);
      Alert.alert('Upload Failed', error.response.data.message || 'Could not update profile picture.');
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Error uploading image (request):', error.request);
      Alert.alert('Upload Failed', 'No response from server. Check your connection.');
    } else {
      // Something else happened
      console.error('Error uploading image (general):', error.message);
      Alert.alert('Upload Failed', error.message);
    }
  } finally {
    setIsUploading(false);
  }
}, []); // 'api' and 'setProfileImage' should be stable, but you can add them if your linter complains

  // --- UPDATED pickImage FUNCTION ---
  const pickImage = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const localUri = result.assets[0].uri;
      // Show local preview immediately
      setProfileImage(localUri);
      // Start the upload
      await uploadImage(localUri);
    }
  }, [uploadImage]); // Add dependency

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: () => authContext.signOut(),
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  }, [authContext]);

  const handleChangePassword = useCallback(() => {
    navigation.navigate('ChangePasswordMain');
  }, [navigation]);

  const handleCancelSubscription = useCallback(() => {
    setCancelModalVisible(true);
  }, []);

  const handleCloseCancelModal = useCallback(() => {
    setCancelModalVisible(false);
  }, []);

  const navigateToSubscriptionPlans = useCallback(() => {
    navigation.navigate('SubscriptionPlans');
  }, [navigation]);

  const handleEditProfile = useCallback(() => {
    Alert.alert('Coming Soon', 'Edit profile will be available soon.');
  }, []);

  const handleNotifications = useCallback(() => {
    Alert.alert('Coming Soon', 'Notification settings will be available soon.');
  }, []);

  const handlePrivacyPolicy = useCallback(() => {
    Alert.alert('Coming Soon', 'Privacy policy will be available soon.');
  }, []);

  const confirmCancelSubscription = useCallback(async () => {
    try {
      setCancelLoading(true);
      const response = await api.delete('/subscriptions/my-subscription/cancel', {
        data: { reason: 'User cancelled from profile' },
      });

      if (response.data.success) {
        setCancelModalVisible(false);
        Alert.alert('Success', 'Subscription cancelled successfully');
        loadSubscription();
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to cancel subscription'
      );
    } finally {
      setCancelLoading(false);
    }
  }, [loadSubscription]);

  const daysLeft = useMemo(
    () => (subscription ? getDaysLeft(subscription.expiryDate) : 0),
    [subscription]
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        removeClippedSubviews={false}
      >
        <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
          <View style={styles.backButton} />
          <Text style={styles.headerTitle}>My Profile</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEditProfile}
            activeOpacity={0.7}
          >
            <MaterialIcons name="edit" size={24} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.profileSection}>
          {/* --- UPDATED JSX FOR UPLOAD --- */}
          <TouchableOpacity
            style={styles.profileImageContainer}
            onPress={pickImage}
            activeOpacity={0.8}
            disabled={isUploading} // Disable while uploading
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <MaterialIcons name="person" size={70} color="#8b5cf6" />
              </View>
            )}

            {/* Show loading overlay or edit button */}
            {isUploading ? (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : (
              <View style={styles.editImageButton}>
                <MaterialIcons name="camera-alt" size={18} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
          {/* --- END OF UPDATED JSX --- */}

          <Text style={styles.profileName}>{userData.name}</Text>
          <View style={styles.memberBadge}>
            <MaterialIcons name="verified" size={16} color="#8b5cf6" />
            <Text style={styles.memberText}>
              Member since {userData.memberSince}
            </Text>
          </View>
        </View>

        {subscriptionLoading ? (
          <View style={styles.subscriptionCard}>
            <ActivityIndicator size="small" color="#8b5cf6" />
          </View>
        ) : subscription ? (
          <SubscriptionCard
            subscription={subscription}
            daysLeft={daysLeft}
            onCancel={handleCancelSubscription}
          />
        ) : (
          <NoSubscriptionCard onSubscribe={navigateToSubscriptionPlans} />
        )}

        <StatsSection
          totalBookings={userData.totalBookings}
          hoursPlayed={userData.hoursPlayed}
        />

        <PersonalInfoSection
          email={userData.email}
          phone={userData.phone}
          city={userData.city}
        />

        <SettingsSection
          onChangePassword={handleChangePassword}
          onNotifications={handleNotifications}
          onPrivacyPolicy={handlePrivacyPolicy}
        />

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <MaterialIcons name="logout" size={20} color="#fff" />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={cancelModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              onPress={handleCloseCancelModal}
              style={styles.modalCloseButton}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={28} color="#1f2937" />
            </TouchableOpacity>

            <MaterialIcons name="warning" size={48} color="#dc2626" />

            <Text style={styles.modalTitle}>Cancel Subscription?</Text>
            <Text style={styles.modalSubtitle}>
              You will lose access to premium features and booking hours.
            </Text>

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={styles.modalKeepButton}
                onPress={handleCloseCancelModal}
                disabled={cancelLoading}
                activeOpacity={0.7}
              >
                <Text style={styles.modalKeepText}>Keep It</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={confirmCancelSubscription}
                disabled={cancelLoading}
                activeOpacity={0.7}
              >
                {cancelLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalCancelText}>Cancel Subscription</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    opacity: 0,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
    marginTop: -20,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  // --- NEW STYLE FOR UPLOADING ---
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 60,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3e8ff',
    borderRadius: 20,
    gap: 6,
  },
  memberText: {
    fontSize: 13,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  subscriptionCard: {
    marginHorizontal: 20,
    marginBottom: 25,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    minHeight: 120,
    justifyContent: 'center',
  },
  subscriptionGradient: {
    padding: 20,
  },
  subscriptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  subscriptionLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  subscriptionType: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  subscriptionBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  subscriptionBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  daysLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  daysLeftText: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 13,
    fontWeight: '600',
  },
  noSubscriptionCard: {
    marginHorizontal: 20,
    marginBottom: 25,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  noSubscriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 12,
  },
  noSubscriptionText: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 6,
    textAlign: 'center',
  },
  subscribeButton: {
    marginTop: 16,
    borderRadius: 10,
    overflow: 'hidden',
    width: '100%',
  },
  subscribeButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailsLabel: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
  detailsValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  cancelSubscriptionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
    backgroundColor: '#fee2e2',
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 25,
    gap: 8,
  },
  cancelSubscriptionText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statsContainer: {
    marginHorizontal: 20,
    marginBottom: 25,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8b5cf6',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
    marginTop: 2,
  },
  settingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  settingLabel: {
    flex: 1,
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '500',
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: width - 40,
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalKeepButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalKeepText: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '600',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ProfileScreen;