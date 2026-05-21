import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabaseClient';

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'CREDIT_CARD';
export type TransactionStatus = 'OPEN' | 'PAID' | 'RECEIVED' | 'OVERDUE';

export interface Bank {
  id: string;
  name: string;
  type: 'CHECKING' | 'SAVINGS' | 'INVESTMENT' | 'WALLET' | 'CASH';
  initialBalance: number;
  currentBalance: number;
  color: string;
  notes?: string;
  icon?: string;
}

export interface CreditCard {
  id: string;
  name: string;
  bankId: string;
  brand: string;
  lastFour: string;
  totalLimit: number;
  usedLimit: number;
  availableLimit: number;
  closingDay: number;
  dueDay: number;
  color: string;
  notes?: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE' | 'BOTH';
  color: string;
  icon: string;
  monthlyGoal?: number;
  isActive: boolean;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  categoryId: string;
  bankId?: string;
  creditCardId?: string;
  competenceDate: string; // ISO date string
  dueDate: string; // ISO date string
  paymentDate?: string; // ISO date string
  status: TransactionStatus;
  isRecurring: boolean;
  isInstallment: boolean;
  isPartial?: boolean;
  notes?: string;
  createdAt?: string; // ISO date string
  installmentTotal?: number;
  installmentCurrent?: number;
  recurringExclusions?: string[]; // Array of "YYYY-MM"
  linkedGoalId?: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadlineDate: string;
  type: 'SAVINGS' | 'SPENDING_LIMIT';
  categoryId?: string;
  bankId?: string;
  color?: string;
  icon?: string;
}

export interface Reminder {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  isCompleted: boolean;
  createdAt: string;
  transactionId?: string;
  method?: string;
  whatsappSent?: boolean;
}

export interface User {
  id: string;
  username: string;
  name: string;
  password?: string;
  phone: string;
  avatar?: string;
}

interface AppState {
  theme: 'dark' | 'light';
  banks: Bank[];
  creditCards: CreditCard[];
  categories: Category[];
  transactions: Transaction[];
  goals: Goal[];
  toggleTheme: () => void;
  // Actions
  addBank: (bank: Omit<Bank, 'id'>) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => string;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'isActive'>) => Promise<string>;
  updateCategory: (id: string, category: Partial<Category>) => Promise<void>;
  markTransactionAsPaid: (id: string, paymentDate: string) => Promise<void>;
  addGoal: (goal: Omit<Goal, 'id'>) => Promise<void>;
  updateGoal: (id: string, goal: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addCreditCard: (card: Omit<CreditCard, 'id' | 'availableLimit' | 'usedLimit'>) => Promise<void>;
  updateCreditCard: (id: string, card: Partial<CreditCard>) => Promise<void>;
  deleteCreditCard: (id: string) => Promise<void>;
  excludeRecurringMonth: (originalId: string, monthYear: string) => Promise<void>;
  payAllOverdue: () => Promise<void>;
  addReminder: (reminder: Omit<Reminder, 'id' | 'isCompleted' | 'createdAt'>) => Promise<void>;
  updateReminder: (id: string, reminder: Partial<Reminder>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  completeReminder: (id: string) => Promise<void>;
  reminders: Reminder[];
  notifications: Notification[];

  // User auth fields
  currentUser: User | null;
  registerUser: (user: Omit<User, 'id'>) => Promise<boolean>;
  loginUser: (username: string, password?: string) => Promise<boolean>;
  logoutUser: () => Promise<void>;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
}

export interface Notification {
  id: string;
  type: 'OVERDUE' | 'DUE_SOON' | 'INFO';
  title: string;
  message: string;
  date: string;
  transactionId?: string;
  amount?: number;
  isIncome?: boolean;
}

const mockCategories: Category[] = [
  { id: 'cat-1', name: 'Alimentação', type: 'EXPENSE', color: '#ff6b6b', icon: 'utensils', isActive: true, monthlyGoal: 1500 },
  { id: 'cat-2', name: 'Moradia', type: 'EXPENSE', color: '#4dabf7', icon: 'home', isActive: true, monthlyGoal: 2500 },
  { id: 'cat-reimb', name: 'Empréstimos/Reembolsos', type: 'BOTH', color: '#fd7e14', icon: 'hand-coins', isActive: true },
  { id: 'cat-3', name: 'Salário', type: 'INCOME', color: '#51cf66', icon: 'briefcase', isActive: true },
];

const mockBanks: Bank[] = [
  { id: 'bank-1', name: 'Nubank', type: 'CHECKING', initialBalance: 0, currentBalance: 3450.00, color: '#8A05BE', icon: 'bank' },
  { id: 'bank-2', name: 'Itaú Personalité', type: 'CHECKING', initialBalance: 0, currentBalance: 12500.00, color: '#EC7000', icon: 'bank' },
];

const mockCards: CreditCard[] = [
  { id: 'cc-1', name: 'Nubank Ultravioleta', bankId: 'bank-1', brand: 'Mastercard', lastFour: '4321', totalLimit: 15000, usedLimit: 4500, availableLimit: 10500, closingDay: 5, dueDay: 12, color: '#4a0367' },
  { id: 'cc-2', name: 'Itaú Black', bankId: 'bank-2', brand: 'Visa', lastFour: '9876', totalLimit: 30000, usedLimit: 2500, availableLimit: 27500, closingDay: 10, dueDay: 20, color: '#1a1a1a' },
];

const mockTransactions: Transaction[] = [
  { id: 't-1', type: 'INCOME', description: 'Salário', amount: 15000, categoryId: 'cat-3', bankId: 'bank-2', competenceDate: new Date().toISOString(), dueDate: new Date().toISOString(), paymentDate: new Date().toISOString(), status: 'RECEIVED', isRecurring: true, isInstallment: false },
  { id: 't-2', type: 'EXPENSE', description: 'Mercado', amount: 840.50, categoryId: 'cat-1', bankId: 'bank-1', competenceDate: new Date().toISOString(), dueDate: new Date().toISOString(), paymentDate: new Date().toISOString(), status: 'PAID', isRecurring: false, isInstallment: false },
  { id: 't-3', type: 'EXPENSE', description: 'Aluguel', amount: 2500, categoryId: 'cat-2', bankId: 'bank-2', competenceDate: new Date().toISOString(), dueDate: new Date(new Date().getTime() + 86400000 * 5).toISOString(), status: 'OPEN', isRecurring: true, isInstallment: false },
];

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // States per user
  const [banks, setBanks] = useState<Bank[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  // Track state loading
  const [isLoaded, setIsLoaded] = useState(false);

  // Listen to Supabase Session changes on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfileAndSetUser(session.user);
      } else {
        setCurrentUser(null);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await fetchProfileAndSetUser(session.user);
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfileAndSetUser = async (supabaseUser: any) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error);
      }

      setCurrentUser({
        id: supabaseUser.id,
        username: profile?.username || supabaseUser.email?.split('@')[0] || 'user',
        name: profile?.name || supabaseUser.user_metadata?.name || 'User',
        phone: profile?.phone || '',
        avatar: profile?.avatar || '👑'
      });
    } catch (e) {
      console.error('Error setting profile state:', e);
    }
  };

  // Seed default data for first-time users
  const seedDefaultDataForUser = async (uId: string) => {
    try {
      // 1. Seed Banks
      const dbBanks = mockBanks.map(b => ({
        id: b.id,
        user_id: uId,
        name: b.name,
        type: b.type,
        initial_balance: b.initialBalance,
        current_balance: b.currentBalance,
        color: b.color,
        icon: b.icon
      }));
      await supabase.from('banks').insert(dbBanks);

      // 2. Seed Credit Cards
      const dbCards = mockCards.map(c => ({
        id: c.id,
        user_id: uId,
        name: c.name,
        bank_id: c.bankId,
        brand: c.brand,
        last_four: c.lastFour,
        total_limit: c.totalLimit,
        used_limit: c.usedLimit,
        available_limit: c.availableLimit,
        closing_day: c.closingDay,
        due_day: c.dueDay,
        color: c.color
      }));
      await supabase.from('credit_cards').insert(dbCards);

      // 3. Seed Transactions
      const dbTransactions = mockTransactions.map(t => ({
        id: t.id,
        user_id: uId,
        type: t.type,
        description: t.description,
        amount: t.amount,
        category_id: t.categoryId,
        bank_id: t.bankId,
        competence_date: t.competenceDate,
        due_date: t.dueDate,
        payment_date: t.paymentDate,
        status: t.status,
        is_recurring: t.isRecurring,
        is_installment: t.isInstallment,
        created_at: new Date().toISOString()
      }));
      await supabase.from('transactions').insert(dbTransactions);

      // Instantly populates local states
      setBanks(mockBanks);
      setCreditCards(mockCards);
      setCategories(mockCategories);
      setTransactions(mockTransactions);
      setGoals([]);
      setReminders([]);
    } catch (err) {
      console.error("Error seeding default user data:", err);
    }
  };

  // Synchronise arrays whenever currentUser changes
  useEffect(() => {
    if (currentUser) {
      setIsLoaded(false);
      const uId = currentUser.id;

      const loadUserData = async () => {
        try {
          const [
            { data: dbBanks },
            { data: dbCards },
            { data: dbCategories },
            { data: dbTransactions },
            { data: dbGoals },
            { data: dbReminders }
          ] = await Promise.all([
            supabase.from('banks').select('*').eq('user_id', uId),
            supabase.from('credit_cards').select('*').eq('user_id', uId),
            supabase.from('categories').select('*'), // RLS handles categories selection automatically
            supabase.from('transactions').select('*').eq('user_id', uId),
            supabase.from('goals').select('*').eq('user_id', uId),
            supabase.from('reminders').select('*').eq('user_id', uId)
          ]);

          if (!dbBanks || dbBanks.length === 0) {
            // First time user, seed!
            await seedDefaultDataForUser(uId);
          } else {
            setBanks(dbBanks.map(b => ({
              id: b.id,
              name: b.name,
              type: b.type,
              initialBalance: Number(b.initial_balance),
              currentBalance: Number(b.current_balance),
              color: b.color,
              notes: b.notes,
              icon: b.icon
            })));

            setCreditCards((dbCards || []).map(c => ({
              id: c.id,
              name: c.name,
              bankId: c.bank_id,
              brand: c.brand,
              lastFour: c.last_four,
              totalLimit: Number(c.total_limit),
              usedLimit: Number(c.used_limit),
              availableLimit: Number(c.available_limit),
              closingDay: c.closing_day,
              dueDay: c.due_day,
              color: c.color,
              notes: c.notes
            })));

            // Merge local mocks with DB categories to ensure defaults are always available
            const mergedCategories = [...mockCategories];
            (dbCategories || []).forEach(dbc => {
              if (!mergedCategories.some(mc => mc.id === dbc.id)) {
                mergedCategories.push({
                  id: dbc.id,
                  name: dbc.name,
                  type: dbc.type,
                  color: dbc.color,
                  icon: dbc.icon,
                  monthlyGoal: dbc.monthly_goal ? Number(dbc.monthly_goal) : undefined,
                  isActive: dbc.is_active
                });
              }
            });
            setCategories(mergedCategories);

            setTransactions((dbTransactions || []).map(t => ({
              id: t.id,
              type: t.type,
              description: t.description,
              amount: Number(t.amount),
              categoryId: t.category_id,
              bankId: t.bank_id,
              creditCardId: t.credit_card_id,
              competenceDate: t.competence_date,
              dueDate: t.due_date,
              paymentDate: t.payment_date,
              status: t.status,
              isRecurring: t.is_recurring,
              isInstallment: t.is_installment,
              isPartial: t.is_partial,
              notes: t.notes,
              createdAt: t.created_at,
              installmentTotal: t.installment_total,
              installmentCurrent: t.installment_current,
              recurringExclusions: t.recurring_exclusions || [],
              linkedGoalId: t.linked_goal_id
            })));

            setGoals((dbGoals || []).map(g => ({
              id: g.id,
              name: g.name,
              targetAmount: Number(g.target_amount),
              currentAmount: Number(g.current_amount),
              deadlineDate: g.deadline_date,
              type: g.type,
              categoryId: g.category_id,
              bankId: g.bank_id,
              color: g.color,
              icon: g.icon
            })));

            setReminders((dbReminders || []).map(r => ({
              id: r.id,
              title: r.title,
              description: r.description,
              dueDate: r.due_date,
              isCompleted: r.is_completed,
              createdAt: r.created_at,
              transactionId: r.transaction_id,
              method: r.method,
              whatsappSent: r.whatsapp_sent
            })));
          }

          setIsLoaded(true);
        } catch (e) {
          console.error("Error loading user state from Supabase:", e);
        }
      };

      loadUserData();
    } else {
      setBanks([]);
      setCreditCards([]);
      setCategories([]);
      setTransactions([]);
      setGoals([]);
      setReminders([]);
      setIsLoaded(false);
    }
  }, [currentUser]);

  const notifications: Notification[] = (() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const list: Notification[] = [];

    // Real transactions
    transactions.filter(t => t.status === 'OPEN').forEach(t => {
      const dueDate = new Date(t.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      if (t.createdAt) {
        const createdDate = new Date(t.createdAt);
        createdDate.setHours(0, 0, 0, 0);
        if (createdDate.getTime() >= dueDate.getTime()) {
          return;
        }
      }

      if (dueDate < now) {
        list.push({
          id: `notify-overdue-${t.id}`,
          type: 'OVERDUE',
          title: t.type === 'INCOME' ? 'Receita Atrasada' : 'Despesa Atrasada',
          message: `${t.description} de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}`,
          date: t.dueDate,
          transactionId: t.id,
          amount: t.amount,
          isIncome: t.type === 'INCOME'
        });
      } else if (dueDate.getTime() <= tomorrow.getTime()) {
        list.push({
          id: `notify-soon-${t.id}`,
          type: 'DUE_SOON',
          title: dueDate.getTime() === now.getTime() ? 'Vence Hoje' : 'Vence Amanhã',
          message: `${t.description} de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}`,
          date: t.dueDate,
          transactionId: t.id,
          amount: t.amount,
          isIncome: t.type === 'INCOME'
        });
      }
    });

    return list.sort((a, b) => {
      if (a.type === 'OVERDUE' && b.type !== 'OVERDUE') return -1;
      if (a.type !== 'OVERDUE' && b.type === 'OVERDUE') return 1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  })();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const addBank = async (bank: Omit<Bank, 'id'>) => {
    if (!currentUser) return;
    const newId = uuidv4();
    const newBank = { ...bank, id: newId };
    setBanks(prev => [...prev, newBank]);

    await supabase.from('banks').insert({
      id: newId,
      user_id: currentUser.id,
      name: bank.name,
      type: bank.type,
      initial_balance: bank.initialBalance,
      current_balance: bank.currentBalance,
      color: bank.color,
      notes: bank.notes,
      icon: bank.icon
    });
  };

  const addTransaction = (t: Omit<Transaction, 'id'>) => {
    if (!currentUser) return '';
    const newId = uuidv4();
    const newTransaction = {
      ...t,
      id: newId,
      createdAt: t.createdAt || new Date().toISOString()
    };
    setTransactions(prev => [...prev, newTransaction]);
    
    // Update bank balance if paid/received
    if (t.status === 'PAID' || t.status === 'RECEIVED') {
      setBanks(prev => prev.map(bank => {
        if (bank.id === t.bankId) {
          const amount = t.type === 'INCOME' ? t.amount : -t.amount;
          const updatedBal = bank.currentBalance + amount;
          
          supabase.from('banks').update({ current_balance: updatedBal }).eq('id', bank.id).then();
          
          return { ...bank, currentBalance: updatedBal };
        }
        return bank;
      }));
    }

    // Update credit card limit if it's an expense on a card
    if (t.type === 'EXPENSE' && t.creditCardId) {
      setCreditCards(prev => prev.map(card => {
        if (card.id === t.creditCardId) {
          const updatedUsed = card.usedLimit + t.amount;
          const updatedAvail = card.availableLimit - t.amount;

          supabase.from('credit_cards').update({
            used_limit: updatedUsed,
            available_limit: updatedAvail
          }).eq('id', card.id).then();

          return {
            ...card,
            usedLimit: updatedUsed,
            availableLimit: updatedAvail
          };
        }
        return card;
      }));
    }

    // Update goal if it's already paid and linked
    if (t.linkedGoalId && t.type === 'EXPENSE' && (t.status === 'PAID' || t.status === 'RECEIVED')) {
       setGoals(prevGoals => prevGoals.map(goal => {
         if (goal.id === t.linkedGoalId) {
           const updatedAmt = goal.currentAmount + t.amount;
           supabase.from('goals').update({ current_amount: updatedAmt }).eq('id', goal.id).then();
           return { ...goal, currentAmount: updatedAmt };
         }
         return goal;
       }));
    }

    // Reimbursement logic
    if (t.type === 'EXPENSE' && t.categoryId === 'cat-reimb') {
      const now = new Date();
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      lastDayOfMonth.setHours(23, 59, 59, 999);

      const incomeTransaction: Omit<Transaction, 'id'> = {
        type: 'INCOME',
        description: `Reembolso: ${t.description}`,
        amount: t.amount,
        categoryId: 'cat-reimb',
        bankId: t.bankId,
        competenceDate: t.competenceDate,
        dueDate: lastDayOfMonth.toISOString(),
        status: 'OPEN',
        isRecurring: false,
        isInstallment: false,
        notes: `Gerado automaticamente a partir da despesa: ${t.description}`
      };

      setTimeout(() => addTransaction(incomeTransaction), 100);
    }

    supabase.from('transactions').insert({
      id: newId,
      user_id: currentUser.id,
      type: t.type,
      description: t.description,
      amount: t.amount,
      category_id: t.categoryId,
      bank_id: t.bankId,
      credit_card_id: t.creditCardId,
      competence_date: t.competenceDate,
      due_date: t.dueDate,
      payment_date: t.paymentDate,
      status: t.status,
      is_recurring: t.isRecurring,
      is_installment: t.isInstallment,
      is_partial: t.isPartial || false,
      notes: t.notes,
      installment_total: t.installmentTotal,
      installment_current: t.installmentCurrent,
      recurring_exclusions: t.recurringExclusions || [],
      linked_goal_id: t.linkedGoalId
    }).then();

    return newId;
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    setTransactions(prev => prev.map(t => {
      if (t.id === id) {
        // Handle credit card limit updates
        if (t.type === 'EXPENSE' || updates.type === 'EXPENSE') {
          const oldCardId = t.creditCardId;
          const newCardId = updates.creditCardId !== undefined ? updates.creditCardId : oldCardId;
          const oldAmount = t.amount;
          const newAmount = updates.amount !== undefined ? updates.amount : oldAmount;

          if (oldCardId || newCardId) {
            setCreditCards(prevCards => prevCards.map(card => {
              let updatedCard = { ...card };
              if (card.id === oldCardId) {
                updatedCard.usedLimit -= oldAmount;
                updatedCard.availableLimit += oldAmount;
              }
              if (card.id === newCardId) {
                updatedCard.usedLimit += newAmount;
                updatedCard.availableLimit -= newAmount;
              }

              supabase.from('credit_cards').update({
                used_limit: updatedCard.usedLimit,
                available_limit: updatedCard.availableLimit
              }).eq('id', card.id).then();

              return updatedCard;
            }));
          }
        }

        // Reverse old balance impact if status changed
        const oldPaid = t.status === 'PAID' || t.status === 'RECEIVED';
        const newPaid = updates.status === 'PAID' || updates.status === 'RECEIVED' || (updates.status === undefined && oldPaid);

        if (oldPaid && !newPaid) {
          setBanks(prevBanks => prevBanks.map(bank => {
            if (bank.id === t.bankId) {
              const amount = t.type === 'INCOME' ? -t.amount : t.amount;
              const updatedBal = bank.currentBalance + amount;
              supabase.from('banks').update({ current_balance: updatedBal }).eq('id', bank.id).then();
              return { ...bank, currentBalance: updatedBal };
            }
            return bank;
          }));
        } else if (!oldPaid && newPaid) {
          setBanks(prevBanks => prevBanks.map(bank => {
            if (bank.id === (updates.bankId || t.bankId)) {
              const amount = (updates.type || t.type) === 'INCOME' ? (updates.amount || t.amount) : -(updates.amount || t.amount);
              const updatedBal = bank.currentBalance + amount;
              supabase.from('banks').update({ current_balance: updatedBal }).eq('id', bank.id).then();
              return { ...bank, currentBalance: updatedBal };
            }
            return bank;
          }));
        } else if (oldPaid && newPaid) {
          setBanks(prevBanks => prevBanks.map(bank => {
            if (bank.id === (updates.bankId || t.bankId) && bank.id === t.bankId) {
              const oldAmt = t.type === 'INCOME' ? t.amount : -t.amount;
              const newAmt = (updates.type || t.type) === 'INCOME' ? (updates.amount || t.amount) : -(updates.amount || t.amount);
              const updatedBal = bank.currentBalance - oldAmt + newAmt;
              supabase.from('banks').update({ current_balance: updatedBal }).eq('id', bank.id).then();
              return { ...bank, currentBalance: updatedBal };
            }
            if (updates.bankId && updates.bankId !== t.bankId) {
                if (bank.id === t.bankId) {
                    const updatedBal = bank.currentBalance - (t.type === 'INCOME' ? t.amount : -t.amount);
                    supabase.from('banks').update({ current_balance: updatedBal }).eq('id', bank.id).then();
                    return { ...bank, currentBalance: updatedBal };
                }
                if (bank.id === updates.bankId) {
                    const updatedBal = bank.currentBalance + ((updates.type || t.type) === 'INCOME' ? (updates.amount || t.amount) : -(updates.amount || t.amount));
                    supabase.from('banks').update({ current_balance: updatedBal }).eq('id', bank.id).then();
                    return { ...bank, currentBalance: updatedBal };
                }
            }
            return bank;
          }));
        }

        // Save actual updates to Supabase
        supabase.from('transactions').update({
          type: updates.type || t.type,
          description: updates.description || t.description,
          amount: updates.amount !== undefined ? updates.amount : t.amount,
          category_id: updates.categoryId || t.categoryId,
          bank_id: updates.bankId !== undefined ? updates.bankId : t.bankId,
          credit_card_id: updates.creditCardId !== undefined ? updates.creditCardId : t.creditCardId,
          competence_date: updates.competenceDate || t.competenceDate,
          due_date: updates.dueDate || t.dueDate,
          payment_date: updates.paymentDate !== undefined ? updates.paymentDate : t.paymentDate,
          status: updates.status || t.status,
          is_recurring: updates.isRecurring !== undefined ? updates.isRecurring : t.isRecurring,
          is_installment: updates.isInstallment !== undefined ? updates.isInstallment : t.isInstallment,
          is_partial: updates.isPartial !== undefined ? updates.isPartial : t.isPartial,
          notes: updates.notes !== undefined ? updates.notes : t.notes,
          installment_total: updates.installmentTotal !== undefined ? updates.installmentTotal : t.installmentTotal,
          installment_current: updates.installmentCurrent !== undefined ? updates.installmentCurrent : t.installmentCurrent,
          recurring_exclusions: updates.recurringExclusions || t.recurringExclusions,
          linked_goal_id: updates.linkedGoalId !== undefined ? updates.linkedGoalId : t.linkedGoalId
        }).eq('id', id).then();

        return { ...t, ...updates };
      }
      return t;
    }));
  };

  const deleteTransaction = async (id: string) => {
    const t = transactions.find(tx => tx.id === id);
    if (!t) return;

    if (t.status === 'PAID' || t.status === 'RECEIVED') {
      setBanks(prev => prev.map(bank => {
        if (bank.id === t.bankId) {
          const amount = t.type === 'INCOME' ? -t.amount : t.amount;
          const updatedBal = bank.currentBalance + amount;
          supabase.from('banks').update({ current_balance: updatedBal }).eq('id', bank.id).then();
          return { ...bank, currentBalance: updatedBal };
        }
        return bank;
      }));
    }

    // Update credit card limit if it was an expense
    if (t.type === 'EXPENSE' && t.creditCardId) {
      setCreditCards(prev => prev.map(card => {
        if (card.id === t.creditCardId) {
          const updatedUsed = card.usedLimit - t.amount;
          const updatedAvail = card.availableLimit + t.amount;
          supabase.from('credit_cards').update({
            used_limit: updatedUsed,
            available_limit: updatedAvail
          }).eq('id', card.id).then();
          return {
            ...card,
            usedLimit: updatedUsed,
            availableLimit: updatedAvail
          };
        }
        return card;
      }));
    }

    setTransactions(prev => prev.filter(tx => tx.id !== id));
    await supabase.from('transactions').delete().eq('id', id);
  };

  const addCategory = async (cat: Omit<Category, 'id' | 'isActive'>) => {
    if (!currentUser) return '';
    const id = uuidv4();
    const newCat = {
      ...cat,
      id,
      isActive: true,
      color: cat.color || (cat.type === 'INCOME' ? '#51cf66' : '#ff6b6b'),
      icon: cat.icon || (cat.type === 'INCOME' ? 'plus-circle' : 'minus-circle')
    };
    setCategories(prev => [...prev, newCat]);

    await supabase.from('categories').insert({
      id,
      user_id: currentUser.id,
      name: cat.name,
      type: cat.type,
      color: newCat.color,
      icon: newCat.icon,
      monthly_goal: cat.monthlyGoal,
      is_active: true
    });

    return id;
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    await supabase.from('categories').update({
      name: updates.name,
      type: updates.type,
      color: updates.color,
      icon: updates.icon,
      monthly_goal: updates.monthlyGoal,
      is_active: updates.isActive
    }).eq('id', id);
  };

  const markTransactionAsPaid = async (id: string, paymentDate: string) => {
    setTransactions(prev => prev.map(t => {
      if (t.id === id) {
        const isPaid = t.status === 'PAID' || t.status === 'RECEIVED';
        if (!isPaid) {
          setBanks(prevBanks => prevBanks.map(bank => {
            if (bank.id === t.bankId) {
              const amount = t.type === 'INCOME' ? t.amount : -t.amount;
              const updatedBal = bank.currentBalance + amount;
              supabase.from('banks').update({ current_balance: updatedBal }).eq('id', bank.id).then();
              return { ...bank, currentBalance: updatedBal };
            }
            return bank;
          }));

          if (t.linkedGoalId && t.type === 'EXPENSE') {
             setGoals(prevGoals => prevGoals.map(goal => {
               if (goal.id === t.linkedGoalId) {
                 const updatedAmt = goal.currentAmount + t.amount;
                 supabase.from('goals').update({ current_amount: updatedAmt }).eq('id', goal.id).then();
                 return { ...goal, currentAmount: updatedAmt };
               }
               return goal;
             }));
          }
        }
        
        const finalStatus = t.type === 'INCOME' ? 'RECEIVED' : 'PAID';
        supabase.from('transactions').update({
          status: finalStatus,
          payment_date: paymentDate
        }).eq('id', id).then();

        return { ...t, status: finalStatus, paymentDate };
      }
      return t;
    }));
  };

  const addGoal = async (goal: Omit<Goal, 'id'>) => {
    if (!currentUser) return;
    const id = uuidv4();
    setGoals(prev => [...prev, { ...goal, id }]);

    await supabase.from('goals').insert({
      id,
      user_id: currentUser.id,
      name: goal.name,
      target_amount: goal.targetAmount,
      current_amount: goal.currentAmount,
      deadline_date: goal.deadlineDate,
      type: goal.type,
      category_id: goal.categoryId,
      bank_id: goal.bankId,
      color: goal.color,
      icon: goal.icon
    });
  };

  const updateGoal = async (id: string, updates: Partial<Goal>) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
    await supabase.from('goals').update({
      name: updates.name,
      target_amount: updates.targetAmount,
      current_amount: updates.currentAmount,
      deadline_date: updates.deadlineDate,
      type: updates.type,
      category_id: updates.categoryId,
      bank_id: updates.bankId,
      color: updates.color,
      icon: updates.icon
    }).eq('id', id);
  };

  const deleteGoal = async (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
    await supabase.from('goals').delete().eq('id', id);
  };

  const addCreditCard = async (card: Omit<CreditCard, 'id' | 'availableLimit' | 'usedLimit'>) => {
    if (!currentUser) return;
    const id = uuidv4();
    const newCard = {
      ...card,
      id,
      usedLimit: 0,
      availableLimit: card.totalLimit
    };
    setCreditCards(prev => [...prev, newCard]);

    await supabase.from('credit_cards').insert({
      id,
      user_id: currentUser.id,
      name: card.name,
      bank_id: card.bankId,
      brand: card.brand,
      last_four: card.lastFour,
      total_limit: card.totalLimit,
      used_limit: 0,
      available_limit: card.totalLimit,
      closing_day: card.closingDay,
      due_day: card.dueDay,
      color: card.color,
      notes: card.notes
    });
  };

  const updateCreditCard = async (id: string, updates: Partial<CreditCard>) => {
    setCreditCards(prev => prev.map(c => {
      if (c.id === id) {
        const updated = { ...c, ...updates };
        if (updates.totalLimit !== undefined) {
          updated.availableLimit = updates.totalLimit - updated.usedLimit;
        }

        supabase.from('credit_cards').update({
          name: updates.name || c.name,
          bank_id: updates.bankId !== undefined ? updates.bankId : c.bankId,
          brand: updates.brand || c.brand,
          last_four: updates.lastFour || c.lastFour,
          total_limit: updates.totalLimit !== undefined ? updates.totalLimit : c.totalLimit,
          used_limit: updated.usedLimit,
          available_limit: updated.availableLimit,
          closing_day: updates.closingDay !== undefined ? updates.closingDay : c.closingDay,
          due_day: updates.dueDay !== undefined ? updates.dueDay : c.dueDay,
          color: updates.color || c.color,
          notes: updates.notes !== undefined ? updates.notes : c.notes
        }).eq('id', id).then();

        return updated;
      }
      return c;
    }));
  };

  const deleteCreditCard = async (id: string) => {
    setCreditCards(prev => prev.filter(c => c.id !== id));
    await supabase.from('credit_cards').delete().eq('id', id);
  };

  const excludeRecurringMonth = async (originalId: string, monthYear: string) => {
    setTransactions(prev => prev.map(t => {
      if (t.id === originalId) {
        const exclusions = t.recurringExclusions || [];
        if (!exclusions.includes(monthYear)) {
          const newExclusions = [...exclusions, monthYear];
          supabase.from('transactions').update({
            recurring_exclusions: newExclusions
          }).eq('id', originalId).then();
          return { ...t, recurringExclusions: newExclusions };
        }
      }
      return t;
    }));
  };

  const payAllOverdue = async () => {
    const today = new Date().toISOString();
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const overdueIds = transactions
      .filter(t => t.status === 'OPEN' && new Date(t.dueDate).getTime() < now.getTime())
      .map(t => t.id);

    if (overdueIds.length === 0) return;

    setTransactions(prev => prev.map(t => {
      if (overdueIds.includes(t.id)) {
        setBanks(prevBanks => prevBanks.map(bank => {
          if (bank.id === t.bankId) {
            const amount = t.type === 'INCOME' ? t.amount : -t.amount;
            const updatedBal = bank.currentBalance + amount;
            supabase.from('banks').update({ current_balance: updatedBal }).eq('id', bank.id).then();
            return { ...bank, currentBalance: updatedBal };
          }
          return bank;
        }));

        supabase.from('transactions').update({
          status: t.type === 'INCOME' ? 'RECEIVED' : 'PAID',
          payment_date: today
        }).eq('id', t.id).then();

        return { ...t, status: t.type === 'INCOME' ? 'RECEIVED' : 'PAID', paymentDate: today };
      }
      return t;
    }));
  };

  const addReminder = async (r: Omit<Reminder, 'id' | 'isCompleted' | 'createdAt'>) => {
    if (!currentUser) return;
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    setReminders(prev => [...prev, { ...r, id, isCompleted: false, createdAt }]);

    await supabase.from('reminders').insert({
      id,
      user_id: currentUser.id,
      title: r.title,
      description: r.description,
      due_date: r.dueDate,
      is_completed: false,
      transaction_id: r.transactionId,
      method: r.method,
      whatsapp_sent: false,
      created_at: createdAt
    });
  };

  const updateReminder = async (id: string, r: Partial<Reminder>) => {
    setReminders(prev => prev.map(item => item.id === id ? { ...item, ...r } : item));
    await supabase.from('reminders').update({
      title: r.title,
      description: r.description,
      due_date: r.dueDate,
      is_completed: r.isCompleted,
      transaction_id: r.transactionId,
      method: r.method,
      whatsapp_sent: r.whatsappSent
    }).eq('id', id);
  };

  const deleteReminder = async (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
    await supabase.from('reminders').delete().eq('id', id);
  };

  const completeReminder = async (id: string) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, isCompleted: true } : r));
    await supabase.from('reminders').update({ is_completed: true }).eq('id', id);
  };

  // User Auth Actions
  const registerUser = async (userData: Omit<User, 'id'>): Promise<boolean> => {
    try {
      const email = userData.username.includes('@')
        ? userData.username
        : `${userData.username.toLowerCase().trim()}@noblefinance.com`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password: userData.password || '123',
        options: {
          data: {
            name: userData.name
          }
        }
      });

      if (error) {
        console.error("Supabase Auth SignUp error:", error);
        return false;
      }

      const supabaseUser = data.user;
      if (!supabaseUser) return false;

      // Insert profile details
      const { error: profileError } = await supabase.from('profiles').insert({
        id: supabaseUser.id,
        username: userData.username.trim(),
        name: userData.name.trim(),
        phone: userData.phone,
        avatar: userData.avatar || '👑'
      });

      if (profileError) {
        console.error("Error creating public profile:", profileError);
      }

      // Pre-seed tables
      await seedDefaultDataForUser(supabaseUser.id);
      return true;
    } catch (e) {
      console.error("Error in registerUser action:", e);
      return false;
    }
  };

  const loginUser = async (username: string, password?: string): Promise<boolean> => {
    try {
      const email = username.includes('@')
        ? username
        : `${username.toLowerCase().trim()}@noblefinance.com`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: password || '123'
      });

      if (error) {
        console.error("Supabase Auth SignIn error:", error);
        return false;
      }

      if (data.user) {
        await fetchProfileAndSetUser(data.user);
        return true;
      }
      return false;
    } catch (e) {
      console.error("Error in loginUser action:", e);
      return false;
    }
  };

  const logoutUser = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const updateUserProfile = async (updates: Partial<User>) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, ...updates };
    setCurrentUser(updatedUser);

    await supabase.from('profiles').update({
      name: updates.name,
      phone: updates.phone,
      avatar: updates.avatar
    }).eq('id', currentUser.id);
  };

  return (
    <AppContext.Provider value={{
      theme, banks, creditCards, categories, transactions, goals, notifications,
      toggleTheme, addBank, addTransaction, updateTransaction, deleteTransaction, addCategory, updateCategory, markTransactionAsPaid,
      addGoal, updateGoal, deleteGoal, addCreditCard, updateCreditCard, deleteCreditCard, excludeRecurringMonth, payAllOverdue,
      addReminder, updateReminder, deleteReminder, completeReminder, reminders,
      currentUser, registerUser, loginUser, logoutUser, updateUserProfile
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
