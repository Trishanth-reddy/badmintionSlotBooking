import React, {
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/axiosConfig';

const { width } = Dimensions.get('window');

const formatBookingDate = (isoDate) => {
  if (!isoDate) return 'N/A';
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Status icon map for memoization
const STATUS_ICONS = {
  Confirmed: 'check-circle',
  Pending: 'pending',
  Cancelled: 'cancel',
  Completed: 'history',
};

const STATUS_COLORS = {
  Confirmed: '#16a34a',
  Pending: '#ca8a04',
  Cancelled: '#dc2626',
  Completed: '#4f46e5',
};

// Memoized status badge component
const StatusBadge = React.memo(({ status }) => (
  <View style={styles.statusContainer}>
    <View
      style={[
        styles.statusBadge,
        status === 'Confirmed' && styles.statusConfirmed,
        status === 'Pending' && styles.statusPending,
        status === 'Cancelled' && styles.statusCancelled,
        status === 'Completed' && styles.statusCompleted,
      ]}
    >
      <MaterialIcons
        name={STATUS_ICONS[status] || 'pending'}
        size={20}
        color={STATUS_COLORS[status] || '#9ca3af'}
      />
      <Text style={[styles.statusText, { color: STATUS_COLORS[status] }]}>
        {status}
      </Text>
    </View>
  </View>
));

// Memoized detail row component
const DetailRow = React.memo(({ icon, label, value }) => (
  <View style={styles.detailRow}>
    <MaterialIcons name={icon} size={22} color="#8b5cf6" />
    <View style={styles.detailContent}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>
));

// Memoized time card component
const TimeCard = React.memo(({ icon, iconColor, label, value }) => (
  <View style={styles.timeCard}>
    <MaterialIcons name={icon} size={24} color={iconColor} />
    <Text style={styles.timeLabel}>{label}</Text>
    <Text style={styles.timeValue}>{value}</Text>
  </View>
));

// Memoized court information section
const CourtInformation = React.memo(({ courtName, courtType }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Court Information</Text>
    <DetailRow icon="place" label="Court Name" value={courtName} />
    <DetailRow icon="location-city" label="Location" value="Hyderabad Sports Complex" />
    <DetailRow icon="event" label="Court Type" value={courtType || 'Standard'} />
  </View>
));

// Memoized player information section
const PlayerInformation = React.memo(({ fullName, email, phone }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Player Information</Text>
    <DetailRow icon="person" label="Name (Captain)" value={fullName} />
    <DetailRow icon="email" label="Email" value={email} />
    <DetailRow icon="phone" label="Phone" value={phone} />
  </View>
));

// Memoized notes section
const NotesSection = React.memo(({ isPending }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Important Notes</Text>
    <View style={styles.noteBox}>
      <MaterialIcons name="info" size={20} color="#8b5cf6" />
      <Text style={styles.noteText}>
        {isPending
          ? 'This booking is pending. Please pay at the counter to confirm.'
          : 'Please arrive 10 minutes early for your slot.'}
      </Text>
    </View>
  </View>
));

const BookingDetailScreen = ({ route, navigation }) => {
  const { bookingId } = route.params;
  const [showQR, setShowQR] = useState(false);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const loadBookingDetails = async () => {
        if (!bookingId) {
          Alert.alert('Error', 'No booking ID provided.');
          setLoading(false);
          return;
        }
        try {
          setLoading(true);
          const response = await api.get(`/bookings/${bookingId}`);
          if (response.data.success) {
            setBooking(response.data.data);
          } else {
            Alert.alert('Error', 'Failed to load booking details.');
          }
        } catch (error) {
          console.error('Error fetching booking details:', error);
          Alert.alert('Error', 'Could not find booking.');
        } finally {
          setLoading(false);
        }
      };

      loadBookingDetails();
    }, [bookingId])
  );

  // Memoized calculations
  const duration = useMemo(() => {
    if (!booking) return 0;
    const endHour = parseInt(booking.endTime.split(':')[0]);
    const startHour = parseInt(booking.startTime.split(':')[0]);
    return endHour - startHour;
  }, [booking]);

  const formattedDate = useMemo(
    () => booking ? formatBookingDate(booking.date) : 'N/A',
    [booking]
  );

  const priceDisplay = useMemo(
    () => booking && booking.totalAmount > 0 ? `₹${booking.totalAmount}` : 'Pending Payment',
    [booking]
  );

  const durationText = useMemo(
    () => `${duration} hour${duration > 1 ? 's' : ''}`,
    [duration]
  );

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCopyToClipboard = useCallback(async (text, label) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', `${label} copied to clipboard`);
  }, []);

  const handleShowQR = useCallback(() => {
    setShowQR(true);
  }, []);

  const handleHideQR = useCallback(() => {
    setShowQR(false);
  }, []);

  const handleDownloadReceipt = useCallback(() => {
    Alert.alert('Coming Soon', 'Receipt download will be available soon.');
  }, []);

  const handleCopyBookingId = useCallback(() => {
    if (booking) {
      handleCopyToClipboard(booking.bookingId, 'Booking ID');
    }
  }, [booking, handleCopyToClipboard]);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loaderText}>Loading Booking...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.loaderContainer}>
        <MaterialIcons name="error-outline" size={48} color="#dc2626" />
        <Text style={styles.errorText}>Booking not found.</Text>
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
        <Text style={styles.headerTitle}>Booking Details</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        removeClippedSubviews={false}
      >
        <StatusBadge status={booking.bookingStatus} />

        <View style={styles.mainCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.bookingIdLabel}>Booking ID</Text>
              <Text style={styles.bookingId}>{booking.bookingId}</Text>
            </View>
            <MaterialIcons name="sports-tennis" size={48} color="#8b5cf6" />
          </View>

          <CourtInformation
            courtName={booking.court.name}
            courtType={booking.court.type}
          />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Booking Time</Text>
            <View style={styles.timeGrid}>
              <TimeCard
                icon="calendar-today"
                iconColor="#8b5cf6"
                label="Date"
                value={formattedDate}
              />
              <TimeCard
                icon="schedule"
                iconColor="#ec4899"
                label="Time"
                value={`${booking.startTime} - ${booking.endTime}`}
              />
              <TimeCard
                icon="timer"
                iconColor="#f43f5e"
                label="Duration"
                value={durationText}
              />
            </View>
          </View>

          <PlayerInformation
            fullName={booking.user.fullName}
            email={booking.user.email}
            phone={booking.user.phone}
          />

          <View style={[styles.section, styles.priceSection]}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Booking Amount</Text>
              <Text style={styles.price}>{priceDisplay}</Text>
            </View>
          </View>

          <NotesSection isPending={booking.bookingStatus === 'Pending'} />

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleShowQR}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#8b5cf6', '#ec4899']}
                style={styles.actionButtonGradient}
              >
                <MaterialIcons name="qr-code-2" size={24} color="#fff" />
                <Text style={styles.actionButtonText}>View QR Code</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleCopyBookingId}
              activeOpacity={0.7}
            >
              <MaterialIcons name="content-copy" size={20} color="#8b5cf6" />
              <Text style={styles.secondaryButtonText}>Copy Details</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.downloadButton}
            onPress={handleDownloadReceipt}
            activeOpacity={0.7}
          >
            <MaterialIcons name="download" size={20} color="#fff" />
            <Text style={styles.downloadButtonText}>Download Receipt</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={showQR} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={handleHideQR}
          activeOpacity={1}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity
              onPress={handleHideQR}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <View style={styles.qrContainer}>
              <Text style={styles.qrTitle}>Booking QR Code</Text>
              <View style={styles.qrBox}>
                <MaterialIcons name="qr-code-2" size={200} color="#8b5cf6" />
              </View>
              <Text style={styles.qrSubtext}>Scan this code at the venue</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#dc2626',
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  statusContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  statusConfirmed: {
    backgroundColor: '#dcfce7',
  },
  statusPending: {
    backgroundColor: '#fef08a',
  },
  statusCancelled: {
    backgroundColor: '#fee2e2',
  },
  statusCompleted: {
    backgroundColor: '#e0e7ff',
  },
  statusText: {
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
  mainCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  bookingIdLabel: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  bookingId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 4,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  detailContent: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '600',
    marginTop: 2,
  },
  timeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  timeCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  timeLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 6,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 2,
  },
  priceSection: {
    backgroundColor: '#f3e8ff',
    padding: 16,
    borderRadius: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8b5cf6',
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
  },
  noteText: {
    marginLeft: 10,
    fontSize: 13,
    color: '#1e3a8a',
    flex: 1,
  },
  actionButtons: {
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  secondaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3e8ff',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#8b5cf6',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#8b5cf6',
    fontSize: 15,
    fontWeight: 'bold',
  },
  downloadButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ec4899',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 4,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: width - 40,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  qrContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
  },
  qrBox: {
    padding: 20,
    backgroundColor: '#f9fafb',
    borderRadius: 15,
    marginBottom: 20,
  },
  qrSubtext: {
    fontSize: 13,
    color: '#9ca3af',
  },
});

export default BookingDetailScreen;
