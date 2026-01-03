import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage'; // Ensure you have this
import api from '../../api/axiosConfig';

const { width } = Dimensions.get('window');

// ... (formatBookingDate, StatusBadge, DetailRow, TimeCard, CourtInformation, NotesSection remain the same) ...

const BookingDetailScreen = ({ route, navigation }) => {
  const { bookingId } = route.params;
  const [showQR, setShowQR] = useState(false);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch Current User ID
  useEffect(() => {
    const getUserId = async () => {
      const user = await AsyncStorage.getItem('user'); // Or however you store user data
      if (user) setCurrentUserId(JSON.parse(user).id || JSON.parse(user)._id);
    };
    getUserId();
  }, []);

  const loadBookingDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/bookings/${bookingId}`);
      if (response.data.success) {
        setBooking(response.data.data);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not find booking.');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useFocusEffect(useCallback(() => { loadBookingDetails(); }, [loadBookingDetails]));

  // --- JOIN REQUEST HANDLERS ---

  const handleSendJoinRequest = async () => {
    try {
      setActionLoading(true);
      const res = await api.post(`/bookings/${bookingId}/join`);
      Alert.alert('Success', 'Request sent to the captain!');
      loadBookingDetails();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to send request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleManageRequest = async (requestId, status) => {
    try {
      setActionLoading(true);
      await api.put(`/bookings/${bookingId}/request/${requestId}`, { status });
      Alert.alert('Success', `Request ${status}`);
      loadBookingDetails();
    } catch (error) {
      Alert.alert('Error', 'Failed to update request');
    } finally {
      setActionLoading(false);
    }
  };

  // --- ROLE CHECKS ---
  const isCaptain = booking?.user?._id === currentUserId;
  const isMember = booking?.teamMembers?.some(m => m.userId === currentUserId || m.userId?._id === currentUserId);
  const myRequest = booking?.joinRequests?.find(r => (r.user?._id || r.user) === currentUserId);

  if (loading) return <View style={styles.loaderContainer}><ActivityIndicator size="large" color="#8b5cf6" /></View>;
  if (!booking) return <View style={styles.loaderContainer}><Text>Booking not found.</Text></View>;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <StatusBadge status={booking.bookingStatus} />

        <View style={styles.mainCard}>
          {/* ... Existing Court and Time Information Sections ... */}

          {/* --- TEAM MEMBERS SECTION --- */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Team Members ({booking.teamMembers.length}/6)</Text>
            {booking.teamMembers.map((member, index) => (
              <View key={index} style={styles.playerRow}>
                <MaterialIcons name="account-circle" size={24} color="#6b7280" />
                <Text style={styles.playerName}>{member.memberName} {member.userId === booking.user._id && '(Captain)'}</Text>
                <Text style={[styles.payStatus, { color: member.paymentStatus === 'Paid' ? '#16a34a' : '#ca8a04' }]}>
                  {member.paymentStatus}
                </Text>
              </View>
            ))}
          </View>

          {/* --- CAPTAIN VIEW: JOIN REQUESTS --- */}
          {isCaptain && booking.joinRequests?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pending Join Requests</Text>
              {booking.joinRequests.filter(r => r.status === 'Pending').map((req) => (
                <View key={req._id} style={styles.requestItem}>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestName}>{req.user?.fullName || 'Unknown User'}</Text>
                    <Text style={styles.requestPhone}>{req.user?.phone}</Text>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity onPress={() => handleManageRequest(req._id, 'Accepted')} style={styles.acceptBtn}>
                      <MaterialIcons name="check" size={20} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleManageRequest(req._id, 'Declined')} style={styles.declineBtn}>
                      <MaterialIcons name="close" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* --- GUEST VIEW: ACTION BUTTONS --- */}
          <View style={styles.actionButtons}>
            {!isCaptain && !isMember && (
              myRequest?.status === 'Pending' ? (
                <View style={styles.pendingStatusBox}>
                  <MaterialIcons name="hourglass-empty" size={20} color="#ca8a04" />
                  <Text style={styles.pendingStatusText}>Join Request Pending</Text>
                </View>
              ) : (
                <TouchableOpacity 
                  style={[styles.actionButton, booking.teamMembers.length >= 6 && { opacity: 0.5 }]} 
                  onPress={handleSendJoinRequest}
                  disabled={actionLoading || booking.teamMembers.length >= 6}
                >
                  <LinearGradient colors={['#8b5cf6', '#ec4899']} style={styles.actionButtonGradient}>
                    {actionLoading ? <ActivityIndicator color="#fff" /> : (
                      <>
                        <MaterialIcons name="person-add" size={24} color="#fff" />
                        <Text style={styles.actionButtonText}>
                          {booking.teamMembers.length >= 6 ? 'Team Full' : 'Request to Join'}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              )
            )}

            {/* View QR - Only for Captain or Confirmed Members */}
            {(isCaptain || isMember) && (
              <TouchableOpacity style={styles.actionButton} onPress={() => setShowQR(true)}>
                <LinearGradient colors={['#8b5cf6', '#ec4899']} style={styles.actionButtonGradient}>
                  <MaterialIcons name="qr-code-2" size={24} color="#fff" />
                  <Text style={styles.actionButtonText}>View QR Code</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  // ... Keep existing styles ...
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  playerName: { flex: 1, marginLeft: 10, fontSize: 14, color: '#1f2937' },
  payStatus: { fontSize: 12, fontWeight: 'bold' },
  requestItem: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  requestInfo: { flex: 1 },
  requestName: { fontWeight: 'bold', color: '#1f2937' },
  requestPhone: { fontSize: 12, color: '#6b7280' },
  requestActions: { flexDirection: 'row', gap: 10 },
  acceptBtn: { backgroundColor: '#16a34a', padding: 8, borderRadius: 8 },
  declineBtn: { backgroundColor: '#dc2626', padding: 8, borderRadius: 8 },
  pendingStatusBox: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#fef9c3',
    borderRadius: 12,
    gap: 8,
  },
  pendingStatusText: { color: '#854d0e', fontWeight: 'bold' },
});

export default BookingDetailScreen;