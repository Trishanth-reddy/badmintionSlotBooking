import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/axiosConfig';

const { width, height } = Dimensions.get('window');

// --- 1. HELPER COMPONENTS ---

const STATUS_COLORS = {
  Confirmed: { bg: '#dcfce7', text: '#16a34a' },
  Pending: { bg: '#fef08a', text: '#ca8a04' },
  Completed: { bg: '#e0e7ff', text: '#4f46e5' },
  Cancelled: { bg: '#fee2e2', text: '#dc2626' },
  default: { bg: '#f3f4f6', text: '#6b7280' },
};

const StatusBadge = ({ status }) => {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.default;
  return (
    <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.statusText, { color: colors.text }]}>{status}</Text>
    </View>
  );
};

const DetailRow = ({ icon, label, value }) => (
  <View style={styles.detailRow}>
    <MaterialIcons name={icon} size={20} color="#6b7280" />
    <View style={styles.detailTextContainer}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>
);

const TimeCard = ({ date, time }) => (
  <View style={styles.timeCard}>
    <View style={styles.timeSection}>
      <MaterialIcons name="event" size={24} color="#8b5cf6" />
      <Text style={styles.timeLabel}>{date}</Text>
    </View>
    <View style={styles.timeDivider} />
    <View style={styles.timeSection}>
      <MaterialIcons name="schedule" size={24} color="#8b5cf6" />
      <Text style={styles.timeLabel}>{time}</Text>
    </View>
  </View>
);

// --- 2. MAIN SCREEN ---

const BookingDetailScreen = ({ route, navigation }) => {
  // Unify ID from manual navigation (bookingId) or Deep Link (id)
  const { bookingId, id } = route.params;
  const targetId = bookingId || id;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Fetch Current User ID from storage
  useEffect(() => {
    const getUserId = async () => {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setCurrentUserId(user.id || user._id);
      }
    };
    getUserId();
  }, []);

  const loadBookingDetails = useCallback(async () => {
    if (!targetId) return;
    try {
      setLoading(true);
      const response = await api.get(`/bookings/${targetId}`);
      if (response.data.success) {
        setBooking(response.data.data);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not find booking details.');
    } finally {
      setLoading(false);
    }
  }, [targetId]);

  useFocusEffect(
    useCallback(() => {
      loadBookingDetails();
    }, [loadBookingDetails])
  );

  // --- HANDLERS ---

  const handleSendJoinRequest = async () => {
    try {
      setActionLoading(true);
      await api.post(`/bookings/${targetId}/join`);
      Alert.alert('Success', 'Request sent to the captain!');
      loadBookingDetails();
    } catch (error) {
      const msg = error.response?.data?.message;
      if (error.response?.status === 403) {
        Alert.alert('Membership Required', 'Please upgrade your plan to join public matches.', [
          { text: 'View Plans', onPress: () => navigation.navigate('ProfileTab') },
          { text: 'Cancel' },
        ]);
      } else if (msg?.includes('busy') || msg?.includes('already')) {
        Alert.alert('Quota Reached', 'Rule: 1 Match per day. You already have a match scheduled for this day.');
      } else {
        Alert.alert('Error', msg || 'Failed to send request');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleManageRequest = async (requestId, status) => {
    try {
      setActionLoading(true);
      await api.put(`/bookings/${targetId}/requests/${requestId}`, { status });
      Alert.alert('Success', `Player ${status}`);
      loadBookingDetails();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update request');
    } finally {
      setActionLoading(false);
    }
  };

  const formatBookingDate = (isoDate) => {
    return new Date(isoDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // UI Checks
  const isCaptain = useMemo(() => 
    booking?.user?._id === currentUserId || booking?.user === currentUserId, 
  [booking, currentUserId]);

  const isMember = useMemo(() => 
    booking?.teamMembers?.some(m => (m.userId?._id || m.userId) === currentUserId), 
  [booking, currentUserId]);

  const myRequest = useMemo(() => 
    booking?.joinRequests?.find(r => (r.user?._id || r.user) === currentUserId), 
  [booking, currentUserId]);

  if (loading) return <View style={styles.loaderContainer}><ActivityIndicator size="large" color="#8b5cf6" /></View>;
  if (!booking) return <View style={styles.loaderContainer}><Text>Booking not found.</Text></View>;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Match Details</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.statusRow}>
           <StatusBadge status={booking.bookingStatus} />
           {booking.isPublic && (
             <View style={styles.publicBadge}>
               <MaterialIcons name="public" size={14} color="#4338ca" />
               <Text style={styles.publicBadgeText}>Public Match</Text>
             </View>
           )}
        </View>

        <View style={styles.mainCard}>
          <Text style={styles.courtName}>{booking.court?.name || 'Court Details'}</Text>
          <TimeCard date={formatBookingDate(booking.date)} time={booking.startTime} />

          <View style={styles.divider} />

          <DetailRow icon="location-on" label="Venue" value="Badminton Hub Hyderabad" />
          <DetailRow icon="payments" label="Total Amount" value={`₹${booking.totalAmount || 0}`} />
          <DetailRow icon="person" label="Captain" value={booking.user?.fullName || 'Organizer'} />

          {/* --- CONFIRMED TEAM MEMBERS --- */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Confirmed Players ({booking.teamMembers?.length || 0}/6)</Text>
                <MaterialIcons name="groups" size={20} color="#8b5cf6" />
            </View>
            
            {booking.teamMembers?.map((member, index) => (
              <View key={index} style={styles.playerRow}>
                <MaterialIcons name="person" size={20} color="#8b5cf6" />
                <Text style={styles.playerName}>
                  {/* Access the populated fullName from the userId object */}
                  {member.userId?.fullName || "Anonymous Player"} 
                  {member.userId?._id === booking.user?._id && " (Captain)"}
                </Text>
                <Text style={[styles.payStatus, { color: member.paymentStatus === 'Paid' ? '#16a34a' : '#ca8a04' }]}>
                  {member.paymentStatus}
                </Text>
              </View>
            ))}
          </View>

          {/* --- CAPTAIN: PENDING REQUESTS --- */}
          {isCaptain && booking.joinRequests?.filter(r => r.status === 'Pending').length > 0 && (
            <View style={[styles.section, styles.requestSection]}>
              <Text style={styles.sectionTitle}>New Join Requests</Text>
              {booking.joinRequests.filter(r => r.status === 'Pending').map((req) => (
                <View key={req._id} style={styles.requestItem}>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestName}>{req.user?.fullName || 'User'}</Text>
                    <Text style={styles.requestPhone}>{req.user?.phone}</Text>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity 
                       onPress={() => handleManageRequest(req._id, 'Accepted')} 
                       style={styles.acceptBtn}
                       disabled={actionLoading}
                    >
                      <MaterialIcons name="check" size={20} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                       onPress={() => handleManageRequest(req._id, 'Declined')} 
                       style={styles.declineBtn}
                       disabled={actionLoading}
                    >
                      <MaterialIcons name="close" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* --- ACTION BUTTONS --- */}
          <View style={styles.actionContainer}>
            {!isCaptain && !isMember && (
              myRequest?.status === 'Pending' ? (
                <View style={styles.pendingStatusBox}>
                  <MaterialIcons name="hourglass-empty" size={20} color="#ca8a04" />
                  <Text style={styles.pendingStatusText}>Request Sent - Waiting for Captain</Text>
                </View>
              ) : (
                <TouchableOpacity 
                  style={[styles.actionButton, booking.teamMembers?.length >= 6 && { opacity: 0.5 }]} 
                  onPress={handleSendJoinRequest}
                  disabled={actionLoading || booking.teamMembers?.length >= 6}
                >
                  <LinearGradient colors={['#8b5cf6', '#ec4899']} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.btnGradient}>
                    {actionLoading ? <ActivityIndicator color="#fff" /> : (
                      <>
                        <MaterialIcons name="person-add" size={24} color="#fff" />
                        <Text style={styles.btnText}>{booking.teamMembers?.length >= 6 ? 'Team Full' : 'Request to Join'}</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              )
            )}

            {(isCaptain || isMember) && (
              <TouchableOpacity style={styles.actionButton} onPress={() => setShowQR(true)}>
                <LinearGradient colors={['#8b5cf6', '#ec4899']} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.btnGradient}>
                  <MaterialIcons name="qr-code-2" size={24} color="#fff" />
                  <Text style={styles.btnText}>View Entry QR</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* --- QR CODE MODAL --- */}
      <Modal visible={showQR} transparent animationType="slide">
        <View style={styles.modalOverlay}>
           <View style={styles.qrCard}>
              <View style={styles.modalHeader}>
                 <Text style={styles.modalTitle}>Entry Pass</Text>
                 <TouchableOpacity onPress={() => setShowQR(false)}>
                    <MaterialIcons name="cancel" size={28} color="#9ca3af" />
                 </TouchableOpacity>
              </View>
              <View style={styles.qrPlaceholder}>
                 <MaterialIcons name="qr-code-2" size={180} color="#1f2937" />
              </View>
              <Text style={styles.qrInfo}>Show this QR at the venue entrance</Text>
              <Text style={styles.qrId}>Booking ID: {booking.bookingId}</Text>
           </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  publicBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eef2ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 4 },
  publicBadgeText: { fontSize: 11, color: '#4338ca', fontWeight: 'bold' },
  mainCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  courtName: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginBottom: 20 },
  timeCard: { flexDirection: 'row', backgroundColor: '#f3e8ff', borderRadius: 15, padding: 15, marginBottom: 20, alignItems: 'center' },
  timeSection: { flex: 1, alignItems: 'center' },
  timeLabel: { fontSize: 13, color: '#6b21a8', marginTop: 4, textAlign: 'center', fontWeight: '600' },
  timeDivider: { width: 1, height: 40, backgroundColor: '#d8b4fe' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 15 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  detailTextContainer: { marginLeft: 12 },
  detailLabel: { fontSize: 12, color: '#9ca3af' },
  detailValue: { fontSize: 15, color: '#374151', fontWeight: '600' },
  section: { marginTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  playerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  playerName: { flex: 1, marginLeft: 10, fontSize: 14, color: '#1f2937', fontWeight: '500' },
  payStatus: { fontSize: 12, fontWeight: 'bold' },
  requestSection: { backgroundColor: '#fff5f5', padding: 15, borderRadius: 15, borderStyle: 'dashed', borderWidth: 1, borderColor: '#feb2b2' },
  requestItem: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 10, alignItems: 'center', elevation: 1 },
  requestInfo: { flex: 1 },
  requestName: { fontWeight: 'bold', color: '#1f2937' },
  requestPhone: { fontSize: 12, color: '#6b7280' },
  requestActions: { flexDirection: 'row', gap: 10 },
  acceptBtn: { backgroundColor: '#16a34a', padding: 10, borderRadius: 10 },
  declineBtn: { backgroundColor: '#dc2626', padding: 10, borderRadius: 10 },
  actionContainer: { marginTop: 30 },
  actionButton: { borderRadius: 18, overflow: 'hidden', height: 60 },
  btnGradient: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  pendingStatusBox: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fef9c3', borderRadius: 18, gap: 10 },
  pendingStatusText: { color: '#854d0e', fontWeight: 'bold', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  qrCard: { backgroundColor: '#fff', width: width * 0.85, borderRadius: 30, padding: 25, alignItems: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  qrPlaceholder: { padding: 20, backgroundColor: '#f9fafb', borderRadius: 20, marginBottom: 20 },
  qrInfo: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  qrId: { fontSize: 12, color: '#9ca3af', fontWeight: 'bold' },
});

export default BookingDetailScreen;