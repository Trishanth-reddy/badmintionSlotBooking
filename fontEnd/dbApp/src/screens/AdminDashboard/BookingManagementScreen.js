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
  FlatList,
  TextInput,
  Alert,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../../api/axiosConfig'; // Ensure this path is correct
import { useDebounce } from 'use-debounce';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const filterTabs = [
  'today',
  'Pending',
  'Confirmed',
  'Cancelled',
  'all (history)',
];

const getStatusColor = (status) => {
  switch (status) {
    case 'Confirmed': return { bg: '#dcfce7', text: '#16a34a' };
    case 'Pending': return { bg: '#fef08a', text: '#ca8a04' };
    case 'Cancelled': return { bg: '#fee2e2', text: '#dc2626' };
    default: return { bg: '#f3f4f6', text: '#6b7280' };
  }
};

const BookingManagementScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('today');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [marking, setMarking] = useState(false);
  const [conflicts, setConflicts] = useState(new Set()); // Store IDs of bookings with conflicts

  const [debouncedSearch] = useDebounce(searchQuery, 500);

  // --- 1. CONFLICT DETECTION LOGIC ---
  // Scans loaded bookings to see if any player is in multiple active matches on same day
  const detectConflicts = (data) => {
    const playerMap = {}; // "Date_PlayerID" -> [BookingID, BookingID]
    const conflictSet = new Set();

    data.forEach(booking => {
      if (booking.bookingStatus === 'Cancelled') return;

      const dateKey = new Date(booking.date).toISOString().split('T')[0];
      
      // Collect all participants (Captain + Team)
      const participants = [
        booking.user?._id, 
        ...(booking.teamMembers?.map(m => m.userId?._id) || [])
      ].filter(Boolean); // Remove nulls

      participants.forEach(playerId => {
        const key = `${dateKey}_${playerId}`;
        if (!playerMap[key]) playerMap[key] = [];
        playerMap[key].push(booking._id);
      });
    });

    // Identify bookings with shared players
    Object.values(playerMap).forEach(bookingIds => {
      if (bookingIds.length > 1) {
        bookingIds.forEach(id => conflictSet.add(id));
      }
    });

    setConflicts(conflictSet);
  };

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};

      if (filterStatus === 'today') params.status = 'Pending'; // Default view
      if (['Pending', 'Confirmed', 'Cancelled'].includes(filterStatus)) params.status = filterStatus;
      if (debouncedSearch) params.search = debouncedSearch;

      // Use the ADMIN endpoint we created
      const response = await api.get('/bookings/admin/all', { params });
      
      let fetchedData = response.data?.data || [];

      // Client-side 'Today' filter (if API returns all)
      if (filterStatus === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        fetchedData = fetchedData.filter(b => b.date.startsWith(todayStr));
      }

      // Sort: Latest first
      fetchedData.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Run Conflict Detection on the fresh data
      detectConflicts(fetchedData);
      setBookings(fetchedData);

    } catch (error) {
      Alert.alert('Error', 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, debouncedSearch]);

  useFocusEffect(useCallback(() => { loadBookings(); }, [loadBookings]));

  // --- 2. UPDATED CANCEL (OVERRIDE) LOGIC ---
  const handleCancelBooking = useCallback(async (booking) => {
    Alert.alert(
      'Admin Override',
      `Force cancel booking ${booking.bookingId}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              // Using PUT as per your Controller logic
              await api.put(`/bookings/${booking._id}/cancel`, { 
                adminNote: 'Cancelled by Admin Override' 
              });
              Alert.alert('Success', 'Booking cancelled via Override.');
              loadBookings();
              setShowDetailModal(false);
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to cancel');
            }
          },
        },
      ]
    );
  }, [loadBookings]);

  const handleMarkAllPaid = useCallback(async (booking) => {
    try {
      setMarking(true);
      // Assuming you have a route for marking paid or simple update
      await api.put(`/bookings/${booking._id}/pay`); 
      Alert.alert('Success', 'Marked as Paid');
      loadBookings();
      setShowDetailModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update payment');
    } finally {
      setMarking(false);
    }
  }, [loadBookings]);

  // --- RENDERERS ---

  const renderBookingCard = useCallback(({ item }) => {
    const statusColor = getStatusColor(item.bookingStatus);
    const hasConflict = conflicts.has(item._id); // Check conflict set

    return (
      <TouchableOpacity
        style={[styles.bookingCard, hasConflict && styles.conflictCard]}
        onPress={() => { setSelectedBooking(item); setShowDetailModal(true); }}
      >
        <View style={styles.bookingCardLeft}>
          <View style={[styles.iconBox, hasConflict && { backgroundColor: '#fee2e2' }]}>
            {hasConflict ? (
              <MaterialIcons name="warning" size={24} color="#dc2626" />
            ) : (
              <MaterialIcons name="sports-tennis" size={24} color="#fff" />
            )}
          </View>
        </View>

        <View style={styles.bookingCardMiddle}>
          <View style={styles.bookingHeader}>
            <Text style={styles.bookingUser}>{item.user?.fullName || 'Unknown User'}</Text>
            {/* Show Bulk Grouping via ID */}
            <Text style={styles.bookingId}>{item.bookingId}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialIcons name="event" size={14} color="#8b5cf6" />
            <Text style={styles.detailText}>{new Date(item.date).toLocaleDateString()} • {item.startTime}</Text>
          </View>

          {hasConflict && (
            <Text style={styles.conflictText}>⚠️ Player Overlap Detected</Text>
          )}
        </View>

        <View style={styles.bookingCardRight}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.statusText, { color: statusColor.text }]}>{item.bookingStatus}</Text>
          </View>
          <Text style={styles.bookingPrice}>₹{item.totalAmount || 0}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [conflicts]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Console</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Filter & Search UI (Same as before) */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={24} color="#8b5cf6" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search Captain, Player, or ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterContainer}>
        {filterTabs.map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.filterTab, filterStatus === status && styles.filterTabActive]}
            onPress={() => setFilterStatus(status)}
          >
            <Text style={[styles.filterText, filterStatus === status && styles.filterTextActive]}>
              {status.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={bookings}
        keyExtractor={(item) => item._id}
        renderItem={renderBookingCard}
        onRefresh={loadBookings}
        refreshing={loading}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <MaterialIcons name="check-circle" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>All caught up!</Text>
            </View>
          )
        }
      />

      {/* --- 3. UPDATED MODAL: DATA MAPPING --- */}
      <Modal visible={showDetailModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedBooking && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Match Details</Text>
                  <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                    <MaterialIcons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>

                {/* RELATIONSHIP VIEW: Full Roster */}
                <View style={styles.teamCard}>
                  <Text style={styles.cardTitle}>Roster & Payment</Text>
                  
                  {/* Captain */}
                  <View style={styles.memberRow}>
                     <View>
                        <Text style={styles.memberName}>{selectedBooking.user?.fullName} (Captain)</Text>
                        <Text style={styles.memberPhone}>{selectedBooking.user?.phone}</Text>
                     </View>
                     <View style={[styles.paymentBadge, styles.paymentPaid]}>
                        <Text style={styles.paymentBadgeText}>Host</Text>
                     </View>
                  </View>

                  {/* Team Members (Populated from Backend) */}
                  {selectedBooking.teamMembers?.map((member, idx) => (
                    <View key={idx} style={styles.memberRow}>
                      <View>
                        {/* Fix: Access userId.fullName, fallback to 'Unknown' */}
                        <Text style={styles.memberName}>
                          {member.userId?.fullName || 'Guest Player'}
                        </Text>
                        <Text style={styles.memberPhone}>
                          {member.userId?.phone || 'No phone'}
                        </Text>
                      </View>
                      <View style={[
                        styles.paymentBadge, 
                        member.paymentStatus === 'Paid' ? styles.paymentPaid : styles.paymentPending
                      ]}>
                        <Text style={styles.paymentBadgeText}>{member.paymentStatus}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* OVERRIDE ACTIONS */}
                <View style={styles.actionContainer}>
                    {selectedBooking.bookingStatus === 'Pending' && (
                        <TouchableOpacity style={styles.actionButton} onPress={() => handleMarkAllPaid(selectedBooking)}>
                            <LinearGradient colors={['#16a34a', '#15803d']} style={styles.actionButtonGradient}>
                                <Text style={styles.actionButtonText}>Mark Paid & Approve</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                    
                    {selectedBooking.bookingStatus !== 'Cancelled' && (
                        <TouchableOpacity style={styles.actionButton} onPress={() => handleCancelBooking(selectedBooking)}>
                            <LinearGradient colors={['#dc2626', '#b91c1c']} style={styles.actionButtonGradient}>
                                <Text style={styles.actionButtonText}>Admin Override (Cancel)</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginLeft: 15, flex: 1 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 20, paddingHorizontal: 15, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  searchInput: { flex: 1, paddingVertical: 12, marginLeft: 8 },
  filterContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 12, gap: 8, flexWrap: 'wrap' },
  filterTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  filterTabActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
  filterText: { fontSize: 12, color: '#6b7280' },
  filterTextActive: { color: '#fff' },
  listContent: { paddingHorizontal: 20, paddingBottom: 20, gap: 10 },
  
  // Card Styles
  bookingCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 15, padding: 12, elevation: 2 },
  conflictCard: { borderWidth: 1, borderColor: '#fca5a5', backgroundColor: '#fff1f2' }, // Red tint for conflict
  bookingCardLeft: { marginRight: 10 },
  iconBox: { width: 45, height: 45, borderRadius: 10, backgroundColor: '#8b5cf6', justifyContent: 'center', alignItems: 'center' },
  bookingCardMiddle: { flex: 1 },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  bookingUser: { fontSize: 14, fontWeight: 'bold', color: '#1f2937' },
  bookingId: { fontSize: 11, color: '#9ca3af' },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3, gap: 4 },
  detailText: { fontSize: 12, color: '#6b7280' },
  conflictText: { fontSize: 11, color: '#dc2626', fontWeight: 'bold', marginTop: 4 },
  bookingCardRight: { alignItems: 'flex-end', marginLeft: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
  bookingPrice: { fontSize: 14, fontWeight: 'bold', color: '#8b5cf6' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingBottom: 30, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  teamCard: { backgroundColor: '#f9fafb', margin: 20, borderRadius: 12, padding: 16 },
  cardTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  memberRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  memberName: { fontSize: 14, fontWeight: '600' },
  memberPhone: { fontSize: 12, color: '#9ca3af' },
  paymentBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  paymentPaid: { backgroundColor: '#dcfce7' },
  paymentPending: { backgroundColor: '#fef08a' },
  paymentBadgeText: { fontSize: 11, fontWeight: '600' },
  actionContainer: { marginHorizontal: 20, gap: 10 },
  actionButton: { borderRadius: 12, overflow: 'hidden' },
  actionButtonGradient: { paddingVertical: 14, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontWeight: 'bold' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#9ca3af', marginTop: 10 }
});

export default BookingManagementScreen;