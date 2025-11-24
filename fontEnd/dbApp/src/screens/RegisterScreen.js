import React, { useState, useContext, useCallback, useMemo } from "react";
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
  ActivityIndicator
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../../App';
import api from '../../api/axiosConfig';

// Email regex outside component
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Memoized input field component
const InputField = React.memo(({ 
  icon, 
  placeholder, 
  value, 
  onChangeText, 
  keyboardType = 'default',
  autoCapitalize = 'none',
  secureTextEntry = false,
  showToggle = false,
  onToggleShow,
  showPassword = false,
  disabled = false,
  maxLength
}) => (
  <View style={styles.inputContainer}>
    <MaterialIcons name={icon} size={20} color="#8b5cf6" style={styles.inputIcon} />
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor="#999"
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      secureTextEntry={secureTextEntry}
      editable={!disabled}
      maxLength={maxLength}
      autoCorrect={false}
    />
    {showToggle && (
      <TouchableOpacity onPress={onToggleShow} style={styles.eyeIcon} activeOpacity={0.7}>
        <MaterialIcons
          name={showPassword ? "visibility" : "visibility-off"}
          size={20}
          color="#999"
        />
      </TouchableOpacity>
    )}
  </View>
));

// Memoized terms section
const TermsSection = React.memo(() => (
  <View style={styles.termsContainer}>
    <MaterialIcons name="info-outline" size={16} color="#666" />
    <Text style={styles.termsText}>
      By signing up, you agree to our{' '}
      <Text style={styles.termsLink}>Terms & Conditions</Text>
      {' '}and{' '}
      <Text style={styles.termsLink}>Privacy Policy</Text>
    </Text>
  </View>
));

const RegisterScreen = ({ navigation }) => {
  const authContext = useContext(AuthContext);
  
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Memoized phone handler
  const handlePhoneChange = useCallback((text) => {
    const digits = text.replace(/\D/g, '').slice(0, 10);
    setPhone(digits);
  }, []);

  const toggleShowPassword = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  const toggleShowConfirmPassword = useCallback(() => {
    setShowConfirmPassword(prev => !prev);
  }, []);

  const handleRegister = useCallback(async () => {
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      Alert.alert("Error", "Please enter a valid 10-digit phone number");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/register', {
        fullName,
        email,
        phone: phoneDigits,
        password,
      });

      // Parallel AsyncStorage operations
      await Promise.all([
        AsyncStorage.setItem('userToken', response.data.token),
        AsyncStorage.setItem('userData', JSON.stringify(response.data.user)),
      ]);

      if (authContext?.signIn) {
        authContext.signIn(response.data.token, response.data.user);
      }

      Alert.alert(
        "Success",
        "Account created successfully!",
        [{ text: "Continue" }]
      );
    } catch (error) {
      console.error("Registration error:", error);
      const errorMessage = error.response?.data?.message || error.message || "Could not connect to the server";
      Alert.alert("Registration Error", errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fullName, email, phone, password, confirmPassword, authContext]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const navigateToLogin = useCallback(() => {
    navigation.navigate("Login");
  }, [navigation]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <LinearGradient
        colors={['#6366f1', '#8b5cf6', '#ec4899']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleGoBack}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Account</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={false}
        >
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>Join CourtBook</Text>
            <Text style={styles.welcomeSubtitle}>
              Create your account to start booking badminton courts
            </Text>
          </View>

          <View style={styles.formCard}>
            <InputField
              icon="person-outline"
              placeholder="Full Name"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              disabled={loading}
            />

            <InputField
              icon="email"
              placeholder="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              disabled={loading}
            />

            <InputField
              icon="phone"
              placeholder="Phone Number (10 digits)"
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              maxLength={10}
              disabled={loading}
            />

            <InputField
              icon="lock-outline"
              placeholder="Password (min. 8 characters)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              showToggle={true}
              showPassword={showPassword}
              onToggleShow={toggleShowPassword}
              disabled={loading}
            />

            <InputField
              icon="lock-outline"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              showToggle={true}
              showPassword={showConfirmPassword}
              onToggleShow={toggleShowConfirmPassword}
              disabled={loading}
            />

            <TermsSection />

            <TouchableOpacity
              style={[styles.registerButton, loading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#8b5cf6', '#ec4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.registerButtonGradient}
              >
                {loading ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.registerButtonText}>Creating Account...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.registerButtonText}>Create Account</Text>
                    <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={navigateToLogin} activeOpacity={0.7}>
                <Text style={styles.loginLink}>Log In</Text>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSpacer: {
    width: 28,
  },
  scrollContent: { paddingBottom: 30 },
  welcomeContainer: {
    paddingHorizontal: 30,
    marginBottom: 30,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 24,
  },
  formCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 25,
    paddingTop: 35,
    paddingBottom: 40,
    minHeight: 700,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
    paddingHorizontal: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: { padding: 5 },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingHorizontal: 5,
  },
  termsText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  termsLink: {
    color: '#8b5cf6',
    fontWeight: '600',
  },
  registerButton: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  registerButtonDisabled: { opacity: 0.7 },
  registerButtonGradient: {
    paddingVertical: 18,
  },
  buttonContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 15,
    color: '#666',
  },
  loginLink: {
    fontSize: 15,
    color: '#8b5cf6',
    fontWeight: 'bold',
  },
});

export default RegisterScreen;
