// useBudgetStore.ts

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  subscribeBudget,
  subscribeMonthlyExpenses,
  setBudget as fsSetBudget,
  updateBudget as fsUpdateBudget,
  addExpense as fsAddExpense,
} from '../services/walletService';
import { Expense, AddExpensePayload, ExpenseCategory } from '../component/types';

export interface BudgetStore {
  budget: number;
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  totalSpent: number;
  remaining: number;
  budgetUsedPercent: number;
  categoryTotals: Partial<Record<ExpenseCategory, number>>;
  handleSetBudget: (amount: number) => Promise<void>;
  handleUpdateBudget: (amount: number) => Promise<void>;  // ← was missing
  handleAddExpense: (payload: AddExpensePayload) => Promise<void>;
}

const useBudgetStore = (): BudgetStore => {
  // ── State ── (hooks must come before any logic)
  const [budget, setBudgetState] = useState<number>(0);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [budgetReady, setBudgetReady] = useState(false);
  const [expensesReady, setExpensesReady] = useState(false);

  const loading = !budgetReady || !expensesReady;

  // ── Listeners ─────────────────────────────
  useEffect(() => {
    const unsubBudget = subscribeBudget(
      (val: number) => {
        setBudgetState(val);
        setBudgetReady(true);
      },
      (err: Error) => {
        setError(err.message);
        setBudgetReady(true);
      },
    );

    const unsubExpenses = subscribeMonthlyExpenses(
      (items: Expense[]) => {
        setExpenses(items);
        setExpensesReady(true);
      },
      (err: Error) => {
        setError(err.message);
        setExpensesReady(true);
      },
    );

    return () => {
      unsubBudget();
      unsubExpenses();
    };
  }, []);

  // ── Derived values ─────────────────────────
  const totalSpent = useMemo(
    () => expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0),
    [expenses],
  );

  const remaining = useMemo(
    () => budget - totalSpent,
    [budget, totalSpent],
  );

  const budgetUsedPercent = useMemo(
    () => budget > 0 ? Math.min(Math.round((totalSpent / budget) * 100), 100) : 0,
    [totalSpent, budget],
  );

  const categoryTotals = useMemo(() => {
    const map: Partial<Record<ExpenseCategory, number>> = {};
    expenses.forEach(({ category, amount }) => {
      map[category] = (map[category] ?? 0) + amount;
    });
    return map;
  }, [expenses]);

  // ── Actions ────────────────────────────────
  const handleSetBudget = useCallback(
    async (amount: number): Promise<void> => { await fsSetBudget(amount); },
    [],
  );

  const handleUpdateBudget = useCallback(
    async (amount: number): Promise<void> => { await fsUpdateBudget(amount); },
    [],
  );

  const handleAddExpense = useCallback(
    async (payload: AddExpensePayload): Promise<void> => { await fsAddExpense(payload); },
    [],
  );

  return {
    budget,
    expenses,
    loading,
    error,
    totalSpent,
    remaining,
    budgetUsedPercent,
    categoryTotals,
    handleSetBudget,
    handleUpdateBudget,
    handleAddExpense,
  };
};

export default useBudgetStore;