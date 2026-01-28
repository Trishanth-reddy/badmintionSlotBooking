import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
  ActivityIndicator, Dimensions, Modal, Platform, StatusBar
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import api from '../../api/axiosConfig';
import { AuthContext } from '../context/AuthContext';

const { width } = Dimensions.get('window');
const BULK_LIMIT = 7;

const ALL_SLOTS = [
  '05:00 AM', '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
  '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM'
];

const TimeScreen = ({ navigation, route }) => {
  const { user } = useContext(AuthContext);
  const { selectedCourt, selectedTeam, minMembershipDays } = route.params;

  const [selectedDates, setSelectedDates] = useState({});
  const [selectedStartTime, setSelectedStartTime] = useState(null);
  
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotData, setSlotData] = useState({});
  const [bulkBookedSlots, setBulkBookedSlots] = useState([]);
  const [occupiedDates, setOccupiedDates] = useState([]);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSlotInfo, setSelectedSlotInfo] = useState(null);
  const [requestLoading, setRequestLoading] = useState(false);

  const isSingleDate = Object.keys(selectedDates).length === 1;

  useEffect(() => {
    let mounted = true;
    const fetchSchedule = async () => {
      try {
        const schedule = await api.get('/bookings/my-schedule');
        if (mounted && schedule.data.success) {
          setOccupiedDates(schedule.data.data);
        }
      } catch (e) {
        console.log("Silent Error: Loading schedule failed");
      }
    };
    fetchSchedule();
    return () => { mounted = false; };
  }, []);

  const calculatedMaxDate = useMemo(() => {
    if (!minMembershipDays) return undefined;
    const today = new Date();
    const daysToAdd = Math.max(0, minMembershipDays - 1);
    const max = new Date(today);
    max.setDate(today.getDate() + daysToAdd);
    return max.toISOString().split('T')[0];
  }, [minMembershipDays]);

  useEffect(() => {
    const dates = Object.keys(selectedDates);
    if (dates.length === 0) {
      setSlotData({});
      setBulkBookedSlots([]);
      return;
    }

    const fetchSlots = async () => {
      setLoadingSlots(true);
      setSelectedStartTime(null);

      try {
        if (dates.length === 1) {
          const res = await api.get('/bookings/slots', {
            params: { courtId: selectedCourt._id, date: dates[0] }
          });
          const map = {};
          res.data.data.forEach(slot => { map[slot.time] = slot; });
          setSlotData(map);
        } else {
          const res = await api.get('/bookings/availability', {
            params: { courtId: selectedCourt._id, dates: dates.join(',') }
          });
          setBulkBookedSlots(res.data.data || []);
        }
      } catch (error) {
        console.error("Slot fetch error", error);
        Alert.alert("Connection Issue", "Could not load time slots.");
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedDates, selectedCourt._id]);

  const calculateEndTime = useCallback((startTime) => {
    if (!startTime) return null;
    const [time, modifier] = startTime.split(' ');
    let [hours, minutes] = time.split(':');
    hours = parseInt(hours, 10);
    let endHours = hours === 12 ? 1 : hours + 1;
    let endModifier = modifier;
    if (hours === 11) endModifier = modifier === 'AM' ? 'PM' : 'AM';
    if (hours === 12) endModifier = modifier;
    return `${endHours}:${minutes} ${endModifier}`;
  }, []);

  const handleSlotPress = useCallback((time, status, slotInfo) => {
    if (status === 'PRIVATE' && !slotInfo) return;

    if (isSingleDate && (status === 'PRIVATE' || status === 'PUBLIC')) {
      setSelectedSlotInfo(slotInfo);
      setModalVisible(true);
      return;
    }

    setSelectedStartTime(prev => (prev === time ? null : time));
  }, [isSingleDate]);

  const handleSendJoinRequest = async () => {
    if (!selectedSlotInfo) return;
    
    if (user?.role !== 'member' && user?.membership?.status !== 'Active') {
        setModalVisible(false);
        Alert.alert("Members Only", "You must have an active membership to join matches.");
        return;
    }

    setRequestLoading(true);
    try {
        const res = await api.post(`/bookings/${selectedSlotInfo.bookingId}/join`);
        if(res.data.success) {
            setModalVisible(false);
            Alert.alert("Request Sent", "The captain has been notified!");
        }
    } catch (error) {
        Alert.alert("Request Failed", error.response?.data?.message || "Could not send request.");
    } finally {
        setRequestLoading(false);
    }
  };

  const handleDayPress = useCallback((day) => {
    const dStr = day.dateString;
    if (occupiedDates.includes(dStr)) {
        Alert.alert("Busy Day", "You already have a game scheduled on this date.");
        return;
    }

    setSelectedDates(prev => {
      const next = { ...prev };
      if (next[dStr]) {
        delete next[dStr];
      } else {
        if (Object.keys(prev).length >= BULK_LIMIT) {
          Alert.alert("Limit Reached", `You can only select up to ${BULK_LIMIT} dates at once.`);
          return prev;
        }
        next[dStr] = true;
      }
      return next;
    });
  }, [occupiedDates]);

  const markedDates = useMemo(() => {
    const marks = {};
    occupiedDates.forEach(d => {
      marks[d] = { marked: true, dotColor: '#94a3b8', disabled: true, disableTouchEvent: true, textColor: '#cbd5e1' };
    });
    Object.keys(selectedDates).forEach(date => {
        marks[date] = { 
            selected: true, 
            selectedColor: '#8b5cf6', 
            selectedTextColor: '#fff', 
            marked: marks[date]?.marked 
        };
    });
    return marks;
  }, [occupiedDates, selectedDates]);

  const computedSlots = useMemo(() => {
    return ALL_SLOTS.map(time => {
        let status = 'AVAILABLE';
        let subLabel = calculateEndTime(time);
        let icon = null;
        let info = null;

        if (isSingleDate) {
            info = slotData[time];
            if (info && info.isBooked) {
                if (info.isPrivate) {
                    status = 'PRIVATE';
                    subLabel = 'Booked';
                    icon = 'lock-closed';
                } else {
                    status = 'PUBLIC';
                    subLabel = `${6 - info.currentPlayers} Open`;
                    icon = 'people';
                }
            }
        } else {
            if (bulkBookedSlots.includes(time)) {
                status = 'PRIVATE';
                subLabel = 'Busy';
                icon = 'remove-circle';
            }
        }
        return { time, status, subLabel, icon, info };
    });
  }, [slotData, bulkBookedSlots, isSingleDate, calculateEndTime]);

  const renderSlot = (slot) => {
    const isSelected = selectedStartTime === slot.time;
    
    // Default is NOW Visibly Green
    let containerStyle = styles.slotAvailable; 
    let textStyle = styles.textAvailable;
    let subTextStyle = styles.slotSubTextDefault;

    if (slot.status === 'PRIVATE') {
        containerStyle = styles.slotPrivate;
        textStyle = styles.textPrivate;
        subTextStyle = styles.textPrivate;
    } else if (slot.status === 'PUBLIC') {
        containerStyle = styles.slotPublic;
        textStyle = styles.textPublic;
        subTextStyle = styles.textPublic;
    } else if (isSelected) {
        containerStyle = styles.slotSelected;
        textStyle = styles.textSelected;
        subTextStyle = styles.textSelected;
    }

    return (
        <TouchableOpacity
            key={slot.time}
            style={[styles.slotCard, containerStyle]}
            onPress={() => handleSlotPress(slot.time, slot.status, slot.info)}
            activeOpacity={0.7}
            disabled={!isSingleDate && slot.status === 'PRIVATE'}
        >
            <Text style={[styles.slotTimeText, textStyle]}>{slot.time}</Text>
            <View style={styles.slotFooter}>
                <Text style={[styles.slotSubText, subTextStyle]}>{slot.subLabel}</Text>
                {slot.icon && <Ionicons name={slot.icon} size={12} color={textStyle.color} />}
                {/* Always show checkmark for available slots to reinforce they are open */}
                {!slot.icon && !isSelected && slot.status === 'AVAILABLE' && (
                    <Ionicons name="checkmark-circle" size={12} color="#15803d" /> 
                )}
            </View>
        </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Select Time</Text>
            <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerSub}>
            {Object.keys(selectedDates).length === 0
                ? "Tap dates to check availability"
                : `${Object.keys(selectedDates).length} Date(s) Selected`}
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.calendarContainer}>
            <Calendar
                onDayPress={handleDayPress}
                markedDates={markedDates}
                minDate={new Date().toISOString().split('T')[0]}
                maxDate={calculatedMaxDate}
                theme={{
                    todayTextColor: '#8b5cf6',
                    arrowColor: '#8b5cf6',
                    textDayFontWeight: '600',
                    textMonthFontWeight: 'bold',
                    textDayHeaderFontWeight: '600'
                }}
            />
        </View>

        <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#dcfce7', borderColor: '#16a34a', borderWidth: 1 }]} />
                <Text style={styles.legendText}>Available</Text>
            </View>
            <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#eff6ff', borderColor: '#3b82f6', borderWidth: 1 }]} />
                <Text style={styles.legendText}>Joinable</Text>
            </View>
            <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#fef2f2', borderColor: '#ef4444', borderWidth: 1 }]} />
                <Text style={styles.legendText}>Booked</Text>
            </View>
        </View>

        {Object.keys(selectedDates).length > 0 && (
            <View style={styles.slotsContainer}>
                <View style={styles.sectionTitleRow}>
                    <Text style={styles.sectionTitle}>Available Slots</Text>
                    {loadingSlots && <ActivityIndicator size="small" color="#8b5cf6" />}
                </View>
                
                <View style={styles.grid}>
                    {computedSlots.map(renderSlot)}
                </View>
                
                <View style={styles.spacer} />
            </View>
        )}
      </ScrollView>

      {selectedStartTime && (
        <View style={styles.footer}>
            <View style={styles.footerTextContainer}>
                <Text style={styles.footerPrice}>
                    ₹{Object.keys(selectedDates).length * selectedCourt.pricePerHour}
                </Text>
                <Text style={styles.footerLabel}>
                    {Object.keys(selectedDates).length} session(s) @ {selectedStartTime}
                </Text>
            </View>
            
            <TouchableOpacity
                style={styles.bookButton}
                onPress={() => navigation.navigate('BookingConfirmation', {
                    selectedDates: Object.keys(selectedDates),
                    selectedStartTime,
                    selectedEndTime: calculateEndTime(selectedStartTime),
                    court: selectedCourt,
                    selectedTeam
                })}
            >
                <Text style={styles.bookButtonText}>Book Now</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
        </View>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
        >
            <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
                <View style={styles.modalDragIndicator} />
                
                <View style={styles.modalHeader}>
                    <View>
                        <Text style={styles.modalTitle}>
                            {selectedSlotInfo?.isPrivate ? "Private Match" : "Public Match"}
                        </Text>
                        <Text style={styles.modalSubTitle}>{selectedSlotInfo?.time} • {selectedCourt.name}</Text>
                    </View>
                    <View style={[styles.badge, selectedSlotInfo?.isPrivate ? styles.badgePrivate : styles.badgePublic]}>
                        <Ionicons name={selectedSlotInfo?.isPrivate ? "lock-closed" : "people"} size={14} color={selectedSlotInfo?.isPrivate ? "#b91c1c" : "#1e40af"} />
                        <Text style={[styles.badgeText, { color: selectedSlotInfo?.isPrivate ? "#b91c1c" : "#1e40af" }]}>
                            {selectedSlotInfo?.isPrivate ? "Locked" : "Open"}
                        </Text>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <View style={styles.detailIconBox}><Ionicons name="person" size={20} color="#6366f1" /></View>
                    <View>
                        <Text style={styles.detailLabel}>Host Captain</Text>
                        <Text style={styles.detailValue}>{selectedSlotInfo?.bookedBy || "Hidden"}</Text>
                    </View>
                </View>
                
                <View style={styles.divider} />

                <View style={styles.detailRow}>
                    <View style={styles.detailIconBox}><Ionicons name="tennisball" size={20} color="#10b981" /></View>
                    <View>
                        <Text style={styles.detailLabel}>Players Joined</Text>
                        <Text style={styles.detailValue}>
                            {selectedSlotInfo?.currentPlayers} / {selectedSlotInfo?.maxPlayers || 6} Spots Filled
                        </Text>
                    </View>
                </View>

                {!selectedSlotInfo?.isPrivate && (
                    <TouchableOpacity
                        style={styles.joinButton}
                        onPress={handleSendJoinRequest}
                        disabled={requestLoading}
                    >
                        {requestLoading ? <ActivityIndicator color="#fff" /> : (
                            <>
                                <Text style={styles.joinButtonText}>Request to Join Match</Text>
                                <Ionicons name="enter-outline" size={20} color="#fff" />
                            </>
                        )}
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  
  header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 50 : 60, paddingBottom: 25, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 13, color: '#e0e7ff', marginTop: 10, textAlign: 'center', fontWeight: '500' },

  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  spacer: { height: 120 },

  calendarContainer: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#fff', elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { height: 4, width: 0 } },
  
  legendContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 15, gap: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff' },
  legendText: { fontSize: 12, color: '#64748b', fontWeight: '500' },

  slotsContainer: { marginTop: 25 },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  slotCard: { width: '31%', paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, marginBottom: 4, justifyContent: 'center' },
  
  // Slot Variants - UPDATED GREEN FOR VISIBILITY
  slotAvailable: { backgroundColor: '#dcfce7', borderColor: '#86efac' }, // Clear Green
  textAvailable: { color: '#15803d' }, // Dark Green Text
  slotSubTextDefault: { color: '#166534' }, // Medium Green

  slotSelected: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6', elevation: 4 },
  textSelected: { color: '#fff' },
  
  slotPublic: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  textPublic: { color: '#1d4ed8' },

  slotPrivate: { backgroundColor: '#fef2f2', borderColor: '#fecaca', opacity: 0.8 },
  textPrivate: { color: '#b91c1c' },

  slotTimeText: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  slotFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  slotSubText: { fontSize: 10, fontWeight: '600' },
  
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  footerTextContainer: { flexDirection: 'column' },
  footerPrice: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  footerLabel: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  bookButton: { backgroundColor: '#8b5cf6', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 8, elevation: 4 },
  bookButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalDragIndicator: { width: 40, height: 5, backgroundColor: '#e2e8f0', borderRadius: 2.5, alignSelf: 'center', marginBottom: 20 },
  
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  modalSubTitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  badgePrivate: { backgroundColor: '#fef2f2' },
  badgePublic: { backgroundColor: '#eff6ff' },
  badgeText: { fontSize: 12, fontWeight: '700' },

  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 8 },
  detailIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  detailLabel: { fontSize: 12, color: '#64748b', marginBottom: 2 },
  detailValue: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 12, marginLeft: 60 },

  joinButton: { backgroundColor: '#2563eb', marginTop: 30, paddingVertical: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, elevation: 2 },
  joinButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});

export default TimeScreen;