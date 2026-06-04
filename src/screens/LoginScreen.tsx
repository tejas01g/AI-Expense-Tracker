import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

// ─── Types ────────────────────────────────────────────────────────────────────
interface LoginScreenProps {
  onContinue?: (name: string, phone: string) => void;
  onBack?: () => void;
}

// ─── Country code picker data ─────────────────────────────────────────────────
const COUNTRY_CODE = '+91';
const FLAG = '🇮🇳';

// ─── Main Screen ──────────────────────────────────────────────────────────────
const LoginScreen: React.FC<LoginScreenProps> = ({ onContinue, onBack }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nameFocused, setNameFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const nameLabelAnim = useRef(new Animated.Value(0)).current;
  const phoneLabelAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Float label animation for name
  useEffect(() => {
    Animated.timing(nameLabelAnim, {
      toValue: nameFocused || name.length > 0 ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [nameFocused, name]);

  // Float label animation for phone
  useEffect(() => {
    Animated.timing(phoneLabelAnim, {
      toValue: phoneFocused || phone.length > 0 ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [phoneFocused, phone]);

  const validate = (): boolean => {
    let valid = true;
    if (name.trim().length < 2) {
      setNameError('Please enter your full name');
      valid = false;
    } else {
      setNameError('');
    }
    if (phone.replace(/\s/g, '').length < 10) {
      setPhoneError('Enter a valid 10-digit number');
      valid = false;
    } else {
      setPhoneError('');
    }
    return valid;
  };

  const handleContinue = () => {
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onContinue?.(name.trim(), phone.replace(/\s/g, ''));
    }, 800);
  };

  const isReady = name.trim().length >= 2 && phone.replace(/\s/g, '').length === 10;

  // Floating label interpolations
  const nameLabelTop = nameLabelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [17, 4],
  });
  const nameLabelSize = nameLabelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [15, 11],
  });
  const phoneLabelTop = phoneLabelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [17, 4],
  });
  const phoneLabelSize = phoneLabelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [15, 11],
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1560" />

      {/* Background gradient */}
      <LinearGradient
        colors={['#1A1560', '#1E1A70', '#16125A']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />

      {/* Depth circles */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={{ flex: 1, width: '100%' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={[
                styles.content,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              {/* Back button */}
              <TouchableOpacity
                onPress={onBack}
                activeOpacity={0.7}
                style={styles.backBtn}
              >
                <View style={styles.backIcon}>
                  <View style={styles.backArrow} />
                </View>
              </TouchableOpacity>

              {/* Header */}
              <View style={styles.header}>
                {/* Logo mark */}
                <View style={styles.logoMark}>
                  <LinearGradient
                    colors={['#A855F7', '#38BDF8']}
                    style={styles.logoGrad}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.logoIcon}>₹</Text>
                  </LinearGradient>
                </View>

                <Text style={styles.title}>Create account</Text>
                <Text style={styles.subtitle}>
                  Enter your details to get started
                </Text>
              </View>

              {/* Form */}
              <View style={styles.form}>

                {/* Name input */}
                <View style={styles.fieldWrapper}>
                  <View
                    style={[
                      styles.inputBox,
                      nameFocused && styles.inputBoxFocused,
                      nameError ? styles.inputBoxError : null,
                    ]}
                  >
                    {/* Floating label */}
                    <Animated.Text
                      style={[
                        styles.floatLabel,
                        {
                          top: nameLabelTop,
                          fontSize: nameLabelSize,
                          color: nameFocused
                            ? '#A855F7'
                            : nameError
                            ? '#F87171'
                            : 'rgba(255,255,255,0.45)',
                        },
                      ]}
                    >
                      Full name
                    </Animated.Text>

                    {/* Icon */}
                    <View style={styles.inputIconWrap}>
                      <View style={styles.personIcon}>
                        <View style={styles.personHead} />
                        <View style={styles.personBody} />
                      </View>
                    </View>

                    <TextInput
                      style={styles.input}
                      value={name}
                      onChangeText={(t) => {
                        setName(t);
                        if (nameError) setNameError('');
                      }}
                      onFocus={() => setNameFocused(true)}
                      onBlur={() => setNameFocused(false)}
                      autoCapitalize="words"
                      autoCorrect={false}
                      returnKeyType="next"
                      placeholderTextColor="transparent"
                    />
                  </View>
                  {nameError ? (
                    <Text style={styles.errorText}>{nameError}</Text>
                  ) : null}
                </View>

                {/* Phone input */}
                <View style={styles.fieldWrapper}>
                  <View
                    style={[
                      styles.inputBox,
                      phoneFocused && styles.inputBoxFocused,
                      phoneError ? styles.inputBoxError : null,
                    ]}
                  >
                    {/* Floating label */}
                    <Animated.Text
                      style={[
                        styles.floatLabel,
                        styles.floatLabelPhone,
                        {
                          top: phoneLabelTop,
                          fontSize: phoneLabelSize,
                          color: phoneFocused
                            ? '#A855F7'
                            : phoneError
                            ? '#F87171'
                            : 'rgba(255,255,255,0.45)',
                        },
                      ]}
                    >
                      Phone number
                    </Animated.Text>

                    {/* Country code pill */}
                    <View style={styles.countryPill}>
                      <Text style={styles.countryFlag}>{FLAG}</Text>
                      <Text style={styles.countryCode}>{COUNTRY_CODE}</Text>
                      <View style={styles.divider} />
                    </View>

                    <TextInput
                      style={[styles.input, styles.inputPhone]}
                      value={phone}
                      onChangeText={(t) => {
                        // Allow only digits and spaces, max 10 digits
                        const digits = t.replace(/\D/g, '').slice(0, 10);
                        // Format: 98765 43210
                        const formatted =
                          digits.length > 5
                            ? digits.slice(0, 5) + ' ' + digits.slice(5)
                            : digits;
                        setPhone(formatted);
                        if (phoneError) setPhoneError('');
                      }}
                      onFocus={() => setPhoneFocused(true)}
                      onBlur={() => setPhoneFocused(false)}
                      keyboardType="phone-pad"
                      returnKeyType="done"
                      maxLength={11}
                      placeholderTextColor="transparent"
                      onSubmitEditing={handleContinue}
                    />
                  </View>
                  {phoneError ? (
                    <Text style={styles.errorText}>{phoneError}</Text>
                  ) : null}
                </View>

                {/* Terms note */}
                <Text style={styles.terms}>
                  By continuing, you agree to our{' '}
                  <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </View>

              {/* Continue button */}
              <TouchableOpacity
                onPress={handleContinue}
                activeOpacity={0.85}
                disabled={loading}
                style={styles.btnWrapper}
              >
                <LinearGradient
                  colors={
                    isReady
                      ? ['#A855F7', '#6366F1', '#38BDF8']
                      : ['#2D2A6E', '#2D2A6E', '#2D2A6E']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.continueBtn}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={[styles.continueTxt, !isReady && styles.continueTxtDim]}>
                      Continue
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Sign in link */}
              <View style={styles.signinRow}>
                <Text style={styles.signinLabel}>Already have an account? </Text>
                <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
                  <Text style={styles.signinLink}>Sign in</Text>
                </TouchableOpacity>
              </View>

            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1A1560',
  },
  safe: {
    flex: 1,
    width: '100%',
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },

  // Depth bg circles
  bgCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#3730A3',
    opacity: 0.12,
    top: -60,
    right: -60,
  },
  bgCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#6366F1',
    opacity: 0.08,
    bottom: 200,
    left: -50,
  },

  // Back button
  backBtn: {
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  backIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  backArrow: {
    width: 10,
    height: 10,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    transform: [{ rotate: '45deg' }, { translateX: 2 }],
  },

  // Header
  header: {
    marginBottom: 36,
  },
  logoMark: {
    marginBottom: 20,
  },
  logoGrad: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '700',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 20,
  },

  // Form
  form: {
    marginBottom: 28,
    gap: 16,
  },
  fieldWrapper: {
    gap: 6,
  },

  // Input box
  inputBox: {
    height: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 10,
    paddingHorizontal: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  inputBoxFocused: {
    borderColor: '#A855F7',
    backgroundColor: 'rgba(168,85,247,0.08)',
  },
  inputBoxError: {
    borderColor: '#F87171',
    backgroundColor: 'rgba(248,113,113,0.06)',
  },

  // Floating label
  floatLabel: {
    position: 'absolute',
    left: 48,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  floatLabelPhone: {
    left: 100,
  },

  // Input icon (person)
  inputIconWrap: {
    marginRight: 10,
    marginBottom: 2,
  },
  personIcon: {
    alignItems: 'center',
  },
  personHead: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginBottom: 2,
  },
  personBody: {
    width: 14,
    height: 7,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },

  // Country pill
  countryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
    paddingRight: 10,
    marginBottom: 2,
  },
  countryFlag: {
    fontSize: 16,
    marginRight: 4,
  },
  countryCode: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
    marginRight: 8,
  },
  divider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // Text input
  input: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    padding: 0,
    margin: 0,
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  inputPhone: {
    marginLeft: 10,
    letterSpacing: 1,
  },

  // Error
  errorText: {
    fontSize: 12,
    color: '#F87171',
    marginLeft: 4,
  },

  // Terms
  terms: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    lineHeight: 18,
    marginTop: 4,
  },
  termsLink: {
    color: '#A855F7',
    fontWeight: '500',
  },

  // Continue button
  btnWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
  },
  continueBtn: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  continueTxt: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  continueTxtDim: {
    color: 'rgba(255,255,255,0.4)',
  },

  // Sign in row
  signinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signinLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
  signinLink: {
    fontSize: 13,
    color: '#A855F7',
    fontWeight: '600',
  },
});

export default LoginScreen;