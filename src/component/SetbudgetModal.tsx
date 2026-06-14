// SetBudgetModal.tsx

import React, { useState, useEffect, useCallback, FC } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Keyboard,
  TouchableWithoutFeedback, Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (amount: number) => Promise<void>;       // create (new cycle)
  onUpdate?: (amount: number) => Promise<void>;    // edit (same cycle)
  currentBudget?: number;
  isEditMode?: boolean;                            // ← driven by parent
  monthLabel?: string;                             // e.g. "Jan 2026"
}

const SetBudgetModal: FC<Props> = ({
  visible,
  onClose,
  onSave,
  onUpdate,
  currentBudget = 0,
  isEditMode = false,
  monthLabel,
}) => {
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [inputError, setInputError] = useState('');

  // Pre-fill with current budget when editing
  useEffect(() => {
    if (visible) {
      setAmount(isEditMode && currentBudget > 0 ? String(currentBudget) : '');
      setInputError('');
    }
  }, [visible, isEditMode, currentBudget]);

  const handleSave = useCallback(async () => {
    Keyboard.dismiss();
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setInputError('Please enter a valid amount.');
      return;
    }
    setSaving(true);
    try {
      if (isEditMode && onUpdate) {
        await onUpdate(parsed);   // ← update same cycle
      } else {
        await onSave(parsed);     // ← new budget cycle (resets expenses)
      }
      setAmount('');
      setInputError('');
      onClose();
    } catch {
      setInputError('Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  }, [amount, isEditMode, onUpdate, onSave, onClose]);

  const handleClose = () => {
    setAmount('');
    setInputError('');
    onClose();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.sheet}>

              <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
                <Icon name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>

              <LinearGradient
                colors={isEditMode ? ['#7C3AED', '#6D28D9'] : ['#2563EB', '#1D4ED8']}
                style={styles.iconWrap}
              >
                <Icon name={isEditMode ? 'pencil' : 'wallet'} size={26} color="#fff" />
              </LinearGradient>

              <Text style={styles.title}>
                {isEditMode ? 'Edit Budget' : 'Set Monthly Budget'}
              </Text>
              <Text style={styles.subtitle}>
                {isEditMode
                  ? `Updating ${monthLabel ? monthLabel + ' ' : ''}from ₹${currentBudget.toLocaleString('en-IN')}`
                  : currentBudget > 0
                    ? `Current budget: ₹${currentBudget.toLocaleString('en-IN')}`
                    : 'No budget set yet'}
              </Text>

              {!isEditMode && currentBudget > 0 && (
                <Text style={styles.warningText}>
                  This will start a new budget cycle and reset this month's expenses.
                </Text>
              )}

              <View style={[styles.inputWrap, inputError ? styles.inputWrapError : undefined]}>
                <Text style={styles.currencySign}>₹</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="#334155"
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={(v) => { setAmount(v); setInputError(''); }}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                  selectTextOnFocus   // ← select all on edit so user can replace easily
                />
              </View>

              {inputError ? <Text style={styles.errorText}>{inputError}</Text> : null}

              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
                style={styles.saveTouch}
              >
                <LinearGradient
                  colors={isEditMode ? ['#7C3AED', '#6D28D9'] : ['#2563EB', '#1D4ED8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveBtn}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.saveBtnText}>
                        {isEditMode ? 'Update Budget' : 'Save Budget'}
                      </Text>
                  }
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleClose} style={styles.cancelTouch}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default SetBudgetModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24,
  },
  sheet: {
    width: '100%', backgroundColor: '#0C1A45', borderRadius: 28,
    padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#1E3A8A',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.5, shadowRadius: 30 },
      android: { elevation: 20 },
    }),
  },
  closeBtn: {
    position: 'absolute', top: 16, right: 16,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#162044', justifyContent: 'center', alignItems: 'center',
  },
  iconWrap: {
    width: 60, height: 60, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  title: { color: '#F1F5F9', fontSize: 22, fontWeight: '800', letterSpacing: -0.4, textAlign: 'center' },
  subtitle: { color: '#475569', fontSize: 13, marginTop: 6, marginBottom: 8, textAlign: 'center' },
  warningText: { color: '#F59E0B', fontSize: 12, marginBottom: 16, textAlign: 'center', paddingHorizontal: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    backgroundColor: '#0A1230', borderRadius: 16, borderWidth: 1.5,
    borderColor: '#1E3A8A', paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 8, gap: 8,
    marginTop: 8,
  },
  inputWrapError: { borderColor: '#EF4444' },
  currencySign: { color: '#60A5FA', fontSize: 22, fontWeight: '700' },
  input: { flex: 1, color: '#F1F5F9', fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 8, alignSelf: 'flex-start' },
  saveTouch: { width: '100%', marginTop: 20, borderRadius: 16, overflow: 'hidden' },
  saveBtn: { paddingVertical: 16, alignItems: 'center', borderRadius: 16 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  cancelTouch: { marginTop: 14, paddingVertical: 6 },
  cancelText: { color: '#475569', fontSize: 14, fontWeight: '500' },
});