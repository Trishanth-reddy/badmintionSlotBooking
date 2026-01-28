import React, {
  useState,
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
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import api from '../../api/axiosConfig';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// --- HELPER FUNCTIONS ---
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

// --- MEMOIZED COMPONENTS ---
const SubscriptionCard = React.memo(({ subscription, daysLeft }) => (
  <>
    <View style={styles.subscriptionCard}>
      <LinearGradient colors={['#8b5cf6', '#ec4899']} style={styles.subscriptionGradient}>
        <View style={styles.subscriptionContent}>
          <View>
            <Text style={styles.subscriptionLabel}>Current Plan</Text>
            <Text style={styles.subscriptionType}>{subscription.planName || 'Standard Plan'}</Text>
          </View>
          <View style={styles.subscriptionBadge}>
            <Text style={styles.subscriptionBadgeText}>
                {subscription.status || 'Inactive'}
            </Text>
          </View>
        </View>
        <View style={styles.daysLeftContainer}>
          <MaterialIcons name="access-time" size={16} color="rgba(255, 255, 255, 0.9)" />
          <Text style={styles.daysLeftText}>
             {daysLeft > 0 ? `${daysLeft} days remaining` : 'Plan Expired'}
          </Text>
        </View>
      </LinearGradient>
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Plan Details</Text>
      <View style={styles.detailsCard}>
        <View style={styles.detailsRow}>
          <Text style={styles.detailsLabel}>Amount Paid</Text>
          <Text style={styles.detailsValue}>₹{subscription.amount || '0'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.detailsRow}>
          <Text style={styles.detailsLabel}>Start Date</Text>
          <Text style={styles.detailsValue}>{formatSubDate(subscription.startDate)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.detailsRow}>
          <Text style={styles.detailsLabel}>Expiry Date</Text>
          <Text style={styles.detailsValue}>{formatSubDate(subscription.expiryDate)}</Text>
        </View>
      </View>
    </View>
  </>
));

const NoSubscriptionCard = React.memo(({ onSubscribe }) => (
  <View style={styles.noSubscriptionCard}>
    <View style={styles.noSubIconBox}>
       <MaterialIcons name="card-membership" size={40} color="#8b5cf6" />
    </View>
    <Text style={styles.noSubscriptionTitle}>No Active Plan</Text>
    <Text style={styles.noSubscriptionText}>Upgrade to book courts and join matches.</Text>
    <TouchableOpacity style={styles.subscribeButton} onPress={onSubscribe} activeOpacity={0.8}>
      <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.subscribeButtonGradient}>
        <Text style={styles.subscribeButtonText}>View Plans</Text>
        <MaterialIcons name="arrow-forward" size={18} color="#fff" />
      </LinearGradient>
    </TouchableOpacity>
  </View>
));

const StatsSection = React.memo(({ totalBookings, hoursPlayed }) => (
  <View style={styles.statsContainer}>
    <Text style={styles.sectionTitle}>Activity</Text>
    <View style={styles.statsGrid}>
      <View style={styles.statCard}>
        <View style={[styles.statIconBox, {backgroundColor: '#eef2ff'}]}>
            <MaterialIcons name="sports-tennis" size={24} color="#6366f1" />
        </View>
        <Text style={styles.statNumber}>{totalBookings}</Text>
        <Text style={styles.statLabel}>Matches</Text>
      </View>
      <View style={styles.statCard}>
        <View style={[styles.statIconBox, {backgroundColor: '#fdf2f8'}]}>
            <MaterialIcons name="timer" size={24} color="#ec4899" />
        </View>
        <Text style={styles.statNumber}>{hoursPlayed}</Text>
        <Text style={styles.statLabel}>Hours</Text>
      </View>
    </View>
  </View>
));

const PersonalInfoSection = React.memo(({ email, phone, city }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Personal Info</Text>
    <View style={styles.infoCard}>
      <View style={styles.infoRow}>
        <MaterialIcons name="email" size={20} color="#9ca3af" />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{email}</Text>
        </View>
      </View>
      <View style={styles.infoRow}>
        <MaterialIcons name="phone" size={20} color="#9ca3af" />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Phone</Text>
          <Text style={styles.infoValue}>{phone || 'Not set'}</Text>
        </View>
      </View>
      <View style={styles.infoRow}>
        <MaterialIcons name="location-on" size={20} color="#9ca3af" />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Location</Text>
          <Text style={styles.infoValue}>{city}</Text>
        </View>
      </View>
    </View>
  </View>
));

const SettingsSection = React.memo(({ onChangePassword, onNotifications, onPrivacyPolicy }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Settings</Text>
    <TouchableOpacity style={styles.settingOption} onPress={onChangePassword} activeOpacity={0.7}>
      <View style={[styles.settingIconBox, {backgroundColor: '#eff6ff'}]}>
         <MaterialIcons name="lock" size={20} color="#3b82f6" />
      </View>
      <Text style={styles.settingLabel}>Change Password</Text>
      <MaterialIcons name="chevron-right" size={22} color="#cbd5e1" />
    </TouchableOpacity>
    <TouchableOpacity style={styles.settingOption} onPress={onNotifications} activeOpacity={0.7}>
      <View style={[styles.settingIconBox, {backgroundColor: '#fff7ed'}]}>
         <MaterialIcons name="notifications" size={20} color="#f97316" />
      </View>
      <Text style={styles.settingLabel}>Notifications</Text>
      <MaterialIcons name="chevron-right" size={22} color="#cbd5e1" />
    </TouchableOpacity>
    <TouchableOpacity style={styles.settingOption} onPress={onPrivacyPolicy} activeOpacity={0.7}>
      <View style={[styles.settingIconBox, {backgroundColor: '#f0fdf4'}]}>
         <MaterialIcons name="privacy-tip" size={20} color="#22c55e" />
      </View>
      <Text style={styles.settingLabel}>Privacy Policy</Text>
      <MaterialIcons name="chevron-right" size={22} color="#cbd5e1" />
    </TouchableOpacity>
  </View>
));

// --- MAIN COMPONENT ---
const ProfileScreen = ({ navigation }) => {
  const authContext = useContext(AuthContext);
  const { setUser } = authContext; 

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [profileImage, setProfileImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [subscription, setSubscription] = useState(null);

  const [userData, setUserData] = useState({
    name: '', email: '', phone: '', city: '', memberSince: '',
    totalBookings: 0, hoursPlayed: 0,
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // --- DATA LOADING ---
  const loadUserProfile = useCallback(async () => {
    try {
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
            ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
            : 'N/A',
        }));
        
        if (user.profilePicture) setProfileImage(user.profilePicture);

        if (user.membership) {
            setSubscription(user.membership);
        } else {
            setSubscription(null);
        }

        if (setUser) setUser(user);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }, [setUser]);

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

  const fetchAllData = useCallback(async () => {
    try {
        await Promise.all([loadUserProfile(), loadUserStats()]);
    } catch (e) {
        console.log(e);
    } finally {
        setLoading(false);
        setRefreshing(false);
    }
  }, [loadUserProfile, loadUserStats]);

  useFocusEffect(
    useCallback(() => {
      if (authContext.userToken) {
        fetchAllData();
      } else {
        setLoading(false);
      }
    }, [authContext.userToken, fetchAllData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const uploadImage = useCallback(async (localUri) => {
    setIsUploading(true);
    const formData = new FormData();
    const filename = localUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;
    formData.append('profilePicture', { uri: localUri, name: filename, type: type });

    try {
      const response = await api.post('/users/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (response.data.success) {
        setProfileImage(response.data.profilePicture);
        loadUserProfile();
        Alert.alert('Success', 'Profile picture updated');
      } else {
        Alert.alert('Upload Failed', response.data.message || 'Server error');
      }
    } catch (error) {
      Alert.alert('Upload Failed', 'Could not update profile picture.');
    } finally {
      setIsUploading(false);
    }
  }, [loadUserProfile]);

  const pickImage = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Permission Required', 'Please allow access to your photos');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled) {
      const localUri = result.assets[0].uri;
      setProfileImage(localUri); 
      await uploadImage(localUri);
    }
  }, [uploadImage]);

  const handleChangePasswordSubmit = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      return Alert.alert('Error', 'Please fill in all fields.');
    }
    if (newPassword !== confirmPassword) {
      return Alert.alert('Error', 'New passwords do not match.');
    }
    if (newPassword.length < 6) {
      return Alert.alert('Error', 'Password must be at least 6 characters long.');
    }

    setIsUpdatingPassword(true);
    try {
      const res = await api.put('/auth/updatepassword', { oldPassword, newPassword });
      if (res.data.success) {
        Alert.alert('Success', 'Password updated successfully!');
        setModalVisible(false);
        setOldPassword(''); setNewPassword(''); setConfirmPassword('');
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to update password.';
      Alert.alert('Error', msg);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleLogout = useCallback(() => {
    Alert.alert('Confirm Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: () => authContext.signOut(), style: 'destructive' },
    ]);
  }, [authContext]);

  const handleChangePassword = useCallback(() => setModalVisible(true), []);
  const navigateToSubscriptionPlans = useCallback(() => navigation.navigate('SubscriptionPlans'), [navigation]);
  const handleEditProfile = useCallback(() => Alert.alert('Coming Soon', 'Edit profile will be available soon.'), []);
  const handleNotifications = useCallback(() => Alert.alert('Coming Soon', 'Notification settings will be available soon.'), []);
  const handlePrivacyPolicy = useCallback(() => Alert.alert('Coming Soon', 'Privacy policy will be available soon.'), []);

  const daysLeft = useMemo(() => {
    if (!subscription) return 0;
    if (subscription.status !== 'Active') return 0; 
    return getDaysLeft(subscription.expiryDate);
  }, [subscription]);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <View style={styles.backButton} />
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity style={styles.editButton} onPress={handleEditProfile} activeOpacity={0.7}>
          <MaterialIcons name="edit" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6"/>}>
        
        <View style={styles.profileSection}>
          <TouchableOpacity style={styles.profileImageContainer} onPress={pickImage} disabled={isUploading}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.avatarInitial}>
                    {(userData.name?.charAt(0) || 'U').toUpperCase()}
                </Text>
              </View>
            )}
            {isUploading ? (
                <View style={styles.uploadingOverlay}><ActivityIndicator color="#fff" /></View> 
            ) : (
                <View style={styles.editImageButton}>
                    <MaterialIcons name="camera-alt" size={16} color="#fff" />
                </View>
            )}
          </TouchableOpacity>
          <Text style={styles.profileName}>{userData.name}</Text>
          <View style={styles.memberBadge}>
            <MaterialIcons name="verified" size={14} color="#8b5cf6" />
            <Text style={styles.memberText}>Member since {userData.memberSince}</Text>
          </View>
        </View>

        {subscription && subscription.status === 'Active' ? (
          <SubscriptionCard subscription={subscription} daysLeft={daysLeft} />
        ) : (
          <NoSubscriptionCard onSubscribe={navigateToSubscriptionPlans} />
        )}

        <StatsSection totalBookings={userData.totalBookings} hoursPlayed={userData.hoursPlayed} />
        <PersonalInfoSection email={userData.email} phone={userData.phone} city={userData.city} />
        <SettingsSection onChangePassword={handleChangePassword} onNotifications={handleNotifications} onPrivacyPolicy={handlePrivacyPolicy} />

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <MaterialIcons name="logout" size={20} color="#fff" />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* --- CHANGE PASSWORD MODAL --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="lock-outline" size={20} color="#9ca3af" />
                <TextInput style={styles.inputField} placeholder="Enter current password" secureTextEntry value={oldPassword} onChangeText={setOldPassword} />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="lock" size={20} color="#9ca3af" />
                <TextInput style={styles.inputField} placeholder="Enter new password" secureTextEntry value={newPassword} onChangeText={setNewPassword} />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="lock" size={20} color="#9ca3af" />
                <TextInput style={styles.inputField} placeholder="Confirm new password" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
              </View>
            </View>
            <TouchableOpacity style={styles.updateButton} onPress={handleChangePasswordSubmit} disabled={isUpdatingPassword}>
              {isUpdatingPassword ? <ActivityIndicator color="#fff" /> : <Text style={styles.updateButtonText}>Update Password</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollContent: { paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  backButton: { width: 40, height: 40 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  editButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
  
  profileSection: { alignItems: 'center', paddingVertical: 25, marginTop: -15 },
  profileImageContainer: { position: 'relative', marginBottom: 12 },
  profileImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#fff' },
  profileImagePlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#e2e8f0' },
  avatarInitial: { fontSize: 36, fontWeight: 'bold', color: '#8b5cf6' },
  
  editImageButton: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: '#8b5cf6', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  uploadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 50, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  
  profileName: { fontSize: 22, fontWeight: 'bold', color: '#1f2937', marginBottom: 6 },
  memberBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#f3e8ff', borderRadius: 20, gap: 4 },
  memberText: { fontSize: 12, color: '#8b5cf6', fontWeight: '600' },
  
  subscriptionCard: { marginHorizontal: 20, marginBottom: 20, borderRadius: 16, overflow: 'hidden', shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  subscriptionGradient: { padding: 20 },
  subscriptionContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  subscriptionLabel: { fontSize: 12, color: 'rgba(255, 255, 255, 0.9)', fontWeight: '600' },
  subscriptionType: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginTop: 2 },
  subscriptionBadge: { backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  subscriptionBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  daysLeftContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255, 255, 255, 0.15)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start' },
  daysLeftText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  
  noSubscriptionCard: { marginHorizontal: 20, marginBottom: 20, backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  noSubIconBox: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#f3e8ff', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  noSubscriptionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  noSubscriptionText: { fontSize: 13, color: '#6b7280', marginTop: 4, textAlign: 'center', marginBottom: 16 },
  subscribeButton: { borderRadius: 12, overflow: 'hidden', width: '100%' },
  subscribeButtonGradient: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, gap: 8 },
  subscribeButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  
  section: { marginHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937', marginBottom: 12 },
  detailsCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  detailsLabel: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  detailsValue: { fontSize: 14, color: '#1e293b', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#f1f5f9' },
  
  statsContainer: { marginHorizontal: 20, marginBottom: 20 },
  statsGrid: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  statIconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  statLabel: { fontSize: 12, color: '#6b7280' },
  
  infoCard: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  infoContent: { marginLeft: 12, flex: 1 },
  infoLabel: { fontSize: 12, color: '#9ca3af' },
  infoValue: { fontSize: 14, color: '#1f2937', fontWeight: '500', marginTop: 2 },
  
  settingOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 12, marginBottom: 8, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  settingIconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  settingLabel: { flex: 1, fontSize: 14, color: '#1f2937', fontWeight: '500' },
  
  logoutButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginHorizontal: 20, marginBottom: 20, backgroundColor: '#ef4444', paddingVertical: 14, borderRadius: 12, gap: 8 },
  logoutButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

  // --- MODAL STYLES ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 450 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12 },
  inputField: { flex: 1, paddingVertical: 12, marginLeft: 8, fontSize: 16, color: '#1f2937' },
  updateButton: { backgroundColor: '#8b5cf6', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  updateButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

export default ProfileScreen;