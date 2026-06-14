import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { requestSMSPermission, readExistingSMS } from '../services/smsService';
import {
  subscribeToTransactions,
  bulkSaveSMSTransactions,
  getMonthSummary,
  saveBudget,
  getBudget,
  Transaction,
} from '../services/walletService';
import { generateSpendingInsight } from '../services/aiService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Returns array of { label, monthKey } for current month + 5 previous */
const buildMonthOptions = () => {
  const now = new Date();
  const options: { label: string; monthKey: string; year: number; month: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      label: i === 0 ? 'This Month' : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
      monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      year: d.getFullYear(),
      month: d.getMonth(),
    });
  }
  return options;
};

const buildWeeklyData = (transactions: Transaction[]) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const map: Record<string, number> = {};
  days.forEach(d => (map[d] = 0));

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  transactions
    .filter(t => t.type === 'debit' && new Date(t.date) >= weekAgo)
    .forEach(t => {
      const day = days[new Date(t.date).getDay()];
      map[day] += t.amount;
    });

  const max = Math.max(...Object.values(map), 1);
  return days.map(day => ({
    day,
    value: Math.round((map[day] / max) * 100),
    amount: map[day],
  }));
};

const formatINR = (amount: number) =>
  `₹${Math.abs(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

/** Truncate + capitalize merchant name properly */
const formatMerchant = (raw: string): string => {
  if (!raw) return 'Unknown';
  // Capitalize each word, replace underscores/extra spaces
  return raw
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

const CATEGORY_ICONS: Record<string, string> = {
  'Food & Dining': '🍔',
  Shopping: '🛍️',
  Transport: '🚗',
  Entertainment: '🎬',
  Utilities: '💡',
  Health: '💊',
  Education: '📚',
  Travel: '✈️',
  Groceries: '🛒',
  Other: '💳',
};

// ─── Component ────────────────────────────────────────────────────────────────

const HomeScreen = () => {
  const insets = useSafeAreaInsets();
  const MONTH_OPTIONS = useMemo(() => buildMonthOptions(), []);

  // ── State ──────────────────────────────────────────────────────────────────
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [weeklyData, setWeeklyData] = useState(buildWeeklyData([]));

  // Month selection (0 = current month, 1–5 = previous months)
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(0);
  const selectedMonthOption = MONTH_OPTIONS[selectedMonthIdx];

  // Per-month data
  const [monthTotal, setMonthTotal] = useState(0);
  const [topCategory, setTopCategory] = useState('Other');
  const [budget, setBudget] = useState(8000);
  const [txCount, setTxCount] = useState(0);

  // AI
  const [aiInsight, setAiInsight] = useState('Analyzing your spending...');

  // Budget modal
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);

  // SMS
  const [smsLoading, setSmsLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // ── Derived ────────────────────────────────────────────────────────────────
  const remaining = budget - monthTotal;
  const isOverBudget = monthTotal > budget;
  const progressPct = budget > 0 ? Math.min((monthTotal / budget) * 100, 100) : 0;

  // ── Fetch summary + budget when selected month changes ────────────────────
  const refreshMonthData = useCallback(
    async (monthKey: string, allTransactions: Transaction[]) => {
      // Filter transactions for selected month
      const [yr, mo] = monthKey.split('-').map(Number);
      const monthTxs = allTransactions.filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() === yr && d.getMonth() + 1 === mo;
      });

      const total = monthTxs
        .filter(t => t.type === 'debit')
        .reduce((s, t) => s + t.amount, 0);

      // Top category for selected month
      const catMap: Record<string, number> = {};
      monthTxs.filter(t => t.type === 'debit' && t.category).forEach(t => {
        catMap[t.category!] = (catMap[t.category!] ?? 0) + t.amount;
      });
      const top = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Other';

      setMonthTotal(total);
      setTopCategory(top);
      setTxCount(monthTxs.length);

      // Fetch budget for this month from Firestore
      const savedBudget = await getBudget(monthKey);
      const bgt = savedBudget ?? 8000;
      setBudget(bgt);

      // AI insight
      const saved = bgt - total;
      const insight = await generateSpendingInsight(total, top, monthTxs.length, saved, bgt);
      setAiInsight(insight);
    },
    []
  );

  // ── Realtime Firestore listener ───────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = subscribeToTransactions(async data => {
      setTransactions(data);
      setWeeklyData(buildWeeklyData(data));
      await refreshMonthData(selectedMonthOption.monthKey, data);
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonthOption.monthKey]);

  // Re-fetch when user switches month
  useEffect(() => {
    refreshMonthData(selectedMonthOption.monthKey, transactions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonthIdx]);

  // ── SMS init ──────────────────────────────────────────────────────────────
  const initSMS = useCallback(async () => {
    const hasPermission = await requestSMSPermission();
    if (!hasPermission) {
      Alert.alert(
        'SMS Permission Needed',
        'Allow SMS access to auto-detect expenses from bank messages.',
        [{ text: 'OK' }]
      );
      return;
    }
    setSmsLoading(true);
    try {
      const parsed = await readExistingSMS();
      if (parsed.length > 0) await bulkSaveSMSTransactions(parsed);
    } catch (err) {
      console.error('SMS init error:', err);
    } finally {
      setSmsLoading(false);
      setInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (!initialized) initSMS();
  }, [initialized, initSMS]);

  // ── Budget modal handlers ─────────────────────────────────────────────────
  const openBudgetModal = () => {
    setBudgetInput(String(budget));
    setBudgetModalVisible(true);
  };

  const handleSaveBudget = async () => {
    const val = parseInt(budgetInput.replace(/[^0-9]/g, ''), 10);
    if (!val || val <= 0) {
      Alert.alert('Invalid', 'Please enter a valid budget amount.');
      return;
    }
    setSavingBudget(true);
    try {
      await saveBudget(selectedMonthOption.monthKey, val);
      setBudget(val);
      setBudgetModalVisible(false);
      // Refresh AI insight with new budget
      const saved = val - monthTotal;
      const insight = await generateSpendingInsight(monthTotal, topCategory, txCount, saved, val);
      setAiInsight(insight);
    } catch (err) {
      Alert.alert('Error', 'Failed to save budget. Try again.');
    } finally {
      setSavingBudget(false);
    }
  };

  // ── Cycle through months on card tap ─────────────────────────────────────
  const handleMonthCycle = () => {
    setSelectedMonthIdx(prev => (prev + 1) % MONTH_OPTIONS.length);
  };

  // ── Top categories for selected month ────────────────────────────────────
  const topExpenses = useMemo(() => {
    const [yr, mo] = selectedMonthOption.monthKey.split('-').map(Number);
    const map: Record<string, number> = {};
    transactions
      .filter(t => {
        const d = new Date(t.date);
        return (
          t.type === 'debit' &&
          t.category &&
          d.getFullYear() === yr &&
          d.getMonth() + 1 === mo
        );
      })
      .forEach(t => {
        map[t.category!] = (map[t.category!] ?? 0) + t.amount;
      });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([title, amount]) => ({ title, amount }));
  }, [transactions, selectedMonthOption]);

  // Recent 5 transactions
  const recentSMS = transactions.slice(0, 5);

  // ── Render ────────────────────────────────────────────────────────────────
  const renderContent = () => (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Welcome back 👋</Text>
          <Text style={styles.greeting}>Good Evening</Text>
        </View>
        <View style={styles.profile} />
      </View>

      {/* SMS Loading Banner */}
      {smsLoading && (
        <View style={styles.smsBanner}>
          <ActivityIndicator size="small" color="#9B4DFF" />
          <Text style={styles.smsBannerText}>Reading SMS & analyzing expenses...</Text>
        </View>
      )}

      {/* AI Insight */}
      <LinearGradient colors={['#3B2A73', '#244A87']} style={styles.aiCard}>
        <Text style={styles.aiTitle}>🤖 AI Insight</Text>
        <Text style={styles.aiText}>{aiInsight}</Text>
      </LinearGradient>

      {/* Expense Card — tap to cycle months */}
      <TouchableOpacity activeOpacity={0.85} onPress={handleMonthCycle}>
        <LinearGradient
          colors={
            isOverBudget
              ? ['rgba(220,38,38,0.55)', 'rgba(153,27,27,0.45)']
              : ['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.08)']
          }
          style={[styles.expenseCard, isOverBudget && styles.dangerBorder]}
        >
          <View style={styles.rowBetween}>
            <Text style={styles.cardLabel}>Your Expenses</Text>
            <View style={styles.rowBetween}>
              {/* Month label — tap cycles */}
              <View style={styles.monthBtn}>
                <Text style={styles.monthText}>
                  {selectedMonthOption.label} ▾
                </Text>
              </View>
            </View>
          </View>

          {/* Over-budget warning */}
          {isOverBudget && (
            <View style={styles.warningBadge}>
              <Text style={styles.warningText}>⚠️ Over Budget!</Text>
            </View>
          )}

          <Text style={[styles.amount, isOverBudget && styles.dangerAmount]}>
            {formatINR(monthTotal)}
          </Text>

          <Text style={styles.increase}>
            Top Category{' '}
            <Text style={styles.green}>
              {CATEGORY_ICONS[topCategory] ?? '💳'} {topCategory}
            </Text>
          </Text>

          <View style={styles.progressBg}>
            <LinearGradient
              colors={isOverBudget ? ['#EF4444', '#DC2626'] : ['#9B4DFF', '#2CA7FF']}
              style={[styles.progressFill, { width: `${progressPct}%` }]}
            />
          </View>

          <View style={styles.rowBetween}>
            {/* Budget button opens modal */}
            <TouchableOpacity
              onPress={e => {
                e.stopPropagation?.();
                openBudgetModal();
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.bottomText, styles.budgetTapText]}>
                Budget: {formatINR(budget)} ✏️
              </Text>
            </TouchableOpacity>

            <Text
              style={[
                styles.bottomText,
                isOverBudget ? styles.overText : styles.safeText,
              ]}
            >
              {isOverBudget
                ? `Over by: ${formatINR(Math.abs(remaining))}`
                : `Remaining: ${formatINR(remaining)}`}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Weekly Chart */}
      <View style={styles.chartCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Weekly Expenses</Text>
          <Text style={styles.smallAmount}>
            {formatINR(weeklyData.reduce((s, d) => s + d.amount, 0))}
          </Text>
        </View>
        <View style={styles.chartContainer}>
          {weeklyData.map(item => (
            <View key={item.day} style={styles.barContainer}>
              <LinearGradient
                colors={
                  item.value > 0 ? ['#7B4CFF', '#31B6FF'] : ['#2A3560', '#2A3560']
                }
                style={[styles.bar, { height: Math.max(item.value, 6) }]}
              />
              <Text style={styles.day}>{item.day}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Recent Transactions */}
      <View style={styles.topSection}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <Text style={styles.badge}>{transactions.length}</Text>
        </View>

        {recentSMS.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {smsLoading ? 'Scanning SMS...' : 'No transactions found yet'}
            </Text>
          </View>
        ) : (
          recentSMS.map(item => (
            <View key={item.id} style={styles.expenseItem}>
              <View style={styles.expenseLeft}>
                <Text style={styles.expenseIcon}>
                  {CATEGORY_ICONS[item.category ?? 'Other'] ?? '💳'}
                </Text>
                <View style={styles.expenseTextBlock}>
                  <Text style={styles.expenseTitle} numberOfLines={1}>
                    {formatMerchant(item.merchant)}
                  </Text>
                  <Text style={styles.expenseSub}>
                    {item.category ?? '⏳ Analyzing...'}
                  </Text>
                  <Text style={styles.expenseDate}>
                    {new Date(item.date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                </View>
              </View>
              <View style={styles.expenseRight}>
                <Text
                  style={[
                    styles.expenseAmount,
                    item.type === 'credit' && styles.creditAmount,
                  ]}
                >
                  {item.type === 'credit' ? '+' : '-'}
                  {formatINR(item.amount)}
                </Text>
                {item.status === 'pending' && (
                  <ActivityIndicator
                    size="small"
                    color="#9B4DFF"
                    style={{ marginTop: 4 }}
                  />
                )}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Top Categories */}
      {topExpenses.length > 0 && (
        <View style={styles.topSection}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Top Categories</Text>
            <Text style={styles.seeAll}>See All</Text>
          </View>
          {topExpenses.map(item => (
            <View key={item.title} style={styles.expenseItem}>
              <Text style={styles.expenseTitle}>
                {CATEGORY_ICONS[item.title] ?? '💳'} {item.title}
              </Text>
              <Text style={styles.expenseAmount}>{formatINR(item.amount)}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={['content']}
        keyExtractor={item => item}
        renderItem={renderContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
      />

      {/* ── Budget Modal ─────────────────────────────────────────────────── */}
      <Modal
        visible={budgetModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBudgetModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalKAV}
            >
              <View style={styles.modalCard}>
                {/* Handle */}
                <View style={styles.modalHandle} />

                <Text style={styles.modalTitle}>
                  Set Budget for {selectedMonthOption.label}
                </Text>
                <Text style={styles.modalSub}>
                  Current budget: {formatINR(budget)}
                </Text>

                <View style={styles.inputRow}>
                  <Text style={styles.inputPrefix}>₹</Text>
                  <TextInput
                    style={styles.budgetInput}
                    value={budgetInput}
                    onChangeText={v => setBudgetInput(v.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    placeholder="Enter amount"
                    placeholderTextColor="#4A5580"
                    autoFocus
                    maxLength={8}
                  />
                </View>

                {/* Quick set chips */}
                <View style={styles.chipRow}>
                  {[5000, 8000, 10000, 15000, 20000].map(amt => (
                    <TouchableOpacity
                      key={amt}
                      style={[
                        styles.chip,
                        budgetInput === String(amt) && styles.chipActive,
                      ]}
                      onPress={() => setBudgetInput(String(amt))}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          budgetInput === String(amt) && styles.chipTextActive,
                        ]}
                      >
                        ₹{(amt / 1000).toFixed(0)}k
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.modalBtns}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setBudgetModalVisible(false)}
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSaveBudget}
                    disabled={savingBudget}
                  >
                    {savingBudget ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.saveText}>Save Budget</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

export default HomeScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101B46' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  welcome: { color: '#B7C0E0', fontSize: 14 },
  greeting: { color: '#FFF', fontSize: 28, fontWeight: '700' },
  profile: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#24315F',
  },

  smsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A2757',
    marginHorizontal: 20,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  smsBannerText: { color: '#B7C0E0', fontSize: 13 },

  aiCard: { margin: 20, borderRadius: 18, padding: 16 },
  aiTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  aiText: { color: '#D4D9EF', lineHeight: 22 },

  expenseCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  dangerBorder: {
    borderWidth: 1.5,
    borderColor: 'rgba(239,68,68,0.6)',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: { color: '#C8D0F0' },
  monthBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  monthText: { color: '#fff', fontSize: 12 },

  warningBadge: {
    backgroundColor: 'rgba(239,68,68,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  warningText: { color: '#FCA5A5', fontSize: 12, fontWeight: '600' },

  amount: { color: '#fff', fontSize: 40, fontWeight: '700', marginTop: 12 },
  dangerAmount: { color: '#FCA5A5' },

  increase: { color: '#C8D0F0', marginTop: 10 },
  green: { color: '#4ADE80' },

  progressBg: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    marginVertical: 20,
    overflow: 'hidden',
  },
  progressFill: { height: '100%' },

  bottomText: { color: '#FFF', fontSize: 14 },
  budgetTapText: { textDecorationLine: 'underline', color: '#C8D0F0' },
  overText: { color: '#FCA5A5', fontWeight: '600' },
  safeText: { color: '#4ADE80', fontWeight: '600' },

  chartCard: {
    backgroundColor: '#1A2757',
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 20,
  },
  sectionTitle: { color: '#fff', fontSize: 20, fontWeight: '600' },
  smallAmount: { color: '#AEB9E0' },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    alignItems: 'flex-end',
  },
  barContainer: { alignItems: 'center' },
  bar: { width: 28, borderRadius: 14 },
  day: { color: '#AEB9E0', marginTop: 8, fontSize: 12 },

  topSection: { marginTop: 24, paddingHorizontal: 20 },
  seeAll: { color: '#2CA7FF' },
  badge: {
    backgroundColor: '#9B4DFF',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    fontSize: 12,
    overflow: 'hidden',
  },

  emptyState: {
    backgroundColor: '#1A2757',
    padding: 24,
    borderRadius: 16,
    marginTop: 12,
    alignItems: 'center',
  },
  emptyText: { color: '#6B7BB0', fontSize: 14 },

  expenseItem: {
    backgroundColor: '#1A2757',
    padding: 16,
    borderRadius: 16,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expenseLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  expenseIcon: { fontSize: 24 },
  expenseTextBlock: { flex: 1 },
  expenseRight: { alignItems: 'flex-end' },
  expenseTitle: { color: '#FFF', fontSize: 15, fontWeight: '500' },
  expenseSub: { color: '#6B7BB0', fontSize: 12, marginTop: 2 },
  expenseDate: { color: '#4A5580', fontSize: 11, marginTop: 2 },
  expenseAmount: { color: '#FFF', fontWeight: '600', fontSize: 15 },
  creditAmount: { color: '#4ADE80' },

  // ── Modal ──────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalKAV: { width: '100%' },
  modalCard: {
    backgroundColor: '#1A2757',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#2E3E7A',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSub: { color: '#6B7BB0', fontSize: 13, marginBottom: 20 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#101B46',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2E3E7A',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  inputPrefix: { color: '#9B4DFF', fontSize: 22, fontWeight: '700', marginRight: 8 },
  budgetInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 26,
    fontWeight: '700',
    paddingVertical: 14,
  },

  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#101B46',
    borderWidth: 1,
    borderColor: '#2E3E7A',
  },
  chipActive: { backgroundColor: '#9B4DFF', borderColor: '#9B4DFF' },
  chipText: { color: '#6B7BB0', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#FFF' },

  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#101B46',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2E3E7A',
  },
  cancelText: { color: '#6B7BB0', fontWeight: '600', fontSize: 15 },
  saveBtn: {
    flex: 2,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#9B4DFF',
    alignItems: 'center',
  },
  saveText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});