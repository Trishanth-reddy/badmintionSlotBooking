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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../../api/axiosConfig';

// Memoized stat box component
const StatBox = React.memo(({ value, label }) => (
  <View style={styles.statBox}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
));

// Memoized bar chart item
const BarItem = React.memo(({ day, revenue, maxRevenue }) => {
  const barHeight = maxRevenue > 0 ? (revenue / maxRevenue) * 140 : 0;
  
  return (
    <View style={styles.barWrapper}>
      <View style={[styles.bar, { height: barHeight }]} />
      <Text style={styles.barLabel}>{day}</Text>
      <Text style={styles.barValue}>₹{(revenue / 1000).toFixed(1)}k</Text>
    </View>
  );
});

// Memoized court row component
const CourtRow = React.memo(({ court, maxBookings, isLast }) => {
  const barWidth = (court.bookings / maxBookings) * 100 + '%';
  
  return (
    <>
      <View style={styles.courtRow}>
        <View style={styles.courtInfo}>
          <Text style={styles.courtName}>{court.name}</Text>
          <View style={styles.popularityBar}>
            <View style={[styles.popularityFill, { width: barWidth }]} />
          </View>
        </View>
        <Text style={styles.courtBookings}>{court.bookings}</Text>
      </View>
      {!isLast && <View style={styles.divider} />}
    </>
  );
});

// Memoized summary section
const SummarySection = React.memo(() => (
  <View style={styles.summaryCard}>
    <Text style={styles.cardTitle}>Summary</Text>
    <View style={styles.summaryRow}>
      <View style={styles.summaryItem}>
        <MaterialIcons name="trending-up" size={24} color="#16a34a" />
        <Text style={styles.summaryText}>Revenue Growing</Text>
      </View>
      <View style={styles.summaryItem}>
        <MaterialIcons name="people" size={24} color="#8b5cf6" />
        <Text style={styles.summaryText}>Active Users</Text>
      </View>
      <View style={styles.summaryItem}>
        <MaterialIcons name="star" size={24} color="#f59e0b" />
        <Text style={styles.summaryText}>High Demand</Text>
      </View>
    </View>
  </View>
));

const AnalyticsScreen = ({ navigation }) => {
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    avgPerBooking: 0,
    newUsers: 0,
    revenueLast7Days: [],
    courtPopularity: [],
  });
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/stats/admin/analytics');

      if (response.data?.success) {
        setAnalytics(response.data.data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      Alert.alert('Error', 'Could not load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
    const unsubscribe = navigation.addListener('focus', loadAnalytics);
    return unsubscribe;
  }, [navigation, loadAnalytics]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Memoized calculations
  const maxRevenue = useMemo(
    () => Math.max(...analytics.revenueLast7Days.map((d) => d.revenue), 1),
    [analytics.revenueLast7Days]
  );

  const maxCourtBookings = useMemo(
    () => Math.max(...analytics.courtPopularity.map((c) => c.bookings), 1),
    [analytics.courtPopularity]
  );

  // Memoized stat boxes data
  const statBoxes = useMemo(
    () => [
      { value: `₹${analytics.totalRevenue}`, label: 'Total Revenue' },
      { value: `₹${analytics.avgPerBooking}`, label: 'Avg / Booking' },
      { value: analytics.newUsers, label: 'New Users (7d)' },
    ],
    [analytics]
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
        <TouchableOpacity
          onPress={handleGoBack}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={false}
      >
        <View style={styles.statsContainer}>
          {statBoxes.map((stat, index) => (
            <StatBox key={index} value={stat.value} label={stat.label} />
          ))}
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Revenue (Last 7 Days)</Text>
          <View style={styles.chartContainer}>
            {analytics.revenueLast7Days.map((day, idx) => (
              <BarItem
                key={idx}
                day={day.day}
                revenue={day.revenue}
                maxRevenue={maxRevenue}
              />
            ))}
          </View>
        </View>

        {analytics.courtPopularity.length > 0 && (
          <View style={styles.listCard}>
            <Text style={styles.cardTitle}>Court Popularity</Text>
            {analytics.courtPopularity.map((court, index) => (
              <CourtRow
                key={court._id || index}
                court={court}
                maxBookings={maxCourtBookings}
                isLast={index === analytics.courtPopularity.length - 1}
              />
            ))}
          </View>
        )}

        <SummarySection />
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
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSpacer: { width: 40 },
  scrollContent: { padding: 20 },
  statsContainer: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#8b5cf6' },
  statLabel: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 180,
    paddingTop: 10,
  },
  barWrapper: { alignItems: 'center', gap: 4 },
  bar: { width: 20, backgroundColor: '#8b5cf6', borderRadius: 5 },
  barLabel: { fontSize: 11, color: '#9ca3af' },
  barValue: { fontSize: 10, color: '#8b5cf6', fontWeight: 'bold' },
  listCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  courtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  courtInfo: { flex: 1 },
  courtName: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
    marginBottom: 6,
  },
  popularityBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  popularityFill: { height: '100%', backgroundColor: '#8b5cf6' },
  courtBookings: { fontSize: 14, color: '#8b5cf6', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#e5e7eb' },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: { alignItems: 'center', gap: 8 },
  summaryText: { fontSize: 12, color: '#6b7280', textAlign: 'center' },
});

export default AnalyticsScreen;
