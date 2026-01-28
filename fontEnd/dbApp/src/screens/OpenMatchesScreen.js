import React, { useState, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/axiosConfig';
import { AuthContext } from '../context/AuthContext';

const { width } = Dimensions.get('window');

// --- 1. HELPER FUNCTIONS ---
const formatMatchDate = (isoDate) => {
  return new Date(isoDate).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};

// --- 2. MEMOIZED CARD COMPONENT ---
const MatchCard = React.memo(({ item, onPress }) => {
  const slotsLeft = 6 - (item.totalPlayers || 1);
  const isFull = slotsLeft <= 0;

  return (
    <TouchableOpacity 
      style={styles.card}
      activeOpacity={0.9}
      onPress={() => onPress(item._id)}
      disabled={isFull}
    >
      {/* HEADER: Court & Status */}
      <View style={styles.cardHeader}>
        <View style={styles.courtBadge}>
           <MaterialIcons name="stadium" size={16} color="#4f46e5" />
           <Text style={styles.courtName}>{item.court?.name || 'Court A'}</Text>
        </View>
        <View style={[styles.slotBadge, isFull ? styles.slotFull : styles.slotOpen]}>
           <Text style={[styles.slotText, isFull ? styles.textFull : styles.textOpen]}>
             {isFull ? 'Full' : `${slotsLeft} Spots Left`}
           </Text>
        </View>
      </View>
      
      {/* BODY: Time & Captain */}
      <View style={styles.cardBody}>
        <Text style={styles.timeText}>
           {formatMatchDate(item.date)} • {item.startTime}
        </Text>
        
        <View style={styles.captainRow}>
           <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(item.user?.fullName || 'C').charAt(0)}</Text>
           </View>
           <View>
              <Text style={styles.captainLabel}>Hosted by</Text>
              <Text style={styles.captainName}>{item.user?.fullName || 'Unknown Captain'}</Text>
           </View>
        </View>
      </View>

      {/* FOOTER: Action */}
      <View style={styles.divider} />
      
      <View style={styles.cardFooter}>
         <View style={styles.memberTag}>
            <MaterialIcons name="verified-user" size={14} color="#8b5cf6" />
            <Text style={styles.memberTagText}>Verified Match</Text>
         </View>
         
         <TouchableOpacity 
            style={[styles.joinBtn, isFull && styles.joinBtnDisabled]} 
            onPress={() => onPress(item._id)}
            disabled={isFull}
         >
            <Text style={styles.joinBtnText}>{isFull ? 'Waitlist' : 'Join'}</Text>
            <MaterialIcons name="arrow-forward" size={16} color={isFull ? "#9ca3af" : "#fff"} />
         </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

// --- 3. MAIN SCREEN ---
const OpenMatchesScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext); 
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMatches = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/bookings/open-matches');
      if (res.data.success) {
        // Sort by Date (Nearest first)
        const sorted = res.data.data.sort((a, b) => new Date(a.date) - new Date(b.date));
        setMatches(sorted);
      }
    } catch (err) {
      console.error("Fetch matches error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchMatches();
  }, [fetchMatches]));

  // --- MEMBERSHIP GATEKEEPER ---
  const handleMatchPress = useCallback((bookingId) => {
    const isMember = 
      user?.role === 'member' || 
      user?.membership?.status === 'Active' || 
      (user?.membership?.expiryDate && new Date(user?.membership?.expiryDate) > new Date());

    if (!isMember) {
      Alert.alert(
        "Membership Access",
        "Open matches are exclusive to active members. Upgrade now to join the community!",
        [
          { text: "Browse Plans", onPress: () => navigation.navigate('ProfileTab', { screen: 'SubscriptionPlans' }) },
          { text: "Cancel", style: "cancel" },
        ]
      );
      return;
    }

    // Navigation logic
    navigation.navigate('HomeTab', {
      screen: 'BookingFlow',
      params: {
        screen: 'BookingDetailMain',
        params: { bookingId }
      }
    });
  }, [user, navigation]);

  const renderItem = useCallback(({ item }) => (
    <MatchCard item={item} onPress={handleMatchPress} />
  ), [handleMatchPress]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Find a Match</Text>
            <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {loading && matches.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          windowSize={5}
          removeClippedSubviews={true}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetchMatches} colors={['#8b5cf6']} tintColor="#8b5cf6" />
          }
          ListEmptyComponent={
            !loading && (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconBg}>
                        <Ionicons name="tennisball-outline" size={48} color="#cbd5e1" />
                    </View>
                    <Text style={styles.emptyTitle}>No Open Matches</Text>
                    <Text style={styles.emptySubtitle}>
                        Be the first! Book a court and mark it as "Public" to invite players.
                    </Text>
                    <TouchableOpacity 
                        style={styles.createBtn}
                        onPress={() => navigation.navigate('HomeTab', { screen: 'BookingFlow' })}
                    >
                        <Text style={styles.createBtnText}>Create Match</Text>
                    </TouchableOpacity>
                </View>
            )
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  
  // Header
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },

  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 20, paddingBottom: 40 },

  // Card Styles
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    marginBottom: 16, 
    padding: 16,
    elevation: 3,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  courtBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eef2ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  courtName: { fontSize: 13, fontWeight: '700', color: '#4338ca' },
  
  slotBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  slotOpen: { backgroundColor: '#f0fdf4' },
  slotFull: { backgroundColor: '#fef2f2' },
  slotText: { fontSize: 11, fontWeight: '700' },
  textOpen: { color: '#15803d' },
  textFull: { color: '#b91c1c' },

  cardBody: { marginBottom: 12 },
  timeText: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 12 },
  
  captainRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f3e8ff', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#8b5cf6' },
  captainLabel: { fontSize: 11, color: '#64748b' },
  captainName: { fontSize: 13, fontWeight: '600', color: '#334155' },

  divider: { height: 1, backgroundColor: '#f1f5f9', marginBottom: 12 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  memberTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  memberTagText: { fontSize: 12, fontWeight: '600', color: '#64748b' },

  joinBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#8b5cf6', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 },
  joinBtnDisabled: { backgroundColor: '#f3f4f6' },
  joinBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Empty State
  emptyContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  createBtn: { backgroundColor: '#eff6ff', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  createBtnText: { color: '#3b82f6', fontWeight: '700', fontSize: 14 },
});

export default OpenMatchesScreen;