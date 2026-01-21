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
  } from 'react-native';
  import { LinearGradient } from 'expo-linear-gradient';
  import { MaterialIcons } from '@expo/vector-icons';
  import { useFocusEffect } from '@react-navigation/native';
  import api from '../../api/axiosConfig';
  import { AuthContext } from '../../App'; // Import AuthContext to check user status

  const OpenMatchesScreen = ({ navigation }) => {
    const { user } = useContext(AuthContext); // Access logged-in user data
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);

    const formatMatchDate = (isoDate) => {
      return new Date(isoDate).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    };

    const fetchMatches = useCallback(async () => {
      try {
        setLoading(true);
        const res = await api.get('/bookings/open-matches');
        if (res.data.success) {
          setMatches(res.data.data);
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

    // --- NEW: MEMBERSHIP GATEKEEPER ---
    // --- UPDATED: ELIGIBILITY CHECKER ---
  const handleMatchPress = (bookingId) => {
    // Check against multiple possible status fields to ensure membership is recognized
    const isMember = 
      user?.role === 'member' || 
      user?.membership?.status === 'Active' || 
      (user?.membership?.expiryDate && new Date(user?.membership?.expiryDate) > new Date());

    if (!isMember) {
      Alert.alert(
        "Membership Required",
        "Only active members can join open matches.",
        [
          { text: "Later", style: "cancel" },
          { 
            text: "View Plans", 
            onPress: () => navigation.navigate('ProfileTab', { screen: 'SubscriptionPlans' }) 
          }
        ]
      );
      return;
    }

    // Proceed to details if eligible
    navigation.navigate('HomeTab', {
      screen: 'BookingFlow',
      params: {
        screen: 'BookingDetailMain',
        params: { bookingId }
      }
    });
  };

    const renderMatch = ({ item }) => (
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => handleMatchPress(item._id)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.courtName}>{item.court?.name || 'Badminton Court'}</Text>
          <View style={styles.vacancyBadge}>
            <Text style={styles.vacancyText}>{6 - item.totalPlayers} Slots Left</Text>
          </View>
        </View>
        
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <MaterialIcons name="person" size={16} color="#6b7280" />
            <Text style={styles.infoText}>Captain: {item.user?.fullName}</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="schedule" size={16} color="#6b7280" />
            <Text style={styles.infoText}>
              {formatMatchDate(item.date)} • {item.startTime}
            </Text>
          </View>
        </View>
        
        {/* Visual Indicator for Members Only */}
        <View style={styles.memberTag}>
          <MaterialIcons name="verified" size={14} color="#8b5cf6" />
          <Text style={styles.memberTagText}>Members Only</Text>
        </View>

        <LinearGradient colors={['#8b5cf6', '#ec4899']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.joinBtn}>
          <Text style={styles.joinBtnText}>Request to Join</Text>
          <MaterialIcons name="lock-open" size={18} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    );

    return (
      <View style={styles.container}>
        <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Join a Game</Text>
        </LinearGradient>

        {loading && matches.length === 0 ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#8b5cf6" />
          </View>
        ) : (
          <FlatList
            data={matches}
            keyExtractor={(item) => item._id}
            renderItem={renderMatch}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={fetchMatches} colors={['#8b5cf6']} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialIcons name="sports-handball" size={64} color="#d1d5db" />
                <Text style={styles.emptyTitle}>No Matches Found</Text>
                <Text style={styles.emptySubtitle}>Check back later or book your own court and mark it public!</Text>
              </View>
            }
          />
        )}
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
    backBtn: { marginRight: 15 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContainer: { padding: 16, paddingBottom: 30 },
    card: { 
      backgroundColor: '#fff', 
      borderRadius: 15, 
      padding: 16, 
      marginBottom: 16, 
      elevation: 4,
      borderWidth: 1,
      borderColor: '#e5e7eb'
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    courtName: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
    vacancyBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    vacancyText: { color: '#92400e', fontWeight: 'bold', fontSize: 12 },
    infoSection: { marginBottom: 12 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    infoText: { marginLeft: 8, color: '#4b5563', fontSize: 14 },
    memberTag: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 4 },
    memberTagText: { fontSize: 12, fontWeight: '600', color: '#8b5cf6', textTransform: 'uppercase' },
    joinBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 10, gap: 8 },
    joinBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    emptyContainer: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#374151', marginTop: 16 },
    emptySubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 8 },
  });

  export default OpenMatchesScreen;