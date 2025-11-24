import React, { useContext, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../../../App';
import { MaterialIcons } from '@expo/vector-icons';

const adminData = {
  name: 'Admin Manager',
  email: 'admin@courtbook.com',
  phone: '+91 9876543200',
  role: 'Administrator',
  joinedDate: '2025-01-15',
  courts: 2,
  totalUsers: 156,
};

// Memoized profile section
const ProfileSection = React.memo(({ name, role }) => (
  <View style={styles.profileSection}>
    <View style={styles.avatarBox}>
      <MaterialIcons name="admin-panel-settings" size={60} color="#fff" />
    </View>
    <Text style={styles.adminName}>{name}</Text>
    <Text style={styles.adminRole}>{role}</Text>
  </View>
));

// Memoized info row component
const InfoRow = React.memo(({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <MaterialIcons name={icon} size={20} color="#8b5cf6" />
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
));

// Memoized stat card component
const StatCard = React.memo(({ icon, iconColor, value, label }) => (
  <View style={styles.statCard}>
    <MaterialIcons name={icon} size={32} color={iconColor} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
));

// Memoized setting item component
const SettingItem = React.memo(({ icon, label, onPress }) => (
  <TouchableOpacity
    style={styles.settingItem}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <MaterialIcons name={icon} size={24} color="#8b5cf6" />
    <Text style={styles.settingLabel}>{label}</Text>
    <MaterialIcons name="chevron-right" size={24} color="#d1d5db" />
  </TouchableOpacity>
));

const AdminProfileScreen = ({ navigation }) => {
  const { signOut } = useContext(AuthContext);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: () => signOut(),
          style: 'destructive',
        },
      ]
    );
  }, [signOut]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleChangePassword = useCallback(() => {
    Alert.alert('Coming Soon', 'Admin password change will be available soon.');
  }, []);

  const handleNotifications = useCallback(() => {
    Alert.alert('Coming Soon', 'Admin notification settings will be available soon.');
  }, []);

  const handleAbout = useCallback(() => {
    Alert.alert('Coming Soon', 'About page will be available soon.');
  }, []);

  // Memoized settings items
  const settingsItems = useMemo(
    () => [
      {
        icon: 'security',
        label: 'Change Password',
        action: handleChangePassword,
      },
      {
        icon: 'notifications',
        label: 'Notifications',
        action: handleNotifications,
      },
      {
        icon: 'info',
        label: 'About',
        action: handleAbout,
      },
    ],
    [handleChangePassword, handleNotifications, handleAbout]
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <TouchableOpacity
          onPress={handleGoBack}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Profile</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        removeClippedSubviews={false}
      >
        <ProfileSection name={adminData.name} role={adminData.role} />

        <View style={styles.infoCard}>
          <InfoRow icon="email" label="Email" value={adminData.email} />
          <View style={styles.divider} />
          <InfoRow icon="phone" label="Phone" value={adminData.phone} />
          <View style={styles.divider} />
          <InfoRow icon="event" label="Joined" value={adminData.joinedDate} />
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Managed Resources</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon="location-city"
              iconColor="#8b5cf6"
              value={adminData.courts}
              label="Courts"
            />
            <StatCard
              icon="people"
              iconColor="#ec4899"
              value={adminData.totalUsers}
              label="Users"
            />
          </View>
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Settings</Text>
          {settingsItems.map((item, index) => (
            <SettingItem
              key={index}
              icon={item.icon}
              label={item.label}
              onPress={item.action}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#dc2626', '#b91c1c']}
            style={styles.logoutGradient}
          >
            <MaterialIcons name="logout" size={20} color="#fff" />
            <Text style={styles.logoutText}>Logout</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  avatarBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  adminName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  adminRole: {
    fontSize: 14,
    color: '#8b5cf6',
    fontWeight: '600',
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 15,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  infoContent: {
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
  statsSection: {
    paddingHorizontal: 20,
    marginTop: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8b5cf6',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  settingsSection: {
    paddingHorizontal: 20,
    marginTop: 25,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  settingLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  logoutButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoutGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AdminProfileScreen;
 