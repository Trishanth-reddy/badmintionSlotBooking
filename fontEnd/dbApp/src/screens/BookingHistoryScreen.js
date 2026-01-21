import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/axiosConfig';

// --- 1. CONSTANTS & HELPERS ---
const STATUS_COLORS = {
  Confirmed: { bg: '#dcfce7', text: '#16a34a' },
  Pending: { bg: '#fef08a', text: '#ca8a04' },
  Completed: { bg: '#e0e7ff', text: '#4f46e5' },
  Cancelled: { bg: '#fee2e2', text: '#dc2626' },
  default: { bg: '#f3f4f6', text: '#6b7280' },
};

const getStatusColor = (status) => STATUS_COLORS[status] || STATUS_COLORS.default;

const formatBookingDate = (isoDate) => {
  if (!isoDate) return 'N/A';
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

// --- 2. SUB-COMPONENTS ---
const EmptyState = React.memo(() => (
  <View style={styles.emptyState}>
    <MaterialIcons name="event-busy" size={48} color="#d1d5db" />
    <Text style={styles.emptyText}>No bookings yet</Text>
  </View>
));

const BookingCard = React.memo(({ item, onPress, onCancel, currentUserId }) => {
  const statusColor = getStatusColor(item.bookingStatus);
  const isCaptain = (item.user?._id || item.user) === currentUserId;
  const hasPendingRequests = isCaptain && item.joinRequests?.some(r => r.status === 'Pending');
  const myJoinRequest = item.joinRequests?.find(r => (r.user?._id || r.user) === currentUserId);
  
  // Only show cancel button if user is captain and match isn't already cancelled or completed
  const canCancel = isCaptain && item.bookingStatus !== 'Cancelled' && item.bookingStatus !== 'Completed';

  return (
    <TouchableOpacity 
      style={styles.bookingCard} 
      onPress={() => onPress(item)} 
      activeOpacity={0.7}
    >
      <View style={styles.bookingCardMiddle}>
        <View style={styles.bookingHeader}>
          <Text style={styles.bookingCourt}>{item.court.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.statusText, { color: statusColor.text }]}>
              {myJoinRequest && !isCaptain ? `Requested (${myJoinRequest.status})` : item.bookingStatus}
            </Text>
          </View>
        </View>
        
        <Text style={styles.bookingDate}>{formatBookingDate(item.date)} • {item.startTime}</Text>
        
        <View style={styles.footerRow}>
          <Text style={styles.bookingPrice}>₹{item.totalAmount || 0} • {item.totalPlayers}/6 players</Text>
          <View style={styles.actionRow}>
            {hasPendingRequests && (
              <View style={styles.requestAlert}>
                <MaterialIcons name="notification-important" size={14} color="#ca8a04" />
                <Text style={styles.requestAlertText}>New Requests</Text>
              </View>
            )}
            {canCancel && (
              <TouchableOpacity 
                onPress={() => onCancel(item._id)} 
                style={styles.deleteButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="cancel" size={20} color="#dc2626" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#d1d5db" />
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
        setBookings(response.data.data);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not load booking history.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCancelBooking = async (id) => {
    Alert.alert(
      "Cancel Booking",
      "Are you sure you want to cancel this match? This action cannot be undone.",
      [
        { text: "No", style: "cancel" },
        { 
          text: "Yes, Cancel", 
          style: "destructive",
          onPress: async () => {
            try {
              // Using the PUT route defined in your bookings.js: router.put('/:id/cancel', protect, cancelBooking);
              const response = await api.put(`/bookings/${id}/cancel`);
              if (response.data.success) {
                Alert.alert("Success", "Booking cancelled successfully.");
                loadBookingHistory(); // Refresh list
              }
            } catch (error) {
              const msg = error.response?.data?.message || "Could not cancel booking.";
              Alert.alert("Error", msg);
            }
          }
        }
      ]
    );
  };

  useFocusEffect(useCallback(() => { loadBookingHistory(); }, [loadBookingHistory]));

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </LinearGradient>
      
      <FlatList
        data={bookings}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <BookingCard 
            item={item} 
            onPress={(i) => navigation.navigate('HomeTab', {
              screen: 'BookingDetailMain',
              params: { bookingId: i._id }
            })}
            onCancel={handleCancelBooking}
            currentUserId={currentUserId} 
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl 
            refreshing={loading} 
            onRefresh={loadBookingHistory} 
            colors={['#8b5cf6']} 
          />
        }
        ListEmptyComponent={EmptyState}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  listContent: { padding: 20 },
  bookingCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 15, padding: 14, marginBottom: 12, elevation: 2, alignItems: 'center' },
  bookingCardMiddle: { flex: 1 },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bookingCourt: { fontSize: 14, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },
  bookingDate: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, alignItems: 'center' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bookingPrice: { fontSize: 12, color: '#8b5cf6' },
  requestAlert: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef9c3', paddingHorizontal: 6, borderRadius: 4, gap: 4 },
  requestAlertText: { fontSize: 10, fontWeight: 'bold', color: '#854d0e' },
  deleteButton: { padding: 4 },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 16, color: '#9ca3af', marginTop: 12 },
});

export default BookingHistoryScreen;