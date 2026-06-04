import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, {
  Circle,
  Rect,
  Path,
  G,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Polygon,
} from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// ─── Illustration ────────────────────────────────────────────────────────────
const HeroIllustration: React.FC = () => (
  <Svg width={280} height={260} viewBox="0 0 280 260">
    <Defs>
      <SvgLinearGradient id="platformGrad" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#4A3FA0" stopOpacity="1" />
        <Stop offset="1" stopColor="#2D2470" stopOpacity="1" />
      </SvgLinearGradient>
      <SvgLinearGradient id="walletGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#2BC48A" stopOpacity="1" />
        <Stop offset="1" stopColor="#1A8F64" stopOpacity="1" />
      </SvgLinearGradient>
      <SvgLinearGradient id="phoneGrad" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#E8E8F0" stopOpacity="1" />
        <Stop offset="1" stopColor="#C8C8DC" stopOpacity="1" />
      </SvgLinearGradient>
      <SvgLinearGradient id="receiptGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#F0F0FF" stopOpacity="1" />
        <Stop offset="1" stopColor="#D0D0EE" stopOpacity="1" />
      </SvgLinearGradient>
      <SvgLinearGradient id="btnGrad" x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0" stopColor="#A855F7" stopOpacity="1" />
        <Stop offset="1" stopColor="#38BDF8" stopOpacity="1" />
      </SvgLinearGradient>
    </Defs>

    {/* Platform base */}
    <G>
      <Path
        d="M40 190 L140 155 L240 190 L140 225 Z"
        fill="url(#platformGrad)"
        opacity={0.9}
      />
      <Path
        d="M40 190 L40 205 L140 240 L140 225 Z"
        fill="#1E1860"
        opacity={0.8}
      />
      <Path
        d="M240 190 L240 205 L140 240 L140 225 Z"
        fill="#2D2490"
        opacity={0.8}
      />
    </G>

    {/* Wallet (left) */}
    <G>
      <Rect x={42} y={120} width={72} height={52} rx={6} fill="url(#walletGrad)" />
      <Rect x={42} y={120} width={72} height={14} rx={6} fill="#1A7A55" />
      <Rect x={52} y={146} width={20} height={8} rx={4} fill="#38E8A0" />
      <Rect x={76} y={146} width={14} height={8} rx={4} fill="#2BC48A" opacity={0.6} />
    </G>

    {/* Coins */}
    {[0, 1, 2].map((i) => (
      <Circle
        key={i}
        cx={60 + i * 12}
        cy={175 - i * 4}
        r={9}
        fill="#F5C842"
        opacity={0.9 - i * 0.1}
      />
    ))}
    {[0, 1].map((i) => (
      <Circle
        key={i}
        cx={195 + i * 12}
        cy={178 - i * 3}
        r={9}
        fill="#F5C842"
        opacity={0.85 - i * 0.1}
      />
    ))}

    {/* Phone (center) */}
    <G>
      <Rect x={105} y={70} width={70} height={118} rx={10} fill="url(#phoneGrad)" />
      <Rect x={109} y={82} width={62} height={98} rx={6} fill="#FFFFFF" />
      {/* Donut chart on phone */}
      <Circle cx={140} cy={115} r={18} fill="none" stroke="#E8E0FF" strokeWidth={8} />
      <Circle
        cx={140}
        cy={115}
        r={18}
        fill="none"
        stroke="#A855F7"
        strokeWidth={8}
        strokeDasharray="50 63"
        strokeLinecap="round"
      />
      <Circle
        cx={140}
        cy={115}
        r={18}
        fill="none"
        stroke="#38BDF8"
        strokeWidth={8}
        strokeDasharray="20 93"
        strokeDashoffset="-50"
        strokeLinecap="round"
      />
      {/* Bar rows */}
      <Rect x={114} y={142} width={28} height={5} rx={2} fill="#E8E0FF" />
      <Rect x={114} y={142} width={18} height={5} rx={2} fill="#A855F7" />
      <Rect x={114} y={152} width={28} height={5} rx={2} fill="#E8E0FF" />
      <Rect x={114} y={152} width={22} height={5} rx={2} fill="#38BDF8" />
      <Rect x={114} y={162} width={28} height={5} rx={2} fill="#E8E0FF" />
      <Rect x={114} y={162} width={12} height={5} rx={2} fill="#2BC48A" />
    </G>

    {/* Receipt / card (right) */}
    <G>
      <Rect x={166} y={100} width={60} height={78} rx={6} fill="url(#receiptGrad)" />
      <Rect x={172} y={110} width={48} height={6} rx={3} fill="#A855F7" opacity={0.5} />
      <Rect x={172} y={122} width={36} height={4} rx={2} fill="#888" opacity={0.3} />
      <Rect x={172} y={130} width={42} height={4} rx={2} fill="#888" opacity={0.3} />
      {/* Check marks */}
      <Circle cx={178} cy={148} r={7} fill="#2BC48A" opacity={0.9} />
      <Path
        d="M174 148 L177 151 L182 145"
        stroke="#fff"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx={196} cy={148} r={7} fill="#2BC48A" opacity={0.9} />
      <Path
        d="M192 148 L195 151 L200 145"
        stroke="#fff"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </G>

    {/* Bar chart (top right floating) */}
    <G opacity={0.9}>
      <Rect x={200} y={52} width={12} height={38} rx={3} fill="#A855F7" />
      <Rect x={216} y={64} width={12} height={26} rx={3} fill="#7C6FD4" />
      <Rect x={232} y={44} width={12} height={46} rx={3} fill="#38BDF8" />
      {/* Trend arrow */}
      <Path
        d="M202 50 L220 36 L238 40"
        stroke="#2BC48A"
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
      />
      <Polygon points="238,36 244,42 232,44" fill="#2BC48A" />
    </G>

    {/* Floating badges */}
    {/* Top-left: user icon */}
    <G>
      <Rect x={28} y={56} width={30} height={30} rx={8} fill="#6C63FF" opacity={0.9} />
      <Circle cx={43} cy={66} r={5} fill="#fff" opacity={0.8} />
      <Path d="M34 82 Q43 74 52 82" stroke="#fff" strokeWidth={1.5} fill="none" opacity={0.8} />
    </G>
    {/* Top-right: location pin */}
    <G>
      <Rect x={222} y={18} width={30} height={30} rx={8} fill="#38BDF8" opacity={0.9} />
      <Circle cx={237} cy={29} r={5} fill="#fff" opacity={0.8} />
      <Path d="M237 34 L237 42" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" opacity={0.8} />
    </G>

    {/* Bottom strip decoration */}
    <Rect x={110} y={196} width={60} height={10} rx={5} fill="#4A3FA0" opacity={0.5} />
  </Svg>
);

// ─── Dot indicators ───────────────────────────────────────────────────────────
interface DotsProps {
  total: number;
  active: number;
}
const Dots: React.FC<DotsProps> = ({ total, active }) => (
  <View style={styles.dotsRow}>
    {Array.from({ length: total }).map((_, i) => (
      <View
        key={i}
        style={[
          styles.dot,
          i === active ? styles.dotActive : styles.dotInactive,
        ]}
      />
    ))}
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
interface OnboardingScreenProps {
  onGetStarted?: () => void;
  onSkip?: () => void;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onGetStarted,
  onSkip,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const illustrationAnim = useRef(new Animated.Value(0)).current;
  const illustrationSlide = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(illustrationAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(illustrationSlide, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1560" />
      <LinearGradient
        colors={['#1A1560', '#1E1A70', '#16125A']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />

      {/* Subtle background circles for depth */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <SafeAreaView style={styles.safe}>
        {/* Illustration */}
        <Animated.View
          style={[
            styles.illustrationContainer,
            {
              opacity: illustrationAnim,
              transform: [{ translateY: illustrationSlide }],
            },
          ]}
        >
          <HeroIllustration />
        </Animated.View>

        {/* Text + CTA */}
        <Animated.View
          style={[
            styles.bottom,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Dots total={3} active={0} />

          <Text style={styles.headline}>
            Track Your Spending.{'\n'}Control Your Money.
          </Text>
          <Text style={styles.subheadline}>
            Track expenses with smart insights.
          </Text>

          {/* Get Started — gradient pill button */}
          <TouchableOpacity
            onPress={onGetStarted}
            activeOpacity={0.85}
            style={styles.primaryWrapper}
          >
            <LinearGradient
              colors={['#A855F7', '#6366F1', '#38BDF8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtn}
              
            >
              <Text style={styles.primaryText}>Get Started</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Skip */}
          <TouchableOpacity
            onPress={onSkip}
            activeOpacity={0.7}
            style={styles.skipBtn}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </Animated.View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Background depth circles
  bgCircle1: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#3730A3',
    opacity: 0.15,
    top: -80,
    right: -80,
  },
  bgCircle2: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#6366F1',
    opacity: 0.1,
    bottom: 120,
    left: -60,
  },

  // Illustration
  illustrationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 24,
  },

  // Bottom section
  bottom: {
    width: '100%',
    paddingHorizontal: 28,
    paddingBottom: 36,
    alignItems: 'center',
  },

  // Dots
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 28,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 22,
    backgroundColor: '#A855F7',
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  // Headlines
  headline: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  subheadline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginBottom: 36,
    lineHeight: 20,
  },

  // Primary button
  primaryWrapper: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
  },
  primaryBtn: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Skip button
  skipBtn: {
    height: 54,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.2,
  },
});

export default OnboardingScreen;