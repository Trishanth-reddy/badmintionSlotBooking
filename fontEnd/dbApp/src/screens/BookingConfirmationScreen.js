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
import { AuthContext } from '../../App';

const { width } = Dimensions.get('window');

const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { 
  month: 'short', 
  day: 'numeric', 
  year: 'numeric' 
});

const BookingConfirmationScreen = ({ navigation, route }) => {
  // 1. Destructure all critical data from navigation params
  const { 
    selectedDates, 
    selectedStartTime, 
    selectedEndTime, 
    court, 
    selectedTeam 
  } = route.params;

  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [isPublic, setIsPublic] = useState(false); // Toggle for Matchmaking logic

  const dates = selectedDates || [];
  const totalDays = dates.length;
  const totalPrice = totalDays * (court.pricePerHour || 0);
  
  // --- ATOMIC BULK BOOKING HANDLER ---
  const handleConfirm = async () => {
    setLoading(true);
    try {
      // Map team members to their IDs for the Individual Verification check on backend
      const teamIds = selectedTeam.map(t => t._id || t.id);

      const payload = {
        courtId: court._id,
        dates: dates, // Send the full array for bulk processing
        startTime: selectedStartTime,
        endTime: selectedEndTime, // Required for backend validation
        teamMemberIds: teamIds,
        isPublic: isPublic, // Determines if others can join via 'Open Matches'
      };

      const response = await api.post('/bookings', payload);

      if (response.data.success) {
        Alert.alert(
          "Success! 🏸", 
          `Match booked for ${totalDays} day(s). Check your history for entry QRs.`, 
          [{ text: "View Bookings", onPress: () => navigation.navigate('BookingsTab') }]
        );
      }
    } catch (error) {
      // Handling the "Ironclad" Business Logic errors (e.g., Player already busy)
      const errorMsg = error.response?.data?.message || "Booking failed.";
      
      console.log("Validation Failed:", error.response?.data);

      Alert.alert(
        "Booking Conflict",
        errorMsg,
        [{ text: "Go Back to Edit", style: "cancel" }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Final Confirmation</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* MATCH SUMMARY CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Venue & Slot</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Court:</Text>
            <Text style={styles.value}>{court.name}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Time:</Text>
            <Text style={styles.value}>{selectedStartTime} - {selectedEndTime}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Dates Selected:</Text>
            <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.value, { color: '#8b5cf6' }]}>{totalDays} Matches</Text>
                {dates.slice(0, 3).map(d => (
                  <Text key={d} style={styles.subValue}>{formatDate(d)}</Text>
                ))}
                {totalDays > 3 && <Text style={styles.subValue}>+ {totalDays - 3} more days</Text>}
            </View>
          </View>
        </View>

        {/* BULK BOOKING RULE: PLAYERS WANTED TOGGLE */}
        <View style={styles.publicCard}>
          <View style={styles.publicHeader}>
            <MaterialIcons name="group-add" size={26} color="#8b5cf6" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.publicTitle}>List as Public Match?</Text>
              <Text style={styles.publicSub}>Allow other verified users to request to join your match.</Text>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ false: '#d1d5db', true: '#c4b5fd' }}
              thumbColor={isPublic ? '#8b5cf6' : '#f3f4f6'}
            />
          </View>
        </View>

        {/* INDIVIDUAL VERIFICATION: TEAM LIST */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>Team Verification</Text>
            <Text style={styles.countText}>{selectedTeam.length + 1}/6</Text>
          </View>
          
          <View style={styles.memberRow}>
            <MaterialIcons name="stars" size={20} color="#fbbf24" />
            <Text style={styles.meText}>{user?.fullName} (Captain)</Text>
          </View>
          
          {selectedTeam.map(m => (
            <View key={m._id} style={styles.memberRow}>
              <MaterialIcons name="check-circle" size={18} color="#8b5cf6" />
              <Text style={styles.memberText}>{m.fullName}</Text>
            </View>
          ))}
          
          <View style={styles.verificationNote}>
             <Text style={styles.noteText}>
               * Every player's daily match quota is verified upon confirmation.
             </Text>
          </View>
        </View>

        <View style={styles.warningBox}>
            <MaterialIcons name="info" size={20} color="#1e40af" />
            <Text style={styles.warningText}>
              Rules: Matches are atomic. If any player is busy on a selected day, the bulk booking will fail.
            </Text>
        </View>
      </ScrollView>

      {/* FOOTER: TOTAL CALCULATION & ACTION */}
      <View style={styles.footer}>
        <View style={styles.priceRow}>
           <View>
              <Text style={styles.priceLabel}>Estimated Total</Text>
              <Text style={styles.priceSubText}>Payable at venue</Text>
           </View>
           <Text style={styles.priceValue}>₹{totalPrice}</Text>
        </View>

        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={loading}>
            <LinearGradient colors={['#8b5cf6', '#ec4899']} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.btnGradient}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Text style={styles.btnText}>Confirm & Reserve</Text>
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
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', padding: 20, paddingTop: 60, alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  backBtn: { padding: 5 },
  content: { padding: 20, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  label: { color: '#6b7280', fontSize: 14 },
  value: { color: '#1f2937', fontWeight: '700', fontSize: 14 },
  subValue: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  countText: { backgroundColor: '#f3e8ff', color: '#8b5cf6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, fontWeight: 'bold', fontSize: 12 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  memberText: { color: '#374151', fontSize: 14 },
  meText: { color: '#1f2937', fontWeight: '700', fontSize: 14 },
  verificationNote: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 10 },
  noteText: { fontSize: 11, color: '#9ca3af', fontStyle: 'italic' },
  publicCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 15, borderStyle: 'dashed', borderWidth: 1, borderColor: '#8b5cf6' },
  publicHeader: { flexDirection: 'row', alignItems: 'center' },
  publicTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  publicSub: { fontSize: 12, color: '#6b7280', marginTop: 4, lineHeight: 18 },
  warningBox: { backgroundColor: '#dbeafe', padding: 15, borderRadius: 15, flexDirection: 'row', gap: 10, alignItems: 'center' },
  warningText: { color: '#1e40af', flex: 1, fontSize: 12, lineHeight: 18 },
  footer: { padding: 25, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#f3f4f6', elevation: 10 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  priceLabel: { fontSize: 14, color: '#6b7280', fontWeight: '600' },
  priceSubText: { fontSize: 11, color: '#9ca3af' },
  priceValue: { fontSize: 26, fontWeight: 'bold', color: '#1f2937' },
  confirmBtn: { borderRadius: 16, overflow: 'hidden' },
  btnGradient: { padding: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 }
});

export default BookingConfirmationScreen;