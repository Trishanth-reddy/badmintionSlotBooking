import React, {
  useState,
  useEffect,
  useCallback, // --- OPTIMIZATION ---
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
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../../api/axiosConfig';
import { useDebounce } from 'use-debounce'; // Install: npm i use-debounce
import { useFocusEffect } from '@react-navigation/native'; // --- OPTIMIZATION --- (Imported for focus listener)

// --- OPTIMIZATION ---
// Moved static constants and helper functions outside the component.
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
    case 'Confirmed':
      return { bg: '#dcfce7', text: '#16a34a' };
    case 'Pending':
      return { bg: '#fef08a', text: '#ca8a04' };
    case 'Cancelled':
      return { bg: '#fee2e2', text: '#dc2626' };
    default:
      return { bg: '#f3f4f6', text: '#6b7280' };
  }
};
// --- END OPTIMIZATION ---

// Helper: convert "h:mm AM/PM" to minutes since midnight
const toMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let [_, h, m, ap] = match;
  let hour = parseInt(h, 10);
  const min = parseInt(m, 10);
  const isPM = ap.toUpperCase() === 'PM';
  if (hour === 12 && !isPM) hour = 0; // 12:xx AM -> 0
  if (isPM && hour !== 12) hour += 12; // PM add 12 except 12 PM
  return hour * 60 + min;
};

const BookingManagementScreen = ({ navigation }) => {
  const today = new Date().toISOString().split('T')[0];
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('today');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [marking, setMarking] = useState(false);

  const [debouncedSearch] = useDebounce(searchQuery, 500);

  // --- OPTIMIZATION ---
  // Memoized all event handlers and data loaders.

  // This function was already memoized, which is great.
  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};

      // "today" = requests submitted today and sent to admin (Pending)
      if (filterStatus === 'today') {
        params.status = 'Pending';
      }
      // For status tabs, fetch full history for that status (no date)
      if (['Pending', 'Confirmed', 'Cancelled'].includes(filterStatus)) {
        params.status = filterStatus;
      }

      if (debouncedSearch) {
        params.search = debouncedSearch;
      }

      const response = await api.get('/bookings/admin/all', { params });

      // For "today" tab, show only bookings created today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayStart.getDate() + 1);

      const incoming = response.data?.data || [];
      const filtered =
        filterStatus === 'today'
          ? incoming.filter((b) => {
              const created = new Date(b.createdAt);
              return created >= todayStart && created < todayEnd;
            })
          : incoming;

      // Client-side sort: latest date/time first
      const sorted = filtered.slice().sort((a, b) => {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        if (db !== da) return db - da; // Newer dates first
        const ta = toMinutes(a.startTime);
        const tb = toMinutes(b.startTime);
        return tb - ta; // Later times first within same date
      });
      setBookings(sorted);
    } catch (error) {
      console.error('Error loading bookings:', error);
      Alert.alert('Error', 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [today, filterStatus, debouncedSearch]);

  // Load bookings when filters change
  useEffect(() => {
    loadBookings();
  }, [loadBookings]); // Depends on the memoized function

  // Add focus listener to refresh
  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [loadBookings])
  );

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCloseModal = useCallback(() => {
    setShowDetailModal(false);
  }, []); // `setShowDetailModal` is stable

  const handleMarkAllPaid = useCallback(async (booking) => {
    try {
      setMarking(true);
      const response = await api.put(`/bookings/admin/${booking._id}/pay-all`);
      Alert.alert('Success', response.data.message);
      loadBookings(); // Refresh the list
      handleCloseModal(); // Close modal
    } catch (error) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to update'
      );
    } finally {
      setMarking(false);
    }
  }, [loadBookings, handleCloseModal]); // Depends on memoized functions

  const handleCancelBooking = useCallback(
    async (booking) => {
      Alert.alert(
        'Cancel Booking',
        `Cancel booking ${booking.bookingId}?`,
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes',
            onPress: async () => {
              try {
                await api.delete(`/bookings/admin/${booking._id}`, {
                  data: { reason: 'Cancelled by admin' },
                });
                Alert.alert('Success', 'Booking cancelled');
                loadBookings(); // Refresh the list
                handleCloseModal(); // Close modal
              } catch (error) {
                Alert.alert('Error', 'Failed to cancel booking');
              }
            },
            style: 'destructive',
          },
        ]
      );
    },
    [loadBookings, handleCloseModal] // Depends on memoized functions
  );

  const handleViewDetails = useCallback((item) => {
    setSelectedBooking(item);
    setShowDetailModal(true);
  }, []); // `setSelectedBooking` and `setShowDetailModal` are stable

  const handleFilterChange = useCallback((status) => {
    setFilterStatus(status);
  }, []); // `setFilterStatus` is stable

  // --- OPTIMIZATION ---
  // Memoized the `renderItem` function for FlatList.
  const renderBookingCard = useCallback(
    ({ item }) => {
      const statusColor = getStatusColor(item.bookingStatus); // Uses helper

      return (
        <TouchableOpacity
          style={styles.bookingCard}
          onPress={() => handleViewDetails(item)} // Uses memoized handler
        >
          <View style={styles.bookingCardLeft}>
            <View style={styles.iconBox}>
              <MaterialIcons name="sports-tennis" size={24} color="#fff" />
            </View>
          </View>

          <View style={styles.bookingCardMiddle}>
            <View style={styles.bookingHeader}>
              <Text style={styles.bookingUser}>{item.user?.fullName}</Text>
              <Text style={styles.bookingId}>{item.bookingId}</Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialIcons name="location-on" size={14} color="#8b5cf6" />
              <Text style={styles.detailText}>{item.court?.name}</Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialIcons name="schedule" size={14} color="#8b5cf6" />
              <Text style={styles.detailText}>
                {item.startTime} - {item.endTime}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialIcons name="people" size={14} color="#8b5cf6" />
              <Text style={styles.detailText}>{item.totalPlayers} players</Text>
            </View>
          </View>

          <View style={styles.bookingCardRight}>
            <View
              style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}
            >
              <Text style={[styles.statusText, { color: statusColor.text }]}>
                {item.bookingStatus}
              </Text>
            </View>
            <Text style={styles.bookingPrice}>₹{item.totalAmount || 0}</Text>
          </View>
        </TouchableOpacity>
      );
    },
    [handleViewDetails] // Depends on memoized handler
  );
  // --- END OPTIMIZATION ---

  if (loading && !bookings.length) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#6366f1', '#8b5cf6']}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={handleGoBack} // --- OPTIMIZATION ---
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Management</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Search */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={24} color="#8b5cf6" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or Booking ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {filterTabs.map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterTab,
              filterStatus === status && styles.filterTabActive,
            ]}
            onPress={() => handleFilterChange(status)} // --- OPTIMIZATION ---
          >
            <Text
              style={[
                styles.filterText,
                filterStatus === status && styles.filterTextActive,
              ]}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bookings List */}
      <FlatList
        data={bookings}
        keyExtractor={(item) => item._id}
        renderItem={renderBookingCard} // --- OPTIMIZATION ---
        onRefresh={loadBookings} // --- OPTIMIZATION ---
        refreshing={loading}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="event-busy" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No bookings found</Text>
          </View>
        }
      />

      {/* Detail Modal */}
      <Modal visible={showDetailModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedBooking && (
              <>
                <View style={styles.modalHeader}>
                  <TouchableOpacity
                    onPress={handleCloseModal} // --- OPTIMIZATION ---
                  >
                    <MaterialIcons name="close" size={28} color="#1f2937" />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Booking Details</Text>
                  <View style={{ width: 40 }} />
                </View>

                {/* Team Members Payment Status */}
                <View style={styles.teamCard}>
                  <Text style={styles.cardTitle}>
                    Team Members ({selectedBooking.totalPlayers})
                  </Text>
                  {selectedBooking.teamMembers.map((member, idx) => (
                    <View key={idx} style={styles.memberRow}>
                      <View>
                        <Text style={styles.memberName}>
                          {member.memberName}
                        </Text>
                        <Text style={styles.memberPhone}>
                          {member.memberPhone}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.paymentBadge,
                          member.paymentStatus === 'Paid'
                            ? styles.paymentPaid
                            : styles.paymentPending,
                        ]}
                      >
                        <Text style={styles.paymentBadgeText}>
                          {member.paymentStatus}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Action Buttons */}
                {selectedBooking.bookingStatus === 'Pending' && (
                  <View style={styles.actionContainer}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleMarkAllPaid(selectedBooking)} // --- OPTIMIZATION ---
                      disabled={marking}
                    >
                      <LinearGradient
                        colors={['#16a34a', '#15803d']}
                        style={styles.actionButtonGradient}
                      >
                        {marking ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <>
                            <MaterialIcons
                              name="done-all"
                              size={20}
                              color="#fff"
                            />
                            <Text style={styles.actionButtonText}>
                              Mark All Paid
                            </Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() =>
                        handleCancelBooking(selectedBooking)
                      } // --- OPTIMIZATION ---
                    >
                      <LinearGradient
                        colors={['#dc2626', '#b91c1c']}
                        style={styles.actionButtonGradient}
                      >
                        <MaterialIcons name="close" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>
                          Cancel Booking
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Styles (unchanged, already optimized)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    fontSize: 15,
    color: '#333',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 12,
    // --- UPDATED to allow scrolling ---
    flexWrap: 'wrap',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14, // Adjusted padding
    paddingVertical: 7, // Adjusted padding
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterTabActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
  filterText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  listContent: { paddingHorizontal: 20, paddingBottom: 20, gap: 10 },
  bookingCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  bookingCardLeft: { marginRight: 10 },
  iconBox: {
    width: 45,
    height: 45,
    borderRadius: 10,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookingCardMiddle: { flex: 1 },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  bookingUser: { fontSize: 14, fontWeight: 'bold', color: '#1f2937' },
  bookingId: { fontSize: 11, color: '#9ca3af' },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
    gap: 4,
  },
  detailText: { fontSize: 12, color: '#6b7280' },
  bookingCardRight: { alignItems: 'flex-end', marginLeft: 8 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  bookingPrice: { fontSize: 14, fontWeight: 'bold', color: '#8b5cf6' },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: { fontSize: 16, color: '#9ca3af', marginTop: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingBottom: 30,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  teamCard: {
    backgroundColor: '#f9fafb',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  memberName: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  memberPhone: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  paymentBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  paymentPaid: { backgroundColor: '#dcfce7' },
  paymentPending: { backgroundColor: 'rgba(254, 240, 138, 0.5)' }, // Lighter yellow
  paymentBadgeText: { fontSize: 12, fontWeight: '600', color: '#1f2937' },
  actionContainer: { marginHorizontal: 20, marginTop: 20, gap: 10 },
  actionButton: { borderRadius: 12, overflow: 'hidden' },
  actionButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  actionButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});

export default BookingManagementScreen;