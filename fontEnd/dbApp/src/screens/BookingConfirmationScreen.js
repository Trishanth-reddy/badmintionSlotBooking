import React, { useState, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../api/axiosConfig';
import { AuthContext } from '../../App';

const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const BookingConfirmationScreen = ({ navigation, route }) => {
  const { selectedDates, selectedStartTime, selectedEndTime, court, selectedTeam } = route.params;
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);

  const dates = selectedDates || [];
  const totalDays = dates.length;
  
  const handleConfirm = async () => {
    setLoading(true);
    try {
      const teamIds = selectedTeam.map(t => t._id);
      const response = await api.post('/bookings', {
        courtId: court._id,
        dates: dates, // Send Array
        startTime: selectedStartTime,
        endTime: selectedEndTime,
        teamMemberIds: teamIds
      });

      if (response.data.success) {
        Alert.alert("Booking Confirmed! 🏸", response.data.message, [
          { text: "Go to Bookings", onPress: () => navigation.navigate('BookingsTab') }
        ]);
      }
    } catch (error) {
      const msg = error.response?.data?.message || "Booking failed.";
      const details = error.response?.data?.errors?.join('\n'); // Show bulk errors
      Alert.alert("Error", details ? `${msg}\n${details}` : msg);
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
        <Text style={styles.headerTitle}>Confirm Booking</Text>
        <View style={{width: 40}} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Summary Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Booking Details</Text>
          
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
            <Text style={styles.label}>Dates:</Text>
            <View style={{alignItems: 'flex-end'}}>
                <Text style={[styles.value, {color: '#8b5cf6'}]}>{totalDays} Day(s) Selected</Text>
                {dates.length <= 3 ? dates.map(d => <Text key={d} style={styles.subValue}>{formatDate(d)}</Text>) 
                 : <Text style={styles.subValue}>{formatDate(dates[0])} to {formatDate(dates[dates.length-1])}</Text>}
            </View>
          </View>
        </View>

        {/* Team Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Team ({selectedTeam.length + 1})</Text>
          <View style={styles.memberRow}>
            <MaterialIcons name="star" size={16} color="#fbbf24" />
            <Text style={styles.meText}>You (Captain)</Text>
          </View>
          {selectedTeam.map(m => (
            <View key={m._id} style={styles.memberRow}>
                <MaterialIcons name="person" size={16} color="#9ca3af" />
                <Text style={styles.memberText}>{m.fullName}</Text>
            </View>
          ))}
        </View>

        <View style={styles.warningBox}>
            <MaterialIcons name="info" size={20} color="#1e40af" />
            <Text style={styles.warningText}>Payment is collected at the venue. Please arrive 10 mins early.</Text>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={loading}>
            <LinearGradient colors={['#8b5cf6', '#ec4899']} style={styles.btnGradient}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                    <>
                    <Text style={styles.btnText}>Confirm Booking</Text>
                    <MaterialIcons name="check-circle" size={20} color="#fff" />
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
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  backBtn: { padding: 5 },
  content: { padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 15, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { color: '#6b7280', fontSize: 14 },
  value: { color: '#1f2937', fontWeight: '600', fontSize: 14 },
  subValue: { color: '#9ca3af', fontSize: 12 },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  memberText: { color: '#374151' },
  meText: { color: '#1f2937', fontWeight: '600' },
  warningBox: { backgroundColor: '#dbeafe', padding: 12, borderRadius: 8, flexDirection: 'row', gap: 10, alignItems: 'center' },
  warningText: { color: '#1e40af', flex: 1, fontSize: 12 },
  footer: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#e5e7eb' },
  confirmBtn: { borderRadius: 12, overflow: 'hidden' },
  btnGradient: { padding: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default BookingConfirmationScreen;