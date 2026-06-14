import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { ParsedSMS } from './smsService';
import { analyzeExpenseWithAI, ExpenseCategory } from './aiService';

export interface Transaction {
  id?: string;
  amount: number;
  merchant: string;
  category: ExpenseCategory | null;
  raw: string;
  date: Date | any;
  type: 'debit' | 'credit';
  status: 'pending' | 'analyzed';
  insight?: string;
  source: 'sms' | 'manual';
  userId: string;
}

// Get current user's transactions collection ref
const getTransactionsRef = () => {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('User not logged in');
  return firestore().collection('users').doc(uid).collection('transactions');
};

// Get current user's budgets collection ref
const getBudgetsRef = () => {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('User not logged in');
  return firestore().collection('users').doc(uid).collection('budgets');
};

// ─── Budget Functions ─────────────────────────────────────────────────────────

/**
 * Save budget for a specific month.
 * monthKey format: "2025-06"
 */
export const saveBudget = async (monthKey: string, amount: number): Promise<void> => {
  await getBudgetsRef()
    .doc(monthKey)
    .set(
      { amount, updatedAt: firestore.FieldValue.serverTimestamp() },
      { merge: true },
    );
};

/**
 * Get budget for a specific month.
 * Returns the saved amount or null if not set.
 * monthKey format: "2025-06"
 */
export const getBudget = async (monthKey: string): Promise<number | null> => {
  try {
    const doc = await getBudgetsRef().doc(monthKey).get();
    if (!doc.exists) return null;
    return (doc.data()?.amount as number) ?? null;
  } catch {
    return null;
  }
};

// ─── Transaction Functions ────────────────────────────────────────────────────

// Save a single SMS transaction + trigger AI analysis
export const saveSMSTransaction = async (sms: ParsedSMS): Promise<string> => {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('User not logged in');

  const ref = getTransactionsRef();

  // Check duplicate: same amount + same day already exists?
  const startOfDay = new Date(sms.date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(sms.date);
  endOfDay.setHours(23, 59, 59, 999);

  const existing = await ref
    .where('amount', '==', sms.amount)
    .where('date', '>=', startOfDay)
    .where('date', '<=', endOfDay)
    .where('source', '==', 'sms')
    .get();

  if (!existing.empty) {
    console.log('Duplicate SMS transaction skipped');
    return existing.docs[0].id;
  }

  // Save with pending status first
  const docRef = await ref.add({
    amount: sms.amount,
    merchant: sms.merchant,
    category: null,
    raw: sms.raw,
    date: firestore.Timestamp.fromDate(sms.date),
    type: sms.type,
    status: 'pending',
    source: 'sms',
    userId: uid,
    createdAt: firestore.FieldValue.serverTimestamp(),
  } as Transaction);

  // AI analyze async (non-blocking)
  analyzeAndUpdateTransaction(docRef.id, sms);

  return docRef.id;
};

// AI analyze then update Firestore
const analyzeAndUpdateTransaction = async (
  docId: string,
  sms: ParsedSMS,
): Promise<void> => {
  try {
    const result = await analyzeExpenseWithAI(
      sms.merchant,
      sms.raw,
      sms.amount,
    );
    await getTransactionsRef().doc(docId).update({
      category: result.category,
      insight: result.insight,
      status: 'analyzed',
    });
  } catch (err) {
    console.error('AI update failed for', docId, err);
  }
};

// Bulk save existing SMS (on first app open)
export const bulkSaveSMSTransactions = async (
  smsList: ParsedSMS[],
): Promise<void> => {
  // Process in batches of 5 to avoid hammering Gemini API
  const batchSize = 5;
  for (let i = 0; i < smsList.length; i += batchSize) {
    const batch = smsList.slice(i, i + batchSize);
    await Promise.all(batch.map(sms => saveSMSTransaction(sms)));
    // Small delay between batches
    if (i + batchSize < smsList.length) {
      await new Promise<void>(resolve => setTimeout(() => resolve(), 1000));
    }
  }
};

// Real-time listener for HomeScreen
export const subscribeToTransactions = (
  onUpdate: (transactions: Transaction[]) => void,
  onError?: (err: Error) => void,
) => {
  const ref = getTransactionsRef();

  const unsubscribe = ref
    .orderBy('date', 'desc')
    .limit(50)
    .onSnapshot(
      snapshot => {
        const transactions: Transaction[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate?.() ?? new Date(),
        })) as Transaction[];
        onUpdate(transactions);
      },
      err => {
        console.error('Snapshot error:', err);
        onError?.(err);
      },
    );

  return unsubscribe;
};

// Get this month's summary
export const getMonthSummary = async () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const snapshot = await getTransactionsRef()
    .where('type', '==', 'debit')
    .where('date', '>=', firestore.Timestamp.fromDate(startOfMonth))
    .get();

  let total = 0;
  const categoryMap: Record<string, number> = {};

  snapshot.docs.forEach(doc => {
    const data = doc.data() as Transaction;
    total += data.amount;
    if (data.category) {
      categoryMap[data.category] =
        (categoryMap[data.category] ?? 0) + data.amount;
    }
  });

  const topCategory =
    Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Other';

  return {
    total,
    topCategory,
    count: snapshot.size,
    categoryMap,
  };
};