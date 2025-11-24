import React, { useState, useContext, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { AuthContext } from '../../App';
import api from '../../api/axiosConfig';

const { width } = Dimensions.get('window');

// Helper function to format date
const formatBookingDate = (isoDate) => {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Helper function for dynamic greeting
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning! ☀️';
  if (hour < 18) return 'Good Afternoon! 🏸';
  return 'Good Evening! 🌙';
};

// Memoized booking card component
const BookingCard = React.memo(({ booking, onPress }) => (
  <TouchableOpacity
    style={styles.bookingCard}
    onPress={() => onPress(booking._id)}
    activeOpacity={0.7}
  >
    <View style={styles.bookingCardLeft}>
      <MaterialIcons name="sports-tennis" size={28} color="#8b5cf6" />
    </View>
    <View style={styles.bookingCardMiddle}>
      <Text style={styles.bookingCourt}>{booking.court?.name || 'Court'}</Text>
      <Text style={styles.bookingDate}>{formatBookingDate(booking.date)}</Text>
      <Text style={styles.bookingTime}>
        {booking.startTime} - {booking.endTime}
      </Text>
    </View>
    <View style={styles.bookingCardRight}>
      <View
        style={[
          styles.statusBadge,
          booking.bookingStatus === 'Confirmed'
            ? styles.statusConfirmed
            : styles.statusPending,
        ]}
      >
        <Text style={styles.statusText}>{booking.bookingStatus}</Text>
      </View>
    </View>
  </TouchableOpacity>
));

// Memoized quick action card component
const QuickActionCard = React.memo(({ booking }) => (
  <TouchableOpacity
    style={styles.quickActionCard}
    onPress={booking.action}
    activeOpacity={0.7}
  >
    <LinearGradient
      colors={[booking.color, booking.color + '99']}
      style={styles.quickActionGradient}
    >
      <MaterialIcons name={booking.icon} size={32} color="#fff" />
      <Text style={styles.quickActionLabel}>{booking.label}</Text>
    </LinearGradient>
  </TouchableOpacity>
));

const HomeScreen = ({ navigation }) => {
  const authContext = useContext(AuthContext);
  const [stats, setStats] = useState({
    totalBookings: 0,
    hoursPlayed: 0,
    tournaments: 0,
  });
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState(getGreeting());

  // Optimized Load Data (Parallel Fetching)
  const loadHomeData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    
    try {
      // Run requests in parallel for speed
      const [statsResponse, bookingsResponse] = await Promise.all([
        api.get('/stats/my-stats').catch(err => { console.log('Stats Error:', err); return { data: { success: false } }; }),
        api.get('/bookings/upcoming').catch(err => { console.log('Bookings Error:', err); return { data: { success: false } }; }),
      ]);

      if (statsResponse.data.success) {
        setStats(statsResponse.data.data);
      }

      if (bookingsResponse.data.success) {
        setUpcomingBookings(bookingsResponse.data.data);
      }
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Auto-Refresh when focusing screen
  useFocusEffect(
    useCallback(() => {
      setGreeting(getGreeting());
      loadHomeData();
    }, [loadHomeData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadHomeData(true);
  };

  // Memoized navigation handlers
  const navigateToProfile = useCallback(() => navigation.navigate('ProfileTab'), [navigation]);
  const navigateToBookings = useCallback(() => navigation.navigate('BookingsTab'), [navigation]);
  const navigateToBookingFlow = useCallback(() => navigation.navigate('BookingFlow', { screen: 'CourtSelectionMain' }), [navigation]);
  const navigateToSubscriptionPlans = useCallback(() => navigation.navigate('ProfileTab', { screen: 'SubscriptionPlans' }), [navigation]);
  const navigateToBookingDetail = useCallback((bookingId) => {
    navigation.navigate('BookingFlow', { screen: 'BookingDetailMain', params: { bookingId } });
  }, [navigation]);

  const quickBookings = useMemo(() => [
    { id: 1, icon: 'calendar-today', label: 'Book Today', color: '#6366f1', action: navigateToBookingFlow },
    { id: 2, icon: 'event-available', label: 'My Bookings', color: '#8b5cf6', action: navigateToBookings },
    { id: 3, icon: 'location-on', label: 'Courts', color: '#ec4899', action: navigateToBookingFlow },
    { id: 4, icon: 'person', label: 'Profile', color: '#f43f5e', action: navigateToProfile },
  ], [navigateToBookingFlow, navigateToBookings, navigateToProfile]);

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
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.subGreeting}>Ready to book your court?</Text>
          </View>
          <TouchableOpacity
            style={styles.profileIcon}
            onPress={navigateToProfile}
            activeOpacity={0.7}
          >
            <MaterialIcons name="account-circle" size={40} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        removeClippedSubviews={false}
        refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.quickActionsGrid}>
            {quickBookings.map((booking) => (
              <QuickActionCard key={booking.id} booking={booking} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <LinearGradient
            colors={['#ec4899', '#f43f5e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bannerCard}
          >
            <View style={styles.bannerContent}>
              <View>
                <Text style={styles.bannerBadge}>SPECIAL OFFER</Text>
                <Text style={styles.bannerTitle}>25% Off on Yearly Plans</Text>
                <Text style={styles.bannerSubtitle}>Limited time offer</Text>
              </View>
              <Text style={styles.bannerEmoji}>🎉</Text>
            </View>
            <TouchableOpacity
              style={styles.bannerButton}
              onPress={navigateToSubscriptionPlans}
              activeOpacity={0.7}
            >
              <Text style={styles.bannerButtonText}>Upgrade Now →</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Bookings</Text>
            <TouchableOpacity onPress={navigateToBookings} activeOpacity={0.7}>
              <Text style={styles.viewAllLink}>View All →</Text>
            </TouchableOpacity>
          </View>

          {upcomingBookings.length > 0 ? (
            <View style={styles.bookingsList}>
              {upcomingBookings.map((booking) => (
                <BookingCard
                  key={booking._id}
                  booking={booking}
                  onPress={navigateToBookingDetail}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="event-available" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>No upcoming bookings</Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={navigateToBookingFlow}
                activeOpacity={0.7}
              >
                <Text style={styles.emptyStateButtonText}>Book a Court</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalBookings || 0}</Text>
              <Text style={styles.statLabel}>Total Bookings</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.hoursPlayed || 0}</Text>
              <Text style={styles.statLabel}>Hours Played</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.tournaments || 0}</Text>
              <Text style={styles.statLabel}>Tournaments</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  profileIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  viewAllLink: {
    fontSize: 14,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickActionCard: {
    width: (width - 52) / 2,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  quickActionGradient: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  bannerCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  bannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  bannerBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 6,
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  bannerEmoji: {
    fontSize: 48,
  },
  bannerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  bannerButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  bookingsList: {
    gap: 12,
  },
  bookingCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  bookingCardLeft: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  bookingCardMiddle: {
    flex: 1,
  },
  bookingCourt: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  bookingDate: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  bookingTime: {
    fontSize: 13,
    color: '#8b5cf6',
    fontWeight: '500',
  },
  bookingCardRight: {
    marginLeft: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusConfirmed: {
    backgroundColor: '#dcfce7',
  },
  statusPending: {
    backgroundColor: '#fef08a',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
    borderRadius: 15,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 12,
    marginBottom: 15,
  },
  emptyStateButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8b5cf6',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default HomeScreen;