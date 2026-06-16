import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabaseClient';
import { format } from 'date-fns';

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
  excludeFromAnalysis?: boolean;
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
  excludeFromAnalysis?: boolean;
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
  affectLimitImmediately?: boolean;
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

export interface RecurringHistory {
  id: string;
  userId: string;
  transactionId: string;
  amount: number;
  effectiveFrom: string; // "YYYY-MM"
  createdAt: string;
}

interface AppState {
  theme: 'dark' | 'light';
  banks: Bank[];
  creditCards: CreditCard[];
  categories: Category[];
  transactions: Transaction[];
  goals: Goal[];
  recurringHistory: RecurringHistory[];
  defaultBankId: string | null;
  setDefaultBank: (bankId: string | null) => Promise<void>;
  toggleTheme: () => void;
  // Actions
  addBank: (bank: Omit<Bank, 'id'>, creditCardDetails?: Omit<CreditCard, 'id' | 'bankId' | 'availableLimit' | 'usedLimit'>) => Promise<void>;
  updateBank: (id: string, bank: Partial<Bank>) => Promise<void>;
  deleteBank: (id: string) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => string;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string, deleteAllInstallments?: boolean) => Promise<void>;
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
  addRecurringHistoryEntry: (transactionId: string, amount: number, effectiveFrom: string) => Promise<void>;
  cloneRecurringHistory: (oldTxId: string, newTxId: string) => Promise<void>;
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
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [defaultBankId, setDefaultBankId] = useState<string | null>(null);

  // States per user
  const [banks, setBanks] = useState<Bank[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [recurringHistory, setRecurringHistory] = useState<RecurringHistory[]>([]);

  // Track state loading
  const [isLoaded, setIsLoaded] = useState(false);

  const creditCardsRef = useRef<CreditCard[]>([]);
  const transactionsRef = useRef<Transaction[]>([]);

  useEffect(() => {
    creditCardsRef.current = creditCards;
  }, [creditCards]);

  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  // Listen to Supabase Session changes on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfileAndSetUser(session.user);
      } else {
        setCurrentUser(null);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Ignorar eventos SIGN_IN pois loginUser já faz o fetch para evitar race conditions
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
      } else if (event === 'INITIAL_SESSION' && session?.user) {
        fetchProfileAndSetUser(session.user);
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

  const syncCreditCardLimits = async (
    currentTransactions?: Transaction[],
    currentCards?: CreditCard[]
  ) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const txsToProcess = currentTransactions || transactionsRef.current;
    const cardsToProcess = currentCards || creditCardsRef.current;

    const updatedCards = cardsToProcess.map(card => {
      const cardExpenses = txsToProcess.filter(t => 
        t.type === 'EXPENSE' &&
        t.creditCardId === card.id &&
        t.status === 'OPEN' &&
        (t.affectLimitImmediately !== false || (t.dueDate ? t.dueDate.substring(0, 10) <= todayStr : true))
      );

      const newUsedLimit = cardExpenses.reduce((sum, t) => sum + t.amount, 0);
      const newAvailableLimit = card.totalLimit - newUsedLimit;

      return {
        ...card,
        usedLimit: newUsedLimit,
        availableLimit: newAvailableLimit
      };
    });

    setCreditCards(updatedCards);

    await Promise.all(
      updatedCards.map(async (card) => {
        const { error } = await supabase
          .from('credit_cards')
          .update({
            used_limit: card.usedLimit,
            available_limit: card.availableLimit
          })
          .eq('id', card.id);

        if (error) {
          console.error(`Error syncing limits for card ${card.name} (${card.id}):`, error);
        }
      })
    );
  };


  // Seed default data for first-time users
  const seedDefaultDataForUser = async (uId: string) => {
    try {
      // Previne duplicação causada pelo StrictMode do React rodando o useEffect duas vezes
      const { data: existingBanks } = await supabase.from('banks').select('id').eq('user_id', uId).limit(1);
      if (existingBanks && existingBanks.length > 0) return;

      // Cria mapas de IDs originais para novos UUIDs válidos e compatíveis com UUID do Postgres
      const bankIdMap: Record<string, string> = {
        'bank-1': uuidv4(),
        'bank-2': uuidv4()
      };
      const cardIdMap: Record<string, string> = {
        'cc-1': uuidv4(),
        'cc-2': uuidv4()
      };

      // 1. Seed Banks
      const dbBanks = mockBanks.map(b => ({
        id: bankIdMap[b.id] || uuidv4(),
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
        id: cardIdMap[c.id] || uuidv4(),
        user_id: uId,
        name: c.name,
        bank_id: bankIdMap[c.bankId] || null,
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

      // 3. Seed Transactions — category_id deve ser null pois as categorias são locais (IDs 'cat-1' não existem no banco)
      const dbTransactions = mockTransactions.map(t => {
        const transId = uuidv4();
        return {
          id: transId,
          user_id: uId,
          type: t.type,
          description: t.description,
          amount: t.amount,
          category_id: null, // Categorias são gerenciadas localmente, não via FK no banco
          bank_id: t.bankId ? (bankIdMap[t.bankId] || null) : null,
          credit_card_id: t.creditCardId ? (cardIdMap[t.creditCardId] || null) : null,
          competence_date: t.competenceDate,
          due_date: t.dueDate,
          payment_date: t.paymentDate || null,
          status: t.status,
          is_recurring: t.isRecurring,
          is_installment: t.isInstallment,
          created_at: new Date().toISOString()
        };
      });
      const { error: txError } = await supabase.from('transactions').insert(dbTransactions);
      if (txError) console.error('Seed transactions error:', txError);

      // Instantly populates local states with the new UUIDs
      setBanks(mockBanks.map(b => ({
        ...b,
        id: bankIdMap[b.id] || b.id
      })));
      setCreditCards(mockCards.map(c => ({
        ...c,
        id: cardIdMap[c.id] || c.id,
        bankId: bankIdMap[c.bankId] || c.bankId
      })));
      setCategories(mockCategories);
      setTransactions(dbTransactions.map(t => ({
        id: t.id,
        type: t.type as TransactionType,
        description: t.description,
        amount: t.amount,
        categoryId: t.category_id,
        bankId: t.bank_id || undefined,
        creditCardId: t.credit_card_id || undefined,
        competenceDate: t.competence_date,
        dueDate: t.due_date,
        paymentDate: t.payment_date || undefined,
        status: t.status as TransactionStatus,
        isRecurring: t.is_recurring,
        isInstallment: t.is_installment,
        createdAt: t.created_at
      })));
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
            { data: dbReminders },
            { data: dbUserSettings },
            { data: dbRecurringHistory }
          ] = await Promise.all([
            supabase.from('banks').select('*').eq('user_id', uId),
            supabase.from('credit_cards').select('*').eq('user_id', uId),
            supabase.from('categories').select('*'), // RLS handles categories selection automatically
            supabase.from('transactions').select('*').eq('user_id', uId),
            supabase.from('goals').select('*').eq('user_id', uId),
            supabase.from('reminders').select('*').eq('user_id', uId),
            supabase.from('user_settings').select('*').eq('user_id', uId),
            supabase.from('recurring_history').select('*').eq('user_id', uId)
          ]);

          const { data: { user } } = await supabase.auth.getUser();
          const email = user?.email || '';

          if ((!dbBanks || dbBanks.length === 0) && email === 'noble@noblefinance.com') {
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
              icon: b.icon,
              excludeFromAnalysis: !!b.exclude_from_analysis
            })));

            const mappedCards = (dbCards || []).map(c => ({
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
            }));
            setCreditCards(mappedCards);

            // Obter as customizações das categorias padrão com parsing robusto (caso venha como string JSON do banco)
            const userSettingsRow = dbUserSettings && dbUserSettings.length > 0 ? dbUserSettings[0] : null;
            let settingsObj = userSettingsRow?.settings || {};
            if (typeof settingsObj === 'string') {
              try {
                settingsObj = JSON.parse(settingsObj);
              } catch (e) {
                console.error("Error parsing settings JSON string in loadUserData:", e);
                settingsObj = {};
              }
            }
            const customizations = settingsObj?.category_customizations || {};
            const defBankId = settingsObj?.default_bank_id || null;
            setDefaultBankId(defBankId);

            // Merge local mocks with DB categories to ensure defaults are always available, prioritizing DB values and applying customizations
            const dbCatIds = new Set((dbCategories || []).map(dbc => dbc.id));
            const mergedCategories = mockCategories
              .filter(mc => !dbCatIds.has(mc.id))
              .map(mc => {
                const custom = customizations[mc.id];
                if (custom) {
                  return {
                    ...mc,
                    name: custom.name !== undefined ? custom.name : mc.name,
                    color: custom.color !== undefined ? custom.color : mc.color,
                    icon: custom.icon !== undefined ? custom.icon : mc.icon,
                    monthlyGoal: custom.monthlyGoal !== undefined ? custom.monthlyGoal : mc.monthlyGoal,
                    isActive: custom.isActive !== undefined ? custom.isActive : mc.isActive,
                    excludeFromAnalysis: custom.excludeFromAnalysis !== undefined ? custom.excludeFromAnalysis : false
                  };
                }
                return { ...mc };
              });

            (dbCategories || []).forEach(dbc => {
              const custom = customizations[dbc.id];
              mergedCategories.push({
                id: dbc.id,
                name: custom?.name !== undefined ? custom.name : dbc.name,
                type: dbc.type,
                color: custom?.color !== undefined ? custom.color : dbc.color,
                icon: custom?.icon !== undefined ? custom.icon : dbc.icon,
                monthlyGoal: dbc.monthly_goal ? Number(dbc.monthly_goal) : (custom?.monthlyGoal !== undefined ? custom.monthlyGoal : undefined),
                isActive: custom?.isActive !== undefined ? custom.isActive : dbc.is_active,
                excludeFromAnalysis: custom?.excludeFromAnalysis !== undefined ? custom.excludeFromAnalysis : !!dbc.exclude_from_analysis
              });
            });
            setCategories(mergedCategories);

            const mappedTransactions = (dbTransactions || []).map(t => ({
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
              linkedGoalId: t.linked_goal_id,
              affectLimitImmediately: t.affect_limit_immediately !== false
            }));
            setTransactions(mappedTransactions);

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

            setRecurringHistory((dbRecurringHistory || []).map(rh => ({
              id: rh.id,
              userId: rh.user_id,
              transactionId: rh.transaction_id,
              amount: Number(rh.amount),
              effectiveFrom: rh.effective_from,
              createdAt: rh.created_at
            })));

            // Sincronizar limites dos cartões de crédito declarativamente baseando-se na data atual
            syncCreditCardLimits(mappedTransactions, mappedCards);
          }

        } catch (e) {
          console.error("Error loading user state from Supabase:", e);
          // Carregar categorias locais para que o app não trave mesmo se o banco falhar
          setCategories(mockCategories);
        } finally {
          // SEMPRE libera o loading, evitando travamento na tela de login
          setIsLoaded(true);
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
      setRecurringHistory([]);
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

  const addBank = async (
    bank: Omit<Bank, 'id'>,
    creditCardDetails?: Omit<CreditCard, 'id' | 'bankId' | 'availableLimit' | 'usedLimit'>
  ) => {
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
      icon: bank.icon,
      exclude_from_analysis: bank.excludeFromAnalysis || false
    });

    if (creditCardDetails) {
      const cardId = uuidv4();
      const newCard: CreditCard = {
        ...creditCardDetails,
        id: cardId,
        bankId: newId,
        usedLimit: 0,
        availableLimit: creditCardDetails.totalLimit
      };
      setCreditCards(prev => [...prev, newCard]);

      await supabase.from('credit_cards').insert({
        id: cardId,
        user_id: currentUser.id,
        bank_id: newId,
        name: creditCardDetails.name,
        brand: creditCardDetails.brand,
        last_four: creditCardDetails.lastFour,
        total_limit: creditCardDetails.totalLimit,
        used_limit: 0,
        available_limit: creditCardDetails.totalLimit,
        closing_day: creditCardDetails.closingDay,
        due_day: creditCardDetails.dueDay,
        color: creditCardDetails.color,
        notes: creditCardDetails.notes
      });
    }
  };

  const updateBank = async (id: string, updates: Partial<Bank>) => {
    setBanks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));

    const dbUpdates: any = {
      name: updates.name,
      type: updates.type,
      initial_balance: updates.initialBalance,
      current_balance: updates.currentBalance,
      color: updates.color,
      notes: updates.notes,
      icon: updates.icon
    };
    if (updates.excludeFromAnalysis !== undefined) {
      dbUpdates.exclude_from_analysis = updates.excludeFromAnalysis;
    }

    await supabase.from('banks').update(dbUpdates).eq('id', id);
  };

  const deleteBank = async (id: string) => {
    setBanks(prev => prev.filter(b => b.id !== id));
    setTransactions(prev => prev.map(t => {
      if (t.bankId === id) {
        return { ...t, bankId: undefined };
      }
      return t;
    }));
    await supabase.from('transactions').update({ bank_id: null }).eq('bank_id', id);

    setGoals(prev => prev.map(g => {
      if (g.bankId === id) {
        return { ...g, bankId: undefined };
      }
      return g;
    }));
    await supabase.from('goals').update({ bank_id: null }).eq('bank_id', id);

    await supabase.from('banks').delete().eq('id', id);
  };

  const addTransaction = (t: Omit<Transaction, 'id'>) => {
    if (!currentUser) return '';
    const newId = uuidv4();
    const newTransaction = {
      ...t,
      id: newId,
      createdAt: t.createdAt || new Date().toISOString()
    };
    transactionsRef.current = [...transactionsRef.current, newTransaction];
    setTransactions(transactionsRef.current);
    
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

    // Sincronizar limites dos cartões de crédito declarativamente
    syncCreditCardLimits(transactionsRef.current);

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
      linked_goal_id: t.linkedGoalId,
      affect_limit_immediately: t.affectLimitImmediately !== false
    }).then(async () => {
      if (t.isRecurring) {
        addRecurringHistoryEntry(newId, t.amount, t.competenceDate.substring(0, 7));
      }
    });

    return newId;
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    const t = transactions.find(tx => tx.id === id);
    if (!t) return;

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

    // Reconciliação inteligente com metas na atualização da transação
    const oldGoalId = t.linkedGoalId;
    const newGoalId = updates.linkedGoalId !== undefined ? updates.linkedGoalId : oldGoalId;
    const oldAmount = t.amount;
    const newAmount = updates.amount !== undefined ? updates.amount : oldAmount;
    const isExpense = (updates.type || t.type) === 'EXPENSE';

    if (isExpense) {
      if (!oldPaid && newPaid) {
        if (newGoalId) {
          setGoals(prev => prev.map(g => {
            if (g.id === newGoalId) {
              const updatedAmt = g.currentAmount + newAmount;
              supabase.from('goals').update({ current_amount: updatedAmt }).eq('id', g.id).then();
              return { ...g, currentAmount: updatedAmt };
            }
            return g;
          }));
        }
      } else if (oldPaid && !newPaid) {
        if (oldGoalId) {
          setGoals(prev => prev.map(g => {
            if (g.id === oldGoalId) {
              const updatedAmt = Math.max(0, g.currentAmount - oldAmount);
              supabase.from('goals').update({ current_amount: updatedAmt }).eq('id', g.id).then();
              return { ...g, currentAmount: updatedAmt };
            }
            return g;
          }));
        }
      } else if (oldPaid && newPaid) {
        if (oldGoalId !== newGoalId) {
          if (oldGoalId) {
            setGoals(prev => prev.map(g => {
              if (g.id === oldGoalId) {
                const updatedAmt = Math.max(0, g.currentAmount - oldAmount);
                supabase.from('goals').update({ current_amount: updatedAmt }).eq('id', g.id).then();
                return { ...g, currentAmount: updatedAmt };
              }
              return g;
            }));
          }
          if (newGoalId) {
            setGoals(prev => prev.map(g => {
              if (g.id === newGoalId) {
                const updatedAmt = g.currentAmount + newAmount;
                supabase.from('goals').update({ current_amount: updatedAmt }).eq('id', g.id).then();
                return { ...g, currentAmount: updatedAmt };
              }
              return g;
            }));
          }
        } else if (newGoalId && oldAmount !== newAmount) {
          setGoals(prev => prev.map(g => {
            if (g.id === newGoalId) {
              const updatedAmt = Math.max(0, g.currentAmount - oldAmount + newAmount);
              supabase.from('goals').update({ current_amount: updatedAmt }).eq('id', g.id).then();
              return { ...g, currentAmount: updatedAmt };
            }
            return g;
          }));
        }
      }
    }

    // Histórico de valores da recorrência se houver alteração
    const isRec = updates.isRecurring !== undefined ? updates.isRecurring : t.isRecurring;
    if (isRec && updates.amount !== undefined && updates.amount !== t.amount) {
      addRecurringHistoryEntry(id, updates.amount, (updates.competenceDate || t.competenceDate).substring(0, 7));
    }

    // Atualização e conclusão de lembretes vinculados
    if (!oldPaid && newPaid) {
      const related = reminders.find(r => r.transactionId === id && !r.isCompleted);
      if (related) {
        completeReminder(related.id);
      }
    }

    const finalCreditCardId = updates.creditCardId !== undefined ? updates.creditCardId : t.creditCardId;

    if (finalCreditCardId) {
      // Remover lembrete ativo se a transação passou a ter ou já tem cartão de crédito vinculado
      const related = reminders.find(r => r.transactionId === id && !r.isCompleted);
      if (related) {
        deleteReminder(related.id);
      }
    } else if (updates.dueDate && updates.dueDate !== t.dueDate) {
      const related = reminders.find(r => r.transactionId === id);
      if (related) {
        updateReminder(related.id, { dueDate: updates.dueDate });
      }
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
      linked_goal_id: updates.linkedGoalId !== undefined ? updates.linkedGoalId : t.linkedGoalId,
      affect_limit_immediately: updates.affectLimitImmediately !== undefined ? updates.affectLimitImmediately : (t.affectLimitImmediately !== false)
    }).eq('id', id).then();

    const updatedList = transactionsRef.current.map(tx => {
      if (tx.id === id) {
        return { ...tx, ...updates };
      }
      return tx;
    });
    transactionsRef.current = updatedList;
    setTransactions(updatedList);

    // Sincroniza os limites dos cartões declarativamente
    syncCreditCardLimits(updatedList);
  };

  const deleteTransaction = async (id: string, deleteAllInstallments?: boolean) => {
    const t = transactionsRef.current.find(tx => tx.id === id);
    if (!t) return;

    let idsToDelete = [id];

    if (deleteAllInstallments && t.isInstallment && t.installmentTotal && t.installmentTotal > 1) {
      const baseDesc = t.description.replace(/\s*\(\d+\/\d+\)\s*/g, '').trim();
      const related = transactionsRef.current.filter(tx => 
        tx.isInstallment &&
        tx.creditCardId === t.creditCardId &&
        tx.bankId === t.bankId &&
        tx.amount === t.amount &&
        tx.installmentTotal === t.installmentTotal &&
        tx.description.replace(/\s*\(\d+\/\d+\)\s*/g, '').trim() === baseDesc
      );
      idsToDelete = related.map(tx => tx.id);
    }

    const paidTxs = transactionsRef.current.filter(tx => idsToDelete.includes(tx.id) && (tx.status === 'PAID' || tx.status === 'RECEIVED'));
    paidTxs.forEach(tx => {
      setBanks(prev => prev.map(bank => {
        if (bank.id === tx.bankId) {
          const amount = tx.type === 'INCOME' ? -tx.amount : tx.amount;
          const updatedBal = bank.currentBalance + amount;
          supabase.from('banks').update({ current_balance: updatedBal }).eq('id', bank.id).then();
          return { ...bank, currentBalance: updatedBal };
        }
        return bank;
      }));

      // Reverter impacto na meta se for despesa vinculada
      if (tx.linkedGoalId && tx.type === 'EXPENSE') {
        setGoals(prevGoals => prevGoals.map(goal => {
          if (goal.id === tx.linkedGoalId) {
            const updatedAmt = Math.max(0, goal.currentAmount - tx.amount);
            supabase.from('goals').update({ current_amount: updatedAmt }).eq('id', goal.id).then();
            return { ...goal, currentAmount: updatedAmt };
          }
          return goal;
        }));
      }
    });

    // Deletar lembretes associados
    setReminders(prev => prev.filter(r => !idsToDelete.includes(r.transactionId)));
    await supabase.from('reminders').delete().in('transaction_id', idsToDelete);

    const remainingTransactions = transactionsRef.current.filter(tx => !idsToDelete.includes(tx.id));
    transactionsRef.current = remainingTransactions;
    setTransactions(remainingTransactions);
    
    await supabase.from('transactions').delete().in('id', idsToDelete);

    // Sincronizar limites dos cartões declarativamente
    syncCreditCardLimits(remainingTransactions);
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
      is_active: true,
      exclude_from_analysis: cat.excludeFromAnalysis || false
    });

    return id;
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    if (!currentUser) return;
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    
    // Obter dados atuais da categoria para servir de fallback no upsert
    const currentCat = categories.find(c => c.id === id);
    const name = updates.name !== undefined ? updates.name : (currentCat?.name || '');
    const type = updates.type !== undefined ? updates.type : (currentCat?.type || 'EXPENSE');
    const color = updates.color !== undefined ? updates.color : (currentCat?.color || '#BCF24B');
    const icon = updates.icon !== undefined ? updates.icon : (currentCat?.icon || 'utensils');
    const monthlyGoal = 'monthlyGoal' in updates ? updates.monthlyGoal : currentCat?.monthlyGoal;
    const isActive = updates.isActive !== undefined ? updates.isActive : (currentCat?.isActive ?? true);
    const excludeFromAnalysis = updates.excludeFromAnalysis !== undefined ? updates.excludeFromAnalysis : currentCat?.excludeFromAnalysis;

    // Verificar se é uma categoria padrão
    const isMock = mockCategories.some(mc => mc.id === id);
    if (isMock) {
      // Buscar configurações atuais do usuário na tabela user_settings
      const { data: dbSettings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', currentUser.id);

      const userSettingsRow = dbSettings && dbSettings.length > 0 ? dbSettings[0] : null;
      let settingsObj = userSettingsRow?.settings || {};
      if (typeof settingsObj === 'string') {
        try {
          settingsObj = JSON.parse(settingsObj);
        } catch (e) {
          console.error("Error parsing settings JSON string in updateCategory:", e);
          settingsObj = {};
        }
      }
      const customCats = settingsObj?.category_customizations || {};
      
      customCats[id] = { name, color, icon, monthlyGoal: monthlyGoal === undefined ? null : monthlyGoal, isActive, excludeFromAnalysis };
      
      const newSettings = {
        ...settingsObj,
        category_customizations: customCats
      };

      await supabase.from('user_settings').upsert({
        user_id: currentUser.id,
        settings: newSettings,
        updated_at: new Date().toISOString()
      });
    } else {
      // Categoria customizada criada pelo usuário
      await supabase.from('categories').upsert({
        id,
        user_id: currentUser.id,
        name,
        type,
        color,
        icon,
        monthly_goal: monthlyGoal === undefined ? null : monthlyGoal,
        is_active: isActive,
        exclude_from_analysis: excludeFromAnalysis
      });
    }
  };

  const markTransactionAsPaid = async (id: string, paymentDate: string) => {
    const t = transactions.find(tx => tx.id === id);
    if (!t) return;

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

    // Concluir lembretes vinculados
    const relatedReminder = reminders.find(r => r.transactionId === id && !r.isCompleted);
    if (relatedReminder) {
      completeReminder(relatedReminder.id);
    }

    const updatedTransactionsList = transactionsRef.current.map(tx => {
      if (tx.id === id) {
        return { ...tx, status: finalStatus, paymentDate };
      }
      return tx;
    });
    transactionsRef.current = updatedTransactionsList;
    setTransactions(updatedTransactionsList);

    // Sincronizar limites dos cartões declarativamente
    syncCreditCardLimits(updatedTransactionsList);
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
    
    let updatedCardsList: CreditCard[] = [];
    setCreditCards(prev => {
      updatedCardsList = [...prev, newCard];
      return updatedCardsList;
    });

    const { error } = await supabase.from('credit_cards').insert({
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

    if (error) {
      console.error(`Error adding credit card:`, error);
    }

    await syncCreditCardLimits(transactions, updatedCardsList);
  };

  const updateCreditCard = async (id: string, updates: Partial<CreditCard>) => {
    let updatedCardsList: CreditCard[] = [];
    setCreditCards(prev => {
      updatedCardsList = prev.map(c => {
        if (c.id === id) {
          return { ...c, ...updates };
        }
        return c;
      });
      return updatedCardsList;
    });

    const cardToUpdate = creditCards.find(c => c.id === id);
    if (!cardToUpdate) return;

    const { error } = await supabase.from('credit_cards').update({
      name: updates.name !== undefined ? updates.name : cardToUpdate.name,
      bank_id: updates.bankId !== undefined ? updates.bankId : cardToUpdate.bankId,
      brand: updates.brand !== undefined ? updates.brand : cardToUpdate.brand,
      last_four: updates.lastFour !== undefined ? updates.lastFour : cardToUpdate.lastFour,
      total_limit: updates.totalLimit !== undefined ? updates.totalLimit : cardToUpdate.totalLimit,
      closing_day: updates.closingDay !== undefined ? updates.closingDay : cardToUpdate.closingDay,
      due_day: updates.dueDay !== undefined ? updates.dueDay : cardToUpdate.dueDay,
      color: updates.color !== undefined ? updates.color : cardToUpdate.color,
      notes: updates.notes !== undefined ? updates.notes : cardToUpdate.notes
    }).eq('id', id);

    if (error) {
      console.error(`Error updating credit card:`, error);
    }

    await syncCreditCardLimits(transactions, updatedCardsList);
  };

  const deleteCreditCard = async (id: string) => {
    setCreditCards(prev => prev.filter(c => c.id !== id));
    await supabase.from('credit_cards').delete().eq('id', id);
  };

  const excludeRecurringMonth = async (originalId: string, monthYear: string) => {
    const updated = transactionsRef.current.map(t => {
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
    });
    transactionsRef.current = updated;
    setTransactions(updated);
  };

  const payAllOverdue = async () => {
    const today = new Date().toISOString();
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const overdueIds = transactions
      .filter(t => t.status === 'OPEN' && new Date(t.dueDate).getTime() < now.getTime())
      .map(t => t.id);

    if (overdueIds.length === 0) return;

    const updated = transactionsRef.current.map(t => {
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
    });

    transactionsRef.current = updated;
    setTransactions(updated);
    syncCreditCardLimits(updated);
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

  const addRecurringHistoryEntry = async (transactionId: string, amount: number, effectiveFrom: string) => {
    if (!currentUser) return;
    const newId = uuidv4();
    const now = new Date().toISOString();

    setRecurringHistory(prev => [...prev, {
      id: newId,
      userId: currentUser.id,
      transactionId,
      amount,
      effectiveFrom,
      createdAt: now
    }]);

    await supabase.from('recurring_history').insert({
      id: newId,
      user_id: currentUser.id,
      transaction_id: transactionId,
      amount,
      effective_from: effectiveFrom,
      created_at: now
    });
  };

  const cloneRecurringHistory = async (oldTxId: string, newTxId: string) => {
    if (!currentUser) return;
    const oldHistory = recurringHistory.filter(h => h.transactionId === oldTxId);
    if (oldHistory.length === 0) return;

    const now = new Date().toISOString();
    const newEntries = oldHistory.map(h => ({
      id: uuidv4(),
      user_id: currentUser.id,
      transaction_id: newTxId,
      amount: h.amount,
      effective_from: h.effectiveFrom,
      created_at: now
    }));

    setRecurringHistory(prev => [
      ...prev,
      ...newEntries.map(e => ({
        id: e.id,
        userId: e.user_id,
        transactionId: e.transaction_id,
        amount: e.amount,
        effectiveFrom: e.effective_from,
        createdAt: e.created_at
      }))
    ]);

    await supabase.from('recurring_history').insert(newEntries);
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
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: supabaseUser.id,
        username: userData.username.trim(),
        name: userData.name.trim(),
        phone: userData.phone,
        avatar: userData.avatar || '👑'
      });

      if (profileError) {
        console.error("Error creating public profile:", profileError);
      }

      // Pre-seed tables apenas para o usuário padrão de testes "noble@noblefinance.com"
      if (email === 'noble@noblefinance.com') {
        await seedDefaultDataForUser(supabaseUser.id);
      }
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
    setDefaultBankId(null);
  };

  const setDefaultBank = async (bankId: string | null) => {
    if (!currentUser) return;
    setDefaultBankId(bankId);

    const { data: dbSettings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', currentUser.id);

    const userSettingsRow = dbSettings && dbSettings.length > 0 ? dbSettings[0] : null;
    let settingsObj = userSettingsRow?.settings || {};
    if (typeof settingsObj === 'string') {
      try {
        settingsObj = JSON.parse(settingsObj);
      } catch (e) {
        settingsObj = {};
      }
    }

    const newSettings = {
      ...settingsObj,
      default_bank_id: bankId
    };

    await supabase.from('user_settings').upsert({
      user_id: currentUser.id,
      settings: newSettings,
      updated_at: new Date().toISOString()
    });
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
      theme, banks, creditCards, categories, transactions, goals, notifications, recurringHistory,
      toggleTheme, addBank, updateBank, deleteBank, addTransaction, updateTransaction, deleteTransaction, addCategory, updateCategory, markTransactionAsPaid,
      addGoal, updateGoal, deleteGoal, addCreditCard, updateCreditCard, deleteCreditCard, excludeRecurringMonth, payAllOverdue,
      addReminder, updateReminder, deleteReminder, completeReminder, reminders,
      addRecurringHistoryEntry, cloneRecurringHistory,
      currentUser, registerUser, loginUser, logoutUser, updateUserProfile,
      defaultBankId, setDefaultBank
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
