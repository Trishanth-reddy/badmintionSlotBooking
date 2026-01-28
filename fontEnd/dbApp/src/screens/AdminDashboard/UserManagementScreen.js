import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput,
  Alert, Modal, Dimensions, ScrollView, ActivityIndicator, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../../api/axiosConfig'; 
import { useDebounce } from 'use-debounce';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// --- HELPER FUNCTIONS ---

const computeDaysLeft = (membership) => {
  if (!membership) return 0;
  if (membership.expiryDate) {
    const now = new Date();
    const end = new Date(membership.expiryDate);
    const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }
  return membership.daysLeft || 0;
};

const getInactiveDays = (membership) => {
  if (!membership?.expiryDate) return 0;
  const now = new Date();
  const end = new Date(membership.expiryDate);
  const diffTime = now - end; 
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

const isLongTermInactive = (membership) => {
    if (membership?.status === 'Active') return false;
    if (!membership?.expiryDate) return true; 
    return getInactiveDays(membership) > 55;
};

// --- MEMOIZED COMPONENTS ---

const NotificationBadge = React.memo(({ label, sent }) => (
  <View style={[styles.notifBadge, sent ? styles.notifSent : styles.notifPending]}>
    <View style={styles.notifHeader}>
       <MaterialIcons name={sent ? "check-circle" : "schedule"} size={14} color={sent ? "#166534" : "#94a3b8"} />
       <Text style={[styles.notifLabel, sent ? styles.notifLabelSent : styles.notifLabelPending]}>{label}</Text>
    </View>
    <Text style={styles.notifStatus}>{sent ? "Sent" : "Pending"}</Text>
  </View>
));

const StatsSection = React.memo(({ stats }) => (
  <View style={styles.statsContainer}>
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{stats.total || 0}</Text>
      <Text style={styles.statLabel}>Total</Text>
    </View>
    <View style={[styles.statBox, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#f1f5f9' }]}>
      <Text style={[styles.statValue, { color: '#16a34a' }]}>{stats.active || 0}</Text>
      <Text style={styles.statLabel}>Active</Text>
    </View>
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color: '#ef4444' }]}>{stats.inactive || 0}</Text>
      <Text style={styles.statLabel}>Inactive</Text>
    </View>
  </View>
));

const FilterTabs = React.memo(({ filterType, onFilterChange }) => (
  <View style={styles.filterContainer}>
    {['all', 'active', 'inactive'].map((filter) => (
      <TouchableOpacity
        key={filter}
        style={[styles.filterTab, filterType === filter && styles.filterTabActive]}
        onPress={() => onFilterChange(filter)}
        activeOpacity={0.7}
      >
        <Text style={[styles.filterText, filterType === filter && styles.filterTextActive]}>
          {filter.charAt(0).toUpperCase() + filter.slice(1)}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
));

const UserCard = React.memo(({ item, onPress }) => {
  const daysLeft = computeDaysLeft(item.membership);
  const isActive = item.membership?.status === 'Active';
  const inactiveDays = !isActive ? getInactiveDays(item.membership) : 0;
  
  return (
    <TouchableOpacity style={styles.userCard} onPress={() => onPress(item)} activeOpacity={0.7}>
      <View style={styles.userCardLeft}>
        {item.profilePicture ? (
          <Image source={{ uri: item.profilePicture }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatarBox, !isActive && { backgroundColor: '#cbd5e1' }]}>
            <Text style={styles.avatar}>{item.fullName?.charAt(0).toUpperCase() || 'U'}</Text>
          </View>
        )}
      </View>

      <View style={styles.userCardMiddle}>
        <View style={styles.nameRow}>
            <Text style={[styles.userName, !isActive && { color: '#64748b' }]} numberOfLines={1}>
                {item.fullName}
            </Text>
            {isActive && <View style={styles.activeDot} />}
        </View>
        <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
        
        <View style={styles.metaRow}>
            {isActive ? (
                <Text style={styles.daysLeftText}>{daysLeft} days remaining</Text>
            ) : (
                <Text style={styles.inactiveText}>
                    {inactiveDays > 0 ? `Expired ${inactiveDays}d ago` : 'Membership Inactive'}
                </Text>
            )}
        </View>
      </View>

      <View style={styles.userCardRight}>
        <MaterialIcons name="chevron-right" size={24} color="#e2e8f0" />
      </View>
    </TouchableOpacity>
  );
});

const QuickAddButton = React.memo(({ days, label, onPress, disabled, colorStart, colorEnd }) => (
  <TouchableOpacity
    style={styles.quickButton}
    onPress={() => onPress(days)}
    disabled={disabled}
    activeOpacity={0.8}
  >
    <LinearGradient 
        colors={[colorStart || '#8b5cf6', colorEnd || '#ec4899']} 
        style={styles.quickButtonGradient}
    >
      <Text style={styles.quickButtonText}>{label}</Text>
    </LinearGradient>
  </TouchableOpacity>
));

// --- MAIN SCREEN ---

const UserManagementScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [debouncedSearch] = useDebounce(searchQuery, 500);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/users', {
        params: { search: debouncedSearch, status: filterType },
      });
      
      const fetchedUsers = response.data.data || [];
      setUsers(fetchedUsers);
      
      const total = fetchedUsers.length;
      const active = fetchedUsers.filter(u => u.membership?.status === 'Active').length;
      setStats({ total, active, inactive: total - active });
      
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterType]);

  useFocusEffect(useCallback(() => { loadUsers(); }, [loadUsers]));

  const handleCloseModal = useCallback(() => { setShowModal(false); setSelectedUser(null); }, []);

  const handleExtendMembership = useCallback(async (days) => {
      if (!selectedUser) return;
      try {
        setActionLoading(true);
        await api.put(`/admin/users/${selectedUser._id}/extend`, { days });
        Alert.alert('Updated', `Successfully added ${days} days.`);
        await loadUsers(); // Refresh list
        handleCloseModal();
      } catch (error) {
        Alert.alert('Error', error.response?.data?.message || 'Failed to extend');
      } finally {
        setActionLoading(false);
      }
    }, [selectedUser, loadUsers, handleCloseModal]);

  const handleDeleteUser = useCallback(async () => {
    if (!selectedUser) return;
    const isOld = isLongTermInactive(selectedUser.membership);
    Alert.alert(
      'Delete Account',
      `Are you sure you want to permanently delete ${selectedUser.fullName}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await api.delete(`/admin/users/${selectedUser._id}`);
              Alert.alert('Deleted', 'User has been removed.');
              await loadUsers();
              handleCloseModal();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete user');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  }, [selectedUser, loadUsers, handleCloseModal]);

  const renderUserCard = useCallback(({ item }) => (
    <UserCard item={item} onPress={(user) => { setSelectedUser(user); setShowModal(true); }} />
  ), []);
  
  const modalDaysLeft = useMemo(() => (selectedUser ? computeDaysLeft(selectedUser.membership) : 0), [selectedUser]);
  const modalInactiveDays = useMemo(() => (selectedUser ? getInactiveDays(selectedUser.membership) : 0), [selectedUser]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Management</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <StatsSection stats={stats} />

      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={22} color="#94a3b8" />
            <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94a3b8"
            returnKeyType="search"
            />
        </View>
        <FilterTabs filterType={filterType} onFilterChange={setFilterType} />
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item._id}
        renderItem={renderUserCard}
        onRefresh={loadUsers}
        refreshing={loading}
        contentContainerStyle={styles.listContent}
        initialNumToRender={8}
        windowSize={5}
        removeClippedSubviews={true}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={!loading && (
            <View style={styles.emptyState}>
                <MaterialIcons name="search-off" size={48} color="#cbd5e1" />
                <Text style={styles.emptyText}>No users found</Text>
            </View>
        )}
      />

      {/* USER DETAIL MODAL */}
      <Modal visible={showModal} transparent animationType="fade" onRequestClose={handleCloseModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedUser && (
              <>
                <View style={styles.modalDragHandle} />
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>User Details</Text>
                  <TouchableOpacity onPress={handleCloseModal} style={styles.closeBtn}>
                    <MaterialIcons name="close" size={22} color="#475569" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                  
                  {/* Profile Header */}
                  <View style={styles.modalProfileHeader}>
                      <View style={styles.modalAvatar}>
                         <Text style={styles.modalAvatarText}>{selectedUser.fullName?.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View>
                         <Text style={styles.modalName}>{selectedUser.fullName}</Text>
                         <Text style={styles.modalEmail}>{selectedUser.email}</Text>
                         <Text style={styles.modalPhone}>{selectedUser.phone || 'No phone linked'}</Text>
                      </View>
                  </View>

                  <View style={styles.divider} />

                  {/* Membership Card */}
                  <View style={styles.sectionBlock}>
                    <View style={styles.sectionRow}>
                        <Text style={styles.sectionLabel}>Membership Status</Text>
                        <View style={[styles.statusPill, selectedUser.membership?.status === 'Active' ? styles.pillActive : styles.pillInactive]}>
                            <Text style={[styles.pillText, selectedUser.membership?.status === 'Active' ? styles.pillTextActive : styles.pillTextInactive]}>
                                {selectedUser.membership?.status || 'Inactive'}
                            </Text>
                        </View>
                    </View>
                    
                    <Text style={styles.timelineText}>
                        {selectedUser.membership?.status === 'Active' 
                          ? `${modalDaysLeft} Days Remaining` 
                          : `Expired ${modalInactiveDays} days ago`}
                    </Text>

                    {/* Auto-Notification Status */}
                    <Text style={styles.subHeader}>Reminder Logs</Text>
                    <View style={styles.notifContainer}>
                      <NotificationBadge 
                        label="5 Days" 
                        sent={
                          selectedUser.membership?.lastWarningDay === 5 || 
                          selectedUser.membership?.lastWarningDay === 3 || 
                          selectedUser.membership?.lastWarningDay === 1 || 
                          selectedUser.membership?.lastWarningDay === 0
                        } 
                      />
                      <NotificationBadge 
                        label="3 Days" 
                        sent={
                          selectedUser.membership?.lastWarningDay === 3 || 
                          selectedUser.membership?.lastWarningDay === 1 || 
                          selectedUser.membership?.lastWarningDay === 0
                        } 
                      />
                      <NotificationBadge 
                        label="1 Day" 
                        sent={
                          selectedUser.membership?.lastWarningDay === 1 || 
                          selectedUser.membership?.lastWarningDay === 0
                        } 
                      />
                    </View>
                  </View>

                  <View style={styles.divider} />

                  {/* Actions */}
                  <View style={styles.sectionBlock}>
                    <Text style={styles.sectionLabel}>Extend Membership</Text>
                    <View style={styles.quickButtonsContainer}>
                      <QuickAddButton days={1} label="+1 Day" colorStart="#3b82f6" colorEnd="#2563eb" onPress={handleExtendMembership} disabled={actionLoading} />
                      <QuickAddButton days={30} label="+1 Month" colorStart="#8b5cf6" colorEnd="#7c3aed" onPress={handleExtendMembership} disabled={actionLoading} />
                      <QuickAddButton days={365} label="+1 Year" colorStart="#10b981" colorEnd="#059669" onPress={handleExtendMembership} disabled={actionLoading} />
                    </View>
                  </View>

                  {/* Danger Zone */}
                  <View style={styles.dangerZone}>
                    {isLongTermInactive(selectedUser.membership) && (
                        <View style={styles.warningBox}>
                            <MaterialIcons name="warning" size={16} color="#b91c1c" />
                            <Text style={styles.warningText}>Inactive {">"} 55 days. Safe to delete.</Text>
                        </View>
                    )}
                    <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteUser} disabled={actionLoading} activeOpacity={0.8}>
                      {actionLoading ? <ActivityIndicator color="#ef4444" /> : <Text style={styles.deleteButtonText}>Delete User Account</Text>}
                    </TouchableOpacity>
                  </View>

                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  
  statsContainer: { flexDirection: 'row', backgroundColor: '#fff', margin: 20, borderRadius: 16, paddingVertical: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  statBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: '500' },

  searchWrapper: { paddingHorizontal: 20, gap: 12, marginBottom: 10 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e2e8f0', height: 48 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: '#1e293b' },
  
  filterContainer: { flexDirection: 'row', gap: 8 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9' },
  filterTabActive: { backgroundColor: '#1e293b' },
  filterText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  filterTextActive: { color: '#fff' },

  listContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  
  userCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, elevation: 2, borderWidth: 1, borderColor: '#f8fafc' },
  userCardLeft: { marginRight: 12 },
  avatarBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#8b5cf6', justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#e2e8f0' },
  avatar: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  
  userCardMiddle: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a' },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  userEmail: { fontSize: 13, color: '#94a3b8' },
  metaRow: { marginTop: 6 },
  daysLeftText: { fontSize: 12, color: '#16a34a', fontWeight: '600' },
  inactiveText: { fontSize: 12, color: '#ef4444', fontWeight: '600' },
  
  userCardRight: { marginLeft: 8 },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 15, color: '#94a3b8', marginTop: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 40, maxHeight: '85%' },
  modalDragHandle: { width: 40, height: 4, backgroundColor: '#cbd5e1', borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, paddingBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  closeBtn: { padding: 4, backgroundColor: '#f1f5f9', borderRadius: 20 },

  modalProfileHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  modalAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  modalAvatarText: { fontSize: 24, fontWeight: 'bold', color: '#475569' },
  modalName: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  modalEmail: { fontSize: 14, color: '#64748b' },
  modalPhone: { fontSize: 13, color: '#94a3b8', marginTop: 2 },

  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 16 },
  
  sectionBlock: { gap: 12 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  statusPill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  pillActive: { backgroundColor: '#dcfce7' },
  pillInactive: { backgroundColor: '#fee2e2' },
  pillText: { fontSize: 12, fontWeight: '700' },
  pillTextActive: { color: '#166534' },
  pillTextInactive: { color: '#991b1b' },
  timelineText: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  
  subHeader: { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  notifContainer: { flexDirection: 'row', gap: 8 },
  notifBadge: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  notifSent: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  notifHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  notifLabel: { fontSize: 11, fontWeight: '700' },
  notifLabelSent: { color: '#166534' },
  notifLabelPending: { color: '#64748b' },
  notifStatus: { fontSize: 10, color: '#94a3b8' },

  quickButtonsContainer: { flexDirection: 'row', gap: 10 },
  quickButton: { flex: 1, borderRadius: 12, overflow: 'hidden', height: 48 },
  quickButtonGradient: { justifyContent: 'center', alignItems: 'center', flex: 1 },
  quickButtonText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },

  dangerZone: { marginTop: 30, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#fecaca', alignItems: 'center' },
  warningBox: { flexDirection: 'row', gap: 6, backgroundColor: '#fef2f2', padding: 8, borderRadius: 8, marginBottom: 12 },
  warningText: { color: '#b91c1c', fontSize: 12, fontWeight: '600' },
  deleteButton: { width: '100%', alignItems: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#ef4444', backgroundColor: '#fff' },
  deleteButtonText: { color: '#ef4444', fontSize: 14, fontWeight: 'bold' },
});

export default UserManagementScreen;