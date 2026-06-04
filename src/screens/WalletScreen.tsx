import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const transactions = [
  {
    id: '1',
    title: 'Food',
    date: 'Today, 10:30 AM',
    amount: '$250.00',
    category: 'Food',
  },
  {
    id: '2',
    title: 'Transport',
    date: 'Yesterday, 6:15 PM',
    amount: '$100.00',
    category: 'Transport',
  },
  {
    id: '3',
    title: 'Shopping',
    date: '02 Jun 2025',
    amount: '$850.00',
    category: 'Shopping',
  },
  {
    id: '4',
    title: 'Snacks',
    date: '01 Jun 2025',
    amount: '$60.00',
    category: 'Food',
  },
];

const getIcon = (category: string) => {
  switch (category) {
    case 'Food':
      return 'fast-food-outline';
    case 'Shopping':
      return 'bag-handle-outline';
    case 'Transport':
      return 'car-sport-outline';
    default:
      return 'wallet-outline';
  }
};

const getColor = (category: string) => {
  switch (category) {
    case 'Food':
      return '#22C55E';
    case 'Shopping':
      return '#8B5CF6';
    case 'Transport':
      return '#F59E0B';
    default:
      return '#3B82F6';
  }
};

const getCategoryGradient = (category: string): string[] => {
  switch (category) {
    case 'Food':
      return ['#134E2A', '#166534'];
    case 'Shopping':
      return ['#3B0764', '#4C1D95'];
    case 'Transport':
      return ['#78350F', '#92400E'];
    default:
      return ['#1E3A5F', '#1D4ED8'];
  }
};

const WalletScreen = () => {
  const insets = useSafeAreaInsets();
  return (
    
    <SafeAreaView style={styles.safeArea} edges={['top']}>
  <ScrollView
  style={styles.scrollView}
  showsVerticalScrollIndicator={false}
  contentContainerStyle={[
    styles.scrollContent,
    {
      paddingBottom: insets.bottom + 90,
    },
  ]}
>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Cash Expenses</Text>
            <Text style={styles.subtitle}>Track your cash spending</Text>
          </View>
          <TouchableOpacity style={styles.notification}>
            <Icon name="notifications-outline" size={22} color="#CBD5E1" />
            {/* Notification dot */}
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>

        {/* ── Main Balance Card ── */}
        <LinearGradient
          colors={['#1E3A8A', '#1D4ED8', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Card background decoration */}
          <View style={styles.cardCircle1} />
          <View style={styles.cardCircle2} />

          <View style={styles.cardHeader}>
            <Text style={styles.month}>This Month</Text>
            <View style={styles.cashBadge}>
              <Icon name="wallet-outline" color="#4ADE80" size={15} />
              <Text style={styles.cashText}>Cash Account</Text>
            </View>
          </View>

          <Text style={styles.amountLabel}>Spent this month</Text>
          <Text style={styles.amount}>$5,000.50</Text>

          <View style={styles.increaseRow}>
            <View style={styles.increasePill}>
              <Icon name="trending-up" size={13} color="#4ADE80" />
              <Text style={styles.increase}>12% vs last month</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressBg}>
              <LinearGradient
                colors={['#A855F7', '#3B82F6', '#06B6D4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.progressFill}
              />
            </View>
            <Text style={styles.progressPercent}>62%</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.bottomRow}>
            <View style={styles.bottomRowItem}>
              <Text style={styles.label}>Budget</Text>
              <Text style={styles.value}>$8,000</Text>
            </View>
            <View style={styles.bottomRowDivider} />
            <View style={styles.bottomRowItem}>
              <Text style={styles.label}>Remaining</Text>
              <Text style={styles.green}>$3,000</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Action Buttons ── */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionTouchable}>
            <LinearGradient
              colors={['#7C3AED', '#6D28D9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionCard}
            >
              <View style={styles.actionIconWrap}>
                <Icon name="add-circle" color="#fff" size={26} />
              </View>
              <Text style={styles.actionTitle}>Add Expense</Text>
              <Text style={styles.actionSub}>Record cash expense</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionTouchable}>
            <LinearGradient
              colors={['#2563EB', '#1D4ED8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionCard}
            >
              <View style={styles.actionIconWrap}>
                <Icon name="wallet" color="#fff" size={26} />
              </View>
              <Text style={styles.actionTitle}>Set Budget</Text>
              <Text style={styles.actionSub}>Monthly budget</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── Recent Transactions ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAll}>See All</Text>
            <Icon name="chevron-forward" size={14} color="#60A5FA" />
          </TouchableOpacity>
        </View>

        <View style={styles.transactionContainer}>
          {transactions.map((item, index) => (
            <View key={item.id}>
              <View style={styles.transactionCard}>
                <View style={styles.left}>
                  <LinearGradient
                    colors={getCategoryGradient(item.category)}
                    style={styles.iconCircle}
                  >
                    <Icon
                      name={getIcon(item.category)}
                      size={19}
                      color={getColor(item.category)}
                    />
                  </LinearGradient>
                  <View>
                    <Text style={styles.transactionTitle}>{item.title}</Text>
                    <Text style={styles.transactionDate}>{item.date}</Text>
                  </View>
                </View>

                <View style={styles.transactionRight}>
                  <Text style={styles.transactionAmount}>-{item.amount}</Text>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: getColor(item.category) + '22' },
                    ]}
                  >
                    <View
                      style={[
                        styles.badgeDot,
                        { backgroundColor: getColor(item.category) },
                      ]}
                    />
                    <Text
                      style={[
                        styles.badgeText,
                        { color: getColor(item.category) },
                      ]}
                    >
                      {item.category}
                    </Text>
                  </View>
                </View>
              </View>
              {index < transactions.length - 1 && (
                <View style={styles.transactionDivider} />
              )}
            </View>
          ))}
        </View>

        {/* ── Top Categories ── */}
        <Text style={styles.sectionTitle}>Top Categories</Text>

        <View style={styles.categoryContainer}>
          <CategoryItem
            title="Food"
            amount="$1500"
            percentage="30%"
            progress={30}
            color="#22C55E"
            icon="fast-food-outline"
          />
          <CategoryItem
            title="Shopping"
            amount="$1250"
            percentage="25%"
            progress={25}
            color="#8B5CF6"
            icon="bag-handle-outline"
          />
          <CategoryItem
            title="Transport"
            amount="$1000"
            percentage="20%"
            progress={20}
            color="#F59E0B"
            icon="car-sport-outline"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const CategoryItem = ({
  title,
  amount,
  percentage,
  progress,
  color,
  icon,
}: any) => (
  <View style={styles.categoryItem}>
    <View style={styles.categoryHeader}>
      <View style={styles.categoryLeft}>
        <View style={[styles.categoryIconWrap, { backgroundColor: color + '22' }]}>
          <Icon name={icon} size={16} color={color} />
        </View>
        <Text style={styles.categoryTitle}>{title}</Text>
      </View>
      <View style={styles.categoryRight}>
        <Text style={styles.categoryAmount}>{amount}</Text>
        <Text style={styles.categoryPercent}>{percentage}</Text>
      </View>
    </View>
    <View style={styles.categoryBar}>
      <View style={[styles.categoryFill, { width: `${progress}%`, backgroundColor: color }]} />
    </View>
  </View>
);

export default WalletScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#060F2E',
  },

  scrollView: {
    flex: 1,
    backgroundColor: '#060F2E',
  },

  scrollContent: {
    paddingHorizontal: 20,
  },

  // ── Header ──
  header: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  title: {
    color: '#F1F5F9',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  subtitle: {
    color: '#64748B',
    marginTop: 3,
    fontSize: 14,
    fontWeight: '400',
  },

  notification: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#0F1D4A',
    borderWidth: 1,
    borderColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  notifDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#060F2E',
  },

  // ── Card ──
  card: {
    marginTop: 20,
    borderRadius: 28,
    padding: 22,
    overflow: 'hidden',
  },

  cardCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: -60,
    right: -40,
  },

  cardCircle2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: -20,
    left: 20,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  month: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  cashBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },

  cashText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },

  amountLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    marginTop: 20,
    fontWeight: '400',
  },

  amount: {
    color: '#fff',
    fontSize: 44,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: -1,
  },

  increaseRow: {
    flexDirection: 'row',
    marginTop: 8,
  },

  increasePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },

  increase: {
    color: '#4ADE80',
    fontSize: 12,
    fontWeight: '600',
  },

  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
  },

  progressBg: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    overflow: 'hidden',
  },

  progressFill: {
    width: '62%',
    height: '100%',
    borderRadius: 10,
  },

  progressPercent: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
    minWidth: 32,
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginTop: 18,
    marginBottom: 16,
  },

  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },

  bottomRowItem: {
    alignItems: 'center',
    flex: 1,
  },

  bottomRowDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  label: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  value: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },

  green: {
    color: '#4ADE80',
    fontSize: 22,
    fontWeight: '700',
  },

  // ── Action Buttons ──
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },

  actionTouchable: {
    flex: 1,
    borderRadius: 22,
  },

  actionCard: {
    borderRadius: 22,
    padding: 18,
  },

  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  actionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  actionSub: {
    color: 'rgba(255,255,255,0.6)',
    marginTop: 3,
    fontSize: 12,
  },

  // ── Section Header ──
  sectionRow: {
    marginTop: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  sectionTitle: {
    color: '#F1F5F9',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
    letterSpacing: -0.3,
  },

  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 20,
  },

  seeAll: {
    color: '#60A5FA',
    fontSize: 14,
    fontWeight: '500',
  },

  // ── Transactions ──
  transactionContainer: {
    marginTop: 14,
    backgroundColor: '#0C1A45',
    borderRadius: 22,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#1E3A8A',
  },

  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },

  transactionDivider: {
    height: 1,
    backgroundColor: '#111D3E',
    marginHorizontal: -4,
  },

  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  transactionTitle: {
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: '600',
  },

  transactionDate: {
    color: '#475569',
    marginTop: 3,
    fontSize: 12,
  },

  transactionRight: {
    alignItems: 'flex-end',
  },

  transactionAmount: {
    color: '#F87171',
    fontWeight: '700',
    fontSize: 15,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 5,
  },

  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Categories ──
  categoryContainer: {
    backgroundColor: '#0C1A45',
    marginTop: 14,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E3A8A',
    gap: 20,
  },

  categoryItem: {
    gap: 10,
  },

  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  categoryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  categoryRight: {
    alignItems: 'flex-end',
    gap: 2,
  },

  categoryTitle: {
    color: '#E2E8F0',
    fontWeight: '600',
    fontSize: 15,
  },

  categoryBar: {
    height: 6,
    backgroundColor: '#162044',
    borderRadius: 10,
    overflow: 'hidden',
  },

  categoryFill: {
    height: '100%',
    borderRadius: 10,
  },

  categoryPercent: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },

  categoryAmount: {
    color: '#F1F5F9',
    fontWeight: '700',
    fontSize: 15,
  },
});