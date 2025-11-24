import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../api/axiosConfig';
import { useFocusEffect } from '@react-navigation/native';

// Status color map for O(1) lookup
const STATUS_COLORS = {
  Confirmed: { bg: '#dcfce7', text: '#16a34a' },
  Pending: { bg: '#fef08a', text: '#ca8a04' },
  Completed: { bg: '#e0e7ff', text: '#4f46e5' },
  Cancelled: { bg: '#fee2e2', text: '#dc2626' },
  default: { bg: '#f3f4f6', text: '#6b7280' },
};

const getStatusColor = (status) => STATUS_COLORS[status] || STATUS_COLORS.default;

const formatBookingDate = (isoDate) => {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Memoized booking card component
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
          <MaterialIcons name="sports-tennis" size={24} color="#8b5cf6" />
        </View>
      </View>

      <View style={styles.bookingCardMiddle}>
        <View style={styles.bookingHeader}>
          <Text style={styles.bookingCourt}>{item.court.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.statusText, { color: statusColor.text }]}>
              {item.bookingStatus}
            </Text>
          </View>
        </View>
        <Text style={styles.bookingDate}>
          {formatBookingDate(item.date)} • {item.startTime}
        </Text>
        <Text style={styles.bookingPrice}>
          ₹{item.totalAmount || 0} • {item.totalPlayers} players
        </Text>
      </View>

      <View style={styles.bookingCardRight}>
        <MaterialIcons name="chevron-right" size={24} color="#d1d5db" />
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  return prevProps.item._id === nextProps.item._id &&
         prevProps.item.bookingStatus === nextProps.item.bookingStatus;
});

// Memoized booking info card
const BookingInfoCard = React.memo(({ booking }) => (
  <View style={styles.infoCard}>
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>Booking ID</Text>
      <Text style={styles.infoValue}>{booking.bookingId}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>Court</Text>
      <Text style={styles.infoValue}>{booking.court.name}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>Date</Text>
      <Text style={styles.infoValue}>{formatBookingDate(booking.date)}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>Time</Text>
      <Text style={styles.infoValue}>
        {booking.startTime} - {booking.endTime}
      </Text>
    </View>
  </View>
));

// Memoized players card
const PlayersCard = React.memo(({ teamMembers, totalPlayers }) => (
  <View style={styles.playersCard}>
    <Text style={styles.cardTitle}>Players ({totalPlayers})</Text>
    {teamMembers.map((member, index) => (
      <View key={index} style={styles.playerRow}>
        <MaterialIcons name="person" size={18} color="#8b5cf6" />
        <Text style={styles.playerName}>{member.memberName}</Text>
      </View>
    ))}
  </View>
));

// Memoized price card
const PriceCard = React.memo(({ totalAmount }) => (
  <View style={styles.priceCard}>
    <Text style={styles.cardTitle}>Price</Text>
    <View style={styles.priceRow}>
      <Text style={styles.priceLabel}>Total Amount</Text>
      <Text style={styles.priceValue}>₹{totalAmount || 0}</Text>
    </View>
  </View>
));

// Memoized empty state
const EmptyState = React.memo(() => (
  <View style={styles.emptyState}>
    <MaterialIcons name="event-busy" size={48} color="#d1d5db" />
    <Text style={styles.emptyText}>No bookings yet</Text>
  </View>
));

const BookingHistoryScreen = ({ navigation }) => {
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadBookingHistory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/bookings/my-bookings');
      if (response.data.success) {
        setBookings(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching booking history:', error);
      Alert.alert('Error', 'Could not load booking history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBookingHistory();
    }, [loadBookingHistory])
  );

  const handleViewDetails = useCallback((booking) => {
    setSelectedBooking(booking);
    setShowDetailModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowDetailModal(false);
  }, []);

  const handleCancelBooking = useCallback(
    (booking) => {
      if (booking.bookingStatus === 'Cancelled') {
        Alert.alert('Info', 'This booking is already cancelled');
        return;
      }
      if (booking.bookingStatus === 'Completed') {
        Alert.alert('Info', 'Cannot cancel completed bookings');
        return;
      }

      Alert.alert(
        'Cancel Booking',
        `Cancel booking ${booking.bookingId}?`,
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, Cancel',
            onPress: async () => {
              try {
                await api.delete(`/bookings/${booking._id}`, {
                  data: { cancellationReason: 'User cancelled' },
                });
                Alert.alert('Success', 'Booking cancelled successfully');
                loadBookingHistory();
                handleCloseModal();
              } catch (error) {
                Alert.alert(
                  'Error',
                  error.response?.data?.message || 'Failed to cancel booking'
                );
              }
            },
            style: 'destructive',
          },
        ]
      );
    },
    [loadBookingHistory, handleCloseModal]
  );

  const keyExtractor = useCallback((item) => item._id, []);

  const renderBookingCard = useCallback(
    ({ item }) => <BookingCard item={item} onPress={handleViewDetails} />,
    [handleViewDetails]
  );

  // Memoized refresh control
  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={loading}
        onRefresh={loadBookingHistory}
        colors={['#8b5cf6']}
        tintColor="#8b5cf6"
      />
    ),
    [loading, loadBookingHistory]
  );

  // Check if booking can be cancelled
  const canCancelBooking = useMemo(
    () =>
      selectedBooking &&
      (selectedBooking.bookingStatus === 'Confirmed' ||
        selectedBooking.bookingStatus === 'Pending'),
    [selectedBooking]
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </LinearGradient>

      {loading && bookings.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={keyExtractor}
          renderItem={renderBookingCard}
          contentContainerStyle={styles.listContent}
          refreshControl={refreshControl}
          ListEmptyComponent={EmptyState}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          initialNumToRender={10}
          windowSize={10}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={showDetailModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedBooking && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                removeClippedSubviews={false}
              >
                <View style={styles.modalHeader}>
                  <TouchableOpacity
                    onPress={handleCloseModal}
                    style={styles.modalCloseButton}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="close" size={28} color="#1f2937" />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Booking Details</Text>
                  <View style={styles.headerSpacer} />
                </View>

                <BookingInfoCard booking={selectedBooking} />

                <PlayersCard
                  teamMembers={selectedBooking.teamMembers}
                  totalPlayers={selectedBooking.totalPlayers}
                />

                <PriceCard totalAmount={selectedBooking.totalAmount} />

                {canCancelBooking && (
                  <View style={styles.actionContainer}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleCancelBooking(selectedBooking)}
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={['#dc2626', '#b91c1c']}
                        style={styles.actionButtonGradient}
                      >
                        <MaterialIcons name="close" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Cancel Booking</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'left',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  bookingCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  bookingCardLeft: {
    marginRight: 12,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookingCardMiddle: {
    flex: 1,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  bookingCourt: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bookingDate: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  bookingPrice: {
    fontSize: 12,
    color: '#8b5cf6',
    fontWeight: '500',
  },
  bookingCardRight: {
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingBottom: 30,
    maxHeight: '95%',
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
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerSpacer: {
    width: 40,
  },
  infoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  infoLabel: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
  playersCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  playerName: {
    fontSize: 13,
    color: '#1f2937',
    fontWeight: '500',
  },
  priceCard: {
    backgroundColor: '#f3e8ff',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: '#6b21a8',
    fontWeight: '600',
  },
  priceValue: {
    fontSize: 18,
    color: '#8b5cf6',
    fontWeight: 'bold',
  },
  actionContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default BookingHistoryScreen;
