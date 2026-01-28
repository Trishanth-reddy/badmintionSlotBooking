import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// --- UPDATED DATA BASED ON CHAT HISTORY ---
const pages = [
  {
    gradient: ['#6366f1', '#8b5cf6'], // Indigo/Purple
    title: 'Welcome to Georgies',
    subtitle: 'Premium Synthetic Courts\nin Kumarakom',
    features: [
      '✓ 2 Professional Synthetic Courts',
      '✓ Open Daily: 5:00 AM - 10:00 PM',
      '✓ Parking, Lockers & Amenities',
    ],
  },
  {
    gradient: ['#ec4899', '#f43f5e'], // Pink/Red (High Energy for Final Slide)
    title: 'Join the Community',
    subtitle: 'Affordable memberships\nstarting at ₹500',
    features: [
      '✓ Regular (₹800) & Student (₹500) Plans',
      '✓ Daily 1-Hour Play Slots',
      '✓ Instant Booking & Slot Management',
    ],
  },
];

const FeatureList = React.memo(({ features }) => (
  <View style={styles.featuresContainer}>
    {features.map((feature, index) => (
      <View key={index} style={styles.featureRow}>
        <Text style={styles.featureText}>{feature}</Text>
      </View>
    ))}
  </View>
));

const PageIndicators = React.memo(({ currentPage, totalPages }) => (
  <View style={styles.indicatorContainer}>
    {Array.from({ length: totalPages }).map((_, index) => (
      <View
        key={index}
        style={[
          styles.indicator,
          currentPage === index
            ? styles.activeIndicator
            : styles.inactiveIndicator,
        ]}
      />
    ))}
  </View>
));

const OnboardingScreen = () => {
  const navigation = useNavigation();
  const [currentPage, setCurrentPage] = useState(0);

  const currentPageData = useMemo(() => pages[currentPage], [currentPage]);

  const buttonText = useMemo(
    () => (currentPage === pages.length - 1 ? 'Get Started' : 'Next'),
    [currentPage]
  );

  const handleNext = useCallback(() => {
    if (currentPage < pages.length - 1) {
      setCurrentPage((prev) => prev + 1);
    } else {
      navigation.replace('Register');
    }
  }, [currentPage, navigation]);

  const handleSkip = useCallback(() => {
    navigation.replace('Register');
  }, [navigation]);

  return (
    <LinearGradient colors={currentPageData.gradient} style={styles.container}>
      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleSkip}
        activeOpacity={0.7}
      >
        <Text style={styles.skipText}>Skip →</Text>
      </TouchableOpacity>

      <View style={styles.contentContainer}>
        
        {/* --- LOGO CONTAINER --- */}
        <View style={styles.iconContainer}>
           <Image 
             source={require('../../assets/logo.jpeg')} 
             style={styles.logoImage}
             resizeMode="contain"
           />
        </View>

        <Text style={styles.title}>{currentPageData.title}</Text>
        <Text style={styles.subtitle}>{currentPageData.subtitle}</Text>

        <FeatureList features={currentPageData.features} />
      </View>

      <PageIndicators currentPage={currentPage} totalPages={pages.length} />

      <TouchableOpacity
        style={styles.nextButton}
        onPress={handleNext}
        activeOpacity={0.8}
      >
        <Text style={styles.nextButtonText}>{buttonText}</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  skipButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  
  // Icon/Logo Container Styles
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#fff', 
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  logoImage: {
    width: 100,
    height: 100,
  },

  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 40,
  },
  featuresContainer: {
    width: '100%',
    maxWidth: 320, // Slightly wider to fit the text
  },
  featureRow: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  featureText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
    textAlign: 'center',
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeIndicator: {
    width: 32,
    backgroundColor: '#ffffff',
  },
  inactiveIndicator: {
    width: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  nextButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  nextButtonText: {
    color: '#8b5cf6',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});

export default OnboardingScreen;