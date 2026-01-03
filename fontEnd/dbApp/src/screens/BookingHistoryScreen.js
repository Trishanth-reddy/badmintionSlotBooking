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
import AsyncStorage from '@react-native-async-storage/async-storage';

// ... Keep existing STATUS_COLORS and formatBookingDate ...

// Updated Memoized booking card component
const BookingCard = React.memo(({ item, onPress, currentUserId }) => {
  const statusColor = getStatusColor(item.bookingStatus);
  
  // Logic to show pending requests badge for Captains
  const isCaptain = (item.user?._id || item.user) === currentUserId;
  const hasPendingRequests = isCaptain && item.joinRequests?.some(r => r.status === 'Pending');
  
  // Logic to show "Requested" status for joiners
  const myJoinRequest = item.joinRequests?.find(r => (r.user?._id || r.user) === currentUserId);

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
              {myJoinRequest && !isCaptain ? `Requested (${myJoinRequest.status})` : item.bookingStatus}
            </Text>
          </View>
        </View>
        
        <Text style={styles.bookingDate}>
          {formatBookingDate(item.date)} • {item.startTime}
        </Text>

        <View style={styles.footerRow}>
          <Text style={styles.bookingPrice}>
            ₹{item.totalAmount || 0} • {item.totalPlayers}/6 players
          </Text>
          
          {/* Captain's Alert for new requests */}
          {hasPendingRequests && (
            <View style={styles.requestAlert}>
              <MaterialIcons name="notification-important" size={14} color="#ca8a04" />
              <Text style={styles.requestAlertText}>New Requests</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.bookingCardRight}>
        <MaterialIcons name="chevron-right" size={24} color="#d1d5db" />
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  return prevProps.item._id === nextProps.item._id &&
         prevProps.item.bookingStatus === nextProps.item.bookingStatus &&
         prevProps.item.joinRequests?.length === nextProps.item.joinRequests?.length;
});

const BookingHistoryScreen = ({ navigation }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Get current user to differentiate between Captain and Joiner
  const getUser = useCallback(async () => {
    const userData = await AsyncStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setCurrentUserId(user.id || user._id);
    }
  }, []);

  const loadBookingHistory = useCallback(async () => {
    try {
      setLoading(true);
      await getUser();
      // This endpoint should return both bookings created by user 
      // AND bookings where user is in teamMembers or joinRequests
      const response = await api.get('/bookings/my-bookings');
      if (response.data.success) {
        setBookings(response.data.data);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not load booking history.');
    } finally {
      setLoading(false);
    }
  }, [getUser]);

  useFocusEffect(
    useCallback(() => {
      loadBookingHistory();
    }, [loadBookingHistory])
  );

  const handleViewDetails = useCallback((item) => {
    // Navigate to the detail screen we updated earlier
    navigation.navigate('BookingDetail', { bookingId: item._id });
  }, [navigation]);

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
            onPress={handleViewDetails} 
            currentUserId={currentUserId} 
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadBookingHistory} />
        }
        ListEmptyComponent={EmptyState}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // ... Keep existing styles ...
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  requestAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef9c3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  requestAlertText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#854d0e',
  },
});

export default BookingHistoryScreen;