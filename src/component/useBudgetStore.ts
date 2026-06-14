// useBudgetStore.ts

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  subscribeBudget,
  subscribeMonthlyExpenses,
  setBudget as fsSetBudget,
  updateBudget as fsUpdateBudget,
  addExpense as fsAddExpense,
  fetchAvailableMonths,
} from '../services/walletServiceoffline';
import { Expense, AddExpensePayload, ExpenseCategory } from '../component/types';

const currentMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export interface BudgetStore {
  budget: number;
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  totalSpent: number;
  remaining: number;
  budgetUsedPercent: number;
  categoryTotals: Partial<Record<ExpenseCategory, number>>;
  selectedMonth: string;
  isCurrentMonth: boolean;
  availableMonths: string[];
  setSelectedMonth: (month: string) => void;
  handleSetBudget: (amount: number) => Promise<void>;
  handleUpdateBudget: (amount: number) => Promise<void>;
  handleAddExpense: (payload: AddExpensePayload) => Promise<void>;
}

const useBudgetStore = (): BudgetStore => {
  // ── State ──
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth());
  const [budget, setBudgetState] = useState<number>(0);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [budgetReady, setBudgetReady] = useState(false);
  const [expensesReady, setExpensesReady] = useState(false);
  const [availableMonths, setAvailableMonths] = useState<string[]>([currentMonth()]);

  const loading = !budgetReady || !expensesReady;
  const isCurrentMonth = selectedMonth === currentMonth();

  // ── Listeners — re-subscribe whenever selectedMonth changes ──
  useEffect(() => {
    setBudgetReady(false);
    setExpensesReady(false);

    const unsubBudget = subscribeBudget(
      selectedMonth,
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
      selectedMonth,
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
  }, [selectedMonth]);

  // ── Load available months once (and refresh after writes) ──
  const refreshAvailableMonths = useCallback(async () => {
    try {
      const months = await fetchAvailableMonths();
      setAvailableMonths(months);
    } catch (e) {
      // Non-fatal — month picker just shows current month
    }
  }, []);

  useEffect(() => {
    refreshAvailableMonths();
  }, [refreshAvailableMonths]);

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

  // "Set Budget" button — new budget cycle, resets expenses, creates
  // fresh expense ids going forward. Only meaningful for current month.
  const handleSetBudget = useCallback(
    async (amount: number): Promise<void> => {
      await fsSetBudget(amount, selectedMonth);
      await refreshAvailableMonths();
    },
    [selectedMonth, refreshAvailableMonths],
  );

  // Tap budget value on card — edits the budget for the currently
  // viewed month in place, no reset.
  const handleUpdateBudget = useCallback(
    async (amount: number): Promise<void> => {
      await fsUpdateBudget(amount, selectedMonth);
      await refreshAvailableMonths();
    },
    [selectedMonth, refreshAvailableMonths],
  );

  const handleAddExpense = useCallback(
    async (payload: AddExpensePayload): Promise<void> => {
      await fsAddExpense(payload);
      await refreshAvailableMonths();
    },
    [refreshAvailableMonths],
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
    selectedMonth,
    isCurrentMonth,
    availableMonths,
    setSelectedMonth,
    handleSetBudget,
    handleUpdateBudget,
    handleAddExpense,
  };
};

export default useBudgetStore;