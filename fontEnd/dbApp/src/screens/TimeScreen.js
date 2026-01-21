import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../api/axiosConfig';

const { width } = Dimensions.get('window');
const BULK_LIMIT = 7;

const TimeScreen = ({ navigation, route }) => {
  const { selectedCourt, selectedTeam, minMembershipDays } = route.params;

  const [selectedDates, setSelectedDates] = useState({});
  const [selectedStartTime, setSelectedStartTime] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [playableRange, setPlayableRange] = useState([]);
  const [occupiedDates, setOccupiedDates] = useState([]); // Rule Enforcement

  // --- 1. INITIALIZATION: Fetch User Schedule & Playable Range ---
  useEffect(() => {
    const init = async () => {
      try {
        const [schedule, range] = await Promise.all([
          api.get('/bookings/my-schedule'),
          getPlayableDates(minMembershipDays)
        ]);
        if (schedule.data.success) setOccupiedDates(schedule.data.data);
        setPlayableRange(range);
      } catch (e) {
        Alert.alert("Error", "Could not load schedule.");
      } finally { setIsInitializing(false); }
    };
    init();
  }, [minMembershipDays]);

  const getPlayableDates = (days) => {
    const res = [];
    const today = new Date();
    for (let i = 0; i < Math.min(days, 30); i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      res.push(d.toISOString().split('T')[0]);
    }
    return res;
  };

  // --- 2. BUSINESS LOGIC: Calculate End Time (1-hour slot) ---
  const calculateEndTime = (startTime) => {
    if (!startTime) return null;
    const [time, modifier] = startTime.split(' ');
    let [hours, minutes] = time.split(':');
    hours = parseInt(hours, 10);

    // Simple 1-hour increment logic
    let endHours = hours === 12 ? 1 : hours + 1;
    let endModifier = modifier;

    // Handle AM/PM transition for 11:00 slots
    if (hours === 11 && modifier === 'AM') endModifier = 'PM';
    if (hours === 11 && modifier === 'PM') endModifier = 'AM';

    return `${endHours}:${minutes} ${endModifier}`;
  };

  // --- 3. MEMOIZED CALENDAR MARKING ---
  const markedDates = useMemo(() => {
    const marks = {};
    playableRange.forEach(d => marks[d] = { marked: true, dotColor: '#c7d2fe' });
    
    // LOCK: Disable dates already in schedule
    occupiedDates.forEach(d => {
      marks[d] = { 
        ...marks[d], 
        disabled: true, 
        disableTouchEvent: true, 
        textColor: '#d1d5db' 
      };
    });

    return { ...marks, ...selectedDates };
  }, [playableRange, occupiedDates, selectedDates]);

  // --- 4. HANDLERS ---
  const handleDayPress = useCallback((day) => {
    const dStr = day.dateString;
    if (occupiedDates.includes(dStr)) return; // Already locked

    setSelectedDates(prev => {
      const next = { ...prev };
      if (next[dStr]) {
        delete next[dStr];
      } else {
        if (Object.keys(prev).length >= BULK_LIMIT) {
          Alert.alert("Limit", `Maximum ${BULK_LIMIT} matches per booking.`);
          return prev;
        }
        next[dStr] = { selected: true, selectedColor: '#8b5cf6', selectedTextColor: '#fff' };
      }
      return next;
    });
    setSelectedStartTime(null);
  }, [occupiedDates]);

  // Fetch intersection availability (Times free on ALL selected dates)
  useEffect(() => {
    const dates = Object.keys(selectedDates);
    if (dates.length === 0) return setBookedSlots([]);
    const fetchSlots = async () => {
      setLoadingSlots(true);
      try {
        const res = await api.get('/bookings/availability', {
          params: { courtId: selectedCourt._id, dates: dates.join(',') }
        });
        setBookedSlots(res.data.data || []);
      } finally { setLoadingSlots(false); }
    };
    fetchSlots();
  }, [selectedDates]);

  if (isInitializing) return <View style={styles.center}><ActivityIndicator size="large" color="#8b5cf6" /></View>;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><MaterialIcons name="arrow-back" size={28} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Schedule Match</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoBox}>
          <MaterialIcons name="info" size={16} color="#4338ca" />
          <Text style={styles.infoText}>Rule: 1 Match per day. Greayed-out dates are already in your schedule.</Text>
        </View>

        <Calendar
          onDayPress={handleDayPress}
          markedDates={markedDates}
          minDate={playableRange[0]}
          maxDate={playableRange[playableRange.length - 1]}
          theme={{ todayTextColor: '#8b5cf6', selectedDayBackgroundColor: '#8b5cf6' }}
        />

        {Object.keys(selectedDates).length > 0 && (
          <View style={styles.slotSection}>
            <Text style={styles.slotTitle}>Free Slots (Intersection Availability)</Text>
            <View style={styles.grid}>
              {['6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '4:00 PM', '5:00 PM', '6:00 PM'].map(time => {
                const isBooked = new Set(bookedSlots).has(time);
                return (
                  <TouchableOpacity 
                    key={time}
                    disabled={isBooked}
                    style={[styles.slot, isBooked && styles.slotBooked, selectedStartTime === time && styles.slotSelected]}
                    onPress={() => setSelectedStartTime(time)}
                  >
                    <Text style={[styles.slotText, selectedStartTime === time && { color: '#fff' }]}>{time}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {selectedStartTime && (
        <TouchableOpacity 
          style={styles.footer} 
          onPress={() => {
            const calculatedEndTime = calculateEndTime(selectedStartTime);
            navigation.navigate('BookingConfirmation', {
              selectedDates: Object.keys(selectedDates),
              selectedStartTime,
              selectedEndTime: calculatedEndTime, // Pass to fix validation
              court: selectedCourt,
              selectedTeam
            });
          }}
        >
          <Text style={styles.footerText}>
            Proceed (₹{Object.keys(selectedDates).length * selectedCourt.pricePerHour})
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 60 },
  headerTitle: { fontSize: 18, color: '#fff', fontWeight: 'bold' },
  content: { padding: 20 },
  infoBox: { flexDirection: 'row', backgroundColor: '#eef2ff', padding: 12, borderRadius: 10, marginBottom: 15, alignItems: 'center', gap: 8 },
  infoText: { color: '#4338ca', fontSize: 11, fontWeight: '700', flex: 1 },
  slotSection: { marginTop: 20 },
  slotTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slot: { width: (width - 60) / 3, padding: 15, backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  slotSelected: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
  slotBooked: { backgroundColor: '#f3f4f6', opacity: 0.5 },
  slotText: { fontSize: 11, fontWeight: 'bold' },
  footer: { backgroundColor: '#8b5cf6', padding: 20, alignItems: 'center' },
  footerText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default TimeScreen;