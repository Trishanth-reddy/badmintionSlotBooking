import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator, Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../api/axiosConfig';
import { AuthContext } from '../../App';

// Reusable User Card (Memoized)
const UserCard = React.memo(({ item, isSelected, onToggle }) => {
  const isInactive = item.membership.status !== 'Active' || item.membership.daysLeft <= 0;
  return (
    <TouchableOpacity
      style={[styles.userCard, isSelected && styles.userCardSelected, isInactive && styles.userCardInactive]}
      onPress={() => onToggle(item)}
      disabled={isInactive && !isSelected}
    >
      <View style={styles.userCardLeft}>
        {item.profilePicture ? (
          <Image source={{ uri: item.profilePicture }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarBox}><Text style={styles.avatar}>{item.fullName.charAt(0)}</Text></View>
        )}
      </View>
      <View style={styles.userCardMiddle}>
        <Text style={styles.userName}>{item.fullName}</Text>
        <Text style={styles.userPhone}>{item.phone}</Text>
        <View style={styles.membershipBadge}>
          <Text style={[styles.membershipText, !isInactive ? styles.active : styles.inactive]}>
            {!isInactive ? 'Active' : 'Expired'} • {item.membership.daysLeft} days left
          </Text>
        </View>
      </View>
      <View style={styles.userCardRight}>
        {isSelected && <MaterialIcons name="check-circle" size={28} color="#8b5cf6" />}
      </View>
    </TouchableOpacity>
  );
});

const TeamSelectionScreen = ({ navigation, route }) => {
  const { selectedCourt } = route.params;
  const { user } = useContext(AuthContext);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [allUsers, setAllUsers] = useState([]); 
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. Load Data Once
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [profileRes, membersRes] = await Promise.all([
          api.get('/users/profile'),
          api.get('/users/available-members')
        ]);
        if (profileRes.data.success) setCurrentUserProfile(profileRes.data.data);
        if (membersRes.data.success) {
            setAllUsers(membersRes.data.data);
            setFilteredUsers(membersRes.data.data);
        }
      } catch (error) { console.error(error); } 
      finally { setLoading(false); }
    };
    init();
  }, []);

  // 2. Debounced Search Logic (Client Side for Speed)
  useEffect(() => {
    const timer = setTimeout(() => {
        if (!searchQuery.trim()) {
            setFilteredUsers(allUsers);
        } else {
            const lower = searchQuery.toLowerCase();
            const filtered = allUsers.filter(u => 
                u.fullName.toLowerCase().includes(lower) || u.phone.includes(lower)
            );
            setFilteredUsers(filtered);
        }
    }, 300); // Wait 300ms after typing stops
    return () => clearTimeout(timer);
  }, [searchQuery, allUsers]);

  const toggleTeammate = useCallback((member) => {
    setSelectedTeam(prev => {
      const exists = prev.find(u => u._id === member._id);
      if (exists) return prev.filter(u => u._id !== member._id);
      if (prev.length >= 5) { Alert.alert("Limit", "Max 6 players."); return prev; }
      return [...prev, member];
    });
  }, []);

  const minDaysLeft = useMemo(() => {
    if (!currentUserProfile) return 0;
    const allPlayers = [currentUserProfile, ...selectedTeam];
    return Math.min(...allPlayers.map(p => p.membership?.daysLeft || 0));
  }, [currentUserProfile, selectedTeam]);

  const handleContinue = useCallback(() => {
    if (minDaysLeft <= 0) { Alert.alert("Expired", "Membership issue."); return; }
    navigation.navigate('TimeSlotMain', { selectedCourt, selectedTeam, minMembershipDays: minDaysLeft });
  }, [minDaysLeft, selectedCourt, selectedTeam, navigation]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Team</Text>
        <View style={{width: 24}} />
      </LinearGradient>

      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={24} color="#8b5cf6" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search Name or Number..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? <ActivityIndicator size="large" color="#8b5cf6" style={{marginTop: 50}} /> : (
        <FlatList
          data={filteredUsers}
          keyExtractor={item => item._id}
          renderItem={({ item }) => (
            <UserCard 
              item={item} 
              isSelected={selectedTeam.find(u => u._id === item._id)} 
              onToggle={toggleTeammate} 
            />
          )}
          contentContainerStyle={styles.listContent}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
        />
      )}

      <View style={styles.footer}>
        <View style={styles.statsRow}>
          <Text style={styles.statsText}>Team: {selectedTeam.length + 1}/6</Text>
          <Text style={styles.statsText}>Valid for: {minDaysLeft} days</Text>
        </View>
        <TouchableOpacity 
            style={[styles.btn, selectedTeam.length === 0 && styles.btnDisabled]}
            onPress={handleContinue}
        >
            <Text style={styles.btnText}>Continue to Slots</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  backButton: { padding: 5 },
  searchContainer: { flexDirection: 'row', backgroundColor: 'white', margin: 15, padding: 10, borderRadius: 10, alignItems: 'center', elevation: 2 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  listContent: { paddingHorizontal: 15, paddingBottom: 100 },
  userCard: { flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, alignItems: 'center', elevation: 1 },
  userCardSelected: { borderColor: '#8b5cf6', borderWidth: 2, backgroundColor: '#f3e8ff' },
  userCardInactive: { opacity: 0.5 },
  userCardLeft: { marginRight: 15 },
  avatarBox: { width: 45, height: 45, borderRadius: 25, backgroundColor: '#8b5cf6', justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 45, height: 45, borderRadius: 25 },
  avatar: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  userCardMiddle: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '600', color: '#333' },
  userPhone: { fontSize: 14, color: '#666', marginVertical: 2 },
  membershipBadge: { alignSelf: 'flex-start', backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 2 },
  membershipText: { fontSize: 12, fontWeight: '600' },
  active: { color: '#16a34a' },
  inactive: { color: '#dc2626' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', padding: 20, elevation: 20, borderTopWidth: 1, borderTopColor: '#eee' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  statsText: { fontSize: 14, fontWeight: '600', color: '#666' },
  btn: { backgroundColor: '#8b5cf6', padding: 15, borderRadius: 10, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#ccc' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});

export default TeamSelectionScreen;