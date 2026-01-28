import React, { useState, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  Alert, 
  RefreshControl, 
  ActivityIndicator 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/axiosConfig';

// --- 1. CONSTANTS & HELPERS ---

const STATUS_CONFIG = {
  Confirmed: { bg: '#dcfce7', text: '#15803d', icon: 'check-circle' },
  Pending: { bg: '#fef9c3', text: '#a16207', icon: 'hourglass-empty' },
  Completed: { bg: '#f1f5f9', text: '#475569', icon: 'history' },
  Cancelled: { bg: '#fee2e2', text: '#b91c1c', icon: 'cancel' },
  default: { bg: '#f3f4f6', text: '#6b7280', icon: 'help' },
};

const formatBookingDate = (isoDate) => {
  if (!isoDate) return 'N/A';
  return new Date(isoDate).toLocaleDateString('en-GB', { 
    day: 'numeric', month: 'short', year: 'numeric' 
  });
};

// --- 2. SUB-COMPONENTS ---

const EmptyState = React.memo(({ onRefresh }) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconBg}>
      <MaterialIcons name="event-note" size={48} color="#cbd5e1" />
    </View>
    <Text style={styles.emptyTitle}>No Bookings Found</Text>
    <Text style={styles.emptySubtitle}>You haven't booked any courts yet.</Text>
    <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
      <Text style={styles.refreshText}>Refresh</Text>
    </TouchableOpacity>
  </View>
));

const BookingCard = React.memo(({ item, onPress, onCancel, currentUserId }) => {
  const config = STATUS_CONFIG[item.bookingStatus] || STATUS_CONFIG.default;
  const isCaptain = (item.user?._id || item.user) === currentUserId;
  const hasRequests = isCaptain && item.joinRequests?.some(r => r.status === 'Pending');
  
  // Logic: Can cancel if Captain AND status is valid (Confirmed/Pending)
  const canCancel = isCaptain && ['Confirmed', 'Pending'].includes(item.bookingStatus);

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => onPress(item)} 
      activeOpacity={0.9} // Better touch feel
    >
      {/* HEADER: Date & Status */}
      <View style={styles.cardHeader}>
        <View style={styles.dateRow}>
           <MaterialIcons name="event" size={16} color="#64748b" />
           <Text style={styles.dateText}>
             {formatBookingDate(item.date)} • {item.startTime}
           </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: config.bg }]}>
           <Text style={[styles.statusText, { color: config.text }]}>{item.bookingStatus}</Text>
        </View>
      </View>

      {/* BODY: Court Info */}
      <View style={styles.cardBody}>
        <Text style={styles.courtName}>{item.court?.name || 'Badminton Court'}</Text>
        <Text style={styles.priceText}>₹{item.totalAmount} • {item.totalPlayers || 1}/6 Players</Text>
      </View>

      {/* FOOTER: Actions & Alerts */}
      {(hasRequests || canCancel) && (
        <>
          <View style={styles.divider} />
          <View style={styles.cardFooter}>
            {hasRequests ? (
              <View style={styles.alertBadge}>
                <View style={styles.alertDot} />
                <Text style={styles.alertText}>New Requests</Text>
              </View>
            ) : <View />} 

            {canCancel && (
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => onCancel(item._id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </TouchableOpacity>
  );
});

// --- 3. MAIN SCREEN ---

const BookingHistoryScreen = ({ navigation }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  const loadBookingHistory = useCallback(async () => {
    try {
      setLoading(true);
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const parsed = JSON.parse(userData);
        setCurrentUserId(parsed.id || parsed._id);
      }

      const response = await api.get('/bookings/my-bookings');
      if (response.data.success) {
        // Sort by Date Descending (Newest first)
        const sorted = response.data.data.sort((a, b) => new Date(b.date) - new Date(a.date));
        setBookings(sorted);
      }
    } catch (error) {
      console.log('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCancelBooking = useCallback((id) => {
    Alert.alert(
      "Cancel Booking",
      "Are you sure? This action cannot be undone.",
      [
        { text: "Keep it", style: "cancel" },
        { 
          text: "Yes, Cancel", 
          style: "destructive",
          onPress: async () => {
            try {
              const response = await api.put(`/bookings/${id}/cancel`);
              if (response.data.success) {
                Alert.alert("Cancelled", "Your booking has been cancelled.");
                loadBookingHistory(); 
              }
            } catch (error) {
              const msg = error.response?.data?.message || "Could not cancel.";
              Alert.alert("Error", msg);
            }
          }
        }
      ]
    );
  }, [loadBookingHistory]);

  useFocusEffect(useCallback(() => { loadBookingHistory(); }, [loadBookingHistory]));

  const navigateToDetail = useCallback((item) => {
    navigation.navigate('HomeTab', {
      screen: 'BookingFlow',
      params: {
        screen: 'BookingDetailMain',
        params: { bookingId: item._id }
      }
    });
  }, [navigation]);

  const renderItem = useCallback(({ item }) => (
    <BookingCard 
      item={item} 
      onPress={navigateToDetail}
      onCancel={handleCancelBooking}
      currentUserId={currentUserId} 
    />
  ), [currentUserId, navigateToDetail, handleCancelBooking]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </LinearGradient>
      
      <FlatList
        data={bookings}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        initialNumToRender={6}
        windowSize={5}
        removeClippedSubviews={true}
        refreshControl={
          <RefreshControl 
            refreshing={loading} 
            onRefresh={loadBookingHistory} 
            colors={['#8b5cf6']} 
            tintColor="#8b5cf6"
          />
        }
        ListEmptyComponent={!loading && <EmptyState onRefresh={loadBookingHistory} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: 60, paddingBottom: 24, paddingHorizontal: 24 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff' },
  listContent: { padding: 20, paddingBottom: 40 },
  
  // --- CARD STYLES ---
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  
  cardBody: { marginBottom: 4 },
  courtName: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  priceText: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },
  
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 12 },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  alertBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff7ed', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 6 },
  alertDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ea580c' },
  alertText: { fontSize: 12, fontWeight: '600', color: '#c2410c' },
  
  cancelBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  cancelText: { fontSize: 13, fontWeight: '600', color: '#ef4444' },

  // --- EMPTY STATE ---
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 24 },
  refreshBtn: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 20, backgroundColor: '#eff6ff' },
  refreshText: { color: '#3b82f6', fontWeight: '600', fontSize: 14 },
});

export default BookingHistoryScreen;