  import React, { useState, useContext, useCallback } from "react";
  import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
  import { LinearGradient } from 'expo-linear-gradient';
  import { MaterialIcons } from '@expo/vector-icons';
  import AsyncStorage from '@react-native-async-storage/async-storage';
  import { AuthContext } from '../../App';
  import api from '../../api/axiosConfig';

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const InputField = React.memo(({ icon, placeholder, value, onChangeText, ...props }) => (
    <View style={styles.inputContainer}>
      <MaterialIcons name={icon} size={20} color="#8b5cf6" style={styles.inputIcon} />
      <TextInput style={styles.input} placeholder={placeholder} placeholderTextColor="#999" value={value} onChangeText={onChangeText} {...props} />
      {props.showToggle && (
        <TouchableOpacity onPress={props.onToggleShow} style={styles.eyeIcon}>
          <MaterialIcons name={props.showPassword ? "visibility" : "visibility-off"} size={20} color="#999" />
        </TouchableOpacity>
      )}
    </View>
  ));

  const RegisterScreen = ({ navigation }) => {
    const authContext = useContext(AuthContext);
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleRegister = useCallback(async () => {
      const phoneDigits = phone.replace(/\D/g, '');

      if (!fullName.trim() || phoneDigits.length !== 10 || !password.trim()) {
        Alert.alert("Error", "Please fill in all mandatory fields correctly");
        return;
      }

      if (email.trim() && !EMAIL_REGEX.test(email)) {
        Alert.alert("Error", "Please enter a valid email or leave it blank");
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
          phone: phoneDigits,
          email: email.trim() || undefined,
          password
        });

        await Promise.all([
          AsyncStorage.setItem('userToken', response.data.token),
          AsyncStorage.setItem('userData', JSON.stringify(response.data.user)),
        ]);

        if (authContext?.signIn) authContext.signIn(response.data.token, response.data.user);
        Alert.alert("Success", "Welcome to CourtBook!");
      } catch (error) {
        Alert.alert("Error", error.response?.data?.message || "Registration failed");
      } finally {
        setLoading(false);
      }
    }, [fullName, phone, email, password, confirmPassword, authContext]);

    return (
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
        <LinearGradient colors={['#6366f1', '#8b5cf6', '#ec4899']} style={styles.gradient}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}><MaterialIcons name="arrow-back" size={28} color="#fff" /></TouchableOpacity>
            <Text style={styles.headerTitle}>Create Account</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeTitle}>Join CourtBook</Text>
              <Text style={styles.welcomeSubtitle}>Start booking badminton courts today</Text>
            </View>

            <View style={styles.formCard}>
              <InputField icon="person-outline" placeholder="Full Name *" value={fullName} onChangeText={setFullName} />
              <InputField icon="phone" placeholder="Phone Number * (10 digits)" value={phone} onChangeText={(text) => setPhone(text.replace(/\D/g, ''))} keyboardType="phone-pad" maxLength={10} />
              <InputField icon="email" placeholder="Email (Optional)" value={email} onChangeText={setEmail} keyboardType="email-address" />
              <InputField icon="lock-outline" placeholder="Password *" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} showToggle onToggleShow={() => setShowPassword(!showPassword)} showPassword={showPassword} />
              <InputField icon="lock-outline" placeholder="Confirm Password *" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} />

              <TouchableOpacity style={[styles.registerButton, loading && styles.registerButtonDisabled]} onPress={handleRegister} disabled={loading}>
                <LinearGradient colors={['#8b5cf6', '#ec4899']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.registerButtonGradient}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.registerButtonText}>Create Account</Text>}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate("Login")}><Text style={styles.loginLink}>Log In</Text></TouchableOpacity>
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
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    headerSpacer: { width: 28 },
    scrollContent: { paddingBottom: 30 },
    welcomeContainer: { paddingHorizontal: 30, marginBottom: 30, alignItems: 'center' },
    welcomeTitle: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
    welcomeSubtitle: { fontSize: 16, color: 'rgba(255, 255, 255, 0.9)' },
    formCard: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 25, paddingTop: 35, paddingBottom: 40, minHeight: 600 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 15, paddingHorizontal: 15, marginBottom: 16, borderWidth: 1, borderColor: '#e0e0e0' },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, paddingVertical: 16, fontSize: 16, color: '#333' },
    eyeIcon: { padding: 5 },
    registerButton: { borderRadius: 15, overflow: 'hidden', marginTop: 10, marginBottom: 20 },
    registerButtonGradient: { paddingVertical: 18, alignItems: 'center' },
    registerButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    loginContainer: { flexDirection: 'row', justifyContent: 'center' },
    loginLink: { color: '#8b5cf6', fontWeight: 'bold' },
    // ... Login specific styles (iconBg, etc) can be merged here
    iconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 15 }
  });

  export default RegisterScreen;