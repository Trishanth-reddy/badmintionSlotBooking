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

// Helper function to compute days left (extracted and pure)
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

// Memoized Stats Component
const StatsSection = React.memo(({ stats }) => (
  <View style={styles.statsContainer}>
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{stats.total}</Text>
      <Text style={styles.statLabel}>Total Users</Text>
    </View>
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{stats.active}</Text>
      <Text style={styles.statLabel}>Active</Text>
    </View>
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{stats.inactive}</Text>
      <Text style={styles.statLabel}>Inactive</Text>
    </View>
  </View>
));

// Memoized Filter Tabs Component
const FilterTabs = React.memo(({ filterType, onFilterChange }) => (
  <View style={styles.filterContainer}>
    {['all', 'active', 'inactive'].map((filter) => (
      <TouchableOpacity
        key={filter}
        style={[
          styles.filterTab,
          filterType === filter && styles.filterTabActive,
        ]}
        onPress={() => onFilterChange(filter)}
      >
        <Text
          style={[
            styles.filterText,
            filterType === filter && styles.filterTextActive,
          ]}
        >
          {filter.charAt(0).toUpperCase() + filter.slice(1)}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
));

// Memoized User Card Component
const UserCard = React.memo(({ item, onPress }) => {
  const daysLeft = useMemo(() => computeDaysLeft(item.membership), [item.membership]);
  
  const handlePress = useCallback(() => {
    onPress(item);
  }, [item, onPress]);

  return (
    <TouchableOpacity style={styles.userCard} onPress={handlePress} activeOpacity={0.7}>
      <View style={styles.userCardLeft}>
        {item.profilePicture ? (
          <Image source={{ uri: item.profilePicture }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarBox}>
            <Text style={styles.avatar}>{item.fullName.charAt(0)}</Text>
          </View>
        )}
      </View>

      <View style={styles.userCardMiddle}>
        <Text style={styles.userName} numberOfLines={1}>{item.fullName}</Text>
        <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
        <View style={styles.badgeContainer}>
          <View
            style={[
              styles.badge,
              item.membership?.status === 'Active' ? styles.badgeActive : styles.badgeInactive,
            ]}
          >
            <Text style={styles.badgeText}>{item.membership?.status || 'No Sub'}</Text>
          </View>
          <Text style={styles.daysLeftText}>{daysLeft} days left</Text>
        </View>
      </View>

      <View style={styles.userCardRight}>
        <MaterialIcons name="chevron-right" size={24} color="#d1d5db" />
      </View>
    </TouchableOpacity>
  );
});

// Memoized Quick Add Button Component
const QuickAddButton = React.memo(({ days, amount, onPress, disabled }) => (
  <TouchableOpacity
    style={styles.quickButton}
    onPress={() => onPress(days, amount)}
    disabled={disabled}
    activeOpacity={0.8}
  >
    <LinearGradient colors={['#8b5cf6', '#ec4899']} style={styles.quickButtonGradient}>
      <Text style={styles.quickButtonText}>{days} Day{days > 1 ? 's' : ''}{'\n'}₹{amount}</Text>
    </LinearGradient>
  </TouchableOpacity>
));

// Main Component
const UserManagementScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());

  const [debouncedSearch] = useDebounce(searchQuery, 500);

  // Load users from API
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/admin/all', {
        params: { search: debouncedSearch, status: filterType },
      });
      setUsers(response.data.data);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterType]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [loadUsers])
  );

  // Auto-refresh every minute for days-left accuracy
  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setSelectedUser(null);
  }, []);

  const handleFilterChange = useCallback((filter) => {
    setFilterType(filter);
  }, []);

  const handleViewDetails = useCallback((item) => {
    setSelectedUser(item);
    setShowModal(true);
  }, []);

  const handleAddMembership = useCallback(
    async (days, amount) => {
      if (!selectedUser) return;
      try {
        setActionLoading(true);
        await api.post('/subscriptions/admin/subscription/add', {
          userId: selectedUser._id,
          days,
          amount,
          notes: `${days}-day plan added by admin`,
        });
        Alert.alert('Success', `${days}-day membership added`);
        await loadUsers();
        handleCloseModal();
      } catch (error) {
        Alert.alert('Error', error.response?.data?.message || 'Failed to add plan');
      } finally {
        setActionLoading(false);
      }
    },
    [selectedUser, loadUsers, handleCloseModal]
  );

  const handleCancelMembership = useCallback(async () => {
    if (!selectedUser) return;
    Alert.alert(
      'Cancel Membership',
      `Cancel membership for ${selectedUser.fullName}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await api.delete(`/subscriptions/admin/subscription/${selectedUser._id}`, {
                data: { reason: 'Cancelled by Admin' },
              });
              Alert.alert('Success', 'Membership cancelled');
              await loadUsers();
              handleCloseModal();
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel membership');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  }, [selectedUser, loadUsers, handleCloseModal]);

  // Memoized render function
  const renderUserCard = useCallback(
    ({ item }) => <UserCard item={item} onPress={handleViewDetails} />,
    [handleViewDetails]
  );

  const keyExtractor = useCallback((item) => item._id, []);

  const selectedUserDaysLeft = useMemo(
    () => (selectedUser ? computeDaysLeft(selectedUser.membership) : 0),
    [selectedUser]
  );

  if (loading && !users.length) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Management</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <StatsSection stats={stats} />

      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={24} color="#8b5cf6" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
      </View>

      <FilterTabs filterType={filterType} onFilterChange={handleFilterChange} />

      <FlatList
        data={users}
        keyExtractor={keyExtractor}
        renderItem={renderUserCard}
        onRefresh={loadUsers}
        refreshing={loading}
        contentContainerStyle={styles.listContent}
        extraData={nowTick}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="person-off" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
      />

      {/* User Detail Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedUser && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={handleCloseModal}>
                    <MaterialIcons name="close" size={28} color="#1f2937" />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>User Details</Text>
                  <View style={{ width: 40 }} />
                </View>

                <View style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Name</Text>
                    <Text style={styles.infoValue}>{selectedUser.fullName}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>{selectedUser.email}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={styles.infoValue}>{selectedUser.phone}</Text>
                  </View>
                </View>

                <View style={styles.membershipCard}>
                  <Text style={styles.cardTitle}>Membership</Text>
                  <View style={styles.membershipRow}>
                    <Text style={styles.membershipLabel}>Status</Text>
                    <View
                      style={[
                        styles.membershipBadge,
                        selectedUser.membership?.status === 'Active'
                          ? styles.badgeActiveModal
                          : styles.badgeInactiveModal,
                      ]}
                    >
                      <Text style={styles.membershipBadgeText}>
                        {selectedUser.membership?.status || 'None'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.membershipDivider} />
                  <View style={styles.membershipRow}>
                    <Text style={styles.membershipLabel}>Days Left</Text>
                    <Text
                      style={[
                        styles.membershipValue,
                        selectedUserDaysLeft <= 5 && styles.daysLeftWarning,
                      ]}
                    >
                      {selectedUserDaysLeft} days
                    </Text>
                  </View>
                </View>

                <View style={styles.actionContainer}>
                  <Text style={styles.quickAddTitle}>Quick Add Membership</Text>
                  <View style={styles.quickButtonsContainer}>
                    <QuickAddButton days={1} amount={100} onPress={handleAddMembership} disabled={actionLoading} />
                    <QuickAddButton days={30} amount={999} onPress={handleAddMembership} disabled={actionLoading} />
                    <QuickAddButton days={90} amount={2499} onPress={handleAddMembership} disabled={actionLoading} />
                  </View>

                  {selectedUser.membership?.status === 'Active' && (
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={handleCancelMembership}
                      disabled={actionLoading}
                      activeOpacity={0.8}
                    >
                      <LinearGradient colors={['#dc2626', '#b91c1c']} style={styles.cancelButtonGradient}>
                        {actionLoading ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <>
                            <MaterialIcons name="block" size={20} color="#fff" />
                            <Text style={styles.cancelButtonText}>Cancel Membership</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  statsContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 15, gap: 10 },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#8b5cf6' },
  statLabel: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: { flex: 1, paddingVertical: 12, marginLeft: 8, fontSize: 15, color: '#333' },
  filterContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 12, gap: 8 },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterTabActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
  filterText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  listContent: { paddingHorizontal: 20, paddingBottom: 20, gap: 10 },
  userCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  userCardLeft: { marginRight: 12 },
  avatarBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#e5e7eb' },
  avatar: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  userCardMiddle: { flex: 1 },
  userName: { fontSize: 15, fontWeight: 'bold', color: '#1f2937', marginBottom: 2 },
  userEmail: { fontSize: 12, color: '#9ca3af', marginBottom: 6 },
  badgeContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeActive: { backgroundColor: '#dcfce7' },
  badgeInactive: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#1f2937' },
  daysLeftText: { fontSize: 11, color: '#8b5cf6', fontWeight: '500' },
  userCardRight: { marginLeft: 12 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, color: '#9ca3af', marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingBottom: 30,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  infoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  divider: { height: 1, backgroundColor: '#e5e7eb' },
  infoLabel: { fontSize: 13, color: '#9ca3af', fontWeight: '500' },
  infoValue: { fontSize: 14, color: '#1f2937', fontWeight: '600', flex: 1, textAlign: 'right' },
  membershipCard: {
    backgroundColor: '#f3e8ff',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 12 },
  membershipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  membershipDivider: { height: 1, backgroundColor: '#e9d5ff' },
  membershipLabel: { fontSize: 13, color: '#6b21a8', fontWeight: '500' },
  membershipValue: { fontSize: 14, color: '#1f2937', fontWeight: '600' },
  membershipBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  badgeActiveModal: { backgroundColor: '#dcfce7' },
  badgeInactiveModal: { backgroundColor: '#fee2e2' },
  membershipBadgeText: { fontSize: 12, fontWeight: '600', color: '#1f2937' },
  daysLeftWarning: { color: '#dc2626' },
  actionContainer: { marginHorizontal: 20, marginTop: 20 },
  quickAddTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
    textAlign: 'center',
  },
  quickButtonsContainer: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  quickButton: { flex: 1, borderRadius: 10, overflow: 'hidden', height: 70 },
  quickButtonGradient: { justifyContent: 'center', alignItems: 'center', paddingVertical: 8, flex: 1 },
  quickButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 16,
  },
  cancelButton: { borderRadius: 12, overflow: 'hidden', marginTop: 10 },
  cancelButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  cancelButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});

export default UserManagementScreen;
