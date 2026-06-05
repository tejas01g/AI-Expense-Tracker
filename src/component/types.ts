// types.ts
// ─────────────────────────────────────────────
// Shared types used across the wallet feature
// ─────────────────────────────────────────────

import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export type ExpenseCategory = 'Food' | 'Transport' | 'Shopping' | 'Other';

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string;   // "YYYY-MM-DD"
  time: string;   // "HH:MM AM/PM"
  month: string;  // "YYYY-MM"
  createdAt?: FirebaseFirestoreTypes.Timestamp;
}

export interface AddExpensePayload {
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  time: string;
}

export interface UserWalletDoc {
  budget: number;
  monthlyBudget?: number;
  updatedAt?: FirebaseFirestoreTypes.Timestamp;
}

export interface CategoryMeta {
  label: ExpenseCategory;
  icon: string;
  color: string;
}