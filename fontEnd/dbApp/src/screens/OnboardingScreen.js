import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const pages = [
  {
    gradient: ['#6366f1', '#8b5cf6'],
    icon: '🏸',
    title: 'Welcome to Georgies',
    subtitle: 'Book premium badminton courts\nanytime, anywhere',
    features: [
      '✓ Multiple court locations',
      '✓ Flexible time slots',
      '✓ Instant booking',
    ],
  },
  {
    gradient: ['#8b5cf6', '#ec4899'],
    icon: '📅',
    title: 'Easy Booking',
    subtitle: 'Select your preferred date,\ntime and court',
    features: [
      '✓ Real-time availability',
      '✓ Book for day or week',
      '✓ 10:00 AM - 10:00 PM',
    ],
  },
  {
    gradient: ['#ec4899', '#f43f5e'],
    icon: '💳',
    title: 'Flexible Plans',
    subtitle: 'Choose the plan that\nfits your needs',
    features: [
      '✓ Monthly subscription',
      '✓ Quarterly savings',
      '✓ Yearly best value',
    ],
  },
];

// Memoized feature list component
const FeatureList = React.memo(({ features }) => (
  <View style={styles.featuresContainer}>
    {features.map((feature, index) => (
      <View key={index} style={styles.featureRow}>
        <Text style={styles.featureText}>{feature}</Text>
      </View>
    ))}
  </View>
));

// Memoized page indicators component
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

  // Memoized current page data
  const currentPageData = useMemo(() => pages[currentPage], [currentPage]);

  // Memoized button text
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
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{currentPageData.icon}</Text>
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
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  icon: {
    fontSize: 70,
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
    maxWidth: 300,
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
