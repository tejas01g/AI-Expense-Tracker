// WalletScreen.tsx
// ─────────────────────────────────────────────
// Fully dynamic — all data from Firestore via useBudgetStore.
// No hardcoded transaction or budget values.
// ─────────────────────────────────────────────

import React, { useState, useCallback, memo, FC } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import useBudgetStore from '../component/useBudgetStore';
import SetBudgetModal from '../component/SetbudgetModal';
import AddExpenseModal from '../component/AddExpenseModal';
import { Expense, ExpenseCategory } from '../component/types';

// ── Icon / color helpers ──────────────────────

const getIcon = (category: ExpenseCategory): string => {
  switch (category) {
    case 'Food':      return 'fast-food-outline';
    case 'Shopping':  return 'bag-handle-outline';
    case 'Transport': return 'car-sport-outline';
    default:          return 'wallet-outline';
  }
};

const getColor = (category: ExpenseCategory): string => {
  switch (category) {
    case 'Food':      return '#22C55E';
    case 'Shopping':  return '#8B5CF6';
    case 'Transport': return '#F59E0B';
    default:          return '#3B82F6';
  }
};

const getCategoryGradient = (category: ExpenseCategory): string[] => {
  switch (category) {
    case 'Food':      return ['#134E2A', '#166534'];
    case 'Shopping':  return ['#3B0764', '#4C1D95'];
    case 'Transport': return ['#78350F', '#92400E'];
    default:          return ['#1E3A5F', '#1D4ED8'];
  }
};

// ── Format helpers ────────────────────────────

const fmt = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const today = new Date();
  const d = new Date(dateStr + 'T00:00:00');
  const diffDays = Math.floor(
    (today.setHours(0, 0, 0, 0) - d.setHours(0, 0, 0, 0)) / 86400000,
  );
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// ── CategoryItem sub-component ────────────────

interface CategoryItemProps {
  title: ExpenseCategory;
  amount: number;
  totalSpent: number;
  color: string;
  icon: string;
}

const CategoryItem: FC<CategoryItemProps> = memo(
  ({ title, amount, totalSpent, color, icon }) => {
    const percent = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;
    return (
      <View style={styles.categoryItem}>
        <View style={styles.categoryHeader}>
          <View style={styles.categoryLeft}>
            <View style={[styles.categoryIconWrap, { backgroundColor: color + '22' }]}>
              <Icon name={icon} size={16} color={color} />
            </View>
            <Text style={styles.categoryTitle}>{title}</Text>
          </View>
          <View style={styles.categoryRight}>
            <Text style={styles.categoryAmount}>${fmt(amount)}</Text>
            <Text style={styles.categoryPercent}>{percent}%</Text>
          </View>
        </View>
        <View style={styles.categoryBar}>
          <View
            style={[
              styles.categoryFill,
              { width: `${percent}%` as `${number}%`, backgroundColor: color },
            ]}
          />
        </View>
      </View>
    );
  },
);

// ── Main Screen ───────────────────────────────

const WalletScreen: FC = () => {
  const insets = useSafeAreaInsets();

  const {
    budget,
    expenses,
    loading,
    totalSpent,
    remaining,
    budgetUsedPercent,
    categoryTotals,
    handleSetBudget,
    handleUpdateBudget,
    handleAddExpense,
  } = useBudgetStore();

  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Opens modal in CREATE mode (Set Budget button)
  const openBudgetModal = useCallback(() => {
    setIsEditMode(false);
    setBudgetModalVisible(true);
  }, []);

  // Opens modal in EDIT mode (tap budget value on card)
  const openEditBudgetModal = useCallback(() => {
    setIsEditMode(true);
    setBudgetModalVisible(true);
  }, []);

  const closeBudgetModal  = useCallback(() => setBudgetModalVisible(false), []);
  const openExpenseModal  = useCallback(() => setExpenseModalVisible(true), []);
  const closeExpenseModal = useCallback(() => setExpenseModalVisible(false), []);

  // Derived alert flags
  const isOverBudget  = budget > 0 && totalSpent > budget;
  const isNearBudget  = budget > 0 && !isOverBudget && budgetUsedPercent >= 80;

  // Top categories — non-zero, sorted desc
  const topCategories = (
    Object.entries(categoryTotals) as [ExpenseCategory, number][]
  )
    .filter(([, amt]) => amt > 0)
    .sort((a, b) => b[1] - a[1]);

  // ── Loading ────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#3B82F6" size="large" />
          <Text style={styles.loadingText}>Loading wallet…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Progress bar color: red if over, amber if near, else purple→cyan
  const progressColors: [string, string, string] = isOverBudget
    ? ['#EF4444', '#DC2626', '#B91C1C']
    : isNearBudget
      ? ['#F59E0B', '#D97706', '#B45309']
      : ['#A855F7', '#3B82F6', '#06B6D4'];

  // Pill icon + color
  const pillIcon  = isOverBudget ? 'warning'     : isNearBudget ? 'alert-circle' : 'trending-up';
  const pillColor = isOverBudget ? '#FCA5A5'     : isNearBudget ? '#FCD34D'      : '#4ADE80';
  const pillBg    = isOverBudget ? 'rgba(239,68,68,0.18)' : isNearBudget ? 'rgba(245,158,11,0.18)' : 'rgba(74,222,128,0.15)';
  const pillText  = isOverBudget
    ? `Over budget by $${fmt(Math.abs(remaining))}`
    : `${budgetUsedPercent}% of budget used`;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Cash Expenses</Text>
            <Text style={styles.subtitle}>Track your cash spending</Text>
          </View>
          <TouchableOpacity style={styles.notification}>
            <Icon name="notifications-outline" size={22} color="#CBD5E1" />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>

        {/* ── Main Balance Card ── */}
        <LinearGradient
          colors={
            isOverBudget
              ? ['#450A0A', '#7F1D1D', '#991B1B']
              : ['#1E3A8A', '#1D4ED8', '#2563EB']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.cardCircle1} />
          <View style={styles.cardCircle2} />

          {/* Card Header */}
          <View style={styles.cardHeader}>
            <Text style={styles.month}>This Month</Text>
            <View style={[
              styles.cashBadge,
              isOverBudget && styles.cashBadgeDanger,
            ]}>
              <Icon
                name={isOverBudget ? 'warning-outline' : 'wallet-outline'}
                color={isOverBudget ? '#FCA5A5' : '#4ADE80'}
                size={15}
              />
              <Text style={[
                styles.cashText,
                isOverBudget && { color: '#FCA5A5' },
              ]}>
                {isOverBudget ? 'Over Budget' : 'Cash Account'}
              </Text>
            </View>
          </View>

          {/* Spent Amount — red when over budget */}
          <Text style={styles.amountLabel}>Spent this month</Text>
          <Text style={[
            styles.amount,
            isOverBudget && styles.amountDanger,
          ]}>
            ${fmt(totalSpent)}
          </Text>

          {/* Smart pill — green / amber / red */}
          {budget > 0 && (
            <View style={styles.increaseRow}>
              <View style={[styles.increasePill, { backgroundColor: pillBg }]}>
                <Icon name={pillIcon} size={13} color={pillColor} />
                <Text style={[styles.increase, { color: pillColor }]}>
                  {pillText}
                </Text>
              </View>
            </View>
          )}

          {/* Progress bar */}
          {budget > 0 && (
            <View style={styles.progressSection}>
              <View style={styles.progressBg}>
                <LinearGradient
                  colors={progressColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(budgetUsedPercent, 100)}%` as `${number}%` },
                  ]}
                />
              </View>
              <Text style={[
                styles.progressPercent,
                isOverBudget && { color: '#FCA5A5' },
              ]}>
                {budgetUsedPercent}%
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          {/* Bottom row — Budget (tappable) | Remaining */}
          <View style={styles.bottomRow}>

            {/* Budget — tap to edit */}
            <View style={styles.bottomRowItem}>
              <Text style={styles.label}>Budget</Text>
              <TouchableOpacity
                onPress={openEditBudgetModal}
                activeOpacity={0.7}
                style={styles.editableRow}
              >
                <Text style={styles.value}>
                  {budget > 0 ? `$${fmt(budget)}` : '—'}
                </Text>
                {budget > 0 && (
                  <Icon
                    name="pencil"
                    size={13}
                    color="#60A5FA"
                    style={styles.pencilIcon}
                  />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.bottomRowDivider} />

            {/* Remaining — green / red */}
            <View style={styles.bottomRowItem}>
              <Text style={styles.label}>Remaining</Text>
              <Text style={
                budget <= 0
                  ? styles.value
                  : remaining >= 0
                    ? styles.green
                    : styles.danger
              }>
                {budget <= 0
                  ? '—'
                  : remaining >= 0
                    ? `$${fmt(remaining)}`
                    : `-$${fmt(Math.abs(remaining))}`
                }
              </Text>
            </View>

          </View>

          {/* Over-budget banner inside card */}
          {isOverBudget && (
            <View style={styles.overBudgetBanner}>
              <Icon name="alert-circle" size={15} color="#FCA5A5" />
              <Text style={styles.overBudgetBannerText}>
                You've exceeded your monthly budget
              </Text>
            </View>
          )}

        </LinearGradient>

        {/* ── Action Buttons ── */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionTouchable} onPress={openExpenseModal}>
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

          <TouchableOpacity style={styles.actionTouchable} onPress={openBudgetModal}>
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

        {expenses.length === 0 ? (
          <View style={styles.emptyBox}>
            <Icon name="receipt-outline" size={36} color="#1E3A8A" />
            <Text style={styles.emptyText}>No expenses yet this month</Text>
          </View>
        ) : (
          <View style={styles.transactionContainer}>
            {expenses.slice(0, 10).map((item: Expense, index: number) => (
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
                      <Text style={styles.transactionDate}>
                        {formatDisplayDate(item.date)}, {item.time}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.transactionRight}>
                    <Text style={styles.transactionAmount}>
                      -${fmt(item.amount)}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: getColor(item.category) + '22' }]}>
                      <View style={[styles.badgeDot, { backgroundColor: getColor(item.category) }]} />
                      <Text style={[styles.badgeText, { color: getColor(item.category) }]}>
                        {item.category}
                      </Text>
                    </View>
                  </View>
                </View>
                {index < Math.min(expenses.length, 10) - 1 && (
                  <View style={styles.transactionDivider} />
                )}
              </View>
            ))}
          </View>
        )}

        {/* ── Top Categories ── */}
        {topCategories.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Top Categories</Text>
            <View style={styles.categoryContainer}>
              {topCategories.map(([cat, amt]) => (
                <CategoryItem
                  key={cat}
                  title={cat}
                  amount={amt}
                  totalSpent={totalSpent}
                  color={getColor(cat)}
                  icon={getIcon(cat)}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Modals ── */}
      <SetBudgetModal
        visible={budgetModalVisible}
        onClose={closeBudgetModal}
        onSave={handleSetBudget}
        onUpdate={handleUpdateBudget}
        currentBudget={budget}
        isEditMode={isEditMode}
      />
      <AddExpenseModal
        visible={expenseModalVisible}
        onClose={closeExpenseModal}
        onAdd={handleAddExpense}
      />
    </SafeAreaView>
  );
};

export default WalletScreen;

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea:        { flex: 1, backgroundColor: '#060F2E' },
  scrollView:      { flex: 1, backgroundColor: '#060F2E' },
  scrollContent:   { paddingHorizontal: 20 },
  loadingWrap:     { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText:     { color: '#475569', fontSize: 14 },

  header:          { marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:           { color: '#F1F5F9', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle:        { color: '#64748B', marginTop: 3, fontSize: 14 },
  notification:    { width: 46, height: 46, borderRadius: 23, backgroundColor: '#0F1D4A', borderWidth: 1, borderColor: '#1E3A8A', justifyContent: 'center', alignItems: 'center' },
  notifDot:        { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#060F2E' },

  card:            { marginTop: 20, borderRadius: 28, padding: 22, overflow: 'hidden' },
  cardCircle1:     { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.05)', top: -60, right: -40 },
  cardCircle2:     { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.04)', bottom: -20, left: 20 },

  cardHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  month:           { color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1 },
  cashBadge:       { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20, gap: 5 },
  cashBadgeDanger: { backgroundColor: 'rgba(239,68,68,0.2)' },
  cashText:        { color: '#fff', fontSize: 12, fontWeight: '500' },

  amountLabel:     { color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 20 },
  amount:          { color: '#fff', fontSize: 44, fontWeight: '800', marginTop: 4, letterSpacing: -1 },
  amountDanger:    { color: '#FCA5A5' },

  increaseRow:     { flexDirection: 'row', marginTop: 8 },
  increasePill:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 4 },
  increase:        { fontSize: 12, fontWeight: '600' },

  progressSection: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
  progressBg:      { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, overflow: 'hidden' },
  progressFill:    { height: '100%', borderRadius: 10 },
  progressPercent: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600', minWidth: 32 },

  divider:         { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 18, marginBottom: 16 },

  bottomRow:        { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  bottomRowItem:    { alignItems: 'center', flex: 1 },
  bottomRowDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.15)' },

  label:           { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  value:           { color: '#fff', fontSize: 22, fontWeight: '700' },
  green:           { color: '#4ADE80', fontSize: 22, fontWeight: '700' },
  danger:          { color: '#F87171', fontSize: 22, fontWeight: '700' },

  // Tappable budget row
  editableRow:     { flexDirection: 'row', alignItems: 'center' },
  pencilIcon:      { marginLeft: 5, marginTop: 3 },

  // Over-budget banner at bottom of card
  overBudgetBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    marginTop: 14,
  },
  overBudgetBannerText: { color: '#FCA5A5', fontSize: 13, fontWeight: '600', flex: 1 },

  actionRow:       { flexDirection: 'row', gap: 12, marginTop: 18 },
  actionTouchable: { flex: 1, borderRadius: 22 },
  actionCard:      { borderRadius: 22, padding: 18 },
  actionIconWrap:  { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  actionTitle:     { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  actionSub:       { color: 'rgba(255,255,255,0.6)', marginTop: 3, fontSize: 12 },

  sectionRow:      { marginTop: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle:    { color: '#F1F5F9', fontSize: 20, fontWeight: '700', marginTop: 20, letterSpacing: -0.3 },
  seeAllButton:    { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 20 },
  seeAll:          { color: '#60A5FA', fontSize: 14, fontWeight: '500' },

  emptyBox:        { backgroundColor: '#0C1A45', borderRadius: 22, paddingVertical: 36, alignItems: 'center', gap: 12, marginTop: 14, borderWidth: 1, borderColor: '#1E3A8A' },
  emptyText:       { color: '#334155', fontSize: 14, fontWeight: '500' },

  transactionContainer: { marginTop: 14, backgroundColor: '#0C1A45', borderRadius: 22, paddingHorizontal: 16, borderWidth: 1, borderColor: '#1E3A8A' },
  transactionCard:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  transactionDivider:   { height: 1, backgroundColor: '#111D3E', marginHorizontal: -4 },
  left:                 { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconCircle:           { width: 46, height: 46, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  transactionTitle:     { color: '#F1F5F9', fontSize: 15, fontWeight: '600' },
  transactionDate:      { color: '#475569', marginTop: 3, fontSize: 12 },
  transactionRight:     { alignItems: 'flex-end' },
  transactionAmount:    { color: '#F87171', fontWeight: '700', fontSize: 15 },
  badge:                { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, marginTop: 5 },
  badgeDot:             { width: 5, height: 5, borderRadius: 3 },
  badgeText:            { fontSize: 11, fontWeight: '600' },

  categoryContainer: { backgroundColor: '#0C1A45', marginTop: 14, borderRadius: 22, padding: 18, borderWidth: 1, borderColor: '#1E3A8A', gap: 20 },
  categoryItem:      { gap: 10 },
  categoryHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryLeft:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryIconWrap:  { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  categoryRight:     { alignItems: 'flex-end', gap: 2 },
  categoryTitle:     { color: '#E2E8F0', fontWeight: '600', fontSize: 15 },
  categoryBar:       { height: 6, backgroundColor: '#162044', borderRadius: 10, overflow: 'hidden' },
  categoryFill:      { height: '100%', borderRadius: 10 },
  categoryPercent:   { color: '#64748B', fontSize: 11, fontWeight: '500' },
  categoryAmount:    { color: '#F1F5F9', fontWeight: '700', fontSize: 15 },
});