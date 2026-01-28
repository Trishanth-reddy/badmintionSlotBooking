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
  Image
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import api from '../../api/axiosConfig';

const OtpVerificationScreen = ({ route, navigation }) => {
  const authContext = useContext(AuthContext);
  
  const { payload } = route.params; 
  const { email, fullName, password } = payload; 

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const inputs = useRef([]);

  useEffect(() => {
    if (countdown === 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

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

  const handleVerify = async () => {
    const enteredOtp = otp.join('');
    if (enteredOtp.length !== 6) {
      Alert.alert("Error", "Please enter the complete 6-digit OTP");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/register', {
        fullName,
        email,
        password,
        otp: enteredOtp,
      });

      setLoading(false);

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

  const handleResend = async () => {
    setResendLoading(true);
    setCountdown(60);

    try {
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
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          
          {/* --- 1. LOGO SECTION --- */}
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/logo.jpeg')} 
              style={styles.logo} 
              resizeMode="contain" 
            />
          </View>

          {/* --- 2. HEADER TEXT --- */}
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Verify Your Email</Text>
            <Text style={styles.subtitle}>Enter the code sent to {email}</Text>
          </View>

          {/* --- 3. INPUT FORM --- */}
          <View style={styles.formContainer}>
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  style={styles.otpInput}
                  keyboardType="number-pad"
                  maxLength={1}
                  onChangeText={(text) => handleOtpChange(text, index)}
                  value={digit}
                  ref={(ref) => (inputs.current[index] = ref)}
                  editable={!loading}
                  selectTextOnFocus={true}
                />
              ))}
            </View>

            <TouchableOpacity
              style={styles.verifyButton}
              onPress={handleVerify}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#6366f1', '#8b5cf6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.verifyButtonGradient}
              >
                {loading ? (
                  <View style={styles.btnContent}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.verifyButtonText}>Verifying...</Text>
                  </View>
                ) : (
                  <View style={styles.btnContent}>
                    <Text style={styles.verifyButtonText}>VERIFY</Text>
                    <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive code? </Text>
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
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff', // Full White Background
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingTop: 40,
    paddingBottom: 40,
  },
  
  // Logo Styles
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  logo: {
    width: 100,
    height: 100, 
  },

  // Header Styles
  headerContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
  },

  // Form Styles
  formContainer: {
    marginBottom: 20,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '600',
    color: '#1f2937',
    backgroundColor: '#f3f4f6',
  },

  // Button Styles
  verifyButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  verifyButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  // Resend Styles
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: '#6b7280',
  },
  countdownText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  resendLink: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: 'bold',
  },
});

export default OtpVerificationScreen;