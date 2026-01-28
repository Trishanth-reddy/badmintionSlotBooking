import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
  ImageBackground
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';

const ContactScreen = ({ navigation }) => {
  
  // --- CONFIGURATION ---
  const FACILITY_PHONE = '+919876543200'; 
  const FACILITY_EMAIL = 'admin@courtbook.com';
  const FACILITY_ADDRESS = 'Kumarakom, Kerala 686563'; 
  
  const LATITUDE = 9.598472;
  const LONGITUDE = 76.433219;
  const LABEL = 'Badminton Court';

  const WHATSAPP_MSG = 'Hi, I have a query regarding badminton court booking.';

  // --- ACTIONS ---
  const handleCall = () => {
    Linking.openURL(`tel:${FACILITY_PHONE}`);
  };

  const handleWhatsApp = () => {
    let url = `whatsapp://send?text=${WHATSAPP_MSG}&phone=${FACILITY_PHONE}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://wa.me/${FACILITY_PHONE}?text=${WHATSAPP_MSG}`);
    });
  };

  const handleEmail = () => {
    Linking.openURL(`mailto:${FACILITY_EMAIL}`);
  };

  const handleMaps = () => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${LATITUDE},${LONGITUDE}`;
    
    const url = Platform.select({
      ios: `${scheme}${LABEL}@${latLng}`,
      android: `${scheme}${latLng}(${LABEL})`
    });

    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Support</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* HERO SECTION */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconBox}>
             <MaterialIcons name="support-agent" size={48} color="#8b5cf6" />
          </View>
          <Text style={styles.heroTitle}>Here to Help!</Text>
          <Text style={styles.heroSubtitle}>
            Have questions about bookings, memberships, or tournaments? Reach out to us directly.
          </Text>
        </View>

        {/* QUICK ACTIONS */}
        <Text style={styles.sectionTitle}>Get in Touch</Text>
        
        <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionCard} onPress={handleCall} activeOpacity={0.7}>
            <View style={[styles.iconBox, { backgroundColor: '#dcfce7' }]}>
                <MaterialIcons name="phone" size={24} color="#16a34a" />
            </View>
            <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Call Us</Text>
                <Text style={styles.actionSub}>{FACILITY_PHONE}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#d1d5db" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={handleWhatsApp} activeOpacity={0.7}>
            <View style={[styles.iconBox, { backgroundColor: '#dbeafe' }]}>
                <FontAwesome name="whatsapp" size={24} color="#2563eb" />
            </View>
            <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>WhatsApp</Text>
                <Text style={styles.actionSub}>Chat with Admin</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#d1d5db" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={handleEmail} activeOpacity={0.7}>
            <View style={[styles.iconBox, { backgroundColor: '#fae8ff' }]}>
                <MaterialIcons name="email" size={24} color="#d946ef" />
            </View>
            <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Email Support</Text>
                <Text style={styles.actionSub}>{FACILITY_EMAIL}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#d1d5db" />
            </TouchableOpacity>
        </View>

        {/* LOCATION WITH MAP PREVIEW */}
        <Text style={styles.sectionTitle}>Visit Us</Text>
        <TouchableOpacity style={styles.locationCard} onPress={handleMaps} activeOpacity={0.9}>
          <ImageBackground 
            source={{ uri: '../../assets/Top.jpeg' }} 
            style={styles.mapPreview}
            imageStyle={{ opacity: 0.8 }}
          >
             <View style={styles.mapOverlay} />
             <View style={styles.mapPinCircle}>
                <MaterialIcons name="location-on" size={28} color="#ef4444" />
             </View>
          </ImageBackground>
          
          <View style={styles.locationContent}>
            <Text style={styles.locationTitle}>Badminton Arena</Text>
            <Text style={styles.locationAddress}>{FACILITY_ADDRESS}</Text>
            <View style={styles.locationAction}>
                <Text style={styles.locationTap}>Tap to view on Google Maps</Text>
                <MaterialIcons name="open-in-new" size={16} color="#8b5cf6" />
            </View>
          </View>
        </TouchableOpacity>

      </ScrollView>
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
  content: { padding: 20, paddingBottom: 50 },
  
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  heroIconBox: {
      width: 80, height: 80, borderRadius: 40, backgroundColor: '#f3e8ff',
      justifyContent: 'center', alignItems: 'center', marginBottom: 16
  },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#1f2937', marginBottom: 8 },
  heroSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 12, marginLeft: 4 },
  
  actionGrid: { marginBottom: 24 },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f3f4f6'
  },
  iconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  actionContent: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  actionSub: { fontSize: 13, color: '#6b7280', marginTop: 2, fontWeight: '500' },

  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#f3f4f6'
  },
  mapPreview: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
  },
  mapOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.05)' },
  mapPinCircle: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: 'white',
      justifyContent: 'center', alignItems: 'center',
      shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 5
  },
  locationContent: { padding: 20 },
  locationTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  locationAddress: { fontSize: 14, color: '#6b7280', marginTop: 4, marginBottom: 16, lineHeight: 20 },
  locationAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationTap: { fontSize: 14, color: '#8b5cf6', fontWeight: '600' },
});

export default ContactScreen;