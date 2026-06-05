// walletService.ts

import firestore, {
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {
  Expense,
  AddExpensePayload,
  UserWalletDoc,
} from '../component/types';

// ── helpers ──────────────────────────────────

const getUserId = (): string => {
  const user = auth().currentUser;

  if (!user) {
    throw new Error('User not authenticated');
  }

  return user.uid;
};

const userDoc = (uid: string) =>
  firestore()
    .collection('expenses')
    .doc(uid);

const cashExpensesCol = (uid: string) =>
  userDoc(uid).collection('cashExpenses');

const currentMonth = (): string => {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1,
  ).padStart(2, '0')}`;
};

// ── Set / update monthly budget ──────────────

export const setBudget = async (amount: number): Promise<void> => {
  const uid = getUserId();

  // Reset current month expenses when new budget is set
  await resetMonthlyExpenses();

  await userDoc(uid).set(
    {
      budget: Number(amount),
      monthlyBudget: Number(amount),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
};

export const updateBudget = async (amount: number): Promise<void> => {
  const uid = getUserId();
  await userDoc(uid).update({
    budget: Number(amount),
    monthlyBudget: Number(amount),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
  // No reset — editing budget preserves all existing expenses
};
// ── Add a cash expense ────────────────────────

export const addExpense = async (
  payload: AddExpensePayload,
): Promise<string> => {
  const uid = getUserId();

  const month = payload.date.substring(0, 7);

  const docRef = await cashExpensesCol(uid).add({
    title: payload.title.trim(),
    amount: Number(payload.amount),
    category: payload.category,
    date: payload.date,
    time: payload.time,
    month,
    createdAt:
      firestore.FieldValue.serverTimestamp(),
  });

  return docRef.id;
};

// ── Fetch budget ──────────────────────────────

export const fetchBudget = async (): Promise<number> => {
  const uid = getUserId();

  const snap = await userDoc(uid).get();

  if (!snap.exists) {
    return 0;
  }

  const data = snap.data() as UserWalletDoc | undefined;

  return data?.budget ?? 0;
};

// ── Fetch expenses for current month ─────────

export const fetchMonthlyExpenses = async (): Promise<
  Expense[]
> => {
  const uid = getUserId();

  const month = currentMonth();

  const snap = await cashExpensesCol(uid)
    .where('month', '==', month)
    .orderBy('createdAt', 'desc')
    .get();

  return snap.docs.map(
    doc =>
      ({
        id: doc.id,
        ...(doc.data() as Omit<Expense, 'id'>),
      }) as Expense,
  );
};

export const resetMonthlyExpenses = async (): Promise<void> => {
  const uid = getUserId();
  const month = currentMonth();

  const snap = await cashExpensesCol(uid)
    .where('month', '==', month)
    .get();

  const batch = firestore().batch();
  snap.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
};


// ── Real-time listener — monthly expenses ─────

export const subscribeMonthlyExpenses = (
  onUpdate: (items: Expense[]) => void,
  onError?: (err: Error) => void,
): (() => void) => {
  let uid: string;

  try {
    uid = getUserId();
  } catch (e) {
    onError?.(e as Error);
    return () => {};
  }

  const month = currentMonth();

  return cashExpensesCol(uid)
    .where('month', '==', month)
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      snap => {
        const items: Expense[] = snap.docs.map(
          doc =>
            ({
              id: doc.id,
              ...(doc.data() as Omit<
                Expense,
                'id'
              >),
            }) as Expense,
        );

        onUpdate(items);
      },
      err => {
        onError?.(err);
      },
    );
};

// ── Real-time listener — budget ───────────────

export const subscribeBudget = (
  onUpdate: (budget: number) => void,
  onError?: (err: Error) => void,
): (() => void) => {
  let uid: string;

  try {
    uid = getUserId();
  } catch (e) {
    onError?.(e as Error);
    return () => {};
  }

  return userDoc(uid).onSnapshot(
    snap => {
      if (!snap.exists) {
        onUpdate(0);
        return;
      }

      const data = snap.data() as UserWalletDoc | undefined;

      onUpdate(data?.budget ?? 0);
    },
    err => {
      onError?.(err);
    },
  );
};