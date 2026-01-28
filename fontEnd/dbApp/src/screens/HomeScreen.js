import React, { useState, useContext, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import api from '../../api/axiosConfig';

const { width } = Dimensions.get('window');

// --- 1. CONSTANTS & DATA ---

const MEMBERSHIP_PLANS = [
  {
    id: 'regular',
    title: 'Regular Plan',
    price: '₹800 / mo',
    features: ['Daily 1 Hour Play', 'Standard Access', 'Non-marking Shoes'],
    color: ['#4f46e5', '#818cf8'], // Indigo
    icon: 'sports-tennis'
  },
  {
    id: 'student',
    title: 'Student Plan',
    price: '₹500 / mo',
    features: ['Valid ID Required', 'Daily 1 Hour Play', 'Discounted Rate'],
    color: ['#059669', '#34d399'], // Emerald
    icon: 'school'
  }
];

const AMENITIES = [
  { id: '1', icon: 'videocam', label: 'CCTV' },
  { id: '2', icon: 'emoji-objects', label: 'Pro Lights' },
  { id: '3', icon: 'checkroom', label: 'Changing' }, 
  { id: '4', icon: 'local-parking', label: 'Parking' },
  { id: '5', icon: 'cleaning-services', label: 'Hygiene' },
];

// --- 2. HELPER FUNCTIONS ---

const formatBookingDate = (isoDate) => {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning! ☀️';
  if (h < 18) return 'Good Afternoon! 🏸';
  return 'Good Evening! 🌙';
};

// --- 3. SUB-COMPONENTS ---

const AmenityItem = React.memo(({ item }) => (
  <View style={styles.amenityItem}>
    <View style={styles.amenityIconBox}>
      <MaterialIcons name={item.icon} size={24} color="#8b5cf6" />
    </View>
    <Text style={styles.amenityLabel}>{item.label}</Text>
  </View>
));

const QuickActionCard = React.memo(({ booking }) => (
  <TouchableOpacity
    style={styles.quickActionCard}
    onPress={booking.action}
    activeOpacity={0.8}
  >
    <LinearGradient
      colors={[booking.color, booking.color]} // Solid or Gradient
      style={styles.quickActionGradient}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
    >
      <View style={styles.quickActionIcon}>
        <MaterialIcons name={booking.icon} size={28} color="#fff" />
      </View>
      <Text style={styles.quickActionLabel}>{booking.label}</Text>
    </LinearGradient>
  </TouchableOpacity>
));

const MembershipPlanCard = React.memo(({ plan, onContact }) => (
  <View style={styles.planCard}>
    <LinearGradient colors={plan.color} style={styles.planHeader}>
       <View style={styles.planHeaderTop}>
         <View style={styles.planIconBox}>
            <MaterialIcons name={plan.icon} size={20} color={plan.color[0]} />
         </View>
         <Text style={styles.planTitle}>{plan.title}</Text>
       </View>
       <Text style={styles.planPrice}>{plan.price}</Text>
    </LinearGradient>
    <View style={styles.planBody}>
       {plan.features.map((feature, index) => (
         <View key={index} style={styles.featureRow}>
           <MaterialIcons name="check" size={14} color="#10b981" />
           <Text style={styles.featureText}>{feature}</Text>
         </View>
       ))}
       <TouchableOpacity 
          style={[styles.planButton, { borderColor: plan.color[0] }]} 
          onPress={onContact}
       >
         <Text style={[styles.planButtonText, { color: plan.color[0] }]}>Contact for Payment</Text>
       </TouchableOpacity>
    </View>
  </View>
));

const BookingCard = React.memo(({ booking, onPress }) => (
  <TouchableOpacity
    style={styles.bookingCard}
    onPress={() => onPress(booking._id)}
    activeOpacity={0.7}
  >
    <View style={styles.bookingCardLeft}>
      <Text style={styles.bookingDateDay}>{new Date(booking.date).getDate()}</Text>
      <Text style={styles.bookingDateMonth}>{new Date(booking.date).toLocaleDateString('en-US', { month: 'short' })}</Text>
    </View>
    
    <View style={styles.bookingCardMiddle}>
      <Text style={styles.bookingCourt}>{booking.court?.name || 'Court'}</Text>
      <Text style={styles.bookingTime}>
        <MaterialIcons name="schedule" size={12} color="#64748b" /> {booking.startTime} - {booking.endTime}
      </Text>
    </View>

    <View style={[
        styles.statusBadge, 
        booking.bookingStatus === 'Confirmed' ? styles.statusConfirmed : styles.statusPending
    ]}>
      <Text style={[
          styles.statusText, 
          booking.bookingStatus === 'Confirmed' ? styles.textConfirmed : styles.textPending
      ]}>
        {booking.bookingStatus}
      </Text>
    </View>
  </TouchableOpacity>
));

// --- 4. MAIN SCREEN ---

const HomeScreen = ({ navigation }) => {
  const [stats, setStats] = useState({ totalBookings: 0, hoursPlayed: 0, tournaments: 0 });
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState(getGreeting());

  // Data Fetching
  const loadHomeData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [statsRes, bookingsRes] = await Promise.all([
        api.get('/stats/my-stats').catch(() => ({ data: { success: false } })),
        api.get('/bookings/upcoming').catch(() => ({ data: { success: false } })),
      ]);

      if (statsRes.data.success) setStats(statsRes.data.data);
      if (bookingsRes.data.success) setUpcomingBookings(bookingsRes.data.data);
    } catch (error) {
      console.error('Home Data Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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

  // Navigation Handlers
  const navigateToProfile = useCallback(() => navigation.navigate('ProfileTab'), [navigation]);
  const navigateToBookings = useCallback(() => navigation.navigate('BookingsTab'), [navigation]);
  const navigateToBookingFlow = useCallback(() => navigation.navigate('BookingFlow', { screen: 'CourtSelectionMain' }), [navigation]);
  const navigateToOpenMatches = useCallback(() => navigation.navigate('OpenMatches'), [navigation]);
  const navigateToContact = useCallback(() => navigation.navigate('ContactTab'), [navigation]); 
  
  const navigateToBookingDetail = useCallback((bookingId) => {
    navigation.navigate('BookingFlow', { screen: 'BookingDetailMain', params: { bookingId } });
  }, [navigation]);

  const quickBookings = useMemo(() => [
    { id: 1, icon: 'sports-tennis', label: 'Book Now', color: '#6366f1', action: navigateToBookingFlow },
    { id: 2, icon: 'event-note', label: 'Bookings', color: '#8b5cf6', action: navigateToBookings },
    { id: 3, icon: 'support-agent', label: 'Support', color: '#ec4899', action: navigateToContact },
    { id: 4, icon: 'person', label: 'Profile', color: '#f43f5e', action: navigateToProfile },
  ], [navigateToBookingFlow, navigateToBookings, navigateToContact, navigateToProfile]);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Image 
              source={require('../../assets/logo.jpeg')} 
              style={styles.headerLogo} 
              resizeMode="cover" 
            />
            <View>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.subGreeting}>Let's hit the court!</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.profileIcon} onPress={navigateToProfile}>
            <MaterialIcons name="account-circle" size={40} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />}
      >
        
        {/* Quick Access Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.quickActionsGrid}>
            {quickBookings.map((item) => (
              <QuickActionCard key={item.id} booking={item} />
            ))}
          </View>
        </View>

        {/* Membership Plans Carousel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Membership Plans</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
            {MEMBERSHIP_PLANS.map((plan) => (
              <MembershipPlanCard key={plan.id} plan={plan} onContact={navigateToContact} />
            ))}
          </ScrollView>
        </View>

        {/* Amenities Carousel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amenities</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
            {AMENITIES.map((item) => (
              <AmenityItem key={item.id} item={item} />
            ))}
          </ScrollView>
        </View>

        {/* Join Game Banner */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Players Wanted</Text>
          <TouchableOpacity style={styles.joinBanner} onPress={navigateToOpenMatches} activeOpacity={0.9}>
            <LinearGradient colors={['#8b5cf6', '#ec4899']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.bannerGradient}>
              <View>
                <Text style={styles.bannerTitle}>Find a Match</Text>
                <Text style={styles.bannerSubtitle}>Join games hosted by others</Text>
              </View>
              <View style={styles.bannerIconBox}>
                 <MaterialIcons name="group-add" size={28} color="#fff" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Upcoming Bookings List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Matches</Text>
            <TouchableOpacity onPress={navigateToBookings}><Text style={styles.viewAllLink}>View All</Text></TouchableOpacity>
          </View>

          {upcomingBookings.length > 0 ? (
            <View style={styles.bookingsList}>
              {upcomingBookings.map((booking) => (
                <BookingCard key={booking._id} booking={booking} onPress={navigateToBookingDetail} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="event-available" size={40} color="#cbd5e1" />
              <Text style={styles.emptyStateText}>No upcoming bookings</Text>
              <TouchableOpacity style={styles.bookNowBtn} onPress={navigateToBookingFlow}>
                <Text style={styles.bookNowText}>Book Now</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Stats Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalBookings || 0}</Text>
              <Text style={styles.statLabel}>Matches</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.hoursPlayed || 0}</Text>
              <Text style={styles.statLabel}>Hours</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.tournaments || 0}</Text>
              <Text style={styles.statLabel}>Rank</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
};

// --- 5. STYLES ---

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' }, // Slightly off-white background
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  
  // Header
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 30, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerLogo: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', backgroundColor: '#fff' },
  greeting: { fontSize: 22, fontWeight: '800', color: '#fff' },
  subGreeting: { fontSize: 13, color: 'rgba(255, 255, 255, 0.9)', marginTop: 2 },
  profileIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
  
  scrollContent: { paddingBottom: 40 },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  viewAllLink: { fontSize: 13, color: '#6366f1', fontWeight: '600' },

  // Quick Actions
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  quickActionCard: { width: (width - 50) / 2, borderRadius: 16, overflow: 'hidden', elevation: 3, shadowColor: '#64748b', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 4 } },
  quickActionGradient: { paddingVertical: 16, alignItems: 'center', borderRadius: 16 },
  quickActionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  quickActionLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Membership Plans
  horizontalScroll: { gap: 16, paddingRight: 20 },
  planCard: { width: width * 0.72, backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', marginRight: 16, elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 4 } },
  planHeader: { padding: 16 },
  planHeaderTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  planIconBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  planTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  planPrice: { color: '#fff', fontSize: 24, fontWeight: '800' },
  planBody: { padding: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  featureText: { fontSize: 13, color: '#475569', fontWeight: '500' },
  planButton: { marginTop: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  planButtonText: { fontSize: 13, fontWeight: '700' },

  // Amenities
  amenityItem: { alignItems: 'center', marginRight: 12, width: 70 },
  amenityIconBox: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 8, shadowColor: '#64748b', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  amenityLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', textAlign: 'center' },

  // Join Banner
  joinBanner: { borderRadius: 16, overflow: 'hidden', elevation: 4, shadowColor: '#8b5cf6', shadowOpacity: 0.2 },
  bannerGradient: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bannerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  bannerSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 4 },
  bannerIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  // Bookings List
  bookingsList: { gap: 12 },
  bookingCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 12, alignItems: 'center', shadowColor: '#64748b', shadowOpacity: 0.05, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
  bookingCardLeft: { backgroundColor: '#f8fafc', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignItems: 'center', marginRight: 12, minWidth: 50 },
  bookingDateDay: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  bookingDateMonth: { fontSize: 11, fontWeight: '600', color: '#64748b', textTransform: 'uppercase' },
  bookingCardMiddle: { flex: 1 },
  bookingCourt: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  bookingTime: { fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: '500' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusConfirmed: { backgroundColor: '#dcfce7' },
  statusPending: { backgroundColor: '#fef9c3' },
  statusText: { fontSize: 11, fontWeight: '700' },
  textConfirmed: { color: '#166534' },
  textPending: { color: '#854d0e' },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 30, backgroundColor: '#fff', borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#cbd5e1' },
  emptyStateText: { fontSize: 14, color: '#94a3b8', marginVertical: 8 },
  bookNowBtn: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#eff6ff', borderRadius: 8 },
  bookNowText: { color: '#3b82f6', fontSize: 13, fontWeight: '700' },

  // Stats
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#64748b', shadowOpacity: 0.05, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
  statNumber: { fontSize: 24, fontWeight: '800', color: '#6366f1' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: '600' },
});

export default HomeScreen;