import React, { useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator, Image, Dimensions,ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../api/axiosConfig';
import { AuthContext } from '../context/AuthContext';

const { width } = Dimensions.get('window');
const ITEM_HEIGHT = 90; // Fixed height for FlatList optimization

// --- MEMOIZED USER CARD ---
const UserCard = React.memo(({ item, isSelected, onToggle }) => {
  const isInactive = item.membership?.status !== 'Active' || (item.membership?.daysLeft || 0) <= 0;
  
  return (
    <TouchableOpacity
      style={[
        styles.userCard, 
        isSelected && styles.userCardSelected, 
        isInactive && styles.userCardInactive
      ]}
      onPress={() => !isInactive && onToggle(item)}
      disabled={isInactive}
      activeOpacity={0.7}
    >
      <View style={styles.userCardLeft}>
        {item.profilePicture ? (
          <Image source={{ uri: item.profilePicture }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatarBox, isSelected && { backgroundColor: '#8b5cf6' }]}>
            <Text style={styles.avatar}>{item.fullName?.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        {isSelected && (
            <View style={styles.checkBadge}>
                <MaterialIcons name="check" size={12} color="#fff" />
            </View>
        )}
      </View>

      <View style={styles.userCardMiddle}>
        <Text style={[styles.userName, isSelected && { color: '#6d28d9' }]}>{item.fullName}</Text>
        <Text style={styles.userPhone}>{item.phone || 'No phone'}</Text>
        
        <View style={[styles.membershipBadge, isInactive ? styles.bgInactive : styles.bgActive]}>
          <Text style={[styles.membershipText, isInactive ? styles.textInactive : styles.textActive]}>
            {isInactive 
                ? 'Membership Expired' 
                : `${item.membership?.daysLeft} days remaining`}
          </Text>
        </View>
      </View>

      {isInactive && (
          <MaterialIcons name="block" size={24} color="#ef4444" style={{ opacity: 0.5 }} />
      )}
    </TouchableOpacity>
  );
});

// --- MAIN SCREEN ---
const TeamSelectionScreen = ({ navigation, route }) => {
  const { selectedCourt } = route.params;
  const { user } = useContext(AuthContext);
  
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [users, setUsers] = useState([]); 
  const [selectedTeam, setSelectedTeam] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  const searchTimeout = useRef(null);

  // 1. Fetch Current User & Initial List
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [profileRes, usersRes] = await Promise.all([
            api.get('/users/profile'),
            api.get('/users/available-members', { params: { search: '' } })
        ]);
        
        if (profileRes.data.success) setCurrentUserProfile(profileRes.data.data);
        if (usersRes.data.success) setUsers(usersRes.data.data);
      } catch (error) {
        console.error("Init failed", error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // 2. Optimized Search
  const fetchUsers = async (query) => {
    setIsSearching(true);
    try {
      const res = await api.get('/users/available-members', { params: { search: query } });
      if (res.data.success) setUsers(res.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchUsers(text), 400); 
  };

  // 3. Selection Logic
  const toggleTeammate = useCallback((member) => {
    setSelectedTeam(prev => {
      const isSelected = prev.some(u => u._id === member._id);
      if (isSelected) return prev.filter(u => u._id !== member._id);
      
      // Limit: 1 (You) + 5 (Teammates) = 6 Total
      if (prev.length >= 5) { 
          Alert.alert("Team Full", "You can select a maximum of 5 teammates (6 players total)."); 
          return prev; 
      }
      return [...prev, member];
    });
  }, []);

  // 4. Validation Logic
  const minDaysLeft = useMemo(() => {
    if (!currentUserProfile) return 0;
    // Include current user in the validation check
    const allPlayers = [currentUserProfile, ...selectedTeam];
    
    // Find the player with the FEWEST days remaining
    const days = allPlayers.map(p => p.membership?.daysLeft || 0);
    return Math.min(...days);
  }, [currentUserProfile, selectedTeam]);

  const handleContinue = useCallback(() => {
    if (minDaysLeft <= 0) { 
        Alert.alert("Membership Issue", "One or more players in your team have an expired membership."); 
        return; 
    }
    navigation.navigate('TimeSlotMain', { 
        selectedCourt, 
        selectedTeam, 
        minMembershipDays: minDaysLeft 
    });
  }, [minDaysLeft, selectedCourt, selectedTeam, navigation]);

  // 5. Performance Props for FlatList
  const renderItem = useCallback(({ item }) => (
    // Filter out current user from the list to avoid self-selection
    item._id === currentUserProfile?._id ? null : (
        <UserCard 
            item={item} 
            isSelected={selectedTeam.some(u => u._id === item._id)} 
            onToggle={toggleTeammate} 
        />
    )
  ), [selectedTeam, currentUserProfile, toggleTeammate]);

  const getItemLayout = useCallback((data, index) => (
    { length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index }
  ), []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Build Your Team</Text>
            <View style={{width: 24}} />
        </View>
        
        {/* Search Bar Embedded in Header */}
        <View style={styles.searchWrapper}>
            <MaterialIcons name="search" size={22} color="#8b5cf6" />
            <TextInput
                style={styles.searchInput}
                placeholder="Search by Name or Phone"
                placeholderTextColor="#9ca3af"
                value={searchQuery}
                onChangeText={handleSearch} 
            />
            {isSearching && <ActivityIndicator size="small" color="#8b5cf6" />}
        </View>
      </LinearGradient>

      {/* "You" Indicator */}
      <View style={styles.meSection}>
         <Text style={styles.sectionLabel}>Your Team ({selectedTeam.length + 1}/6)</Text>
         <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContainer}>
            <View style={styles.chipMe}>
                <Text style={styles.chipMeText}>You</Text>
            </View>
            {selectedTeam.map(u => (
                <TouchableOpacity key={u._id} onPress={() => toggleTeammate(u)} style={styles.chip}>
                    <Text style={styles.chipText}>{u.fullName.split(' ')[0]}</Text>
                    <MaterialIcons name="close" size={14} color="#4b5563" />
                </TouchableOpacity>
            ))}
         </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          getItemLayout={getItemLayout}
          removeClippedSubviews={true}
          ListEmptyComponent={
            <View style={styles.emptyState}>
                <MaterialIcons name="group-off" size={48} color="#cbd5e1" />
                <Text style={styles.emptyText}>No available players found.</Text>
            </View>
          }
        />
      )}

      {/* FOOTER */}
      <View style={styles.footer}>
        <View style={styles.footerInfo}>
            <Text style={styles.footerLabel}>Validity Check</Text>
            <View style={styles.validityRow}>
                <MaterialIcons 
                    name={minDaysLeft > 0 ? "check-circle" : "warning"} 
                    size={16} 
                    color={minDaysLeft > 0 ? "#16a34a" : "#dc2626"} 
                />
                <Text style={[styles.validityText, { color: minDaysLeft > 0 ? '#1f2937' : '#dc2626' }]}>
                    {minDaysLeft > 0 ? `Valid for next ${minDaysLeft} days` : 'Membership Expired'}
                </Text>
            </View>
        </View>

        <TouchableOpacity 
            style={[styles.continueBtn, (selectedTeam.length === 0 && !currentUserProfile) && styles.btnDisabled]}
            onPress={handleContinue}
            activeOpacity={0.8}
        >
            <LinearGradient 
                colors={minDaysLeft > 0 ? ['#8b5cf6', '#ec4899'] : ['#9ca3af', '#9ca3af']} 
                style={styles.btnGradient}
            >
                <Text style={styles.btnText}>Select Slots</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  
  // Header
  header: { padding: 20, paddingTop: 50, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
  
  searchWrapper: { flexDirection: 'row', backgroundColor: 'white', paddingHorizontal: 15, height: 50, borderRadius: 16, alignItems: 'center' },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: '#1f2937' },

  // "Me" Section
  meSection: { paddingVertical: 15, paddingHorizontal: 20 },
  sectionLabel: { fontSize: 13, color: '#64748b', fontWeight: '600', marginBottom: 10 },
  chipContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chipMe: { backgroundColor: '#e0e7ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#c7d2fe' },
  chipMeText: { color: '#4338ca', fontWeight: 'bold', fontSize: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', gap: 4 },
  chipText: { color: '#374151', fontSize: 12, fontWeight: '500' },

  // List
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#94a3b8', marginTop: 10, fontSize: 16 },

  // Card
  userCard: { flexDirection: 'row', backgroundColor: 'white', padding: 12, borderRadius: 16, marginBottom: 12, alignItems: 'center', height: ITEM_HEIGHT - 12, shadowColor: '#64748b', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, borderWidth: 1, borderColor: 'transparent' },
  userCardSelected: { borderColor: '#8b5cf6', backgroundColor: '#f5f3ff' },
  userCardInactive: { opacity: 0.6, backgroundColor: '#f1f5f9' },
  
  userCardLeft: { marginRight: 12, position: 'relative' },
  avatarBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 48, height: 48, borderRadius: 24 },
  avatar: { color: '#64748b', fontSize: 18, fontWeight: 'bold' },
  checkBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#8b5cf6', width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },

  userCardMiddle: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  userPhone: { fontSize: 13, color: '#9ca3af', marginBottom: 4 },
  
  membershipBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  bgActive: { backgroundColor: '#dcfce7' },
  bgInactive: { backgroundColor: '#fee2e2' },
  membershipText: { fontSize: 11, fontWeight: '600' },
  textActive: { color: '#15803d' },
  textInactive: { color: '#b91c1c' },

  // Footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', padding: 20, paddingBottom: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f1f5f9', elevation: 10 },
  footerInfo: { flex: 1 },
  footerLabel: { fontSize: 12, color: '#64748b' },
  validityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  validityText: { fontSize: 14, fontWeight: '700' },
  
  continueBtn: { borderRadius: 12, overflow: 'hidden', width: 140 },
  btnGradient: { paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
});

export default TeamSelectionScreen;