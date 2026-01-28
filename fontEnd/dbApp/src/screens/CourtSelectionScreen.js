import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const COURT_CARD_HEIGHT = 220; 

// --- 1. COURT DATA WITH LOCAL IMAGES ---
const predefinedCourts = [
  { 
    _id: '69086b372af5aa7c81d55348', 
    name: 'Court 1', 
    // Use require() for local assets
    image: require('../../assets/Court1.jpeg') 
  },
  { 
    _id: '69086b372af5aa7c81d55349', 
    name: 'Court 2', 
    // Use require() for local assets
    image: require('../../assets/Court2.jpeg') 
  },
];

const CourtCard = React.memo(({ item, isSelected, onSelect }) => (
  <TouchableOpacity
    style={[styles.courtCard, isSelected && styles.courtCardSelected]}
    onPress={() => onSelect(item)}
    activeOpacity={0.9}
  >
    {/* Court Image: Passed directly as source (no {uri: ...}) */}
    <Image source={item.image} style={styles.courtImage} resizeMode="cover" />
    
    {/* Overlay for Selection State */}
    {isSelected && (
      <View style={styles.selectedOverlay}>
        <View style={styles.checkmarkCircle}>
           <MaterialIcons name="check" size={24} color="#fff" />
        </View>
      </View>
    )}

    {/* Court Details */}
    <View style={styles.courtDetails}>
      <View style={styles.courtHeader}>
        <Text style={styles.courtName}>{item.name}</Text>
        <View style={styles.availableBadge}>
          <MaterialIcons name="check-circle" size={14} color="#16a34a" />
          <Text style={styles.availableText}>Available</Text>
        </View>
      </View>      
      <Text style={styles.includedText}>Included in Membership</Text>
    </View>
  </TouchableOpacity>
));

const CourtSelectionScreen = ({ navigation }) => {
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleCourtSelect = useCallback((court) => setSelectedCourt(court), []);

  const handleContinue = useCallback(() => {
    if (!selectedCourt) {
      Alert.alert('Selection Required', 'Please select a court to continue');
      return;
    }
    navigation.navigate('TeamSelection', { selectedCourt });
  }, [selectedCourt, navigation]);

  if (loading) {
      return (
          <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8b5cf6" />
          </View>
      );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select a Court</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <FlatList
        data={predefinedCourts}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <CourtCard
            item={item}
            isSelected={selectedCourt?._id === item._id}
            onSelect={handleCourtSelect}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, !selectedCourt && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!selectedCourt}
        >
          <LinearGradient
            colors={selectedCourt ? ['#8b5cf6', '#ec4899'] : ['#d1d5db', '#d1d5db']}
            style={styles.continueButtonGradient}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <MaterialIcons name="arrow-forward" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSpacer: { width: 40 },
  
  listContent: { padding: 20, paddingBottom: 100 },
  
  // Updated Court Card Styles
  courtCard: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  courtCardSelected: { borderColor: '#8b5cf6' },
  
  courtImage: { width: '100%', height: 140, backgroundColor: '#e5e7eb' },
  
  selectedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(139, 92, 246, 0.2)', justifyContent: 'center', alignItems: 'center' },
  checkmarkCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#8b5cf6', justifyContent: 'center', alignItems: 'center', elevation: 5 },

  courtDetails: { padding: 16 },
  courtHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  courtName: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  
  availableBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  availableText: { fontSize: 12, fontWeight: 'bold', color: '#16a34a' },
  
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  ratingText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  
  includedText: { fontSize: 12, color: '#8b5cf6', fontWeight: '600', fontStyle: 'italic' },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  continueButton: { borderRadius: 12, overflow: 'hidden', elevation: 6 },
  continueButtonDisabled: { opacity: 0.7 },
  continueButtonGradient: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, gap: 8 },
  continueButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});

export default CourtSelectionScreen;