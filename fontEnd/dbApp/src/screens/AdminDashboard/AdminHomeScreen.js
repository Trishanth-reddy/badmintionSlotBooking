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
  RefreshControl,
  Image, // Added Image to imports
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../../api/axiosConfig'; // Check your path to axiosConfig

const { width } = Dimensions.get('window');

// --- MEMOIZED COMPONENTS ---

const StatCard = React.memo(({ icon, iconColor, value, label }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, { backgroundColor: iconColor + '15' }]}>
      <MaterialIcons name={icon} size={26} color={iconColor} />
    </View>
    <View style={styles.statContent}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  </View>
));

const MenuCard = React.memo(({ item, onPress }) => (
  <TouchableOpacity
    style={styles.menuCard}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
      <MaterialIcons name={item.icon} size={24} color={item.color} />
    </View>
    <View style={styles.menuContent}>
      <Text style={styles.menuItemTitle}>{item.title}</Text>
      <Text style={styles.menuDescription}>{item.description}</Text>
    </View>
    <MaterialIcons name="chevron-right" size={24} color="#cbd5e1" />
  </TouchableOpacity>
));

const BookingItem = React.memo(({ booking, isLast }) => (
  <>
    <View style={styles.activityRow}>
      <View style={styles.activityInfo}>
        <View style={styles.userAvatarPlaceholder}>
           <Text style={styles.userInitials}>
             {booking.user?.fullName?.charAt(0).toUpperCase() || 'G'}
           </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.activityLabel} numberOfLines={1}>
            {booking.user?.fullName || 'Guest User'}
          </Text>
          <Text style={styles.activitySubLabel}>
             {new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </View>
      
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.activityValue}>
          {booking.court?.name || 'Court'}
        </Text>
        <Text style={[styles.activitySubValue, {color: '#6366f1'}]}>
           {booking.startTime}
        </Text>
      </View>
    </View>
    {!isLast && <View style={styles.activityDivider} />}
  </>
));

// --- MAIN COMPONENT ---

const AdminHomeScreen = ({ navigation }) => {
  // 1. State for Real Data
  const [stats, setStats] = useState({
    activeMembers: 0,
    totalBookings: 0,
    totalUsers: 0,
    pendingBookings: 0,
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 2. Fetch Data Function (Calls the new Admin API)
  const loadDashboardData = useCallback(async () => {
    try {
      // NOTE: Ensure your backend has the /admin/stats route we created!
      const response = await api.get('/admin/stats');

      if (response.data?.success) {
        const { stats, recentBookings } = response.data.data;
        setStats(stats);
        setRecentBookings(recentBookings || []);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      // Optional: Alert.alert("Error", "Failed to fetch stats");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // 3. Load on Mount & Focus
  useEffect(() => {
    loadDashboardData();
    const unsubscribe = navigation.addListener('focus', loadDashboardData);
    return unsubscribe;
  }, [navigation, loadDashboardData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

  // 4. Navigation Handlers
  const navigateToUserManagement = useCallback(() => navigation.navigate('UserManagement'), [navigation]);
  const navigateToBookingManagement = useCallback(() => navigation.navigate('BookingManagement'), [navigation]);
  const navigateToAdminProfile = useCallback(() => navigation.navigate('AdminProfile'), [navigation]);

  // 5. Menu Items
  const menuItems = useMemo(() => [
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
  ], [navigateToUserManagement, navigateToBookingManagement]);

  // 6. Stat Cards (Reordered: Active Members First)
  const statCards = useMemo(() => [
    {
      icon: 'card-membership',
      iconColor: '#10b981', // Green
      value: stats.activeMembers,
      label: 'Active Members',
    },
    {
      icon: 'event-note',
      iconColor: '#8b5cf6', // Purple
      value: stats.totalBookings,
      label: 'Total Bookings',
    },
    {
      icon: 'people',
      iconColor: '#6366f1', // Indigo
      value: stats.totalUsers,
      label: 'Total Users',
    },
    {
      icon: 'pending-actions',
      iconColor: '#f59e0b', // Orange
      value: stats.pendingBookings,
      label: 'Pending',
    },
  ], [stats]);

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
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
             {/* Logo Integration */}
             <Image 
                source={require('../../../assets/logo.jpeg')} 
                style={styles.headerLogo}
                resizeMode="cover"
             />
             <View>
               <Text style={styles.greeting}>Welcome, Admin</Text>
               <Text style={styles.subGreeting}>Manage your courts</Text>
             </View>
          </View>
          
          <TouchableOpacity
            onPress={navigateToAdminProfile}
            style={styles.profileButton}
            activeOpacity={0.8}
          >
            <MaterialIcons name="admin-panel-settings" size={28} color="#6366f1" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
           <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />
        }
      >
        {/* STATS GRID */}
        <View style={styles.sectionHeader}>
           <Text style={styles.sectionTitle}>Overview</Text>
        </View>
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

        {/* QUICK ACTIONS */}
        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          {menuItems.map((item, index) => (
            <MenuCard key={index} item={item} onPress={item.action} />
          ))}
        </View>

        {/* RECENT BOOKINGS */}
        {recentBookings.length > 0 && (
          <View style={styles.activityContainer}>
            <View style={styles.activityHeader}>
               <Text style={styles.sectionTitle}>Recent Activity</Text>
               <TouchableOpacity onPress={navigateToBookingManagement}>
                  <Text style={styles.viewAllText}>View All</Text>
               </TouchableOpacity>
            </View>
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
    paddingTop: 60,
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: '#fff',
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  subGreeting: { fontSize: 13, color: 'rgba(255, 255, 255, 0.9)', marginTop: 2 },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollContent: { paddingBottom: 40, paddingTop: 20 },
  
  sectionHeader: { paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: (width - 52) / 2, // Dynamic width for 2 columns
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'column',
    alignItems: 'flex-start',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statContent: { width: '100%' },
  statValue: { fontSize: 24, fontWeight: '800', color: '#1e293b', marginBottom: 2 },
  statLabel: { fontSize: 13, color: '#64748b', fontWeight: '500' },

  // Menu
  menuContainer: { paddingHorizontal: 20, marginBottom: 24 },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuContent: { flex: 1 },
  menuItemTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
  menuDescription: { fontSize: 13, color: '#64748b' },

  // Activity / Recent Bookings
  activityContainer: { paddingHorizontal: 20 },
  activityHeader: {
     flexDirection: 'row', 
     justifyContent: 'space-between', 
     alignItems: 'center',
     marginBottom: 4 // Handled by sectionTitle margin
  },
  viewAllText: { fontSize: 13, fontWeight: '600', color: '#6366f1', marginBottom: 12 },
  
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    alignItems: 'center',
  },
  activityInfo: {
     flexDirection: 'row',
     alignItems: 'center',
     flex: 1,
     gap: 12,
  },
  userAvatarPlaceholder: {
     width: 36,
     height: 36,
     borderRadius: 18,
     backgroundColor: '#f1f5f9',
     justifyContent: 'center',
     alignItems: 'center',
  },
  userInitials: {
     fontSize: 14,
     fontWeight: '700',
     color: '#64748b',
  },
  activityDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  activityLabel: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  activitySubLabel: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  activityValue: { fontSize: 14, color: '#1e293b', fontWeight: '600', textAlign: 'right' },
  activitySubValue: { fontSize: 12, color: '#64748b', textAlign: 'right', marginTop: 2, fontWeight: '500' },
});

export default AdminHomeScreen;