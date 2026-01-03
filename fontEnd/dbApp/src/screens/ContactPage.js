import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

const { width } = Dimensions.get('window');

const contactInfo = [
  {
    id: 1,
    icon: 'phone',
    title: 'Phone',
    value: '+91 98765 43210',
    color: '#8b5cf6',
    action: 'phone',
  },
  {
    id: 2,
    icon: 'email',
    title: 'Email',
    value: 'support@Georgies.com',
    color: '#ec4899',
    action: 'email',
  },
  {
    id: 3,
    icon: 'location-on',
    title: 'Address',
    value: 'Hyderabad Sports Complex\nHyderabad, Telangana 500001',
    color: '#f43f5e',
    action: 'location',
  },
  {
    id: 4,
    icon: 'access-time',
    title: 'Operating Hours',
    value: '6:00 AM - 10:00 PM Daily',
    color: '#06b6d4',
    action: null,
  },
];

const socialLinks = [
  {
    id: 1,
    icon: 'facebook',
    name: 'Facebook',
    url: 'https://facebook.com/courtbookapp',
    color: '#4267B2',
    emoji: '📘',
  },
  {
    id: 2,
    icon: 'instagram',
    name: 'Instagram',
    url: 'https://instagram.com/courtbookapp',
    color: '#E1306C',
    emoji: '📷',
  },
  {
    id: 3,
    icon: 'twitter',
    name: 'Twitter',
    url: 'https://twitter.com/courtbookapp',
    color: '#1DA1F2',
    emoji: '𝕏',
  },
  {
    id: 4,
    icon: 'language',
    name: 'Website',
    url: 'https://www.courtbook.com',
    color: '#8b5cf6',
    emoji: '🌐',
  },
];

const faqData = [
  {
    id: 1,
    question: 'What are your operating hours?',
    answer: "We're open 6:00 AM - 10:00 PM daily",
  },
  {
    id: 2,
    question: 'Can I cancel my booking?',
    answer: 'Yes, free cancellation up to 2 hours before',
  },
  {
    id: 3,
    question: 'How do I make a payment?',
    answer: 'We accept bank transfers and online payments',
  },
];

// Memoized contact card component
const ContactCard = React.memo(({ item, onPress }) => (
  <TouchableOpacity
    style={styles.contactCard}
    onPress={() => item.action && onPress(item.action, item.value)}
    disabled={!item.action}
    activeOpacity={item.action ? 0.7 : 1}
  >
    <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
      <MaterialIcons name={item.icon} size={24} color={item.color} />
    </View>
    <View style={styles.contactContent}>
      <Text style={styles.contactTitle}>{item.title}</Text>
      <Text style={styles.contactValue}>{item.value}</Text>
    </View>
    {item.action && (
      <MaterialIcons name="chevron-right" size={24} color="#d1d5db" />
    )}
  </TouchableOpacity>
));

// Memoized social card component
const SocialCard = React.memo(({ social, onPress }) => (
  <TouchableOpacity
    style={[styles.socialCard, { borderColor: social.color }]}
    onPress={() => onPress(social.url)}
    activeOpacity={0.7}
  >
    <Text style={styles.socialIcon}>{social.emoji}</Text>
    <Text style={styles.socialName}>{social.name}</Text>
  </TouchableOpacity>
));

// Memoized FAQ item component
const FAQItem = React.memo(({ item }) => (
  <View style={styles.faqItem}>
    <MaterialIcons name="help" size={20} color="#8b5cf6" />
    <View style={styles.faqContent}>
      <Text style={styles.faqQuestion}>{item.question}</Text>
      <Text style={styles.faqAnswer}>{item.answer}</Text>
    </View>
  </View>
));

// Memoized hero section
const HeroSection = React.memo(() => (
  <View style={styles.heroSection}>
    <MaterialIcons name="help-outline" size={48} color="#8b5cf6" />
    <Text style={styles.heroTitle}>Get in Touch</Text>
    <Text style={styles.heroSubtitle}>
      We're here to help and answer any question you might have
    </Text>
  </View>
));

const ContactPage = ({ navigation }) => {
  const handleContactAction = useCallback(async (action, value) => {
    switch (action) {
      case 'phone':
        Linking.openURL(`tel:${value}`);
        break;
      case 'email':
        Linking.openURL(`mailto:${value}`);
        break;
      case 'copy':
        await Clipboard.setStringAsync(value);
        Alert.alert('Copied', `${value} copied to clipboard`);
        break;
      case 'location':
        Linking.openURL('https://maps.google.com/?q=Hyderabad+Sports+Complex');
        break;
      default:
        break;
    }
  }, []);

  const openLink = useCallback(async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Could not open link');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open link');
    }
  }, []);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Memoized specific contact handlers
  const handleCallUs = useCallback(() => {
    handleContactAction('phone', '+91 98765 43210');
  }, [handleContactAction]);

  const handleEmailUs = useCallback(() => {
    handleContactAction('email', 'support@courtbook.com');
  }, [handleContactAction]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <TouchableOpacity
          onPress={handleGoBack}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Us</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        removeClippedSubviews={false}
      >
        <HeroSection />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          {contactInfo.map((item) => (
            <ContactCard
              key={item.id}
              item={item}
              onPress={handleContactAction}
            />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Contact</Text>
          <View style={styles.buttonGrid}>
            <TouchableOpacity
              style={styles.quickButton}
              onPress={handleCallUs}
              activeOpacity={0.8}
            >
              <MaterialIcons name="phone-in-talk" size={28} color="#fff" />
              <Text style={styles.quickButtonText}>Call Us</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickButton}
              onPress={handleEmailUs}
              activeOpacity={0.8}
            >
              <MaterialIcons name="mail-outline" size={28} color="#fff" />
              <Text style={styles.quickButtonText}>Email Us</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Follow Us</Text>
          <View style={styles.socialGrid}>
            {socialLinks.map((social) => (
              <SocialCard
                key={social.id}
                social={social}
                onPress={openLink}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {faqData.map((item) => (
            <FAQItem key={item.id} item={item} />
          ))}
        </View>

        <View style={styles.messageSection}>
          <MaterialIcons name="mail-outline" size={32} color="#8b5cf6" />
          <Text style={styles.messageTitle}>Send Us a Message</Text>
          <Text style={styles.messageText}>
            Can't find what you're looking for? Send us a message and our team
            will get back to you within 24 hours.
          </Text>
          <TouchableOpacity
            style={styles.messageButton}
            onPress={handleEmailUs}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#8b5cf6', '#ec4899']}
              style={styles.messageButtonGradient}
            >
              <Text style={styles.messageButtonText}>Send Message</Text>
              <MaterialIcons name="send" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
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
    width: 40,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 12,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
  contactValue: {
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '600',
    marginTop: 2,
  },
  buttonGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickButton: {
    flex: 1,
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  quickButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  socialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  socialCard: {
    width: (width - 52) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  socialIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  socialName: {
    fontSize: 13,
    color: '#1f2937',
    fontWeight: '600',
  },
  faqItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  faqContent: {
    flex: 1,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  faqAnswer: {
    fontSize: 12,
    color: '#9ca3af',
  },
  messageSection: {
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  messageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 12,
  },
  messageText: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  messageButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  messageButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export default ContactPage;
