import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// ─── Types ────────────────────────────────────────────────────────────────────
interface LoginScreenProps {
  onContinue?: (name: string, phone: string) => void; // App.tsx handles navigation
  onBack?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const COUNTRY_CODE = '+91';
const FLAG = '🇮🇳';
const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30; // seconds

// ─── OTP Box Component ────────────────────────────────────────────────────────
interface OTPInputProps {
  otp: string[];
  onOtpChange: (otp: string[]) => void;
  hasError: boolean;
}

const OTPInput: React.FC<OTPInputProps> = ({ otp, onOtpChange, hasError }) => {
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    onOtpChange(newOtp);
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      onOtpChange(newOtp);
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={otpStyles.row}>
      {Array.from({ length: OTP_LENGTH }).map((_, i) => (
        <TextInput
          key={i}
          ref={(ref) => { inputRefs.current[i] = ref; }}
          style={[
            otpStyles.box,
            otp[i] ? otpStyles.boxFilled : null,
            hasError ? otpStyles.boxError : null,
          ]}
          value={otp[i] || ''}
          onChangeText={(t) => handleChange(t, i)}
          onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
          keyboardType="number-pad"
          maxLength={1}
          textAlign="center"
          selectionColor="#A855F7"
          caretHidden
        />
      ))}
    </View>
  );
};

const otpStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 24,
  },
  box: {
    width: 46,
    height: 54,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  boxFilled: {
    borderColor: '#A855F7',
    backgroundColor: 'rgba(168,85,247,0.12)',
  },
  boxError: {
    borderColor: '#F87171',
    backgroundColor: 'rgba(248,113,113,0.08)',
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
const LoginScreen: React.FC<LoginScreenProps> = ({ onContinue, onBack }) => {
  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nameFocused, setNameFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // OTP Modal state
  const [otpVisible, setOtpVisible] = useState(false);
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Firebase confirmation result ref
  const confirmationRef = useRef<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const nameLabelAnim = useRef(new Animated.Value(0)).current;
  const phoneLabelAnim = useRef(new Animated.Value(0)).current;
  const modalSlideAnim = useRef(new Animated.Value(300)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, []);

  // Float label animations
  useEffect(() => {
    Animated.timing(nameLabelAnim, {
      toValue: nameFocused || name.length > 0 ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [nameFocused, name]);

  useEffect(() => {
    Animated.timing(phoneLabelAnim, {
      toValue: phoneFocused || phone.length > 0 ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [phoneFocused, phone]);

  // Modal slide-in animation
  const openModal = useCallback(() => {
    setOtpVisible(true);
    Animated.spring(modalSlideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, []);

  const closeModal = useCallback(() => {
    Animated.timing(modalSlideAnim, {
      toValue: 400,
      duration: 260,
      useNativeDriver: true,
    }).start(() => {
      setOtpVisible(false);
      setOtp(Array(OTP_LENGTH).fill(''));
      setOtpError('');
    });
  }, []);

  // Shake animation for wrong OTP
  const triggerShake = useCallback(() => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, []);

  const startResendCooldown = useCallback(() => {
    setResendCooldown(RESEND_COOLDOWN);
    cooldownTimer.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownTimer.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // ─── Validation ─────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    let valid = true;
    if (name.trim().length < 2) {
      setNameError('Please enter your full name');
      valid = false;
    } else {
      setNameError('');
    }
    const digits = phone.replace(/\s/g, '');
    if (digits.length < 10) {
      setPhoneError('Enter a valid 10-digit number');
      valid = false;
    } else {
      setPhoneError('');
    }
    return valid;
  };

  // ─── Send OTP via Firebase ───────────────────────────────────────────────────
  const handleContinue = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const fullPhone = `${COUNTRY_CODE}${phone.replace(/\s/g, '')}`;
      const confirmation = await auth().signInWithPhoneNumber(fullPhone);
      confirmationRef.current = confirmation;
      openModal();
      startResendCooldown();
    } catch (error: any) {
      console.error('OTP send error:', error);
      setPhoneError(
        error?.code === 'auth/invalid-phone-number'
          ? 'Invalid phone number format'
          : 'Failed to send OTP. Try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── Resend OTP ──────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      const fullPhone = `${COUNTRY_CODE}${phone.replace(/\s/g, '')}`;
      const confirmation = await auth().signInWithPhoneNumber(fullPhone);
      confirmationRef.current = confirmation;
      setOtp(Array(OTP_LENGTH).fill(''));
      setOtpError('');
      startResendCooldown();
    } catch {
      setOtpError('Failed to resend OTP. Please try again.');
    }
  };

  // ─── Verify OTP & Save to Firestore ─────────────────────────────────────────
  const handleVerifyOtp = async () => {
    const otpCode = otp.join('');
    if (otpCode.length < OTP_LENGTH) {
      setOtpError('Please enter the complete 6-digit OTP');
      triggerShake();
      return;
    }
    if (!confirmationRef.current) {
      setOtpError('Session expired. Please go back and try again.');
      return;
    }

    setOtpLoading(true);
    setOtpError('');

    try {
      // 1. Verify OTP with Firebase Auth
      const userCredential = await confirmationRef.current.confirm(otpCode);
      const uid = userCredential?.user?.uid;
      if (!uid) throw new Error('No UID returned');

      // 2. Save user details to Firestore users collection
      await firestore().collection('users').doc(uid).set(
        {
          uid,
          name: name.trim(),
          phone: `${COUNTRY_CODE}${phone.replace(/\s/g, '')}`,
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true } // merge: true — won't overwrite existing data on re-login
      );

      // 3. Close modal → let App.tsx handle navigation via onContinue callback
    closeModal();

onContinue?.(
  name.trim(),
  phone.replace(/\s/g, ''),
);
    } catch (error: any) {
      console.error('OTP verify error:', error);
      triggerShake();
      if (
        error?.code === 'auth/invalid-verification-code' ||
        error?.code === 'auth/code-expired'
      ) {
        setOtpError('Invalid or expired OTP. Please try again.');
      } else {
        setOtpError('Verification failed. Please try again.');
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const isReady = name.trim().length >= 2 && phone.replace(/\s/g, '').length === 10;
  const isOtpFilled = otp.every((d) => d !== '');

  // Floating label interpolations
  const nameLabelTop = nameLabelAnim.interpolate({ inputRange: [0, 1], outputRange: [17, 4] });
  const nameLabelSize = nameLabelAnim.interpolate({ inputRange: [0, 1], outputRange: [15, 11] });
  const phoneLabelTop = phoneLabelAnim.interpolate({ inputRange: [0, 1], outputRange: [17, 4] });
  const phoneLabelSize = phoneLabelAnim.interpolate({ inputRange: [0, 1], outputRange: [15, 11] });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1560" />

      <LinearGradient
        colors={['#1A1560', '#1E1A70', '#16125A']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />
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
              <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={styles.backBtn}>
                <View style={styles.backIcon}>
                  <View style={styles.backArrow} />
                </View>
              </TouchableOpacity>

              {/* Header */}
              <View style={styles.header}>
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
                <Text style={styles.subtitle}>Enter your details to get started</Text>
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
                    <Animated.Text
                      style={[
                        styles.floatLabel,
                        {
                          top: nameLabelTop,
                          fontSize: nameLabelSize,
                          color: nameFocused ? '#A855F7' : nameError ? '#F87171' : 'rgba(255,255,255,0.45)',
                        },
                      ]}
                    >
                      Full name
                    </Animated.Text>
                    <View style={styles.inputIconWrap}>
                      <View style={styles.personIcon}>
                        <View style={styles.personHead} />
                        <View style={styles.personBody} />
                      </View>
                    </View>
                    <TextInput
                      style={styles.input}
                      value={name}
                      onChangeText={(t) => { setName(t); if (nameError) setNameError(''); }}
                      onFocus={() => setNameFocused(true)}
                      onBlur={() => setNameFocused(false)}
                      autoCapitalize="words"
                      autoCorrect={false}
                      returnKeyType="next"
                      placeholderTextColor="transparent"
                    />
                  </View>
                  {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
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
                    <Animated.Text
                      style={[
                        styles.floatLabel,
                        styles.floatLabelPhone,
                        {
                          top: phoneLabelTop,
                          fontSize: phoneLabelSize,
                          color: phoneFocused ? '#A855F7' : phoneError ? '#F87171' : 'rgba(255,255,255,0.45)',
                        },
                      ]}
                    >
                      Phone number
                    </Animated.Text>
                    <View style={styles.countryPill}>
                      <Text style={styles.countryFlag}>{FLAG}</Text>
                      <Text style={styles.countryCode}>{COUNTRY_CODE}</Text>
                      <View style={styles.divider} />
                    </View>
                    <TextInput
                      style={[styles.input, styles.inputPhone]}
                      value={phone}
                      onChangeText={(t) => {
                        const digits = t.replace(/\D/g, '').slice(0, 10);
                        const formatted = digits.length > 5 ? digits.slice(0, 5) + ' ' + digits.slice(5) : digits;
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
                  {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
                </View>

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
                  colors={isReady ? ['#A855F7', '#6366F1', '#38BDF8'] : ['#2D2A6E', '#2D2A6E', '#2D2A6E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.continueBtn}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={[styles.continueTxt, !isReady && styles.continueTxtDim]}>Continue</Text>
                  }
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

      {/* ─── OTP Modal ──────────────────────────────────────────────────────── */}
      <Modal
        visible={otpVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        {/* Backdrop */}
        <Pressable style={styles.modalBackdrop} onPress={closeModal} />

        {/* Sheet */}
        <Animated.View
          style={[
            styles.modalSheet,
            { transform: [{ translateY: modalSlideAnim }] },
          ]}
        >
          <LinearGradient
            colors={['#1E1A70', '#1A1560']}
            style={styles.modalGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            {/* Drag handle */}
            <View style={styles.dragHandle} />

            {/* Modal header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <LinearGradient
                  colors={['#A855F7', '#6366F1']}
                  style={styles.modalIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {/* Phone icon (manual) */}
                  <View style={styles.phoneIconOuter}>
                    <View style={styles.phoneIconInner} />
                  </View>
                </LinearGradient>
              </View>
              <Text style={styles.modalTitle}>Verify your number</Text>
              <Text style={styles.modalSubtitle}>
                We sent a 6-digit OTP to{'\n'}
                <Text style={styles.modalPhone}>
                  {COUNTRY_CODE} {phone}
                </Text>
              </Text>
            </View>

            {/* OTP Input */}
            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <OTPInput otp={otp} onOtpChange={(v) => { setOtp(v); if (otpError) setOtpError(''); }} hasError={!!otpError} />
            </Animated.View>

            {/* Error message */}
            {otpError ? (
              <Text style={styles.otpErrorText}>{otpError}</Text>
            ) : null}

            {/* Verify button */}
            <TouchableOpacity
              onPress={handleVerifyOtp}
              activeOpacity={0.85}
              disabled={otpLoading}
              style={styles.btnWrapper}
            >
              <LinearGradient
                colors={isOtpFilled ? ['#A855F7', '#6366F1', '#38BDF8'] : ['#2D2A6E', '#2D2A6E', '#2D2A6E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.continueBtn}
              >
                {otpLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={[styles.continueTxt, !isOtpFilled && styles.continueTxtDim]}>Verify OTP</Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            {/* Resend row */}
            <View style={styles.resendRow}>
              <Text style={styles.resendLabel}>Didn't receive the OTP? </Text>
              <TouchableOpacity
                onPress={handleResend}
                disabled={resendCooldown > 0}
                activeOpacity={0.7}
              >
                <Text style={[styles.resendLink, resendCooldown > 0 && styles.resendLinkDim]}>
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Change number */}
            <TouchableOpacity onPress={closeModal} activeOpacity={0.7} style={styles.changeNumBtn}>
              <Text style={styles.changeNumText}>Change phone number</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1A1560' },
  safe: { flex: 1, width: '100%' },
  scroll: { flexGrow: 1, paddingBottom: 32 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },

  bgCircle1: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: '#3730A3', opacity: 0.12, top: -60, right: -60,
  },
  bgCircle2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#6366F1', opacity: 0.08, bottom: 200, left: -50,
  },

  backBtn: { marginBottom: 24, alignSelf: 'flex-start' },
  backIcon: {
    width: 40, height: 40, borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center',
    justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)',
  },
  backArrow: {
    width: 10, height: 10, borderLeftWidth: 2, borderBottomWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    transform: [{ rotate: '45deg' }, { translateX: 2 }],
  },

  header: { marginBottom: 36 },
  logoMark: { marginBottom: 20 },
  logoGrad: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  logoIcon: { fontSize: 24, color: '#fff', fontWeight: '700' },
  title: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginBottom: 8, letterSpacing: 0.2 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 20 },

  form: { marginBottom: 28, gap: 16 },
  fieldWrapper: { gap: 6 },

  inputBox: {
    height: 58, borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.07)',
    flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 10,
    paddingHorizontal: 16, position: 'relative', overflow: 'hidden',
  },
  inputBoxFocused: { borderColor: '#A855F7', backgroundColor: 'rgba(168,85,247,0.08)' },
  inputBoxError: { borderColor: '#F87171', backgroundColor: 'rgba(248,113,113,0.06)' },

  floatLabel: { position: 'absolute', left: 48, fontWeight: '400', letterSpacing: 0.1 },
  floatLabelPhone: { left: 100 },

  inputIconWrap: { marginRight: 10, marginBottom: 2 },
  personIcon: { alignItems: 'center' },
  personHead: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.35)', marginBottom: 2 },
  personBody: { width: 14, height: 7, borderTopLeftRadius: 7, borderTopRightRadius: 7, backgroundColor: 'rgba(255,255,255,0.35)' },

  countryPill: { flexDirection: 'row', alignItems: 'center', marginRight: 4, paddingRight: 10, marginBottom: 2 },
  countryFlag: { fontSize: 16, marginRight: 4 },
  countryCode: { fontSize: 15, color: 'rgba(255,255,255,0.75)', fontWeight: '500', marginRight: 8 },
  divider: { width: 1, height: 18, backgroundColor: 'rgba(255,255,255,0.2)' },

  input: { flex: 1, fontSize: 15, color: '#FFFFFF', padding: 0, margin: 0, fontWeight: '400', letterSpacing: 0.3 },
  inputPhone: { marginLeft: 10, letterSpacing: 1 },
  errorText: { fontSize: 12, color: '#F87171', marginLeft: 4 },

  terms: { fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 18, marginTop: 4 },
  termsLink: { color: '#A855F7', fontWeight: '500' },

  btnWrapper: { borderRadius: 14, overflow: 'hidden', marginBottom: 20 },
  continueBtn: { height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  continueTxt: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', letterSpacing: 0.3 },
  continueTxtDim: { color: 'rgba(255,255,255,0.4)' },

  signinRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  signinLabel: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  signinLink: { fontSize: 13, color: '#A855F7', fontWeight: '600' },

  // ─── Modal ───────────────────────────────────────────────────────────────
  modalBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden',
  },
  modalGrad: {
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  dragHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center', marginBottom: 24,
  },

  modalHeader: { alignItems: 'center', marginBottom: 4 },
  modalIconWrap: { marginBottom: 16 },
  modalIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  phoneIconOuter: {
    width: 24, height: 28, borderRadius: 4, borderWidth: 2,
    borderColor: '#fff', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 3,
  },
  phoneIconInner: { width: 8, height: 2, borderRadius: 1, backgroundColor: '#fff' },

  modalTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 8, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 22 },
  modalPhone: { color: '#A855F7', fontWeight: '600' },

  otpErrorText: {
    fontSize: 13, color: '#F87171', textAlign: 'center',
    marginTop: -12, marginBottom: 14, letterSpacing: 0.2,
  },

  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  resendLabel: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  resendLink: { fontSize: 13, color: '#A855F7', fontWeight: '600' },
  resendLinkDim: { color: 'rgba(168,85,247,0.45)' },

  changeNumBtn: { alignItems: 'center', paddingVertical: 4 },
  changeNumText: { fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'underline' } as any,
});

export default LoginScreen;