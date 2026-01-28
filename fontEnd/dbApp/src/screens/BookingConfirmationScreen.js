import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../api/axiosConfig';
import { AuthContext } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { 
  day: 'numeric', 
  month: 'short', 
  year: 'numeric' 
});

const BookingConfirmationScreen = ({ navigation, route }) => {
  const { 
    selectedDates, 
    selectedStartTime, 
    selectedEndTime, 
    court, 
    selectedTeam 
  } = route.params;

  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [isPublic, setIsPublic] = useState(false); 

  const dates = selectedDates || [];
  const totalDays = dates.length;
  const totalPrice = totalDays * (court.pricePerHour || 0);
  
  const handleConfirm = async () => {
    setLoading(true);
    try {
      const teamIds = selectedTeam.map(t => t._id || t.id);

      const payload = {
        courtId: court._id,
        dates: dates, 
        startTime: selectedStartTime,
        endTime: selectedEndTime, 
        teamMemberIds: teamIds,
        isPublic: isPublic, 
      };

      const response = await api.post('/bookings', payload);

      if (response.data.success) {
        Alert.alert(
          "Booking Confirmed! 🎉", 
          `Your match has been scheduled for ${totalDays} day(s).`, 
          [{ 
            text: "View My Bookings", 
            onPress: () => {
              navigation.popToTop(); 
              navigation.navigate('BookingsTab'); 
            } 
          }]
        );
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Booking failed.";
      Alert.alert("Booking Conflict", errorMsg, [{ text: "Edit Details", style: "cancel" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review & Confirm</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* --- MATCH SUMMARY --- */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Match Details</Text>
          
          <View style={styles.infoRow}>
             <View style={styles.iconBox}>
                <MaterialIcons name="stadium" size={24} color="#8b5cf6" />
             </View>
             <View style={{flex:1}}>
                <Text style={styles.infoLabel}>Court</Text>
                <Text style={styles.infoValue}>{court.name}</Text>
             </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
             <View style={styles.iconBox}>
                <MaterialIcons name="schedule" size={24} color="#ec4899" />
             </View>
             <View style={{flex:1}}>
                <Text style={styles.infoLabel}>Time Slot</Text>
                <Text style={styles.infoValue}>{selectedStartTime} - {selectedEndTime}</Text>
             </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
             <View style={styles.iconBox}>
                <MaterialIcons name="date-range" size={24} color="#10b981" />
             </View>
             <View style={{flex:1}}>
                <Text style={styles.infoLabel}>Selected Dates ({totalDays})</Text>
                <View style={styles.dateChipContainer}>
                    {dates.slice(0, 4).map(d => (
                        <View key={d} style={styles.dateChip}>
                            <Text style={styles.dateChipText}>{formatDate(d)}</Text>
                        </View>
                    ))}
                    {dates.length > 4 && (
                        <View style={styles.moreChip}>
                            <Text style={styles.moreChipText}>+{dates.length - 4} more</Text>
                        </View>
                    )}
                </View>
             </View>
          </View>
        </View>

        {/* --- PUBLIC MATCH TOGGLE --- */}
        <View style={styles.publicCard}>
          <View style={styles.publicHeader}>
            <View style={styles.publicIconBox}>
                <MaterialIcons name="public" size={24} color="#fff" />
            </View>
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={styles.publicTitle}>Make it Public?</Text>
              <Text style={styles.publicSub}>Allow others to join if spots are open.</Text>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ false: '#e2e8f0', true: '#c4b5fd' }}
              thumbColor={isPublic ? '#8b5cf6' : '#fff'}
            />
          </View>
        </View>

        {/* --- TEAM LIST --- */}
        <View style={styles.card}>
          <View style={styles.teamHeader}>
            <Text style={styles.sectionTitle}>Team Roster</Text>
            <View style={styles.countBadge}>
                <Text style={styles.countText}>{selectedTeam.length + 1}/6</Text>
            </View>
          </View>
          
          <View style={styles.memberItem}>
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user?.fullName?.charAt(0)}</Text>
            </View>
            <Text style={styles.meText}>{user?.fullName} (You)</Text>
            <MaterialIcons name="stars" size={20} color="#fbbf24" />
          </View>
          
          {selectedTeam.map(m => (
            <View key={m._id} style={styles.memberItem}>
              <View style={[styles.avatar, {backgroundColor: '#e0e7ff'}]}>
                  <Text style={[styles.avatarText, {color: '#4338ca'}]}>{m.fullName?.charAt(0)}</Text>
              </View>
              <Text style={styles.memberText}>{m.fullName}</Text>
              <MaterialIcons name="check-circle" size={18} color="#8b5cf6" />
            </View>
          ))}
        </View>

        <View style={styles.warningBox}>
            <MaterialIcons name="info-outline" size={20} color="#1e40af" />
            <Text style={styles.warningText}>
              Note: This booking is atomic. If any player is busy on a chosen date, the booking will fail.
            </Text>
        </View>
      </ScrollView>

      {/* --- FOOTER --- */}
      <View style={styles.footer}>

        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={loading} activeOpacity={0.8}>
            <LinearGradient colors={['#8b5cf6', '#7c3aed']} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.btnGradient}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Text style={styles.btnText}>Confirm Booking</Text>
                      <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                    </>
                )}
            </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  backBtn: { padding: 4 },
  
  content: { padding: 20, paddingBottom: 40 },
  
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#64748b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 16 },
  
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: '500' },
  infoValue: { fontSize: 16, color: '#1e293b', fontWeight: '700' },
  
  dateChipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  dateChip: { backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0' },
  dateChipText: { fontSize: 12, fontWeight: '600', color: '#15803d' },
  moreChip: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  moreChipText: { fontSize: 11, color: '#64748b' },

  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 16 },

  publicCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  publicHeader: { flexDirection: 'row', alignItems: 'center' },
  publicIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center' },
  publicTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  publicSub: { fontSize: 12, color: '#64748b', marginTop: 2 },

  teamHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  countBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  countText: { fontSize: 12, fontWeight: '700', color: '#3b82f6' },
  
  memberItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#d97706' },
  meText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1e293b' },
  memberText: { flex: 1, fontSize: 14, fontWeight: '500', color: '#475569' },

  warningBox: { flexDirection: 'row', gap: 10, backgroundColor: '#eff6ff', padding: 16, borderRadius: 16, alignItems: 'center' },
  warningText: { fontSize: 12, color: '#1e40af', flex: 1, lineHeight: 18 },

  footer: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#f1f5f9', elevation: 10 },
  priceContainer: { flex: 1 },
  priceLabel: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  priceValue: { fontSize: 24, color: '#1e293b', fontWeight: '800' },
  priceSub: { fontSize: 11, color: '#94a3b8' },
  
  confirmBtn: { flex: 1.5, borderRadius: 16, overflow: 'hidden' },
  btnGradient: { paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});

export default BookingConfirmationScreen;