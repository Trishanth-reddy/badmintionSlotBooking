import React, { useState, useContext, useCallback, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../../App';
import api from '../../api/axiosConfig';

const LoginScreen = ({ navigation }) => {
  const authContext = useContext(AuthContext);
  
  // State for Phone and Password
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Focus management
  const passwordInputRef = useRef(null);

  const handleLogin = useCallback(async () => {
    // 1. Clean the input (remove spaces or special characters)
    const phoneDigits = phone.trim();

    // 2. Validation: Strict 10-digit check
    if (phoneDigits.length !== 10) {
      Alert.alert('Invalid Input', 'Please enter a valid 10-digit phone number');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Invalid Input', 'Please enter your password');
      return;
    }

    setLoading(true);

    try {
      // 3. API Call: Ensure we send 'phone', NOT 'email'
      const response = await api.post('/auth/login', {
        phone: phoneDigits,
        password: password.trim(),
      });

      // 4. Save Token and User Data
      await Promise.all([
        AsyncStorage.setItem('userToken', response.data.token),
        AsyncStorage.setItem('userData', JSON.stringify(response.data.user)),
      ]);

      // 5. Update Global Auth Context
      if (authContext?.signIn) {
        await authContext.signIn(response.data.token, response.data.user);
      }

      const welcomeMsg = response.data.user.role === 'admin' 
        ? 'Welcome back, Admin! 👑' 
        : 'Welcome back to CourtBook! 🏸';
      
      Alert.alert('Success', welcomeMsg);

    } catch (error) {
      console.error('Login Error:', error.response?.data);
      // This picks up the "Invalid email" error from the backend if your backend is still checking for email
      const errorMessage = error.response?.data?.message || 'Invalid phone or password';
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [phone, password, authContext]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <LinearGradient
        colors={['#6366f1', '#8b5cf6', '#ec4899']}
        style={styles.gradient}
      >
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.welcomeContainer}>
            <View style={styles.iconBg}>
              <MaterialIcons name="sports-tennis" size={60} color="#fff" />
            </View>
            <Text style={styles.welcomeTitle}>Welcome Back!</Text>
            <Text style={styles.welcomeSubtitle}>
              Log in with your registered phone number
            </Text>
          </View>

          <View style={styles.formCard}>
            {/* Phone Input Field */}
            <View style={styles.inputContainer}>
              <MaterialIcons name="phone" size={22} color="#8b5cf6" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Phone Number (10 digits)"
                placeholderTextColor="#999"
                value={phone}
                onChangeText={(text) => setPhone(text.replace(/\D/g, '').slice(0, 10))}
                keyboardType="phone-pad"
                editable={!loading}
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
              />
            </View>

            {/* Password Input Field */}
            <View style={styles.inputContainer}>
              <MaterialIcons name="lock-outline" size={22} color="#8b5cf6" style={styles.inputIcon} />
              <TextInput
                ref={passwordInputRef}
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <MaterialIcons
                  name={showPassword ? 'visibility' : 'visibility-off'}
                  size={22}
                  color="#999"
                />
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <LinearGradient
                colors={['#8b5cf6', '#ec4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginButtonGradient}
              >
                {loading ? (
                  <View style={styles.loaderRow}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.loginButtonText}>Processing...</Text>
                  </View>
                ) : (
                  <View style={styles.loginButtonContent}>
                    <Text style={styles.loginButtonText}>Log In</Text>
                    <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.signupLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  scrollContent: { paddingBottom: 30 },
  welcomeContainer: {
    alignItems: 'center',
    paddingHorizontal: 30,
    marginBottom: 30,
  },
  iconBg: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  welcomeTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
  welcomeSubtitle: { fontSize: 15, color: 'rgba(255, 255, 255, 0.9)', textAlign: 'center' },
  formCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    paddingHorizontal: 25, paddingTop: 40, paddingBottom: 50,
    minHeight: 500,
  },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8f9fa', borderRadius: 15,
    paddingHorizontal: 15, marginBottom: 20,
    borderWidth: 1, borderColor: '#eee',
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 15, fontSize: 16, color: '#333' },
  eyeIcon: { padding: 5 },
  loginButton: { borderRadius: 15, overflow: 'hidden', marginTop: 10, marginBottom: 25 },
  loginButtonGradient: { paddingVertical: 18, alignItems: 'center' },
  loginButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loginButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  loginButtonDisabled: { opacity: 0.8 },
  signupContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  signupText: { fontSize: 15, color: '#666' },
  signupLink: { fontSize: 15, color: '#8b5cf6', fontWeight: 'bold' },
});

export default LoginScreen;