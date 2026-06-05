// AddExpenseModal.tsx
// ─────────────────────────────────────────────
// Bottom-sheet modal for adding a cash expense.
// Fields: title, amount, category (pill selector), date, time.
// ─────────────────────────────────────────────

import React, { useState, useCallback, FC } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { AddExpensePayload, CategoryMeta, ExpenseCategory } from '../component/types';

// ── Category config ────────────────────────────

const CATEGORIES: CategoryMeta[] = [
  { label: 'Food',      icon: 'fast-food-outline',  color: '#22C55E' },
  { label: 'Transport', icon: 'car-sport-outline',  color: '#F59E0B' },
  { label: 'Shopping',  icon: 'bag-handle-outline', color: '#8B5CF6' },
  { label: 'Other',     icon: 'wallet-outline',     color: '#3B82F6' },
];

// ── Date / Time helpers ────────────────────────

const todayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
};

const nowTimeStr = (): string => {
  const d = new Date();
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
};

// ── Validation errors type ─────────────────────

interface FormErrors {
  title?: string;
  amount?: string;
  date?: string;
  time?: string;
  submit?: string;
}

// ── Props ──────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (payload: AddExpensePayload) => Promise<void>;
}

// ── Component ──────────────────────────────────

const AddExpenseModal: FC<Props> = ({ visible, onClose, onAdd }) => {
  const [title, setTitle] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [date, setDate] = useState<string>(todayStr());
  const [time, setTime] = useState<string>(nowTimeStr());
  const [saving, setSaving] = useState<boolean>(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!title.trim()) e.title = 'Title is required';
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) e.amount = 'Enter a valid amount';
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) e.date = 'Use format YYYY-MM-DD';
    if (!time.trim()) e.time = 'Time is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAdd = useCallback(async (): Promise<void> => {
    Keyboard.dismiss();
    if (!validate()) return;
    setSaving(true);
    try {
      await onAdd({
        title: title.trim(),
        amount: parseFloat(amount),
        category,
        date,
        time: time.trim(),
      });
      // reset form
      setTitle('');
      setAmount('');
      setCategory('Food');
      setDate(todayStr());
      setTime(nowTimeStr());
      setErrors({});
      onClose();
    } catch {
      setErrors({ submit: 'Failed to add. Try again.' });
    } finally {
      setSaving(false);
    }
  }, [title, amount, category, date, time, onAdd, onClose]);

  const handleClose = (): void => {
    setTitle('');
    setAmount('');
    setCategory('Food');
    setDate(todayStr());
    setTime(nowTimeStr());
    setErrors({});
    onClose();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.sheet}>
              {/* Handle bar */}
              <View style={styles.handle} />

              {/* Header */}
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>Add Expense</Text>
                  <Text style={styles.sheetSubtitle}>Record a cash expense</Text>
                </View>
                <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
                  <Icon name="close" size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* ── Amount ── */}
                <Text style={styles.label}>Amount</Text>
                <View
                  style={[
                    styles.inputRow,
                    errors.amount ? styles.inputRowError : undefined,
                  ]}
                >
                  <Text style={styles.currencySign}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    placeholderTextColor="#334155"
                    keyboardType="decimal-pad"
                    value={amount}
                    onChangeText={(v: string) => {
                      setAmount(v);
                      setErrors((p) => ({ ...p, amount: undefined }));
                    }}
                    returnKeyType="next"
                  />
                </View>
                {errors.amount ? (
                  <Text style={styles.err}>{errors.amount}</Text>
                ) : null}

                {/* ── Title ── */}
                <Text style={styles.label}>Title</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    errors.title ? styles.inputRowError : undefined,
                  ]}
                  placeholder="e.g. Lunch, Uber ride…"
                  placeholderTextColor="#334155"
                  value={title}
                  onChangeText={(v: string) => {
                    setTitle(v);
                    setErrors((p) => ({ ...p, title: undefined }));
                  }}
                  returnKeyType="next"
                />
                {errors.title ? (
                  <Text style={styles.err}>{errors.title}</Text>
                ) : null}

                {/* ── Category ── */}
                <Text style={styles.label}>Category</Text>
                <View style={styles.categoryRow}>
                  {CATEGORIES.map((cat) => {
                    const active = category === cat.label;
                    return (
                      <TouchableOpacity
                        key={cat.label}
                        onPress={() => setCategory(cat.label)}
                        style={[
                          styles.catPill,
                          active && {
                            backgroundColor: cat.color + '22',
                            borderColor: cat.color,
                          },
                        ]}
                      >
                        <Icon
                          name={cat.icon}
                          size={15}
                          color={active ? cat.color : '#475569'}
                        />
                        <Text
                          style={[
                            styles.catPillText,
                            active && { color: cat.color },
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* ── Date & Time row ── */}
                <View style={styles.dateTimeRow}>
                  <View style={styles.dateTimeCol}>
                    <Text style={styles.label}>Date</Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        errors.date ? styles.inputRowError : undefined,
                      ]}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#334155"
                      value={date}
                      onChangeText={(v: string) => {
                        setDate(v);
                        setErrors((p) => ({ ...p, date: undefined }));
                      }}
                      keyboardType="numbers-and-punctuation"
                      returnKeyType="next"
                      maxLength={10}
                    />
                    {errors.date ? (
                      <Text style={styles.err}>{errors.date}</Text>
                    ) : null}
                  </View>

                  <View style={styles.dateTimeCol}>
                    <Text style={styles.label}>Time</Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        errors.time ? styles.inputRowError : undefined,
                      ]}
                      placeholder="e.g. 10:30 AM"
                      placeholderTextColor="#334155"
                      value={time}
                      onChangeText={(v: string) => {
                        setTime(v);
                        setErrors((p) => ({ ...p, time: undefined }));
                      }}
                      returnKeyType="done"
                    />
                    {errors.time ? (
                      <Text style={styles.err}>{errors.time}</Text>
                    ) : null}
                  </View>
                </View>

                {errors.submit ? (
                  <Text style={[styles.err, { marginTop: 4 }]}>
                    {errors.submit}
                  </Text>
                ) : null}

                {/* ── Add Button ── */}
                <TouchableOpacity
                  onPress={handleAdd}
                  disabled={saving}
                  activeOpacity={0.85}
                  style={styles.addTouch}
                >
                  <LinearGradient
                    colors={['#7C3AED', '#6D28D9']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.addBtn}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Icon name="add-circle" size={20} color="#fff" />
                        <Text style={styles.addBtnText}>Add Expense</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <View style={{ height: 16 }} />
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default AddExpenseModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0C1A45',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '92%',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#1E3A8A',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#1E3A8A',
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 22,
  },
  sheetTitle: {
    color: '#F1F5F9',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  sheetSubtitle: {
    color: '#475569',
    fontSize: 13,
    marginTop: 3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#162044',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A1230',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1E3A8A',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 6,
    gap: 8,
  },
  inputRowError: {
    borderColor: '#EF4444',
  },
  currencySign: {
    color: '#60A5FA',
    fontSize: 22,
    fontWeight: '700',
  },
  amountInput: {
    flex: 1,
    color: '#F1F5F9',
    fontSize: 26,
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: '#0A1230',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1E3A8A',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: '500',
  },
  err: {
    color: '#EF4444',
    fontSize: 11,
    marginTop: 5,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#0A1230',
    borderWidth: 1.5,
    borderColor: '#1E3A8A',
  },
  catPillText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 13,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeCol: {
    flex: 1,
  },
  addTouch: {
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});