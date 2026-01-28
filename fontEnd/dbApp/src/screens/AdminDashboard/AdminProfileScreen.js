import React, { useContext, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image // Added Image import
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../../context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../../api/axiosConfig';
import { useFocusEffect } from '@react-navigation/native';

// --- MEMOIZED COMPONENTS ---

const ProfileSection = React.memo(({ name, role, email }) => (
  <View style={styles.profileSection}>
    <View style={styles.avatarBox}>
       {/* Use Logo as Avatar or Fallback to Initials */}
       <Image 
          source={require('../../../assets/logo.jpeg')} 
          style={styles.avatarImage} 
          resizeMode="cover"
       />
    </View>
    <Text style={styles.adminName}>{name || 'Admin'}</Text>
    <Text style={styles.adminRole}>{role || 'Administrator'}</Text>
    <Text style={styles.adminEmail}>{email}</Text>
  </View>
));

const InfoRow = React.memo(({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <MaterialIcons name={icon} size={20} color="#8b5cf6" />
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || 'N/A'}</Text>
    </View>
  </View>
));

const StatCard = React.memo(({ icon, iconColor, value, label }) => (
  <View style={styles.statCard}>
    <MaterialIcons name={icon} size={32} color={iconColor} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
));

const SettingItem = React.memo(({ icon, label, onPress }) => (
  <TouchableOpacity
    style={styles.settingItem}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.settingLeft}>
      <MaterialIcons name={icon} size={24} color="#8b5cf6" />
      <Text style={styles.settingLabel}>{label}</Text>
    </View>
    <MaterialIcons name="chevron-right" size={24} color="#d1d5db" />
  </TouchableOpacity>
));

// --- MAIN SCREEN ---

const AdminProfileScreen = ({ navigation }) => {
  const { signOut } = useContext(AuthContext);
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ totalUsers: 0, totalBookings: 0 });

  // --- MODAL STATE ---
  const [modalVisible, setModalVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // 1. Fetch Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [profileRes, statsRes] = await Promise.all([
        api.get('/users/profile'),
        api.get('/admin/stats')
      ]);

      if (profileRes.data.success) setProfile(profileRes.data.data);
      if (statsRes.data.success) setStats(statsRes.data.data.stats);

    } catch (error) {
      console.error('Error loading admin profile:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // 2. Handlers
  const handleLogout = useCallback(() => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: () => signOut(), style: 'destructive' },
      ]
    );
  }, [signOut]);

  const handleNotifications = useCallback(() => {
    Alert.alert('Info', 'Push notifications are managed automatically via the backend.');
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // 3. CHANGE PASSWORD LOGIC
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

    setIsUpdating(true);
    try {
      const res = await api.put('/auth/updatepassword', {
        oldPassword,
        newPassword
      });

      if (res.data.success) {
        Alert.alert('Success', 'Password updated successfully!');
        setModalVisible(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to update password.';
      Alert.alert('Error', msg);
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading && !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Profile</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <ProfileSection 
            name={profile?.fullName} 
            role={profile?.role === 'admin' ? 'Administrator' : 'Manager'} 
            email={profile?.email}
        />

        {/* DETAILS CARD */}
        <View style={styles.infoCard}>
          <InfoRow icon="email" label="Email" value={profile?.email} />
          <View style={styles.divider} />
          <InfoRow icon="phone" label="Phone" value={profile?.phone} />
          <View style={styles.divider} />
          <InfoRow icon="event" label="Joined" value={formatDate(profile?.createdAt)} />
        </View>

        {/* STATS SECTION */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Facility Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard icon="people" iconColor="#8b5cf6" value={stats.totalUsers || 0} label="Total Users" />
            <StatCard icon="sports-tennis" iconColor="#ec4899" value={stats.totalBookings || 0} label="Total Bookings" />
            <StatCard icon="location-city" iconColor="#10b981" value="2" label="Active Courts" />
          </View>
        </View>

        {/* SETTINGS */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          <SettingItem
            icon="lock"
            label="Change Password"
            onPress={() => setModalVisible(true)} 
          />
          <SettingItem
            icon="notifications"
            label="Notification Info"
            onPress={handleNotifications}
          />
        </View>
      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
          <LinearGradient colors={['#dc2626', '#b91c1c']} style={styles.logoutGradient}>
            <MaterialIcons name="logout" size={20} color="#fff" />
            <Text style={styles.logoutText}>Logout</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

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
                <TextInput
                  style={styles.inputField}
                  placeholder="Enter current password"
                  secureTextEntry
                  value={oldPassword}
                  onChangeText={setOldPassword}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="lock" size={20} color="#9ca3af" />
                <TextInput
                  style={styles.inputField}
                  placeholder="Enter new password"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="lock" size={20} color="#9ca3af" />
                <TextInput
                  style={styles.inputField}
                  placeholder="Confirm new password"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>
            </View>

            <TouchableOpacity 
              style={styles.updateButton} 
              onPress={handleChangePasswordSubmit}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.updateButtonText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSpacer: { width: 40 },
  scrollContent: { paddingBottom: 100 },
  profileSection: { alignItems: 'center', paddingVertical: 30 },
  
  // Updated Avatar Box for Logo
  avatarBox: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    backgroundColor: '#fff', // White background for logo
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 16, 
    shadowColor: '#8b5cf6', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8, 
    elevation: 6,
    overflow: 'hidden' // Ensure image stays circular
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },

  adminName: { fontSize: 24, fontWeight: 'bold', color: '#1f2937' },
  adminRole: { fontSize: 14, color: '#8b5cf6', fontWeight: '600', marginTop: 4 },
  adminEmail: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  infoCard: { backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 15, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  divider: { height: 1, backgroundColor: '#e5e7eb' },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#9ca3af', fontWeight: '500' },
  infoValue: { fontSize: 14, color: '#1f2937', fontWeight: '600', marginTop: 2 },
  statsSection: { paddingHorizontal: 20, marginTop: 25 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 12 },
  statsGrid: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 15, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginTop: 8 },
  statLabel: { fontSize: 11, color: '#9ca3af', marginTop: 4, textAlign: 'center' },
  settingsSection: { paddingHorizontal: 20, marginTop: 25 },
  settingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingLabel: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  logoutButton: { borderRadius: 12, overflow: 'hidden', shadowColor: '#dc2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  logoutGradient: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, gap: 8 },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  // Modal Styles
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

export default AdminProfileScreen;