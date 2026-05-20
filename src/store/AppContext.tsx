import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

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
  addBank: (bank: Omit<Bank, 'id'>) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => string;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  addCategory: (category: Omit<Category, 'id' | 'isActive'>) => string;
  updateCategory: (id: string, category: Partial<Category>) => void;
  markTransactionAsPaid: (id: string, paymentDate: string) => void;
  addGoal: (goal: Omit<Goal, 'id'>) => void;
  updateGoal: (id: string, goal: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  addCreditCard: (card: Omit<CreditCard, 'id' | 'availableLimit' | 'usedLimit'>) => void;
  updateCreditCard: (id: string, card: Partial<CreditCard>) => void;
  deleteCreditCard: (id: string) => void;
  excludeRecurringMonth: (originalId: string, monthYear: string) => void;
  payAllOverdue: () => void;
  addReminder: (reminder: Omit<Reminder, 'id' | 'isCompleted' | 'createdAt'>) => void;
  updateReminder: (id: string, reminder: Partial<Reminder>) => void;
  deleteReminder: (id: string) => void;
  completeReminder: (id: string) => void;
  reminders: Reminder[];
  notifications: Notification[];

  // User auth fields
  users: User[];
  currentUser: User | null;
  registerUser: (user: Omit<User, 'id'>) => boolean;
  loginUser: (username: string, password?: string) => boolean;
  logoutUser: () => void;
  updateUserProfile: (updates: Partial<User>) => void;
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

  // User Authentication State
  const [users, setUsers] = useState<User[]>(() => {
    const stored = localStorage.getItem('noble_users');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        // fallback
      }
    }
    // Setup default initial user
    const defaultUser: User = {
      id: 'default-user-id',
      username: 'noble',
      password: '123',
      name: 'Noble Admin',
      phone: '5511999999999',
      avatar: '👑'
    };
    const initialUsers = [defaultUser];
    localStorage.setItem('noble_users', JSON.stringify(initialUsers));
    return initialUsers;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('noble_current_user');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        // fallback
      }
    }
    return null;
  });

  // State managed per user
  const [banks, setBanks] = useState<Bank[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  // Track state loading prevents saves while switching
  const [isLoaded, setIsLoaded] = useState(false);

  // Synchronise arrays whenever currentUser changes
  useEffect(() => {
    if (currentUser) {
      setIsLoaded(false);
      const uId = currentUser.id;
      
      const savedBanks = localStorage.getItem(`noble_user_banks_${uId}`);
      const savedCards = localStorage.getItem(`noble_user_creditCards_${uId}`);
      const savedCategories = localStorage.getItem(`noble_user_categories_${uId}`);
      const savedTransactions = localStorage.getItem(`noble_user_transactions_${uId}`);
      const savedGoals = localStorage.getItem(`noble_user_goals_${uId}`);
      const savedReminders = localStorage.getItem(`noble_user_reminders_${uId}`);

      setBanks(savedBanks ? JSON.parse(savedBanks) : mockBanks);
      setCreditCards(savedCards ? JSON.parse(savedCards) : mockCards);
      setCategories(savedCategories ? JSON.parse(savedCategories) : mockCategories);
      setTransactions(savedTransactions ? JSON.parse(savedTransactions) : mockTransactions);
      setGoals(savedGoals ? JSON.parse(savedGoals) : []);
      setReminders(savedReminders ? JSON.parse(savedReminders) : []);

      // If user is brand new and didn't have saved arrays yet, save defaults right away
      if (!savedBanks) localStorage.setItem(`noble_user_banks_${uId}`, JSON.stringify(mockBanks));
      if (!savedCards) localStorage.setItem(`noble_user_creditCards_${uId}`, JSON.stringify(mockCards));
      if (!savedCategories) localStorage.setItem(`noble_user_categories_${uId}`, JSON.stringify(mockCategories));
      if (!savedTransactions) localStorage.setItem(`noble_user_transactions_${uId}`, JSON.stringify(mockTransactions));
      if (!savedGoals) localStorage.setItem(`noble_user_goals_${uId}`, JSON.stringify([]));
      if (!savedReminders) localStorage.setItem(`noble_user_reminders_${uId}`, JSON.stringify([]));

      setIsLoaded(true);
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

  // Persists to localStorage only when fully loaded and when there's an active user
  useEffect(() => {
    if (currentUser && isLoaded) {
      localStorage.setItem(`noble_user_banks_${currentUser.id}`, JSON.stringify(banks));
    }
  }, [banks, currentUser, isLoaded]);

  useEffect(() => {
    if (currentUser && isLoaded) {
      localStorage.setItem(`noble_user_creditCards_${currentUser.id}`, JSON.stringify(creditCards));
    }
  }, [creditCards, currentUser, isLoaded]);

  useEffect(() => {
    if (currentUser && isLoaded) {
      localStorage.setItem(`noble_user_categories_${currentUser.id}`, JSON.stringify(categories));
    }
  }, [categories, currentUser, isLoaded]);

  useEffect(() => {
    if (currentUser && isLoaded) {
      localStorage.setItem(`noble_user_transactions_${currentUser.id}`, JSON.stringify(transactions));
    }
  }, [transactions, currentUser, isLoaded]);

  useEffect(() => {
    if (currentUser && isLoaded) {
      localStorage.setItem(`noble_user_goals_${currentUser.id}`, JSON.stringify(goals));
    }
  }, [goals, currentUser, isLoaded]);

  useEffect(() => {
    if (currentUser && isLoaded) {
      localStorage.setItem(`noble_user_reminders_${currentUser.id}`, JSON.stringify(reminders));
    }
  }, [reminders, currentUser, isLoaded]);

  // Sync current user to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('noble_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('noble_current_user');
    }
  }, [currentUser]);

  // Sync users list to localStorage
  useEffect(() => {
    localStorage.setItem('noble_users', JSON.stringify(users));
  }, [users]);

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

      // Rule: if a transaction was created historically on or after its due date,
      // it means the user registered a past transaction directly. Do not trigger due/overdue alerts for it.
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
    // Apply theme class to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const addBank = (bank: Omit<Bank, 'id'>) => {
    setBanks(prev => [...prev, { ...bank, id: uuidv4() }]);
  };

  const addTransaction = (t: Omit<Transaction, 'id'>) => {
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
          return { ...bank, currentBalance: bank.currentBalance + amount };
        }
        return bank;
      }));
    }

    // Update credit card limit if it's an expense on a card
    if (t.type === 'EXPENSE' && t.creditCardId) {
      setCreditCards(prev => prev.map(card => {
        if (card.id === t.creditCardId) {
          return {
            ...card,
            usedLimit: card.usedLimit + t.amount,
            availableLimit: card.availableLimit - t.amount
          };
        }
        return card;
      }));
    }

    // Update goal if it's already paid and linked
    if (t.linkedGoalId && t.type === 'EXPENSE' && (t.status === 'PAID' || t.status === 'RECEIVED')) {
       setGoals(prevGoals => prevGoals.map(goal => {
         if (goal.id === t.linkedGoalId) {
           return { ...goal, currentAmount: goal.currentAmount + t.amount };
         }
         return goal;
       }));
    }

    // Reimbursement logic: if it's an expense in the reimbursement category, create a receivable
    if (t.type === 'EXPENSE' && t.categoryId === 'cat-reimb') {
      const now = new Date();
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      lastDayOfMonth.setHours(23, 59, 59, 999);

      const incomeTransaction: Transaction = {
        id: uuidv4(),
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

      setTransactions(prev => [...prev, incomeTransaction]);
    }

    return newId;
  };

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
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
              return updatedCard;
            }));
          }
        }

        // Reverse old balance impact if status changed
        const oldPaid = t.status === 'PAID' || t.status === 'RECEIVED';
        const newPaid = updates.status === 'PAID' || updates.status === 'RECEIVED' || (updates.status === undefined && oldPaid);

        if (oldPaid && !newPaid) {
          // Was paid, now not. Add back expense / subtract income
          setBanks(prevBanks => prevBanks.map(bank => {
            if (bank.id === t.bankId) {
              const amount = t.type === 'INCOME' ? -t.amount : t.amount;
              return { ...bank, currentBalance: bank.currentBalance + amount };
            }
            return bank;
          }));
        } else if (!oldPaid && newPaid) {
          // Was not paid, now is. Subtract expense / add income
          setBanks(prevBanks => prevBanks.map(bank => {
            if (bank.id === (updates.bankId || t.bankId)) {
              const amount = (updates.type || t.type) === 'INCOME' ? (updates.amount || t.amount) : -(updates.amount || t.amount);
              return { ...bank, currentBalance: bank.currentBalance + amount };
            }
            return bank;
          }));
        } else if (oldPaid && newPaid) {
          // Paid in both. Update balance with difference
          setBanks(prevBanks => prevBanks.map(bank => {
            if (bank.id === (updates.bankId || t.bankId) && bank.id === t.bankId) {
              const oldAmt = t.type === 'INCOME' ? t.amount : -t.amount;
              const newAmt = (updates.type || t.type) === 'INCOME' ? (updates.amount || t.amount) : -(updates.amount || t.amount);
              return { ...bank, currentBalance: bank.currentBalance - oldAmt + newAmt };
            }
            // Handle bank change while staying paid
            if (updates.bankId && updates.bankId !== t.bankId) {
                if (bank.id === t.bankId) {
                    return { ...bank, currentBalance: bank.currentBalance - (t.type === 'INCOME' ? t.amount : -t.amount) };
                }
                if (bank.id === updates.bankId) {
                    return { ...bank, currentBalance: bank.currentBalance + ((updates.type || t.type) === 'INCOME' ? (updates.amount || t.amount) : -(updates.amount || t.amount)) };
                }
            }
            return bank;
          }));
        }

        return { ...t, ...updates };
      }
      return t;
    }));
  };

  const deleteTransaction = (id: string) => {
    const t = transactions.find(tx => tx.id === id);
    if (!t) return;

    if (t.status === 'PAID' || t.status === 'RECEIVED') {
      setBanks(prev => prev.map(bank => {
        if (bank.id === t.bankId) {
          const amount = t.type === 'INCOME' ? -t.amount : t.amount;
          return { ...bank, currentBalance: bank.currentBalance + amount };
        }
        return bank;
      }));
    }

    // Update credit card limit if it was an expense
    if (t.type === 'EXPENSE' && t.creditCardId) {
      setCreditCards(prev => prev.map(card => {
        if (card.id === t.creditCardId) {
          return {
            ...card,
            usedLimit: card.usedLimit - t.amount,
            availableLimit: card.availableLimit + t.amount
          };
        }
        return card;
      }));
    }

    setTransactions(prev => prev.filter(tx => tx.id !== id));
  };

  const addCategory = (cat: Omit<Category, 'id' | 'isActive'>) => {
    const id = uuidv4();
    const newCat: Category = {
      ...cat,
      id,
      isActive: true,
      color: cat.color || (cat.type === 'INCOME' ? '#51cf66' : '#ff6b6b'),
      icon: cat.icon || (cat.type === 'INCOME' ? 'plus-circle' : 'minus-circle')
    };
    setCategories(prev => [...prev, newCat]);
    return id;
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const markTransactionAsPaid = (id: string, paymentDate: string) => {
    setTransactions(prev => prev.map(t => {
      if (t.id === id) {
        const isPaid = t.status === 'PAID' || t.status === 'RECEIVED';
        if (!isPaid) {
          // If was open and now paid, update balance
          setBanks(prevBanks => prevBanks.map(bank => {
            if (bank.id === t.bankId) {
              const amount = t.type === 'INCOME' ? t.amount : -t.amount;
              return { ...bank, currentBalance: bank.currentBalance + amount };
            }
            return bank;
          }));

          // Link to Goal currentAmount if applicable
          if (t.linkedGoalId && t.type === 'EXPENSE') {
             setGoals(prevGoals => prevGoals.map(goal => {
               if (goal.id === t.linkedGoalId) {
                 return { ...goal, currentAmount: goal.currentAmount + t.amount };
               }
               return goal;
             }));
          }
        }
        return { ...t, status: t.type === 'INCOME' ? 'RECEIVED' : 'PAID', paymentDate };
      }
      return t;
    }));
  };

  const addGoal = (goal: Omit<Goal, 'id'>) => {
    setGoals(prev => [...prev, { ...goal, id: uuidv4() }]);
  };

  const updateGoal = (id: string, updates: Partial<Goal>) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
  };

  const deleteGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const addCreditCard = (card: Omit<CreditCard, 'id' | 'availableLimit' | 'usedLimit'>) => {
    const newCard: CreditCard = {
      ...card,
      id: uuidv4(),
      usedLimit: 0,
      availableLimit: card.totalLimit
    };
    setCreditCards(prev => [...prev, newCard]);
  };

  const updateCreditCard = (id: string, updates: Partial<CreditCard>) => {
    setCreditCards(prev => prev.map(c => {
      if (c.id === id) {
        const updated = { ...c, ...updates };
        if (updates.totalLimit !== undefined) {
          updated.availableLimit = updates.totalLimit - updated.usedLimit;
        }
        return updated;
      }
      return c;
    }));
  };

  const deleteCreditCard = (id: string) => {
    setCreditCards(prev => prev.filter(c => c.id !== id));
  };

  const excludeRecurringMonth = (originalId: string, monthYear: string) => {
    setTransactions(prev => prev.map(t => {
      if (t.id === originalId) {
        const exclusions = t.recurringExclusions || [];
        if (!exclusions.includes(monthYear)) {
          return { ...t, recurringExclusions: [...exclusions, monthYear] };
        }
      }
      return t;
    }));
  };

  const payAllOverdue = () => {
    const today = new Date().toISOString();
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const overdueIds = transactions
      .filter(t => t.status === 'OPEN' && new Date(t.dueDate).getTime() < now.getTime())
      .map(t => t.id);

    if (overdueIds.length === 0) return;

    setTransactions(prev => prev.map(t => {
      if (overdueIds.includes(t.id)) {
        // Update bank balance
        setBanks(prevBanks => prevBanks.map(bank => {
          if (bank.id === t.bankId) {
            const amount = t.type === 'INCOME' ? t.amount : -t.amount;
            return { ...bank, currentBalance: bank.currentBalance + amount };
          }
          return bank;
        }));
        return { ...t, status: t.type === 'INCOME' ? 'RECEIVED' : 'PAID', paymentDate: today };
      }
      return t;
    }));
  };

  const addReminder = (r: Omit<Reminder, 'id' | 'isCompleted' | 'createdAt'>) => {
    const newReminder: Reminder = {
      ...r,
      id: uuidv4(),
      isCompleted: false,
      createdAt: new Date().toISOString()
    };
    setReminders(prev => [...prev, newReminder]);
  };

  const updateReminder = (id: string, r: Partial<Reminder>) => {
    setReminders(prev => prev.map(item => item.id === id ? { ...item, ...r } : item));
  };

  const deleteReminder = (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  const completeReminder = (id: string) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, isCompleted: true } : r));
  };

  // User auth actions
  const registerUser = (userData: Omit<User, 'id'>): boolean => {
    const exists = users.some(u => u.username.toLowerCase() === userData.username.toLowerCase());
    if (exists) {
      return false;
    }
    const newUser: User = {
      ...userData,
      id: uuidv4()
    };
    setUsers(prev => [...prev, newUser]);
    // Pre-create database records with initial templates so dashboard is alive
    localStorage.setItem(`noble_user_banks_${newUser.id}`, JSON.stringify(mockBanks));
    localStorage.setItem(`noble_user_creditCards_${newUser.id}`, JSON.stringify(mockCards));
    localStorage.setItem(`noble_user_categories_${newUser.id}`, JSON.stringify(mockCategories));
    localStorage.setItem(`noble_user_transactions_${newUser.id}`, JSON.stringify(mockTransactions));
    localStorage.setItem(`noble_user_goals_${newUser.id}`, JSON.stringify([]));
    localStorage.setItem(`noble_user_reminders_${newUser.id}`, JSON.stringify([]));
    return true;
  };

  const loginUser = (username: string, password?: string): boolean => {
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (user && user.password === password) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const logoutUser = () => {
    setCurrentUser(null);
  };

  const updateUserProfile = (updates: Partial<User>) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, ...updates };
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, ...updates } : u));
  };

  return (
    <AppContext.Provider value={{
      theme, banks, creditCards, categories, transactions, goals, notifications,
      toggleTheme, addBank, addTransaction, updateTransaction, deleteTransaction, addCategory, updateCategory, markTransactionAsPaid,
      addGoal, updateGoal, deleteGoal, addCreditCard, updateCreditCard, deleteCreditCard, excludeRecurringMonth, payAllOverdue,
      addReminder, updateReminder, deleteReminder, completeReminder, reminders,
      users, currentUser, registerUser, loginUser, logoutUser, updateUserProfile
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
