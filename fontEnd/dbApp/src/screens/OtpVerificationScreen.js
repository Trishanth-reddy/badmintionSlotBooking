import React, { useState, useRef, useEffect, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import api from '../../api/axiosConfig';

const OtpVerificationScreen = ({ route, navigation }) => {
  const authContext = useContext(AuthContext);
  
  // ✅ FIX 1: Extract the FULL payload passed from RegisterScreen
  // We need password and fullName to complete the registration.
  const { payload } = route.params; 
  const { email, fullName, password } = payload; 

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const inputs = useRef([]);

  // Countdown Timer
  useEffect(() => {
    if (countdown === 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Handle OTP Input
  const handleOtpChange = (text, index) => {
    if (text.length > 1 && text.length === 6) {
      const newOtp = text.split('');
      setOtp(newOtp);
      inputs.current[5]?.focus();
      return;
    }
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
    if (!text && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  // Handle Verification (The Main Fix)
  const handleVerify = async () => {
    const enteredOtp = otp.join('');
    if (enteredOtp.length !== 6) {
      Alert.alert("Error", "Please enter the complete 6-digit OTP");
      return;
    }

    setLoading(true);

    try {
      // ✅ FIX 2: Call '/register' with ALL user data
      // This matches your backend: router.post('/register', register);
      const response = await api.post('/auth/register', {
        fullName,
        email,
        password,
        otp: enteredOtp, // The code the user just typed
      });

      setLoading(false);

      // Save token and user data
      if (response.data.token && response.data.user) {
        await AsyncStorage.setItem('userToken', response.data.token);
        await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));

        if (authContext && authContext.signIn) {
          await authContext.signIn(response.data.token, response.data.user);
        }

        Alert.alert("Success", "Account created successfully!");
      }
    } catch (error) {
      setLoading(false);
      console.error("Verification error:", error.response?.data);

      const errorMessage = error.response?.data?.message || "Invalid or expired OTP";
      Alert.alert("Verification Error", errorMessage);
    }
  };

  // Handle Resend OTP
  const handleResend = async () => {
    setResendLoading(true);
    setCountdown(60);

    try {
      // ✅ FIX 3: Use the correct route '/send-register-otp'
      // Your backend doesn't have '/resend-otp', it reuses the send endpoint.
      await api.post('/auth/send-register-otp', {
        email,
      });

      setResendLoading(false);
      Alert.alert("New OTP Sent", "A new code has been sent to your email.");

    } catch (error) {
      setResendLoading(false);
      setCountdown(0);
      const errorMessage = error.response?.data?.message || "Could not resend OTP";
      Alert.alert("Error", errorMessage);
    }
  };

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
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verify Your Email</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.welcomeContainer}>
            <View style={styles.iconBg}>
              <MaterialIcons name="phonelink-lock" size={60} color="#fff" />
            </View>
            <Text style={styles.welcomeTitle}>Enter OTP</Text>
            <Text style={styles.welcomeSubtitle}>
              A 6-digit code was sent to:
            </Text>
            <Text style={styles.phoneText}>{email}</Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  style={styles.otpInput}
                  keyboardType="number-pad"
                  maxLength={1} // Changed to 1 to prevent double paste issues, logic handles paste separately
                  onChangeText={(text) => handleOtpChange(text, index)}
                  value={digit}
                  ref={(ref) => (inputs.current[index] = ref)}
                  editable={!loading}
                  selectTextOnFocus={true}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
              onPress={handleVerify}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#8b5cf6', '#ec4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.verifyButtonGradient}
              >
                {loading ? (
                  <>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.verifyButtonText}>Creating Account...</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.verifyButtonText}>Verify & Create Account</Text>
                    <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive the code? </Text>
              {countdown > 0 ? (
                <Text style={styles.countdownText}>
                  Resend in {countdown}s
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResend} disabled={resendLoading}>
                  <Text style={styles.resendLink}>
                    {resendLoading ? "Sending..." : "Resend OTP"}
                  </Text>
                </TouchableOpacity>
              )}
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
  scrollContent: { paddingBottom: 30 },
  welcomeContainer: {
    paddingHorizontal: 30,
    alignItems: 'center',
    marginBottom: 30,
  },
  iconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
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
    textAlign: 'center',
    lineHeight: 24,
  },
  phoneText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginTop: 8,
  },
  formCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 25,
    paddingTop: 35,
    paddingBottom: 40,
    minHeight: 400,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
    backgroundColor: '#f5f5f5',
  },
  verifyButton: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  verifyButtonDisabled: { opacity: 0.7 },
  verifyButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    fontSize: 15,
    color: '#666',
  },
  countdownText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '600',
  },
  resendLink: {
    fontSize: 15,
    color: '#8b5cf6',
    fontWeight: 'bold',
  },
});

export default OtpVerificationScreen;