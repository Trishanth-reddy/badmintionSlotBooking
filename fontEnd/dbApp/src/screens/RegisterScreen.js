import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../api/axiosConfig';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const InputField = ({ icon, placeholder, value, onChangeText, ...props }) => (
  <View style={styles.inputContainer}>
    <MaterialIcons name={icon} size={22} color="#8b5cf6" style={styles.inputIcon} />
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor="#9ca3af"
      value={value}
      onChangeText={onChangeText}
      {...props}
    />
    {props.showToggle && (
      <TouchableOpacity onPress={props.onToggleShow} style={styles.eyeIcon}>
        <MaterialIcons
          name={props.showPassword ? 'visibility' : 'visibility-off'}
          size={22}
          color="#9ca3af"
        />
      </TouchableOpacity>
    )}
  </View>
);

const RegisterScreen = ({ navigation }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(''); // <--- NEW STATE
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    // 1. Validate Inputs
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    // Basic Phone Validation (Optional: Adjust length as needed)
    if (phone.trim() && phone.trim().length < 10) {
       Alert.alert('Invalid Phone', 'Please enter a valid mobile number.');
       return;
    }

    if (password.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      // 2. API Call: Send Registration OTP
      const res = await api.post('/auth/send-register-otp', {
        email: email.trim().toLowerCase(),
      });

      if (res.data.success) {
        Alert.alert('Verification Code Sent', `Please check ${email} for your code.`);
        
        // 3. Navigate to Verification Screen
        // We pass 'phone' in the payload so the NEXT screen can send it to the backend
        navigation.navigate('OtpVerification', {
          flow: 'register',
          payload: {
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(), // <--- PASSING PHONE DATA
            password: password,
          },
        });
      }
    } catch (error) {
      console.error('Register Error:', error.response?.data);
      const msg = error.response?.data?.message || 'Failed to initiate registration.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <LinearGradient
        colors={['#6366f1', '#8b5cf6', '#ec4899']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>Create Account</Text>
            <Text style={styles.welcomeSubtitle}>
              Join the community and start playing
            </Text>
          </View>

          <View style={styles.formCard}>
            {/* Full Name */}
            <InputField
              icon="person-outline"
              placeholder="Full Name"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />

            {/* Email Address */}
            <InputField
              icon="email"
              placeholder="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Mobile Number - NEW FIELD */}
            <InputField
              icon="phone-iphone"
              placeholder="Mobile Number (Optional)"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad" 
            />

            {/* Password */}
            <InputField
              icon="lock-outline"
              placeholder="Password (Min 8 chars)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              showToggle
              onToggleShow={() => setShowPassword(!showPassword)}
              showPassword={showPassword}
            />

            {/* Confirm Password */}
            <InputField
              icon="lock-outline"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
            />

            {/* Next Button */}
            <TouchableOpacity
              style={[styles.registerButton, loading && styles.disabledButton]}
              onPress={handleNext}
              disabled={loading}
            >
              <LinearGradient
                colors={['#8b5cf6', '#ec4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.registerButtonGradient}
              >
                {loading ? (
                  <View style={styles.loaderRow}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.registerButtonText}>Sending OTP...</Text>
                  </View>
                ) : (
                  <View style={styles.btnContent}>
                    <Text style={styles.registerButtonText}>Next</Text>
                    <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Log In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

// Styles remain exactly the same as your previous code
const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 45, height: 45, borderRadius: 22.5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  scrollContent: { paddingBottom: 40 },
  welcomeContainer: {
    paddingHorizontal: 30,
    marginBottom: 30,
    marginTop: 10,
  },
  welcomeTitle: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  welcomeSubtitle: { fontSize: 16, color: 'rgba(255, 255, 255, 0.9)' },
  formCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 30,
    paddingTop: 40,
    paddingBottom: 50,
    minHeight: 600,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    paddingHorizontal: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    height: 60,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#333', height: '100%' },
  eyeIcon: { padding: 10 },
  registerButton: { borderRadius: 16, overflow: 'hidden', marginTop: 10, marginBottom: 30 },
  disabledButton: { opacity: 0.7 },
  registerButtonGradient: { paddingVertical: 18, alignItems: 'center' },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  registerButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  loginContainer: { flexDirection: 'row', justifyContent: 'center' },
  loginText: { fontSize: 15, color: '#6b7280' },
  loginLink: { fontSize: 15, color: '#8b5cf6', fontWeight: 'bold' },
});

export default RegisterScreen;