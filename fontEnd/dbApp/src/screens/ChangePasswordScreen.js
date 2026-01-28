import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../api/axiosConfig';

const { width } = Dimensions.get('window');

// Memoized password requirement item component
const RequirementItem = React.memo(({ isValid, text }) => (
  <View style={styles.requirementItem}>
    <MaterialIcons
      name={isValid ? 'check-circle' : 'circle'}
      size={16}
      color={isValid ? '#16a34a' : '#cbd5e1'}
    />
    <Text style={[styles.requirementText, isValid && styles.requirementTextValid]}>{text}</Text>
  </View>
));

// Memoized password input component
const PasswordInput = React.memo(({ 
  label, 
  value, 
  onChangeText, 
  placeholder, 
  showPassword, 
  onToggleShow, 
  disabled,
  icon = 'lock-outline'
}) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputContainer}>
      <MaterialIcons name={icon} size={20} color="#94a3b8" style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        secureTextEntry={!showPassword}
        value={value}
        onChangeText={onChangeText}
        editable={!disabled}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity onPress={onToggleShow} activeOpacity={0.7} style={styles.eyeIcon}>
        <MaterialIcons
          name={showPassword ? 'visibility' : 'visibility-off'}
          size={20}
          color="#94a3b8"
        />
      </TouchableOpacity>
    </View>
  </View>
));

// Memoized security tips section
const SecurityTips = React.memo(() => (
  <View style={styles.tipsSection}>
    <View style={styles.tipsHeader}>
       <MaterialIcons name="lightbulb" size={18} color="#b45309" />
       <Text style={styles.tipsTitle}>Security Tips</Text>
    </View>
    <Text style={styles.tip}>• Use a mix of uppercase, lowercase, numbers, and symbols.</Text>
    <Text style={styles.tip}>• Never share your password with anyone.</Text>
    <Text style={styles.tip}>• Avoid using personal information like birthdays.</Text>
  </View>
));

const ChangePasswordScreen = ({ navigation }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Memoized validation states
  const validations = useMemo(() => ({
    lengthValid: newPassword.length >= 8,
    differentValid: newPassword && currentPassword && newPassword !== currentPassword,
    matchValid: newPassword === confirmPassword && newPassword.length > 0,
  }), [newPassword, currentPassword, confirmPassword]);

  const handleChangePassword = useCallback(async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!validations.lengthValid) {
      Alert.alert('Error', 'New password must be at least 8 characters');
      return;
    }

    if (!validations.matchValid) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (!validations.differentValid) {
      Alert.alert('Error', 'New password must be different from current password');
      return;
    }

    setLoading(true);

    try {
      const response = await api.put('/users/change-password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (response.data.success) {
        Alert.alert(
          'Success',
          'Your password has been changed successfully',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Change password error:', error.response?.data);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to change password'
      );
    } finally {
      setLoading(false);
    }
  }, [currentPassword, newPassword, confirmPassword, validations, navigation]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const toggleShowCurrentPassword = useCallback(() => {
    setShowCurrentPassword((prev) => !prev);
  }, []);

  const toggleShowNewPassword = useCallback(() => {
    setShowNewPassword((prev) => !prev);
  }, []);

  const toggleShowConfirmPassword = useCallback(() => {
    setShowConfirmPassword((prev) => !prev);
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <TouchableOpacity
          onPress={handleGoBack}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={false}
      >
        <View style={styles.infoSection}>
          <View style={styles.infoIconBox}>
            <MaterialIcons name="lock-reset" size={32} color="#8b5cf6" />
          </View>
          <Text style={styles.infoTitle}>Update Password</Text>
          <Text style={styles.infoText}>
            Ensure your account stays secure with a strong password.
          </Text>
        </View>

        <View style={styles.formCard}>
          <PasswordInput
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Enter current password"
            showPassword={showCurrentPassword}
            onToggleShow={toggleShowCurrentPassword}
            disabled={loading}
            icon="lock-outline"
          />

          <PasswordInput
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter new password (min. 8 chars)"
            showPassword={showNewPassword}
            onToggleShow={toggleShowNewPassword}
            disabled={loading}
            icon="lock"
          />

          <PasswordInput
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter new password"
            showPassword={showConfirmPassword}
            onToggleShow={toggleShowConfirmPassword}
            disabled={loading}
            icon="lock-clock"
          />

          <View style={styles.requirementsBox}>
            <Text style={styles.requirementsTitle}>Password Strength:</Text>
            <RequirementItem 
              isValid={validations.lengthValid} 
              text="At least 8 characters" 
            />
            <RequirementItem 
              isValid={validations.differentValid} 
              text="Different from current password" 
            />
            <RequirementItem 
              isValid={validations.matchValid} 
              text="Passwords match" 
            />
          </View>
        </View>

        <SecurityTips />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleGoBack}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleChangePassword}
          disabled={loading}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#8b5cf6', '#ec4899']}
            start={{x:0, y:0}} end={{x:1, y:0}}
            style={styles.confirmButtonGradient}
          >
            {loading ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator color="#fff" size="small" />
              </View>
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.confirmButtonText}>Update Password</Text>
                <MaterialIcons name="check" size={20} color="#fff" />
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
  headerSpacer: { width: 40 },
  
  scrollContent: { paddingBottom: 100 },
  
  infoSection: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
    alignItems: 'center',
  },
  infoIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  infoTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginBottom: 6 },
  infoText: { fontSize: 14, color: '#6b7280', textAlign: 'center', paddingHorizontal: 20 },
  
  formCard: {
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    height: 50,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#1f2937' },
  eyeIcon: { padding: 8 },
  
  requirementsBox: {
    marginTop: 10,
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  requirementsTitle: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 10, textTransform: 'uppercase' },
  requirementItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  requirementText: { fontSize: 13, color: '#94a3b8' },
  requirementTextValid: { color: '#15803d', fontWeight: '500' },
  
  tipsSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#fffbeb',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: '#b45309' },
  tip: { fontSize: 13, color: '#92400e', marginBottom: 4, lineHeight: 20 },
  
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    elevation: 10
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelButtonText: { color: '#475569', fontSize: 15, fontWeight: '600' },
  confirmButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  confirmButtonGradient: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  confirmButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});

export default ChangePasswordScreen;