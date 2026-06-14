import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import Icon from 'react-native-vector-icons/Feather';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CategorySpend {
  amount: number;
  changePercent: number;
}

interface BiggestExpense {
  category: string;
  amount: number;
}

export interface AnalyticsData {
  userName: string;
  totalSpent: number;
  budget: number;
  online: CategorySpend;
  offline: CategorySpend;
  /** 7 values (Mon -> Sun), 0-100 representing relative activity */
  weeklyActivity: number[];
  biggestExpense: BiggestExpense;
  forecast: number;
  aiTip: string;
  potentialSavings: number;
  achievements: string[];
}

/** Raw shape of a single expense document in Firestore */
interface ExpenseDoc {
  amount: number;
  category: string;
  paymentMode: 'online' | 'offline';
  createdAt: { toDate: () => Date } | Date | number;
}

interface AnalyticsScreenProps {
  /** Optional override - if provided, live Firestore fetching is skipped */
  data?: AnalyticsData;
  onAIAssistantPress?: () => void;
}

// ---------------------------------------------------------------------------
// Theme / constants
// ---------------------------------------------------------------------------

const COLORS = {
  bg: '#F5F4F1',
  card: '#FFFFFF',
  border: '#E8E6E0',
  textPrimary: '#1A1A18',
  textSecondary: '#6F6E69',

  heroBg: '#26215C',
  heroAccent: '#AFA9EC',
  heroAccentText: '#CECBF6',

  online: '#1D9E75',
  offline: '#D85A30',

  weekBar: '#AFA9EC',
  weekBarActive: '#534AB7',

  amberBg: '#FAEEDA',
  amberIcon: '#BA7517',

  greenBg: '#EAF3DE',
  greenIcon: '#3B6D11',

  blueBg: '#E6F1FB',
  blueIcon: '#185FA5',

  coachBg: '#EEEDFE',
  coachIconBg: '#534AB7',
  coachTitle: '#26215C',
  coachText: '#3C3489',
  coachPillText: '#0F6E56',

  success: '#3B6D11',
  danger: '#C8432A',
  fab: '#534AB7',
};

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const EXPENSES_COLLECTION = 'expenses';
const USERS_COLLECTION = 'users';

// How long a cached analytics snapshot is considered fresh (ms).
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const DEFAULT_DATA: AnalyticsData = {
  userName: 'Tejasvi',
  totalSpent: 0,
  budget: 15000,
  online: { amount: 0, changePercent: 0 },
  offline: { amount: 0, changePercent: 0 },
  weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
  biggestExpense: { category: '—', amount: 0 },
  forecast: 0,
  aiTip: 'Add a few expenses to get personalized insights.',
  potentialSavings: 0,
  achievements: [],
};

const SAFE_AREA_EDGES: Edge[] = ['top', 'left', 'right'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatINR = (value: number): string => `₹${Math.round(value).toLocaleString('en-IN')}`;

const toDate = (value: ExpenseDoc['createdAt']): Date => {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  return value.toDate();
};

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const startOfLastMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() - 1, 1);
const startOfWeek = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sun
  const diff = day === 0 ? 6 : day - 1; // shift so Monday = 0
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

// ---------------------------------------------------------------------------
// In-memory analytics cache (per-user, TTL based)
// ---------------------------------------------------------------------------

interface CacheEntry {
  data: AnalyticsData;
  timestamp: number;
}

const analyticsCache = new Map<string, CacheEntry>();

const getCachedAnalytics = (uid: string): AnalyticsData | null => {
  const entry = analyticsCache.get(uid);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) return null;
  return entry.data;
};

const setCachedAnalytics = (uid: string, data: AnalyticsData): void => {
  analyticsCache.set(uid, { data, timestamp: Date.now() });
};

// ---------------------------------------------------------------------------
// Pure aggregation: raw expense docs -> AnalyticsData
// (kept outside the component / hook so it's a stable, pure function and
// easy to memoize / unit test)
// ---------------------------------------------------------------------------

const computeAnalytics = (
  userName: string,
  budget: number,
  thisMonthExpenses: ExpenseDoc[],
  lastMonthExpenses: ExpenseDoc[],
  now: Date,
): AnalyticsData => {
  // ---- Online vs offline split (current month) ----
  let onlineAmount = 0;
  let offlineAmount = 0;
  const categoryTotals = new Map<string, number>();

  thisMonthExpenses.forEach(exp => {
    if (exp.paymentMode === 'online') onlineAmount += exp.amount;
    else offlineAmount += exp.amount;

    categoryTotals.set(exp.category, (categoryTotals.get(exp.category) ?? 0) + exp.amount);
  });

  const totalSpent = onlineAmount + offlineAmount;

  // ---- Same split for last month, to compute % change ----
  let lastOnline = 0;
  let lastOffline = 0;
  lastMonthExpenses.forEach(exp => {
    if (exp.paymentMode === 'online') lastOnline += exp.amount;
    else lastOffline += exp.amount;
  });

  const pctChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  // ---- Weekly activity (Mon..Sun of current week), normalized 0-100 ----
  const weekStart = startOfWeek(now);
  const dailyTotals = [0, 0, 0, 0, 0, 0, 0];
  thisMonthExpenses.forEach(exp => {
    const d = toDate(exp.createdAt);
    if (d >= weekStart) {
      const dayIndex = (d.getDay() + 6) % 7; // Mon=0..Sun=6
      dailyTotals[dayIndex] += exp.amount;
    }
  });
  const maxDaily = Math.max(...dailyTotals, 1);
  const weeklyActivity = dailyTotals.map(v => Math.round((v / maxDaily) * 100));

  // ---- Biggest expense category ----
  let biggestExpense: BiggestExpense = { category: '—', amount: 0 };
  categoryTotals.forEach((amount, category) => {
    if (amount > biggestExpense.amount) {
      biggestExpense = { category, amount };
    }
  });

  // ---- Forecast at current pace ----
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const forecast = dayOfMonth > 0 ? Math.round((totalSpent / dayOfMonth) * daysInMonth) : totalSpent;

  // ---- AI tip + potential savings (simple heuristic) ----
  const lastTotal = lastOnline + lastOffline;
  const diff = totalSpent - lastTotal;
  let aiTip = 'Your spending looks steady compared to last month.';
  let potentialSavings = 0;

  if (biggestExpense.amount > 0) {
    if (diff > 0) {
      aiTip = `You're spending ${formatINR(diff)} more than last month, mostly on ${biggestExpense.category}.`;
    } else if (diff < 0) {
      aiTip = `Nice! You spent ${formatINR(Math.abs(diff))} less than last month.`;
    } else {
      aiTip = `Your spending on ${biggestExpense.category} is your largest category this month.`;
    }
    potentialSavings = Math.round(biggestExpense.amount * 0.15);
  }

  // ---- Achievements (derived heuristics) ----
  const achievements: string[] = [];
  const activeDays = dailyTotals.filter(v => v > 0).length;
  if (activeDays >= 3) achievements.push(`${activeDays} day logging streak this week`);
  if (diff < 0 && lastTotal > 0) achievements.push(`Saved ${formatINR(Math.abs(diff))} vs last month`);
  if (budget > 0 && totalSpent <= budget) achievements.push('Budget under control');
  if (achievements.length === 0) achievements.push('Start logging to unlock achievements');

  return {
    userName,
    totalSpent,
    budget,
    online: { amount: onlineAmount, changePercent: pctChange(onlineAmount, lastOnline) },
    offline: { amount: offlineAmount, changePercent: pctChange(offlineAmount, lastOffline) },
    weeklyActivity,
    biggestExpense,
    forecast,
    aiTip,
    potentialSavings,
    achievements,
  };
};

// ---------------------------------------------------------------------------
// useAnalyticsData - real-time Firestore aggregation with in-memory cache
// ---------------------------------------------------------------------------

interface UseAnalyticsResult {
  data: AnalyticsData;
  loading: boolean;
  error: string | null;
}

const useAnalyticsData = (override?: AnalyticsData): UseAnalyticsResult => {
  const currentUser = auth().currentUser;
  const uid = currentUser?.uid ?? null;

  // Seed from cache synchronously so the screen isn't blank on revisits.
  const [data, setData] = useState<AnalyticsData>(() => {
    if (override) return override;
    if (uid) {
      const cached = getCachedAnalytics(uid);
      if (cached) return cached;
    }
    return DEFAULT_DATA;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (override) return false;
    if (uid) return getCachedAnalytics(uid) === null;
    return false;
  });

  const [error, setError] = useState<string | null>(null);

  // Keep latest "last month expenses" snapshot around without retriggering
  // the main subscription (avoids a second live listener for a slowly
  // changing dataset).
  const lastMonthRef = useRef<ExpenseDoc[]>([]);
  const userNameRef = useRef<string>('User');
  const budgetRef = useRef<number>(DEFAULT_DATA.budget);

  useEffect(() => {
    if (override) {
      setData(override);
      setLoading(false);
      return;
    }

    if (!uid) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const lastMonthStart = startOfLastMonth(now);

    // Fetch user display name + budget once (rarely changes).
    firestore()
      .collection(USERS_COLLECTION)
      .doc(uid)
      .get()
      .then(snap => {
        const profile = snap.data() as { name?: string; budget?: number } | undefined;
        userNameRef.current = profile?.name ?? currentUser?.displayName ?? 'User';
        budgetRef.current = profile?.budget ?? DEFAULT_DATA.budget;
      })
      .catch(() => {
        userNameRef.current = currentUser?.displayName ?? 'User';
        budgetRef.current = DEFAULT_DATA.budget;
      });

    // One-time fetch of last month's expenses for % change comparisons.
    firestore()
      .collection(EXPENSES_COLLECTION)
      .where('userId', '==', uid)
      .where('createdAt', '>=', lastMonthStart)
      .where('createdAt', '<', thisMonthStart)
      .get()
      .then(snap => {
        lastMonthRef.current = snap.docs.map(d => d.data() as ExpenseDoc);
      })
      .catch(() => {
        lastMonthRef.current = [];
      });

    // Live subscription for the current month's expenses.
    const unsubscribe = firestore()
      .collection(EXPENSES_COLLECTION)
      .where('userId', '==', uid)
      .where('createdAt', '>=', thisMonthStart)
      .onSnapshot(
        snapshot => {
          if (!isMounted) return;

          const thisMonthExpenses = snapshot.docs.map(d => d.data() as ExpenseDoc);

          const computed = computeAnalytics(
            userNameRef.current,
            budgetRef.current,
            thisMonthExpenses,
            lastMonthRef.current,
            new Date(),
          );

          setData(computed);
          setCachedAnalytics(uid, computed);
          setLoading(false);
        },
        err => {
          if (!isMounted) return;
          console.log('Analytics Firestore error:', err.message);
          setError(err.message);
          setLoading(false);
        },
      );

    return () => {
      isMounted = false;
      unsubscribe();
    };
    // Only re-subscribe when the user changes (or override toggles).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, override]);

  return { data, loading, error };
};

// ---------------------------------------------------------------------------
// Donut chart (online vs offline split) built with react-native-svg
// ---------------------------------------------------------------------------

interface DonutChartProps {
  onlinePercent: number;
  size?: number;
  strokeWidth?: number;
  centerLabel: string;
}

const DonutChart = memo(
  ({ onlinePercent, size = 110, strokeWidth = 14, centerLabel }: DonutChartProps) => {
    const { radius, circumference, center, onlineLength, offlineLength } = useMemo(() => {
      const r = (size - strokeWidth) / 2;
      const circ = 2 * Math.PI * r;
      const c = size / 2;
      const onlineLen = (onlinePercent / 100) * circ;
      return {
        radius: r,
        circumference: circ,
        center: c,
        onlineLength: onlineLen,
        offlineLength: circ - onlineLen,
      };
    }, [size, strokeWidth, onlinePercent]);

    return (
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {/* Offline base ring */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={COLORS.offline}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Online ring drawn on top, rotated to start at 12 o'clock */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={COLORS.online}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${onlineLength} ${offlineLength}`}
            strokeLinecap="butt"
            rotation={-90}
            origin={`${center}, ${center}`}
          />
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.donutCenter]}>
          <Text style={styles.donutCenterText}>{centerLabel}</Text>
        </View>
      </View>
    );
  },
);
DonutChart.displayName = 'DonutChart';

// ---------------------------------------------------------------------------
// Weekly activity bars
// ---------------------------------------------------------------------------

interface WeeklyActivityProps {
  values: number[];
}

const BAR_MAX_HEIGHT = 64;

const WeeklyActivity = memo(({ values }: WeeklyActivityProps) => {
  const peakIndex = useMemo(() => {
    let maxVal = -Infinity;
    let idx = 0;
    for (let i = 0; i < values.length; i++) {
      if (values[i] > maxVal) {
        maxVal = values[i];
        idx = i;
      }
    }
    return idx;
  }, [values]);

  const peakDayName = DAY_NAMES[peakIndex] ?? 'Day';

  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.cardTitle}>Weekly activity</Text>
        <Text style={styles.mutedSmall}>{peakDayName} is your peak day</Text>
      </View>
      <View style={styles.barsRow}>
        {values.map((value, index) => {
          const isPeak = index === peakIndex && value > 0;
          return (
            <View key={index} style={styles.barColumn}>
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max((value / 100) * BAR_MAX_HEIGHT, 4),
                    backgroundColor: isPeak ? COLORS.weekBarActive : COLORS.weekBar,
                  },
                ]}
              />
              <Text style={styles.barLabel}>{DAY_LABELS[index]}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
});
WeeklyActivity.displayName = 'WeeklyActivity';

// ---------------------------------------------------------------------------
// Small stat card (biggest expense / forecast)
// ---------------------------------------------------------------------------

interface StatCardProps {
  iconName: string;
  iconBg: string;
  iconColor: string;
  label: string;
  title: string;
  subtitle: string;
}

const StatCard = memo(
  ({ iconName, iconBg, iconColor, label, title, subtitle }: StatCardProps) => (
    <View style={[styles.card, styles.statCard]}>
      <View style={[styles.iconBadge, { backgroundColor: iconBg }]}>
        <Icon name={iconName} size={16} color={iconColor} />
      </View>
      <Text style={styles.mutedSmall}>{label}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.mutedSmall}>{subtitle}</Text>
    </View>
  ),
);
StatCard.displayName = 'StatCard';

// ---------------------------------------------------------------------------
// Achievement row item
// ---------------------------------------------------------------------------

interface AchievementItemProps {
  iconName: string;
  iconBg: string;
  iconColor: string;
  label: string;
}

const AchievementItem = memo(
  ({ iconName, iconBg, iconColor, label }: AchievementItemProps) => (
    <View style={styles.achievementRow}>
      <View style={[styles.iconBadge, { backgroundColor: iconBg }]}>
        <Icon name={iconName} size={16} color={iconColor} />
      </View>
      <Text style={styles.achievementLabel}>{label}</Text>
    </View>
  ),
);
AchievementItem.displayName = 'AchievementItem';

const ACHIEVEMENT_META: { iconName: string; iconBg: string; iconColor: string }[] = [
  { iconName: 'zap', iconBg: COLORS.amberBg, iconColor: COLORS.amberIcon },
  { iconName: 'dollar-sign', iconBg: COLORS.greenBg, iconColor: COLORS.greenIcon },
  { iconName: 'target', iconBg: COLORS.blueBg, iconColor: COLORS.blueIcon },
];

// ---------------------------------------------------------------------------
// Online/Offline breakdown card (extracted + memoized so it only re-renders
// when its own slice of data changes)
// ---------------------------------------------------------------------------

interface SpendBreakdownProps {
  totalSpent: number;
  online: CategorySpend;
  offline: CategorySpend;
  onlinePercent: number;
  offlinePercent: number;
}

const SpendBreakdown = memo(
  ({ totalSpent, online, offline, onlinePercent, offlinePercent }: SpendBreakdownProps) => {
    const centerLabel = useMemo(() => formatINR(totalSpent), [totalSpent]);

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Where your money went</Text>
        <View style={styles.donutRow}>
          <DonutChart onlinePercent={onlinePercent} centerLabel={centerLabel} />
          <View style={styles.donutLegend}>
            <View style={styles.legendItem}>
              <View style={styles.legendHeader}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.online }]} />
                <Text style={styles.mutedSmall}>Online · {onlinePercent}%</Text>
              </View>
              <View style={styles.legendValueRow}>
                <Text style={styles.legendAmount}>{formatINR(online.amount)}</Text>
                <Text style={online.changePercent >= 0 ? styles.changePositive : styles.changeNegative}>
                  {online.changePercent >= 0 ? '↑' : '↓'}
                  {Math.abs(online.changePercent)}%
                </Text>
              </View>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendHeader}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.offline }]} />
                <Text style={styles.mutedSmall}>Offline · {offlinePercent}%</Text>
              </View>
              <View style={styles.legendValueRow}>
                <Text style={styles.legendAmount}>{formatINR(offline.amount)}</Text>
                <Text style={offline.changePercent >= 0 ? styles.changePositive : styles.changeNegative}>
                  {offline.changePercent >= 0 ? '↑' : '↓'}
                  {Math.abs(offline.changePercent)}%
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  },
);
SpendBreakdown.displayName = 'SpendBreakdown';

// ---------------------------------------------------------------------------
// Hero / budget card (extracted + memoized)
// ---------------------------------------------------------------------------

interface HeroCardProps {
  totalSpent: number;
  budget: number;
  online: CategorySpend;
  offline: CategorySpend;
}

const HeroCard = memo(({ totalSpent, budget, online, offline }: HeroCardProps) => {
  const budgetUsedPercent = useMemo(
    () => (budget > 0 ? Math.min(Math.round((totalSpent / budget) * 100), 100) : 0),
    [totalSpent, budget],
  );
  const remaining = useMemo(() => Math.max(budget - totalSpent, 0), [budget, totalSpent]);
  const totalLabel = useMemo(() => formatINR(totalSpent), [totalSpent]);
  const remainingLabel = useMemo(() => formatINR(remaining), [remaining]);

  return (
    <View style={styles.heroCard}>
      <Text style={styles.heroLabel}>Total spent this month</Text>
      <Text style={styles.heroAmount}>{totalLabel}</Text>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${budgetUsedPercent}%` }]} />
      </View>

      <View style={styles.rowBetween}>
        <Text style={styles.heroAccentText}>{budgetUsedPercent}% of budget used</Text>
        <Text style={styles.heroAccentText}>{remainingLabel} left</Text>
      </View>

      {/* Online + offline split of the total, shown directly under the hero number */}
      <View style={styles.heroSplitRow}>
        <View style={styles.heroSplitItem}>
          <View style={styles.heroSplitHeader}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.online }]} />
            <Text style={styles.heroSplitLabel}>Online</Text>
          </View>
          <Text style={styles.heroSplitAmount}>{formatINR(online.amount)}</Text>
        </View>
        <View style={styles.heroSplitDivider} />
        <View style={styles.heroSplitItem}>
          <View style={styles.heroSplitHeader}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.offline }]} />
            <Text style={styles.heroSplitLabel}>Offline</Text>
          </View>
          <Text style={styles.heroSplitAmount}>{formatINR(offline.amount)}</Text>
        </View>
      </View>
    </View>
  );
});
HeroCard.displayName = 'HeroCard';

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ data: dataOverride, onAIAssistantPress }) => {
  const { data, loading, error } = useAnalyticsData(dataOverride);

  const {
    userName,
    budget,
    online,
    offline,
    weeklyActivity,
    biggestExpense,
    forecast,
    aiTip,
    potentialSavings,
    achievements,
  } = data;

  // Total spent = online + offline, always derived so it can never drift
  // out of sync with the two category totals.
  const computedTotalSpent = useMemo(() => online.amount + offline.amount, [online.amount, offline.amount]);

  const { onlinePercent, offlinePercent } = useMemo(() => {
    const total = online.amount + offline.amount;
    if (total === 0) return { onlinePercent: 0, offlinePercent: 0 };
    const onlinePct = Math.round((online.amount / total) * 100);
    return { onlinePercent: onlinePct, offlinePercent: 100 - onlinePct };
  }, [online.amount, offline.amount]);

  const forecastLabel = useMemo(() => formatINR(forecast), [forecast]);
  const biggestExpenseLabel = useMemo(
    () => formatINR(biggestExpense.amount),
    [biggestExpense.amount],
  );

  const renderedAchievements = useMemo(
    () =>
      achievements.map((label, index) => ({
        label,
        meta: ACHIEVEMENT_META[index % ACHIEVEMENT_META.length],
      })),
    [achievements],
  );

  const handleFabPress = useCallback(() => {
    onAIAssistantPress?.();
  }, [onAIAssistantPress]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]} edges={SAFE_AREA_EDGES}>
        <ActivityIndicator size="large" color={COLORS.fab} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]} edges={SAFE_AREA_EDGES}>
        <Icon name="alert-circle" size={28} color={COLORS.danger} />
        <Text style={styles.errorText}>Couldn&apos;t load your analytics.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={SAFE_AREA_EDGES}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good evening</Text>
            <Text style={styles.userName}>{userName}</Text>
          </View>
          <View style={styles.avatar}>
            <Icon name="user" size={18} color={COLORS.heroBg} />
          </View>
        </View>

        {/* Hero / budget card with online+offline split */}
        <HeroCard totalSpent={computedTotalSpent} budget={budget} online={online} offline={offline} />

        {/* Donut + breakdown */}
        <SpendBreakdown
          totalSpent={computedTotalSpent}
          online={online}
          offline={offline}
          onlinePercent={onlinePercent}
          offlinePercent={offlinePercent}
        />

        {/* Weekly activity */}
        <WeeklyActivity values={weeklyActivity} />

        {/* Stat cards */}
        <View style={styles.statRow}>
          <StatCard
            iconName="target"
            iconBg={COLORS.amberBg}
            iconColor={COLORS.amberIcon}
            label="Biggest expense"
            title={biggestExpense.category}
            subtitle={biggestExpenseLabel}
          />
          <StatCard
            iconName="trending-up"
            iconBg={COLORS.greenBg}
            iconColor={COLORS.greenIcon}
            label="Forecast, month end"
            title={forecastLabel}
            subtitle="at current pace"
          />
        </View>

        {/* AI coach card */}
        <View style={styles.coachCard}>
          <View style={styles.coachHeader}>
            <View style={styles.coachIconBadge}>
              <Icon name="zap" size={15} color="#FFFFFF" />
            </View>
            <Text style={styles.coachTitle}>AI financial coach</Text>
          </View>
          <Text style={styles.coachText}>{aiTip}</Text>
          {potentialSavings > 0 && (
            <View style={styles.coachPill}>
              <Icon name="trending-down" size={14} color={COLORS.coachPillText} />
              <Text style={styles.coachPillText}>Save up to {formatINR(potentialSavings)}</Text>
            </View>
          )}
        </View>

        {/* Achievements */}
        <View style={[styles.card, styles.lastCard]}>
          <Text style={styles.cardTitle}>Achievements</Text>
          {renderedAchievements.map(({ label, meta }) => (
            <AchievementItem key={label} label={label} {...meta} />
          ))}
        </View>
      </ScrollView>

      {/* Floating AI assistant button */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={handleFabPress}
        accessibilityRole="button"
        accessibilityLabel="Open AI assistant"
      >
        <Icon name="message-circle" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default memo(AnalyticsScreen);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 8,
    paddingBottom: 96,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  greeting: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.heroAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero card
  heroCard: {
    backgroundColor: COLORS.heroBg,
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
  },
  heroLabel: {
    fontSize: 12,
    color: COLORS.heroAccentText,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  heroAmount: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: COLORS.heroAccent,
  },
  heroAccentText: {
    fontSize: 12,
    color: COLORS.heroAccentText,
  },
  heroSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  heroSplitItem: {
    flex: 1,
    gap: 4,
  },
  heroSplitDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 16,
  },
  heroSplitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroSplitLabel: {
    fontSize: 12,
    color: COLORS.heroAccentText,
  },
  heroSplitAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Generic card
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 14,
  },
  lastCard: {
    marginBottom: 0,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mutedSmall: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  // Donut
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  donutCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  donutLegend: {
    flex: 1,
    gap: 14,
  },
  legendItem: {
    gap: 4,
  },
  legendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  legendAmount: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  changePositive: {
    fontSize: 12,
    color: COLORS.success,
  },
  changeNegative: {
    fontSize: 12,
    color: COLORS.danger,
  },

  // Weekly activity
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: BAR_MAX_HEIGHT + 22,
    gap: 8,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  bar: {
    width: '100%',
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  // Stat cards
  statRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    marginBottom: 0,
    padding: 16,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginVertical: 2,
  },

  // AI coach card
  coachCard: {
    backgroundColor: COLORS.coachBg,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  coachIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.coachIconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.coachTitle,
  },
  coachText: {
    fontSize: 14,
    color: COLORS.coachText,
    marginBottom: 12,
    lineHeight: 20,
  },
  coachPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  coachPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.coachPillText,
  },

  // Achievements
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  achievementLabel: {
    fontSize: 13,
    color: COLORS.textPrimary,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.fab,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});

// Avoid unused-variable lint warning while keeping SCREEN_WIDTH available
// for future responsive tweaks (e.g. tablet layouts).
void SCREEN_WIDTH;