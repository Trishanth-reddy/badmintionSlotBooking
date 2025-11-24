import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Alert,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const COURT_CARD_HEIGHT = 170;

// Static Data (In prod, fetch from API if needed, but static is fastest)
const predefinedCourts = [
  { _id: '69086b372af5aa7c81d55348', name: 'Court 1 - Premium', rating: 4.8, reviews: 245, pricePerHour: 499, features: ['AC', 'LED Lights', 'Professional'] },
  { _id: '69086b372af5aa7c81d55349', name: 'Court 2 - Standard', rating: 4.5, reviews: 189, pricePerHour: 399, features: ['AC', 'LED Lights'] },
];

const CourtCard = React.memo(({ item, isSelected, onSelect }) => (
  <TouchableOpacity
    style={[styles.courtCard, isSelected && styles.courtCardSelected]}
    onPress={() => onSelect(item)}
    activeOpacity={0.7}
  >
    <View style={styles.courtCardTop}>
      <View style={styles.courtImageContainer}>
        <Text style={styles.courtImage}>🏸</Text>
      </View>
      <View style={styles.courtHeaderInfo}>
        <Text style={styles.courtName}>{item.name}</Text>
        <View style={styles.ratingContainer}>
          <MaterialIcons name="star" size={16} color="#fbbf24" />
          <Text style={styles.ratingText}>{item.rating}</Text>
          <Text style={styles.reviewsText}>({item.reviews})</Text>
        </View>
      </View>
      <View style={styles.availableBadge}>
        <MaterialIcons name="check-circle" size={16} color="#16a34a" />
        <Text style={styles.availableText}>Available</Text>
      </View>
    </View>

    <View style={styles.featuresContainer}>
      {item.features?.map((feature, index) => (
        <View key={index} style={styles.featureBadge}>
          <Text style={styles.featureText}>{feature}</Text>
        </View>
      ))}
    </View>

    <View style={styles.courtCardBottom}>
      <Text style={styles.priceText}>₹{item.pricePerHour}/hour</Text>
      {isSelected && (
        <View style={styles.selectedCheckmark}>
          <MaterialIcons name="check-circle" size={24} color="#8b5cf6" />
        </View>
      )}
    </View>
  </TouchableOpacity>
));

const CourtSelectionScreen = ({ navigation }) => {
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [loading, setLoading] = useState(true); // Simulate load for smooth transition

  useEffect(() => {
    // Simulate fast load (100ms) to allow navigation animation to finish
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

  const getItemLayout = useCallback((data, index) => ({
    length: COURT_CARD_HEIGHT, offset: COURT_CARD_HEIGHT * index, index,
  }), []);

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
        getItemLayout={getItemLayout}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={2} 
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
  courtCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 2, borderColor: '#e5e7eb', elevation: 2 },
  courtCardSelected: { borderColor: '#8b5cf6', backgroundColor: '#f3e8ff' },
  courtCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  courtImageContainer: { width: 50, height: 50, borderRadius: 10, backgroundColor: '#f3e8ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  courtImage: { fontSize: 28 },
  courtHeaderInfo: { flex: 1 },
  courtName: { fontSize: 15, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 13, fontWeight: '600', color: '#1f2937' },
  reviewsText: { fontSize: 12, color: '#9ca3af' },
  availableBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4 },
  availableText: { fontSize: 12, fontWeight: '600', color: '#16a34a' },
  featuresContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  featureBadge: { backgroundColor: '#f3f4f6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  featureText: { fontSize: 11, color: '#6b7280', fontWeight: '500' },
  courtCardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  priceText: { fontSize: 15, fontWeight: 'bold', color: '#8b5cf6' },
  selectedCheckmark: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  continueButton: { borderRadius: 12, overflow: 'hidden', elevation: 6 },
  continueButtonDisabled: { opacity: 0.7 },
  continueButtonGradient: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, gap: 8 },
  continueButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});

export default CourtSelectionScreen;