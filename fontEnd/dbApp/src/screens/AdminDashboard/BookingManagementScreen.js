import React, {
  useState,
  useEffect,
  useCallback,
  useMemo
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
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../../api/axiosConfig'; 
import { useDebounce } from 'use-debounce';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// Tabs Configuration
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

const BookingCard = React.memo(({ item, onPress }) => {
    const statusColor = getStatusColor(item.bookingStatus);
    return (
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={() => onPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.bookingCardLeft}>
          <View style={styles.iconBox}>
              <MaterialIcons name="sports-tennis" size={24} color="#fff" />
          </View>
        </View>

        <View style={styles.bookingCardMiddle}>
          <View style={styles.bookingHeader}>
            <Text style={styles.bookingUser} numberOfLines={1}>{item.user?.fullName || 'Unknown User'}</Text>
            <Text style={styles.bookingId}>{item.bookingId}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialIcons name="event" size={14} color="#8b5cf6" />
            <Text style={styles.detailText}>
                {new Date(item.date).toLocaleDateString('en-GB')} • {item.startTime}
            </Text>
          </View>
        </View>

        <View style={styles.bookingCardRight}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.statusText, { color: statusColor.text }]}>{item.bookingStatus}</Text>
          </View>
          <Text style={styles.bookingPrice}>₹{item.totalAmount || 0}</Text>
        </View>
      </TouchableOpacity>
    );
});

const BookingManagementScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('today'); 
  
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [debouncedSearch] = useDebounce(searchQuery, 500);

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};

      if (filterStatus !== 'today' && filterStatus !== 'all (history)') {
         params.status = filterStatus;
      }
      
      if (debouncedSearch) params.search = debouncedSearch;

      const response = await api.get('/bookings/admin/all', { params });
      let fetchedData = response.data?.data || [];

      // Client-side Filter for 'Today'
      if (filterStatus === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        fetchedData = fetchedData.filter(b => b.date.startsWith(todayStr));
      }

      // Sort: Latest first
      fetchedData.sort((a, b) => new Date(b.date) - new Date(a.date));
      setBookings(fetchedData);

    } catch (error) {
      console.error(error);
      // Silent fail or toast
    } finally {
      setLoading(false);
    }
  }, [filterStatus, debouncedSearch]);

  useFocusEffect(useCallback(() => { loadBookings(); }, [loadBookings]));

  const handleCancelBooking = useCallback(async (booking) => {
    Alert.alert(
      'Force Cancel',
      `Cancel booking ${booking.bookingId}? This will notify the user.`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await api.put(`/bookings/${booking._id}/cancel`, { 
                adminNote: 'Cancelled by Admin Override' 
              });
              Alert.alert('Success', 'Booking cancelled.');
              loadBookings();
              setShowDetailModal(false);
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to cancel');
            } finally {
                setActionLoading(false);
            }
          },
        },
      ]
    );
  }, [loadBookings]);

  const handleMarkAllPaid = useCallback(async (booking) => {
    try {
      setActionLoading(true);
      await api.put(`/bookings/${booking._id}/pay`); 
      Alert.alert('Success', 'Marked as Paid');
      loadBookings();
      setShowDetailModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update payment');
    } finally {
      setActionLoading(false);
    }
  }, [loadBookings]);

  const renderBookingCard = useCallback(({ item }) => (
      <BookingCard item={item} onPress={(b) => { setSelectedBooking(b); setShowDetailModal(true); }} />
  ), []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Management</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={22} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search ID, Name..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#94a3b8"
        />
      </View>

      <View style={styles.filterWrapper}>
        <FlatList 
            horizontal
            showsHorizontalScrollIndicator={false}
            data={filterTabs}
            keyExtractor={item => item}
            contentContainerStyle={styles.filterContainer}
            renderItem={({ item }) => (
                <TouchableOpacity
                    style={[styles.filterTab, filterStatus === item && styles.filterTabActive]}
                    onPress={() => setFilterStatus(item)}
                >
                    <Text style={[styles.filterText, filterStatus === item && styles.filterTextActive]}>
                    {item.toUpperCase()}
                    </Text>
                </TouchableOpacity>
            )}
        />
      </View>

      <FlatList
        data={bookings}
        keyExtractor={(item) => item._id}
        renderItem={renderBookingCard}
        onRefresh={loadBookings}
        refreshing={loading}
        contentContainerStyle={styles.listContent}
        initialNumToRender={8}
        windowSize={5}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <MaterialIcons name="event-busy" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No bookings found</Text>
            </View>
          )
        }
      />

      {/* --- DETAIL MODAL --- */}
      <Modal visible={showDetailModal} transparent animationType="fade" onRequestClose={() => setShowDetailModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedBooking && (
              <>
                <View style={styles.modalDragHandle} />
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Match Details</Text>
                  <TouchableOpacity onPress={() => setShowDetailModal(false)} style={styles.closeBtn}>
                    <MaterialIcons name="close" size={22} color="#475569" />
                  </TouchableOpacity>
                </View>

                <View style={styles.detailBody}>
                    <View style={styles.infoBlock}>
                        <Text style={styles.infoLabel}>Booking ID</Text>
                        <Text style={styles.infoValue}>{selectedBooking.bookingId}</Text>
                    </View>
                    
                    <View style={styles.infoRow}>
                        <View style={styles.infoBlock}>
                            <Text style={styles.infoLabel}>Date</Text>
                            <Text style={styles.infoValue}>{new Date(selectedBooking.date).toLocaleDateString('en-GB')}</Text>
                        </View>
                        <View style={styles.infoBlock}>
                            <Text style={styles.infoLabel}>Time</Text>
                            <Text style={styles.infoValue}>{selectedBooking.startTime}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <Text style={styles.sectionHeader}>Players & Payment</Text>
                    
                    {/* Captain */}
                    <View style={styles.memberRow}>
                        <View>
                            <Text style={styles.memberName}>{selectedBooking.user?.fullName} (Captain)</Text>
                            <Text style={styles.memberPhone}>{selectedBooking.user?.phone || 'No phone'}</Text>
                        </View>
                        <View style={[styles.paymentBadge, styles.paymentPaid]}>
                            <Text style={styles.paymentBadgeText}>Paid</Text>
                        </View>
                    </View>

                    {/* Team Members */}
                    {selectedBooking.teamMembers?.map((member, idx) => (
                    <View key={idx} style={styles.memberRow}>
                        <View>
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

                {/* ACTION BUTTONS */}
                <View style={styles.actionContainer}>
                    {selectedBooking.bookingStatus === 'Pending' && (
                        <TouchableOpacity style={styles.actionButton} onPress={() => handleMarkAllPaid(selectedBooking)} disabled={actionLoading}>
                            <LinearGradient colors={['#16a34a', '#15803d']} style={styles.actionButtonGradient}>
                                {actionLoading ? <ActivityIndicator color="#fff"/> : <Text style={styles.actionButtonText}>Mark Paid & Approve</Text>}
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                    
                    {selectedBooking.bookingStatus !== 'Cancelled' && (
                        <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancelBooking(selectedBooking)} disabled={actionLoading}>
                             {actionLoading ? <ActivityIndicator color="#ef4444"/> : <Text style={styles.cancelButtonText}>Cancel Booking</Text>}
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
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginLeft: 15, flex: 1 },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 20, marginTop: 15, marginBottom: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', height: 48 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: '#1e293b' },
  
  filterWrapper: { height: 50 },
  filterContainer: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
  filterTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: 'transparent' },
  filterTabActive: { backgroundColor: '#1e293b', borderColor: '#1e293b' },
  filterText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  
  listContent: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 10, gap: 12 },
  
  // Card Styles Optimized
  bookingCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 12, shadowColor: '#000', shadowOpacity: 0.04, elevation: 2, borderWidth: 1, borderColor: '#f8fafc' },
  bookingCardLeft: { marginRight: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#8b5cf6', justifyContent: 'center', alignItems: 'center' },
  bookingCardMiddle: { flex: 1, justifyContent: 'center' },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  bookingUser: { fontSize: 15, fontWeight: 'bold', color: '#1e293b', maxWidth: '70%' },
  bookingId: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  
  bookingCardRight: { alignItems: 'flex-end', marginLeft: 8, justifyContent: 'space-between' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 4 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  bookingPrice: { fontSize: 14, fontWeight: 'bold', color: '#8b5cf6' },

  // Modal Optimized
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 30, maxHeight: '80%' },
  modalDragHandle: { width: 40, height: 4, backgroundColor: '#cbd5e1', borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, paddingBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  closeBtn: { padding: 4, backgroundColor: '#f1f5f9', borderRadius: 20 },
  
  detailBody: { marginBottom: 20 },
  infoRow: { flexDirection: 'row', gap: 20, marginTop: 12 },
  infoBlock: { marginBottom: 8 },
  infoLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' },
  infoValue: { fontSize: 16, color: '#1e293b', fontWeight: '600', marginTop: 2 },
  
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 16 },
  sectionHeader: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  
  memberRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f8fafc' },
  memberName: { fontSize: 14, fontWeight: '600', color: '#334155' },
  memberPhone: { fontSize: 12, color: '#94a3b8' },
  paymentBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'center' },
  paymentPaid: { backgroundColor: '#dcfce7' },
  paymentPending: { backgroundColor: '#fef08a' },
  paymentBadgeText: { fontSize: 11, fontWeight: '600', color: '#15803d' },
  
  actionContainer: { gap: 12 },
  actionButton: { borderRadius: 12, overflow: 'hidden', height: 50 },
  actionButtonGradient: { paddingVertical: 14, alignItems: 'center', flex: 1, justifyContent: 'center' },
  actionButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  cancelButton: { alignItems: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#ef4444', backgroundColor: '#fff' },
  cancelButtonText: { color: '#ef4444', fontWeight: 'bold', fontSize: 15 },
  
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: '#94a3b8', marginTop: 12, fontSize: 15 }
});

export default BookingManagementScreen;