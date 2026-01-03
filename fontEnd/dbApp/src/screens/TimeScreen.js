import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../api/axiosConfig';

// ========================================
// CONSTANTS & HELPERS
// ========================================

const { width } = Dimensions.get('window');
const BULK_BOOKING_LIMIT = 7;
const MAX_MEMBERSHIP_DAYS_DISPLAY = 30;
const CALENDAR_MIN_HOUR = 6;
const CALENDAR_MAX_HOUR = 21;

// Generate time slots once (expensive operation)
const generateTimeSlots = () => {
  const slots = [];
  for (let i = CALENDAR_MIN_HOUR; i <= CALENDAR_MAX_HOUR; i++) {
    const suffix = i >= 12 ? 'PM' : 'AM';
    const displayHour = i % 12 === 0 ? 12 : i % 12;
    slots.push(`${displayHour}:00 ${suffix}`);
  }
  return slots;
};

const ALL_TIME_SLOTS = generateTimeSlots();

const getCalculatedEndTime = (startTime) => {
  if (!startTime) return null;
  const index = ALL_TIME_SLOTS.indexOf(startTime);
  if (index === -1) return null;
  if (index === ALL_TIME_SLOTS.length - 1) return '10:00 PM';
  return ALL_TIME_SLOTS[index + 1];
};

// ========================================
// MEMOIZED COMPONENTS
// ========================================

const TimeSlotItem = React.memo(
  ({ item, isSelected, isBooked, onPress }) => (
    <TouchableOpacity
      style={[
        styles.timeSlot,
        isBooked && styles.timeSlotBooked,
        isSelected && styles.timeSlotSelected,
      ]}
      onPress={() => onPress(item)}
      disabled={isBooked}
      activeOpacity={isBooked ? 1 : 0.7}
    >
      <Text
        style={[
          styles.timeSlotText,
          isBooked && styles.timeSlotTextBooked,
          isSelected && styles.timeSlotTextSelected,
        ]}
      >
        {item}
      </Text>
      {isBooked && <MaterialIcons name="lock" size={14} color="#9ca3af" style={styles.lockIcon} />}
    </TouchableOpacity>
  ),
  (prevProps, nextProps) =>
    prevProps.item === nextProps.item &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isBooked === nextProps.isBooked
);

TimeSlotItem.displayName = 'TimeSlotItem';

// ========================================
// MAIN COMPONENT
// ========================================

const TimeScreen = ({ navigation, route }) => {
  const { selectedCourt, selectedTeam, minMembershipDays } = route.params;

  // State
  const [selectedDates, setSelectedDates] = useState({});
  const [selectedStartTime, setSelectedStartTime] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [playableDays, setPlayableDays] = useState([]);

  // Refs for performance
  const fetchAbortControllerRef = useRef(null);

  // Memoized values
  const bookedSlotsSet = useMemo(() => new Set(bookedSlots), [bookedSlots]);

  const datesCount = useMemo(() => Object.keys(selectedDates).length, [selectedDates]);

  const markedDates = useMemo(() => {
    const marks = {};
    playableDays.forEach((d) => {
      marks[d] = { marked: true, dotColor: '#8b5cf6' };
    });
    return { ...marks, ...selectedDates };
  }, [playableDays, selectedDates]);

  const selectedDatesArray = useMemo(() => Object.keys(selectedDates).sort(), [selectedDates]);

  // Calculate playable days once
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dates = [];
    const limit = Math.min(minMembershipDays, MAX_MEMBERSHIP_DAYS_DISPLAY);

    for (let i = 0; i < limit; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    setPlayableDays(dates);
  }, [minMembershipDays]);

  // Handle day press
  const handleDayPress = useCallback(
    (day) => {
      const dateStr = day.dateString;

      if (!playableDays.includes(dateStr)) {
        Alert.alert('Unavailable', "This date exceeds your team's membership limit.");
        return;
      }

      setSelectedDates((prev) => {
        const newState = { ...prev };
        if (newState[dateStr]) {
          delete newState[dateStr];
        } else {
          if (Object.keys(prev).length >= BULK_BOOKING_LIMIT) {
            Alert.alert('Limit', `Max ${BULK_BOOKING_LIMIT} days bulk.`);
            return prev;
          }
          newState[dateStr] = {
            selected: true,
            selectedColor: '#8b5cf6',
            selectedTextColor: '#fff',
          };
        }
        return newState;
      });

      setSelectedStartTime(null);
    },
    [playableDays]
  );

  // Fetch availability on selected dates change
  useEffect(() => {
    if (selectedDatesArray.length === 0) {
      setBookedSlots([]);
      return;
    }

    const fetchAvailability = async () => {
      setLoadingSlots(true);

      try {
        // Cancel previous request if exists
        if (fetchAbortControllerRef.current) {
          fetchAbortControllerRef.current.abort();
        }

        fetchAbortControllerRef.current = new AbortController();

        const response = await api.get('/bookings/availability', {
          params: {
            courtId: selectedCourt._id,
            dates: selectedDatesArray.join(','),
          },
          signal: fetchAbortControllerRef.current.signal,
        });

        if (response.data.success) {
          setBookedSlots(response.data.data || []);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error fetching availability:', error);
        }
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchAvailability();

    return () => {
      if (fetchAbortControllerRef.current) {
        fetchAbortControllerRef.current.abort();
      }
    };
  }, [selectedDatesArray, selectedCourt._id]);

  // Handle time selection
  const handleTimeSelection = useCallback(
    (time) => {
      if (bookedSlotsSet.has(time)) return;
      setSelectedStartTime((prev) => (prev === time ? null : time));
    },
    [bookedSlotsSet]
  );

  // Handle continue to next screen
  const handleContinue = useCallback(() => {
    if (selectedDatesArray.length === 0) {
      return Alert.alert('Select Date', 'Please select a date.');
    }
    if (!selectedStartTime) {
      return Alert.alert('Select Time', 'Please select a time slot.');
    }

    const endTime = getCalculatedEndTime(selectedStartTime);
    navigation.navigate('BookingConfirmation', {
      selectedDates: selectedDatesArray,
      selectedStartTime,
      selectedEndTime: endTime,
      court: selectedCourt,
      selectedTeam,
    });
  }, [selectedDatesArray, selectedStartTime, navigation, selectedCourt, selectedTeam]);

  // Handle back navigation
  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Render time slot
  const renderTimeSlot = useCallback(
    ({ item }) => (
      <TimeSlotItem
        item={item}
        isSelected={selectedStartTime === item}
        isBooked={bookedSlotsSet.has(item)}
        onPress={handleTimeSelection}
      />
    ),
    [selectedStartTime, bookedSlotsSet, handleTimeSelection]
  );

  const timeSlotKeyExtractor = useCallback((item) => item, []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Date & Time</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        <View style={styles.section}>
          <Text style={styles.infoText}>Select multiple dates to bulk book.</Text>
          <View style={styles.calendarContainer}>
            <Calendar
              onDayPress={handleDayPress}
              minDate={playableDays[0]}
              maxDate={playableDays[playableDays.length - 1]}
              markedDates={markedDates}
              theme={{
                todayTextColor: '#8b5cf6',
                arrowColor: '#8b5cf6',
                selectedDayBackgroundColor: '#8b5cf6',
              }}
            />
          </View>
        </View>

        {datesCount > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Slots</Text>
            {loadingSlots ? (
              <ActivityIndicator size="large" color="#8b5cf6" style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={ALL_TIME_SLOTS}
                keyExtractor={timeSlotKeyExtractor}
                numColumns={3}
                scrollEnabled={false}
                renderItem={renderTimeSlot}
                columnWrapperStyle={styles.timeGridRow}
                removeClippedSubviews={true}
                maxToRenderPerBatch={9}
                windowSize={10}
              />
            )}
          </View>
        )}
      </ScrollView>

      {selectedStartTime && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#8b5cf6', '#ec4899']}
              style={styles.continueButtonGradient}
            >
              <Text style={styles.continueButtonText}>
                Book {datesCount} Day(s) @ {selectedStartTime}
              </Text>
              <MaterialIcons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// ========================================
// STYLES
// ========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  infoText: {
    color: '#666',
    marginBottom: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  timeGridRow: {
    gap: 10,
    marginBottom: 10,
  },
  timeSlot: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    margin: 2,
    minHeight: 70,
  },
  timeSlotSelected: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  timeSlotBooked: {
    backgroundColor: '#f3f4f6',
    opacity: 0.6,
  },
  timeSlotText: {
    fontWeight: '600',
    color: '#333',
    fontSize: 13,
  },
  timeSlotTextSelected: {
    color: '#fff',
  },
  timeSlotTextBooked: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  lockIcon: {
    marginTop: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 5,
  },
  continueButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  continueButtonGradient: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TimeScreen;
