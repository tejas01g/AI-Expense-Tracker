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

// Per-month budget documents: expenses/{uid}/budgets/{month}
const budgetsCol = (uid: string) =>
  userDoc(uid).collection('budgets');

const currentMonth = (): string => {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1,
  ).padStart(2, '0')}`;
};

// ── Set / update monthly budget ──────────────

// "Set Budget" button — starts a NEW budget cycle for the given month
// (defaults to current month). Resets that month's expenses so new
// expenses get tracked against the new budget.
export const setBudget = async (
  amount: number,
  month: string = currentMonth(),
): Promise<string> => {
  const uid = getUserId();

  // Reset this month's expenses when a new budget cycle starts
  await resetMonthlyExpenses(month);

  // Create a NEW budget doc with auto-generated id
  const newBudgetRef = await budgetsCol(uid).add({
    budget: Number(amount),
    month,
    createdAt: firestore.FieldValue.serverTimestamp(),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });

  // Point this month at the new budget doc as the "active" one
  await userDoc(uid).set(
    {
      budget: Number(amount),
      monthlyBudget: Number(amount),
      currentMonth: month,
      activeBudgetIds: {
        [month]: newBudgetRef.id,
      },
      updatedAt: firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return newBudgetRef.id;
};

// "Tap Budget on card" — edits the ACTIVE budget doc for this month
// in place (no new doc, no reset).
export const updateBudget = async (
  amount: number,
  month: string = currentMonth(),
): Promise<void> => {
  const uid = getUserId();

  const activeId = await getActiveBudgetId(uid, month);

  if (activeId) {
    await budgetsCol(uid).doc(activeId).set(
      {
        budget: Number(amount),
        month,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } else {
    // No active budget doc yet for this month — create one
    const newRef = await budgetsCol(uid).add({
      budget: Number(amount),
      month,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
    await userDoc(uid).set(
      { activeBudgetIds: { [month]: newRef.id } },
      { merge: true },
    );
  }

  // Keep top-level budget field in sync only if editing current month
  if (month === currentMonth()) {
    await userDoc(uid).set(
      {
        budget: Number(amount),
        monthlyBudget: Number(amount),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
};

// ── Helper: get the active budget doc id for a month ─────

const getActiveBudgetId = async (
  uid: string,
  month: string,
): Promise<string | null> => {
  const snap = await userDoc(uid).get();
  const data = snap.data() as { activeBudgetIds?: Record<string, string> } | undefined;
  return data?.activeBudgetIds?.[month] ?? null;
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

// ── Fetch budget for a given month ────────────

export const fetchBudget = async (
  month: string = currentMonth(),
): Promise<number> => {
  const uid = getUserId();

  const snap = await budgetsCol(uid).doc(month).get();

  if (snap.exists()) {
    const data = snap.data() as { budget?: number } | undefined;
    if (data?.budget !== undefined) {
      return data.budget;
    }
  }

  // Fallback for legacy top-level budget (current month only)
  if (month === currentMonth()) {
    const legacy = await userDoc(uid).get();
    const data = legacy.data() as UserWalletDoc | undefined;
    return data?.budget ?? 0;
  }

  return 0;
};

// ── Fetch expenses for a given month ─────────

export const fetchMonthlyExpenses = async (
  month: string = currentMonth(),
): Promise<Expense[]> => {
  const uid = getUserId();

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

export const resetMonthlyExpenses = async (
  month: string = currentMonth(),
): Promise<void> => {
  const uid = getUserId();

  const snap = await cashExpensesCol(uid)
    .where('month', '==', month)
    .get();

  const batch = firestore().batch();
  snap.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
};

// ── Real-time listener — expenses for a given month ─────

export const subscribeMonthlyExpenses = (
  month: string,
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

  return cashExpensesCol(uid)
    .where('month', '==', month)
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      snap => {
        const items: Expense[] = snap.docs.map(
          doc =>
            ({
              id: doc.id,
              ...(doc.data() as Omit<Expense, 'id'>),
            }) as Expense,
        );

        onUpdate(items);
      },
      err => {
        onError?.(err);
      },
    );
};
// ── Real-time listener — budget for a given month ───────────────

export const subscribeBudget = (
  month: string,
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

  let innerUnsub: (() => void) | null = null;

  const outerUnsub = userDoc(uid).onSnapshot(
    snap => {
      const data = snap.data() as
        | (UserWalletDoc & { activeBudgetIds?: Record<string, string> })
        | undefined;

      const activeId = data?.activeBudgetIds?.[month];

      if (innerUnsub) {
        innerUnsub();
        innerUnsub = null;
      }

      if (activeId) {
        innerUnsub = budgetsCol(uid).doc(activeId).onSnapshot(
          budgetSnap => {
            const b = budgetSnap.data() as { budget?: number } | undefined;
            onUpdate(b?.budget ?? 0);
          },
          err => onError?.(err),
        );
      } else if (month === currentMonth()) {
        // Legacy fallback
        onUpdate(data?.budget ?? 0);
      } else {
        onUpdate(0);
      }
    },
    err => {
      onError?.(err);
    },
  );

  return () => {
    outerUnsub();
    if (innerUnsub) innerUnsub();
  };
};

// ── Available months (for the month picker) ───────────────

// Returns a list of "YYYY-MM" months that have either expenses or a
// budget doc, plus the current month, sorted descending (newest first).
export const fetchAvailableMonths = async (): Promise<string[]> => {
  const uid = getUserId();

  const months = new Set<string>();
  months.add(currentMonth());

  const [expSnap, budgetSnap] = await Promise.all([
    cashExpensesCol(uid).get(),
    budgetsCol(uid).get(),
  ]);

  expSnap.docs.forEach(doc => {
    const m = (doc.data() as Expense).month;
    if (m) months.add(m);
  });

  budgetSnap.docs.forEach(doc => {
    months.add(doc.id);
  });

  return Array.from(months).sort((a, b) => (a < b ? 1 : -1));
};