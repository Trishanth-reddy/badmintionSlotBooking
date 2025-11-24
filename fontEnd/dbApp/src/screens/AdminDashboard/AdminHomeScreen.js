import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../../api/axiosConfig';

const { width } = Dimensions.get('window');

// Memoized stat card component
const StatCard = React.memo(({ icon, iconColor, value, label }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, { backgroundColor: iconColor + '20' }]}>
      <MaterialIcons name={icon} size={28} color={iconColor} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
));

// Memoized menu card component
const MenuCard = React.memo(({ item, onPress }) => (
  <TouchableOpacity
    style={styles.menuCard}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
      <MaterialIcons name={item.icon} size={28} color={item.color} />
    </View>
    <View style={styles.menuContent}>
      <Text style={styles.menuItemTitle}>{item.title}</Text>
      <Text style={styles.menuDescription}>{item.description}</Text>
    </View>
    <MaterialIcons name="chevron-right" size={24} color="#d1d5db" />
  </TouchableOpacity>
));

// Memoized booking item component
const BookingItem = React.memo(({ booking, isLast }) => (
  <>
    <View style={styles.activityRow}>
      <Text style={styles.activityLabel}>
        {booking.user?.fullName || 'N/A'}
      </Text>
      <Text style={styles.activityValue}>
        {booking.court?.name} • {booking.startTime}
      </Text>
    </View>
    {!isLast && <View style={styles.activityDivider} />}
  </>
));

const AdminHomeScreen = ({ navigation }) => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeMembers: 0,
    bookingsToday: 0,
    pendingQueries: 0,
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/stats/admin/dashboard');

      if (response.data?.success) {
        const { stats, recentBookings } = response.data.data;
        setStats(stats);
        setRecentBookings(recentBookings);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      Alert.alert('Error', 'Could not load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    const unsubscribe = navigation.addListener('focus', loadDashboardData);
    return unsubscribe;
  }, [navigation, loadDashboardData]);

  const navigateToUserManagement = useCallback(() => {
    navigation.navigate('UserManagement');
  }, [navigation]);

  const navigateToBookingManagement = useCallback(() => {
    navigation.navigate('BookingManagement');
  }, [navigation]);

  const navigateToAnalytics = useCallback(() => {
    navigation.navigate('Analytics');
  }, [navigation]);

  const navigateToAdminProfile = useCallback(() => {
    navigation.navigate('AdminProfile');
  }, [navigation]);

  // Memoized menu items with stable action references
  const menuItems = useMemo(
    () => [
      {
        title: 'User Management',
        icon: 'people-outline',
        description: 'Manage users & memberships',
        color: '#6366f1',
        action: navigateToUserManagement,
      },
      {
        title: 'Booking Management',
        icon: 'event-available',
        description: 'View & manage all bookings',
        color: '#8b5cf6',
        action: navigateToBookingManagement,
      },
      {
        title: 'Analytics',
        icon: 'bar-chart',
        description: 'View statistics & reports',
        color: '#f43f5e',
        action: navigateToAnalytics,
      },
    ],
    [navigateToUserManagement, navigateToBookingManagement, navigateToAnalytics]
  );

  // Memoized stat cards data
  const statCards = useMemo(
    () => [
      {
        icon: 'people',
        iconColor: '#6366f1',
        value: stats.totalUsers,
        label: 'Total Users',
      },
      {
        icon: 'card-membership',
        iconColor: '#8b5cf6',
        value: stats.activeMembers,
        label: 'Active Members',
      },
      {
        icon: 'event-note',
        iconColor: '#ec4899',
        value: stats.bookingsToday,
        label: 'Bookings Today',
      },
      {
        icon: 'mail-outline',
        iconColor: '#f43f5e',
        value: stats.pendingQueries,
        label: 'Pending',
      },
    ],
    [stats]
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
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome, Admin 👋</Text>
          <Text style={styles.subGreeting}>Manage your badminton courts</Text>
        </View>
        <TouchableOpacity
          onPress={navigateToAdminProfile}
          style={styles.profileButton}
          activeOpacity={0.7}
        >
          <MaterialIcons name="admin-panel-settings" size={40} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        removeClippedSubviews={false}
      >
        <View style={styles.statsGrid}>
          {statCards.map((card, index) => (
            <StatCard
              key={index}
              icon={card.icon}
              iconColor={card.iconColor}
              value={card.value}
              label={card.label}
            />
          ))}
        </View>

        <View style={styles.menuContainer}>
          <Text style={styles.menuTitle}>Quick Actions</Text>
          {menuItems.map((item, index) => (
            <MenuCard key={index} item={item} onPress={item.action} />
          ))}
        </View>

        {recentBookings.length > 0 && (
          <View style={styles.activityContainer}>
            <Text style={styles.activityTitle}>Recent Bookings</Text>
            <View style={styles.activityCard}>
              {recentBookings.map((booking, idx) => (
                <BookingItem
                  key={booking._id || idx}
                  booking={booking}
                  isLast={idx === recentBookings.length - 1}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
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
    paddingBottom: 30,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subGreeting: { fontSize: 15, color: 'rgba(255, 255, 255, 0.9)' },
  profileButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: { paddingBottom: 30 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  statCard: {
    width: (width - 52) / 2,
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
  statIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  statLabel: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  menuContainer: { paddingHorizontal: 20, paddingTop: 30 },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  menuIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: { flex: 1 },
  menuItemTitle: { fontSize: 15, fontWeight: 'bold', color: '#1f2937' },
  menuDescription: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  activityContainer: { paddingHorizontal: 20, paddingTop: 20 },
  activityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  activityDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  activityLabel: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  activityValue: { fontSize: 14, color: '#8b5cf6' },
});

export default AdminHomeScreen;
