import React, { useState } from 'react';
import { 
  ChevronDown, 
  Search, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  MoreHorizontal, 
  CreditCard,
  Wifi,
  ArrowDown,
  ArrowUp,
  Home,
  ShoppingBag,
  Car,
  Utensils,
  Ticket,
  Shield,
  RefreshCcw,
  ShoppingCart,
  GraduationCap,
  Plus,
  X,
  Target,
  TrendingUp,
  Download,
  Filter,
  CheckCircle2,
  Trash2,
  Edit2,
  Bell
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { Modal } from '../components/ui/Modal';
import { useAppContext } from '../store/AppContext';
import { CategoryIcon } from '../components/CategoryIcon';
import { format, addMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { PremiumSelect, PremiumDatePicker, PremiumCurrencyInput } from '../components/ui/PremiumInputs';

function calculateCardDueDate(purchaseDateStr: string, closingDay: number, dueDay: number): Date {
  const purchaseDate = new Date(purchaseDateStr + 'T12:00:00');
  let dueYear = purchaseDate.getFullYear();
  let dueMonth = purchaseDate.getMonth();

  if (purchaseDate.getDate() > closingDay) {
    dueMonth += 1;
  }

  if (dueDay < closingDay) {
    dueMonth += 1;
  }

  return new Date(dueYear, dueMonth, dueDay, 12, 0, 0);
}

const expenses = [
  { name: 'Aluguel', value: '95%', Icon: Home },
  { name: 'Supermercado', value: '77%', Icon: ShoppingBag },
  { name: 'Transporte', value: '84%', Icon: Car },
  { name: 'Restaurante', value: '80%', Icon: Utensils },
  { name: 'Lazer', value: '58%', Icon: Ticket },
  { name: 'Seguro', value: '80%', Icon: Shield },
  { name: 'Assinaturas', value: '40%', Icon: RefreshCcw },
  { name: 'Compras', value: '32%', Icon: ShoppingCart },
  { name: 'Educação', value: '30%', Icon: GraduationCap },
];

export default function DashboardPage() {
  const [deletingTransaction, setDeletingTransaction] = useState<any>(null);
  const { 
    transactions, addTransaction, updateTransaction, deleteTransaction, 
    excludeRecurringMonth, categories, addCategory, banks, goals, 
    creditCards, notifications, markTransactionAsPaid,
    reminders, addReminder, deleteReminder, completeReminder
  } = useAppContext();

  const overdueExpenses = notifications.filter(n => n.type === 'OVERDUE' && !n.isIncome);

  const activeReminders = reminders.filter(r => {
    if (r.isCompleted) return false;
    const tx = transactions.find(t => t.id === r.transactionId);
    if (tx && tx.creditCardId) return false;
    return true;
  });

  const handleQuickPay = (t: any) => {
    const isVirtual = t.id.toString().startsWith('recurring-');
    if (isVirtual) {
      const parentId = t.id.toString().split('-')[1];
      const monthYearKey = `${new Date(t.competenceDate).getFullYear()}-${(new Date(t.competenceDate).getMonth() + 1).toString().padStart(2, '0')}`;
      
      addTransaction({
        ...t,
        id: undefined,
        isRecurring: false,
        paymentDate: new Date().toISOString(),
        status: t.type === 'INCOME' ? 'RECEIVED' : 'PAID',
      });
      excludeRecurringMonth(parentId, monthYearKey);
    } else {
      updateTransaction(t.id, {
        paymentDate: new Date().toISOString(),
        status: t.type === 'INCOME' ? 'RECEIVED' : 'PAID'
      });
    }
  };

  const handleEditClick = (t: any) => {
    setEditingTransaction(t);
    setNewTx({
      description: t.description,
      amount: t.amount,
      type: t.type,
      categoryId: t.categoryId,
      newCategoryName: '',
      bankId: t.bankId || '',
      creditCardId: t.creditCardId || '',
      dueDate: t.dueDate ? format(parseISO(t.dueDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      paymentDate: t.paymentDate ? format(parseISO(t.paymentDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      isPaid: t.status === 'PAID' || t.status === 'RECEIVED',
      isRecurring: t.isRecurring || false,
      isInstallment: t.isInstallment || false,
      installmentCount: t.installmentTotal?.toString() || '1',
      installmentStart: t.installmentCurrent?.toString() || '1',
      linkedGoalId: t.linkedGoalId || ''
    });

    if (t.type === 'INCOME') {
      setActiveModal('new_transaction_income');
    } else {
      setActiveModal('new_transaction_expense');
    }
  };

  const handleSort = (field: 'description' | 'category' | 'dueDate' | 'paymentDate' | 'amount' | 'competenceDate') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };


  const handleDelete = () => {
    if (deletingTransaction) {
      const isVirtual = deletingTransaction.id.toString().startsWith('recurring-');
      if (isVirtual) {
        const parentId = deletingTransaction.id.toString().split('-')[1];
        const monthYearKey = `${new Date(deletingTransaction.competenceDate).getFullYear()}-${(new Date(deletingTransaction.competenceDate).getMonth() + 1).toString().padStart(2, '0')}`;
        excludeRecurringMonth(parentId, monthYearKey);
      } else {
        deleteTransaction(deletingTransaction.id);
      }
      setActiveModal(null);
      setDeletingTransaction(null);
    }
  };
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [cashFlowDetailMonth, setCashFlowDetailMonth] = useState<any>(null);
  const [bankDetailInfo, setBankDetailInfo] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const closeModal = () => {
    setActiveModal(null);
    setCashFlowDetailMonth(null);
    setBankDetailInfo(null);
    setEditingTransaction(null);
  };

  // Filters State
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const now = new Date();
  const currentMonthName = months[now.getMonth()];
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthName);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [dateFieldToFilter, setDateFieldToFilter] = useState<'competenceDate' | 'dueDate' | 'paymentDate'>('competenceDate');

  const [createdTransactionInfo, setCreatedTransactionInfo] = useState<any>(null);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [sortField, setSortField] = useState<'description' | 'category' | 'dueDate' | 'paymentDate' | 'amount' | 'competenceDate'>('competenceDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // New Transaction State
  const [newTx, setNewTx] = useState({
    description: '',
    amount: 0,
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    categoryId: '',
    newCategoryName: '',
    bankId: '',
    creditCardId: '',
    isPaid: true,
    isPartial: false,
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    isRecurring: false,
    isInstallment: false,
    installmentCount: '1',
    installmentStart: '0',
    linkedGoalId: ''
  });

  const [newReminder, setNewReminder] = useState({
    title: '',
    description: '',
    dueDate: format(new Date(), 'yyyy-MM-dd')
  });

  const handleAddReminder = () => {
    if (!newReminder.title || !newReminder.dueDate) return;
    addReminder(newReminder);
    setNewReminder({
      title: '',
      description: '',
      dueDate: format(new Date(), 'yyyy-MM-dd')
    });
    setActiveModal(null);
  };

  const handleCardChange = (cardId: string) => {
    const card = creditCards.find(cc => cc.id === cardId);
    if (card) {
      setNewTx({
        ...newTx,
        creditCardId: cardId,
        bankId: card.bankId,
        isPaid: false
      });
    } else {
      setNewTx({
        ...newTx,
        creditCardId: cardId,
        isPaid: true
      });
    }
  };

  const isTxFormValid = 
    newTx.description.trim() !== '' &&
    newTx.amount > 0 &&
    newTx.categoryId !== '' &&
    (newTx.categoryId !== 'NEW' || newTx.newCategoryName.trim() !== '') &&
    (activeModal === 'new_transaction_income' 
      ? newTx.bankId !== '' 
      : (newTx.bankId !== '' || newTx.creditCardId !== ''));

  const handleAddTx = (type: 'INCOME' | 'EXPENSE') => {
    if (!isTxFormValid) return;
    
    let finalCategoryId = newTx.categoryId;
    
    // Create new category if needed
    if (newTx.categoryId === 'NEW' && newTx.newCategoryName) {
      finalCategoryId = addCategory({
        name: newTx.newCategoryName,
        type: type
      });
    }

    if (!finalCategoryId) {
      const defaultCat = categories.find(c => c.type === type || c.type === 'BOTH');
      finalCategoryId = defaultCat?.id || (categories[0]?.id || '');
    }

    const card = newTx.creditCardId ? creditCards.find(cc => cc.id === newTx.creditCardId) : null;
    const calculatedDueDate = card 
      ? calculateCardDueDate(newTx.dueDate, card.closingDay, card.dueDay)
      : new Date(newTx.dueDate + 'T12:00:00');

    const txData = {
      description: newTx.description,
      amount: Number(newTx.amount),
      type: type,
      categoryId: finalCategoryId,
      bankId: newTx.bankId || undefined,
      creditCardId: newTx.creditCardId || undefined,
      dueDate: calculatedDueDate.toISOString(),
      paymentDate: newTx.isPaid ? new Date(newTx.paymentDate + 'T12:00:00').toISOString() : undefined,
      status: newTx.isPaid ? (type === 'INCOME' ? 'RECEIVED' : 'PAID') : 'OPEN' as any,
      isRecurring: newTx.isRecurring,
      isPartial: newTx.isPartial,
      linkedGoalId: newTx.linkedGoalId || undefined
    };

    if (editingTransaction) {
      const isVirtual = editingTransaction.id.toString().startsWith('recurring-') || editingTransaction.id.toString().startsWith('projected-');
      if (isVirtual) {
        const parentId = editingTransaction.id.toString().split('-')[1];
        const monthYearKey = format(parseISO(editingTransaction.competenceDate), 'yyyy-MM');
        
        addTransaction({
          ...txData,
          competenceDate: editingTransaction.competenceDate,
          dueDate: card 
            ? calculateCardDueDate(format(parseISO(editingTransaction.competenceDate), 'yyyy-MM-dd'), card.closingDay, card.dueDay).toISOString()
            : calculatedDueDate.toISOString(),
          isRecurring: false
        });
        excludeRecurringMonth(parentId, monthYearKey);
      } else {
        if (editingTransaction.isRecurring) {
          addTransaction({
            ...txData,
            competenceDate: editingTransaction.competenceDate,
            dueDate: card 
              ? calculateCardDueDate(format(parseISO(editingTransaction.competenceDate), 'yyyy-MM-dd'), card.closingDay, card.dueDay).toISOString()
              : calculatedDueDate.toISOString(),
            isRecurring: false
          });
          
          // Buscar o primeiro mês futuro vago a partir do mês seguinte à competência da recorrência
          let nextMonth = addMonths(new Date(editingTransaction.competenceDate), 1);
          let isMonthOccupied = true;
          while (isMonthOccupied) {
            const m = nextMonth.getMonth();
            const y = nextMonth.getFullYear();
            
            const hasInstance = transactions.some(t => {
              if (t.id.toString().startsWith('recurring-')) return false;
              const tDate = new Date(t.competenceDate);
              return t.description === editingTransaction.description &&
                     t.categoryId === editingTransaction.categoryId &&
                     tDate.getMonth() === m &&
                     tDate.getFullYear() === y &&
                     t.id !== editingTransaction.id;
            });
            
            if (hasInstance) {
              nextMonth = addMonths(nextMonth, 1);
            } else {
              isMonthOccupied = false;
            }
          }

          updateTransaction(editingTransaction.id, {
            competenceDate: nextMonth.toISOString(),
            dueDate: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), new Date(editingTransaction.dueDate).getDate()).toISOString()
          });
        } else {
          updateTransaction(editingTransaction.id, {
            ...txData,
            competenceDate: new Date(newTx.dueDate + 'T12:00:00').toISOString()
          });
        }
      }
      
      setCreatedTransactionInfo({
        ...txData,
        id: editingTransaction.id,
        dueDate: calculatedDueDate.toISOString()
      });

      setActiveModal('success_created');
      setEditingTransaction(null);
    } else {
      let createdId = '';
      if (newTx.isInstallment && Number(newTx.installmentCount) > 1) {
        const count = Number(newTx.installmentCount);
        const paid = Number(newTx.installmentStart) || 0;
        const start = paid + 1;
        // Use the provided dates as base for installments
        const baseDueDate = new Date(newTx.dueDate + 'T12:00:00');
        const basePaymentDate = new Date(newTx.paymentDate + 'T12:00:00');

        let offset = 0;
        for (let j = start; j <= count; j++) {
          const installmentDueDate = addMonths(baseDueDate, offset);
          const installmentPaymentDate = addMonths(basePaymentDate, offset);
          
          let finalInstallmentDueDate = installmentDueDate;
          if (card) {
            const dateStr = format(installmentDueDate, 'yyyy-MM-dd');
            finalInstallmentDueDate = calculateCardDueDate(dateStr, card.closingDay, card.dueDay);
          }

          const id = addTransaction({
            ...txData,
            competenceDate: installmentDueDate.toISOString(), // Set competence to purchase date of each installment
            dueDate: finalInstallmentDueDate.toISOString(),
            paymentDate: (offset === 0 && newTx.isPaid) ? installmentPaymentDate.toISOString() : undefined,
            status: (offset === 0 && newTx.isPaid) ? txData.status : 'OPEN',
            isInstallment: true,
            installmentTotal: count,
            installmentCurrent: j,
            description: `${txData.description} (${j}/${count})`
          });
          if (offset === 0) createdId = id;
          offset++;
        }
      } else {
        createdId = addTransaction({
          ...txData,
          competenceDate: new Date(newTx.dueDate + 'T12:00:00').toISOString(),
          dueDate: calculatedDueDate.toISOString(),
          paymentDate: newTx.isPaid ? new Date(newTx.paymentDate + 'T12:00:00').toISOString() : undefined,
          isInstallment: false
        });
      }
      
      setCreatedTransactionInfo({ 
        ...txData, 
        id: createdId,
        dueDate: calculatedDueDate.toISOString()
      });

      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const dueStr = newTx.dueDate;

      if (type === 'EXPENSE' && dueStr === todayStr && !newTx.isPaid) {
        setActiveModal('due_today_prompt');
      } else {
        setActiveModal('success_created');
      }
    }

    setNewTx({ 
      description: '', 
      amount: 0, 
      type: 'EXPENSE', 
      categoryId: '', 
      newCategoryName: '',
      bankId: '', 
      creditCardId: '',
      isPaid: true,
      isPartial: false,
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      isRecurring: false,
      isInstallment: false,
      installmentCount: '1',
      installmentStart: '0',
      linkedGoalId: ''
    });
  };

  const getVisibleTransactions = () => {
    const monthsNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const targetMonthIdx = selectedMonth !== 'ALL' ? monthsNames.indexOf(selectedMonth) : -1;
    const targetYear = selectedYear;
    const monthYearKey = targetMonthIdx !== -1 ? `${targetYear}-${(targetMonthIdx + 1).toString().padStart(2, '0')}` : '';

    // Filter out real transactions that are specifically excluded for the current month
    const list = transactions.filter(t => {
      if (t.isRecurring && monthYearKey) {
        return !t.recurringExclusions?.includes(monthYearKey);
      }
      return true;
    });

    const recurringTxs = transactions.filter(t => t.isRecurring);
    
    if (selectedMonth !== 'ALL') {
      recurringTxs.forEach(rt => {
        // Skip if this month is specifically excluded
        if (rt.recurringExclusions?.includes(monthYearKey)) return;

        const startDate = new Date(rt.competenceDate);
        const startMonthIdx = startDate.getMonth();
        const startYear = startDate.getFullYear();

        // Check if target month is after or same as start month
        if (targetYear > startYear || (targetYear === startYear && targetMonthIdx >= startMonthIdx)) {
          // Check if there is already a real transaction with the same description in this month
          const alreadyHasInstance = transactions.some(t => {
            const tDate = new Date(t.competenceDate);
            return t.description === rt.description && 
                   tDate.getMonth() === targetMonthIdx &&
                   tDate.getFullYear() === targetYear &&
                   t.id !== rt.id;
          });

          const isSourceMonth = startMonthIdx === targetMonthIdx && startYear === targetYear;

          if (!alreadyHasInstance && !isSourceMonth) {
            const projectedDate = new Date(targetYear, targetMonthIdx, startDate.getDate());
            list.push({
              ...rt,
              id: `recurring-${rt.id}-${targetYear}-${targetMonthIdx}`,
              competenceDate: projectedDate.toISOString(),
              dueDate: projectedDate.toISOString(),
              paymentDate: undefined,
              status: 'OPEN' // Projected is always open
            });
          }
        }
      });
    }

    return list;
  };

  const filteredTransactions = getVisibleTransactions().filter(tx => {
    const category = categories.find(c => c.id === tx.categoryId);
    const bank = banks.find(b => b.id === tx.bankId);
    
    // Dynamic Status Calculation
    const getStatus = (t: any) => {
      if (t.status === 'PAID' || t.status === 'RECEIVED') return t.status;
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const dueDate = new Date(t.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < now ? 'OVERDUE' : 'OPEN';
    };

    const status = getStatus(tx);

    const matchesSearch = tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tx.amount.toString().includes(searchQuery) ||
                         category?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         bank?.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'ALL' || tx.type === filterType;
    const matchesStatus = filterStatus === 'ALL' || status === filterStatus;
    const matchesCategory = filterCategory === 'ALL' || tx.categoryId === filterCategory;
    
    // Date Filtering
    let matchesDate = true;
    const dateValue = tx[dateFieldToFilter];
    
    if (!dateValue && (dateFieldToFilter === 'dueDate' || dateFieldToFilter === 'paymentDate')) {
      if (selectedMonth !== 'ALL' || (dateRange.start && dateRange.end)) {
        matchesDate = false;
      }
    } else {
      const txDate = new Date(dateValue || tx.competenceDate);
      if (dateRange.start && dateRange.end) {
        const start = new Date(dateRange.start + 'T00:00:00');
        const end = new Date(dateRange.end + 'T23:59:59');
        matchesDate = txDate >= start && txDate <= end;
      } else if (selectedMonth !== 'ALL') {
        const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const monthIdx = months.indexOf(selectedMonth);
        matchesDate = txDate.getMonth() === monthIdx && txDate.getFullYear() === selectedYear;
      }
    }

    return matchesSearch && matchesType && matchesStatus && matchesCategory && matchesDate;
  }).sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (sortField === 'category') {
      const catA = categories.find(c => c.id === a.categoryId)?.name || '';
      const catB = categories.find(c => c.id === b.categoryId)?.name || '';
      aVal = catA;
      bVal = catB;
    }

    if (sortField === 'dueDate' || sortField === 'paymentDate' || sortField === 'competenceDate') {
      aVal = aVal ? new Date(aVal).getTime() : 0;
      bVal = bVal ? new Date(bVal).getTime() : 0;
    }

    if (sortField === 'amount') {
      aVal = a.amount;
      bVal = b.amount;
    }

    if (sortField === 'description') {
      aVal = a.description.toLowerCase();
      bVal = b.description.toLowerCase();
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const totalBalance = banks.reduce((acc, bank) => acc + bank.currentBalance, 0);

  const filteredForStats = getVisibleTransactions().filter(tx => {
    let matchesDate = true;
    const txDate = new Date(tx.competenceDate);

    if (dateRange.start && dateRange.end) {
      const start = new Date(dateRange.start + 'T00:00:00');
      const end = new Date(dateRange.end + 'T23:59:59');
      matchesDate = txDate >= start && txDate <= end;
    } else if (selectedMonth !== 'ALL') {
      const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const monthIdx = months.indexOf(selectedMonth);
      matchesDate = txDate.getMonth() === monthIdx && txDate.getFullYear() === selectedYear;
    }
    return matchesDate;
  });

  const totalToPay = filteredForStats
    .filter(t => t.type === 'EXPENSE' && (t.status === 'OPEN' || t.status === 'OVERDUE'))
    .reduce((acc, t) => acc + t.amount, 0);
  
  const totalReceivables = filteredForStats
    .filter(t => t.type === 'INCOME' && (t.status === 'OPEN' || t.status === 'OVERDUE'))
    .reduce((acc, t) => acc + t.amount, 0);
  
  const reimbursementReceivables = transactions
    .filter(t => t.categoryId === 'cat-reimb' && t.type === 'INCOME' && (t.status === 'OPEN' || t.status === 'OVERDUE'))
    .reduce((acc, t) => acc + t.amount, 0);
  
  const projectedBalance = totalBalance + totalReceivables - totalToPay;

  const cashFlowData = (() => {
    const data = [];
    const now = new Date();
    now.setHours(0,0,0,0);
    
    const startOfYear = new Date(selectedYear, 0, 1);
    const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59);

    let initialBalance = totalBalance;
    transactions.forEach(t => {
      const d = new Date(t.paymentDate || t.competenceDate);
      if (t.status === 'PAID' || t.status === 'RECEIVED') {
        const competence = new Date(t.competenceDate);
        if (competence >= startOfYear && competence < now) {
          if (t.type === 'INCOME') initialBalance -= t.amount;
          else initialBalance += t.amount;
        }
      }
    });

    for (let m = 0; m < 12; m++) {
      const isPast = selectedYear < now.getFullYear() || (selectedYear === now.getFullYear() && m < now.getMonth());
      const isCurrent = selectedYear === now.getFullYear() && m === now.getMonth();
      const isFuture = selectedYear > now.getFullYear() || (selectedYear === now.getFullYear() && m > now.getMonth());

      let monthIncome = 0;
      let monthExpense = 0;
      const monthTransactions: any[] = [];

      transactions.forEach(t => {
        const d = new Date(t.competenceDate);
        if (d.getFullYear() === selectedYear && d.getMonth() === m) {
          if (t.type === 'INCOME') monthIncome += t.amount;
          else monthExpense += t.amount;
          monthTransactions.push(t);
        }
      });

      if (isFuture || isCurrent) {
        transactions.filter(t => t.isRecurring).forEach(rt => {
          const rtStart = new Date(rt.competenceDate);
          if (selectedYear > rtStart.getFullYear() || (selectedYear === rtStart.getFullYear() && m >= rtStart.getMonth())) {
            const monthKey = `${selectedYear}-${(m + 1).toString().padStart(2, '0')}`;
            if (!rt.recurringExclusions?.includes(monthKey)) {
              const alreadyHasReal = transactions.some(t => {
                const td = new Date(t.competenceDate);
                return t.description === rt.description && td.getMonth() === m && td.getFullYear() === selectedYear && t.id !== rt.id;
              });

              const isSourceMonth = rtStart.getMonth() === m && rtStart.getFullYear() === selectedYear;

              if (!alreadyHasReal && !isSourceMonth) {
                if (rt.type === 'INCOME') monthIncome += rt.amount;
                else monthExpense += rt.amount;
                
                const projectedDate = new Date(selectedYear, m, rtStart.getDate());
                let projectedDueDate = rt.dueDate;
                if (rt.dueDate) {
                  const oDate = new Date(rt.dueDate);
                  projectedDueDate = new Date(selectedYear, m, oDate.getDate()).toISOString();
                }

                monthTransactions.push({
                  ...rt,
                  id: `projected-${rt.id}-${m}`,
                  competenceDate: projectedDate.toISOString(),
                  dueDate: projectedDueDate,
                  paymentDate: undefined,
                  status: 'OPEN',
                  isProjected: true
                });
              }
            }
          }
        });
      }

      data.push({
        name: months[m].substring(0, 3),
        fullName: months[m],
        income: monthIncome,
        expense: monthExpense,
        balance: monthIncome - monthExpense,
        transactions: monthTransactions,
        isFuture,
        isCurrent
      });
    }

    return data;
  })();

  const maxBalance = Math.max(...cashFlowData.map(d => Math.abs(d.balance)), 1000);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 2 
    }).format(val);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 lg:p-6 pb-24 w-full relative">
      {/* Modals Section */}
      <Modal isOpen={activeModal === 'new_transaction_income' || activeModal === 'new_transaction_expense'} 
             onClose={closeModal} 
             title={editingTransaction ? (activeModal === 'new_transaction_income' ? "Editar Receita" : "Editar Despesa") : (activeModal === 'new_transaction_income' ? "Nova Receita" : "Nova Despesa")}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Descrição</label>
            <input 
              type="text" 
              placeholder={activeModal === 'new_transaction_income' ? "Ex: Salário" : "Ex: Combustível"} 
              value={newTx.description}
              onChange={e => setNewTx({...newTx, description: e.target.value})}
              className="w-full bg-card border border-border/60 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/50" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
              <PremiumCurrencyInput 
                label="Valor"
                value={newTx.amount}
                onChange={val => setNewTx({...newTx, amount: val})}
              />
              <PremiumSelect 
                label="Conta / Banco"
                value={newTx.bankId}
                onChange={val => setNewTx({...newTx, bankId: val})}
                options={banks.map(bank => ({ value: bank.id, label: bank.name, color: bank.color }))}
              />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <PremiumSelect 
              label="Categoria"
              value={newTx.categoryId}
              onChange={val => setNewTx({...newTx, categoryId: val})}
              options={[
                ...categories
                  .filter(c => activeModal === 'new_transaction_income' ? (c.type === 'INCOME' || c.type === 'BOTH') : (c.type === 'EXPENSE' || c.type === 'BOTH'))
                  .map(c => ({ value: c.id, label: c.name, color: c.color })),
                { value: 'NEW', label: '+ Nova Categoria', color: '#EAB308' }
              ]}
            />
            {activeModal === 'new_transaction_expense' ? (
              <PremiumSelect 
                label="Cartão de Crédito"
                value={newTx.creditCardId || ''}
                onChange={handleCardChange}
                options={[{ value: '', label: 'Nenhum' }, ...creditCards.map(cc => ({ value: cc.id, label: cc.name, color: cc.color }))]}
              />
            ) : <div />}
          </div>

          {activeModal === 'new_transaction_expense' && (
            <PremiumSelect 
              label="Vincular a uma Meta de Reserva"
              options={[{ value: '', label: 'Não vincular' }, ...goals.filter(g => g.type === 'SAVINGS').map(g => ({ value: g.id, label: g.name, color: g.color }))]}
              value={newTx.linkedGoalId || ''}
              onChange={val => setNewTx({...newTx, linkedGoalId: val})}
            />
          )}

          {newTx.categoryId === 'NEW' && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nome da nova categoria</label>
              <input 
                type="text" 
                placeholder="Ex: Assinaturas" 
                value={newTx.newCategoryName}
                onChange={e => setNewTx({...newTx, newCategoryName: e.target.value})}
                className="w-full bg-card border border-border/60 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none" 
              />
            </div>
          )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <PremiumDatePicker 
                  label={newTx.creditCardId ? "Data da Compra" : "Vencimento"}
                  value={newTx.dueDate}
                  onChange={val => setNewTx({...newTx, dueDate: val})}
                />
              </div>
              <div className={cn(!newTx.isPaid && "opacity-50 pointer-events-none")}>
                <PremiumDatePicker 
                  label="Pagamento"
                  value={newTx.isPaid ? newTx.paymentDate : ''}
                  onChange={val => setNewTx({...newTx, paymentDate: val})}
                />
              </div>
            </div>
          
          <div className="space-y-3 pt-2">
             <div className={cn(
                    "flex items-center justify-between p-3.5 bg-muted/20 rounded-2xl border border-border/50 group transition-all",
                    newTx.creditCardId ? "opacity-50 pointer-events-none" : "cursor-pointer hover:bg-muted/30"
                  )} 
                  onClick={() => {
                    if (!newTx.creditCardId) {
                      setNewTx({...newTx, isPaid: !newTx.isPaid});
                    }
                  }}>
               <div className="flex flex-col">
                 <span className="text-xs font-semibold tracking-tight text-foreground/90">Confirmar Pagamento / Recebimento</span>
                 <span className="text-[10px] text-muted-foreground">
                   {newTx.creditCardId ? "Despesas no cartão são pagas na fatura" : "Esta transação já foi realizada?"}
                 </span>
               </div>
               <div className={cn(
                 "w-10 h-5 rounded-full transition-all relative flex items-center px-1",
                 newTx.isPaid ? "bg-primary" : "bg-muted"
               )}>
                 <div className={cn(
                   "w-3.5 h-3.5 rounded-full bg-white transition-all shadow-sm",
                   newTx.isPaid ? "translate-x-5" : "translate-x-0"
                 )} />
               </div>
             </div>

            {activeModal === 'new_transaction_expense' && (
              <div className="flex items-center justify-between p-3.5 bg-muted/20 rounded-2xl border border-border/50 group cursor-pointer hover:bg-muted/30 transition-all" onClick={() => setNewTx({...newTx, isInstallment: !newTx.isInstallment})}>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold tracking-tight text-foreground/90">Compra Parcelada</span>
                  <span className="text-[10px] text-muted-foreground">Configurar lançamentos parcelados?</span>
                </div>
                <div className={cn(
                  "w-10 h-5 rounded-full transition-all relative flex items-center px-1",
                  newTx.isInstallment ? "bg-primary" : "bg-muted"
                )}>
                  <div className={cn(
                    "w-3.5 h-3.5 rounded-full bg-white transition-all shadow-sm",
                    newTx.isInstallment ? "translate-x-5" : "translate-x-0"
                  )} />
                </div>
              </div>
            )}
          </div>

          {newTx.isInstallment && activeModal === 'new_transaction_expense' && (
            <div className="space-y-3 animate-in fade-in duration-300">
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nº Total de Parcelas</label>
                    <input 
                      type="number" 
                      min="1"
                      max="120"
                      value={newTx.installmentCount}
                      onChange={e => setNewTx({...newTx, installmentCount: e.target.value})}
                      className="w-full bg-card border border-border/60 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none" 
                    />
                 </div>
                 <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Parcelas Pagas
                    </label>
                    <input 
                      type="number" 
                      min="0"
                      max="120"
                      value={newTx.installmentStart}
                      onChange={e => setNewTx({...newTx, installmentStart: e.target.value})}
                      className="w-full bg-card border border-border/60 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none" 
                    />
                 </div>
              </div>
              <div className="bg-muted/30 border border-border/40 p-3 rounded-xl text-xs text-muted-foreground font-medium">
                 {(() => {
                   const total = Number(newTx.installmentCount) || 1;
                   const paid = Number(newTx.installmentStart) || 0;
                   const remaining = Math.max(0, total - paid);

                   const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                   const dueDateObj = new Date(newTx.dueDate + 'T12:00:00');
                   const lastInstallmentDate = addMonths(dueDateObj, remaining - 1);
                   const lastInstallmentMonthStr = `${months[lastInstallmentDate.getMonth()]} de ${lastInstallmentDate.getFullYear()}`;

                   if (remaining === 0) {
                     return <span className="text-emerald-500 font-semibold">✓ Todas as parcelas já foram quitadas!</span>;
                   }
                   return (
                     <div className="space-y-1">
                       <div>
                         {paid > 0 ? (
                           <span>
                             Faltam <strong className="text-primary">{remaining}</strong> parcelas pendentes. O sistema criará automaticamente da <strong className="text-foreground">{paid + 1}ª</strong> à <strong className="text-foreground">{total}ª</strong> parcela.
                           </span>
                         ) : (
                           <span>
                             Serão criadas <strong className="text-primary">{remaining}</strong> parcelas consecutivas no sistema (da 1ª à {total}ª).
                           </span>
                         )}
                       </div>
                       <div className="text-[10px] text-muted-foreground/80 mt-1 flex items-center gap-1">
                         <span>📅 A última parcela ({total}ª) vencerá em</span>
                         <strong className="text-foreground">{lastInstallmentMonthStr}</strong>.
                       </div>
                     </div>
                   );
                 })()}
              </div>
            </div>
          )}

          <button 
            type="button" 
            disabled={!isTxFormValid}
            onClick={() => handleAddTx(activeModal === 'new_transaction_income' ? 'INCOME' : 'EXPENSE')}
            className={cn(
              "w-full text-primary-foreground font-semibold py-4 rounded-xl mt-4 transition-all active:scale-95 text-sm uppercase tracking-wider font-bold cursor-pointer",
              !isTxFormValid
                ? "bg-muted text-muted-foreground opacity-50 cursor-not-allowed border border-border"
                : (activeModal === 'new_transaction_income' 
                    ? "bg-primary hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.01]" 
                    : "bg-red-500 text-white hover:shadow-lg hover:shadow-red-500/20 hover:scale-[1.01]")
            )}
          >
            {editingTransaction ? "Salvar Alterações" : (activeModal === 'new_transaction_income' ? "Adicionar Receita" : "Adicionar Despesa")}
          </button>
        </div>
      </Modal>

      <Modal isOpen={!!cashFlowDetailMonth} onClose={closeModal} title={`Detalhes de ${cashFlowDetailMonth?.fullName} ${selectedYear}`}>
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
             <div className="bg-primary/5 p-3 rounded-2xl border border-primary/20 flex flex-col items-center">
                <span className="text-[10px] text-muted-foreground font-bold mb-1">Receitas</span>
                <span className="text-sm font-black text-primary">{formatCurrency(cashFlowDetailMonth?.income || 0)}</span>
             </div>
             <div className="bg-red-500/5 p-3 rounded-2xl border border-red-500/20 flex flex-col items-center">
                <span className="text-[10px] text-muted-foreground font-bold mb-1">Despesas</span>
                <span className="text-sm font-black text-red-400">{formatCurrency(cashFlowDetailMonth?.expense || 0)}</span>
             </div>
             <div className="bg-foreground/5 p-3 rounded-2xl border border-foreground/10 flex flex-col items-center">
                <span className="text-[10px] text-muted-foreground font-bold mb-1">Saldo</span>
                <span className={cn(
                  "text-sm font-black",
                  (cashFlowDetailMonth?.balance || 0) >= 0 ? "text-foreground" : "text-red-400"
                )}>{formatCurrency(cashFlowDetailMonth?.balance || 0)}</span>
             </div>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            <p className="text-[10px] font-bold text-muted-foreground ml-1 sticky top-0 bg-background py-2">Composição do mês</p>
            {cashFlowDetailMonth?.transactions
              .sort((a: any, b: any) => new Date(a.competenceDate).getTime() - new Date(b.competenceDate).getTime())
              .map((tx: any) => {
                const cat = categories.find((c: any) => c.id === tx.categoryId);
                const isPaid = tx.status === 'PAID' || tx.status === 'RECEIVED';
                return (
                  <div key={tx.id} className="flex items-center justify-between p-4 bg-muted/20 border border-border/50 rounded-2xl hover:bg-muted/30 transition-all">
                    <div className="flex items-center gap-3">
                      {cat ? (
                        <CategoryIcon icon={cat.icon} color={cat.color} size="sm" />
                      ) : (
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center border",
                          tx.type === 'INCOME' ? "bg-primary/10 border-primary/20 text-primary" : "bg-red-500/10 border-red-500/20 text-red-400"
                        )}>
                          {tx.type === 'INCOME' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-foreground/90">
                          {tx.description}
                          {tx.isProjected && <span className="ml-2 text-[8px] bg-primary/20 text-primary px-1 rounded italic">Projetado</span>}
                        </span>
                        <span className="text-[9px] text-muted-foreground">
                          Vence em {format(new Date(tx.dueDate || tx.competenceDate), "dd 'de' MMMM", { locale: ptBR })}
                          {isPaid && tx.paymentDate && (
                            <span className="ml-1 text-primary/60 font-bold">
                              • Pago em {format(new Date(tx.paymentDate), "dd/MM", { locale: ptBR })}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                    <span className={cn(
                      "text-xs font-black",
                      tx.type === 'INCOME' ? "text-primary" : "text-foreground"
                    )}>
                      {tx.type === 'INCOME' ? '+' : '-'} {formatCurrency(tx.amount)}
                    </span>
                  </div>
                );
              })}
            {cashFlowDetailMonth?.transactions.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-10">Nenhum lançamento para este mês.</p>
            )}
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!bankDetailInfo} onClose={closeModal} title={`Detalhes de ${bankDetailInfo?.name}`}>
        <div className="space-y-4">
          <div className="bg-muted/20 p-4 rounded-xl border border-border/50 text-center">
             <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Saldo em {bankDetailInfo?.name}</p>
             <p className="text-2xl font-black text-foreground">{formatCurrency(bankDetailInfo?.currentBalance || 0)}</p>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            <p className="text-[10px] font-bold text-muted-foreground ml-1 sticky top-0 bg-background py-2">Próximos Lançamentos (30 dias)</p>
            {transactions
               .filter(t => t.bankId === bankDetailInfo?.id && (t.status === 'OPEN' || t.status === 'OVERDUE' || t.status === 'PAID' || t.status === 'RECEIVED'))
               .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
               .slice(0, 50)
               .map(tx => {
                 const cat = categories.find(c => c.id === tx.categoryId);
                 return (
                   <div key={tx.id} className="flex justify-between items-center p-3 rounded-xl border border-border/50 bg-card">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted" style={{ backgroundColor: cat ? `${cat.color}20` : undefined, color: cat?.color }}>
                            {cat?.icon === 'utensils' && <span>🍔</span>}
                            {cat?.icon === 'home' && <span>🏠</span>}
                            {cat?.icon === 'briefcase' && <span>💼</span>}
                            {cat?.icon === 'hand-coins' && <span>💸</span>}
                            {!cat && <span className="text-sm">📝</span>}
                         </div>
                         <div>
                           <p className="text-sm font-bold text-foreground">{tx.description}</p>
                           <p className="text-[10px] text-muted-foreground font-medium">{format(new Date(tx.dueDate), 'dd/MM/yyyy')}</p>
                         </div>
                      </div>
                      <div className="text-right">
                        <p className={cn("text-sm font-bold", tx.type === 'INCOME' ? "text-primary" : "text-red-400")}>
                          {tx.type === 'INCOME' ? '+' : '-'} {formatCurrency(tx.amount)}
                        </p>
                        <span className={cn(
                          "text-[9px] font-bold px-2 py-0.5 rounded-full",
                          (tx.status === 'PAID' || tx.status === 'RECEIVED') ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-400/10 text-amber-500"
                        )}>
                          {(tx.status === 'PAID' || tx.status === 'RECEIVED') ? 'Concluído' : 'Pendente'}
                        </span>
                      </div>
                   </div>
                 );
               })
            }
            {transactions.filter(t => t.bankId === bankDetailInfo?.id).length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-10">Nenhum lançamento encontrado nesta conta.</p>
            )}
          </div>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'all_cards'} onClose={closeModal} title="Meus Cartões e Contas">
        <div className="space-y-4">
                  <div className="bg-muted/30 p-4 rounded-2xl border border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">Nubank Ultravioleta</p>
                        <p className="text-[10px] text-muted-foreground">**** 4321 • Mastercard</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold">R$ 10.500 disp.</span>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-2xl border border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#EC7000]/20 rounded-xl flex items-center justify-center text-[#EC7000]">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">Itaú Black</p>
                        <p className="text-[10px] text-muted-foreground">**** 9876 • Visa</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold">R$ 27.500 disp.</span>
                  </div>
          <button onClick={() => setActiveModal('add_account')} className="w-full border-2 border-dashed border-border rounded-2xl py-6 flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 hover:text-primary hover:border-primary/50 transition-all group">
            <Plus className="w-6 h-6 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">Adicionar Nova Conta</span>
          </button>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'add_account'} onClose={closeModal} title="Adicionar Conta ou Cartão">
        <form className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nome da instituição</label>
            <input type="text" placeholder="Ex: Nubank, Itaú..." className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Titular</label>
            <input type="text" placeholder="Nome impresso no cartão" className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none" />
          </div>
          <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border">
            <div className="flex flex-col">
              <span className="text-sm font-bold">Cartão de Crédito?</span>
              <span className="text-[10px] text-muted-foreground">Esta é uma conta de crédito</span>
            </div>
            <input type="checkbox" className="w-5 h-5 accent-primary cursor-pointer" />
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <button type="button" onClick={() => setActiveModal('all_cards')} className="bg-muted text-foreground font-semibold py-4 rounded-xl hover:bg-muted/80 transition-all">
              Voltar
            </button>
            <button type="button" onClick={() => {
              // In a real app we'd call an addCreditCard action
              closeModal();
            }} className="bg-primary text-primary-foreground font-semibold py-4 rounded-xl hover:shadow-lg transition-all">
              Cadastrar
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={activeModal === 'monthly_filter'} onClose={closeModal} title="Filtrar por Período">
        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground mb-3 block">Base de data</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'competenceDate', label: 'Competência' },
                { id: 'dueDate', label: 'Vencimento' },
                { id: 'paymentDate', label: 'Pagamento' }
              ].map(dt => (
                <button 
                  key={dt.id}
                  onClick={() => setDateFieldToFilter(dt.id as any)}
                  className={cn(
                    "py-2 rounded-lg border text-[10px] font-medium transition-all",
                    dateFieldToFilter === dt.id ? "bg-primary text-primary-foreground border-primary" : "bg-muted/20 border-border text-muted-foreground"
                  )}
                >
                  {dt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <PremiumSelect
              label="Ano"
              value={selectedYear.toString()}
              onChange={(val) => setSelectedYear(parseInt(val))}
              options={Array.from({ length: 11 }, (_, i) => {
                const y = now.getFullYear() - 5 + i;
                return { value: y.toString(), label: y.toString() };
              })}
            />
            <PremiumSelect
              label="Mês"
              value={selectedMonth}
              onChange={(val) => {
                setSelectedMonth(val);
                setDateRange({start: '', end: ''});
              }}
              options={[
                { value: 'ALL', label: 'Todos' },
                ...months.map(m => ({ value: m, label: m }))
              ]}
            />
          </div>

          <div className="pt-4 border-t border-border">
            <label className="text-[10px] font-semibold text-muted-foreground mb-3 block">Período personalizado</label>
            <div className="grid grid-cols-2 gap-3">
              <PremiumDatePicker 
                label="Início"
                value={dateRange.start}
                onChange={(val) => setDateRange({ ...dateRange, start: val })}
              />
              <PremiumDatePicker 
                label="Fim"
                value={dateRange.end}
                onChange={(val) => setDateRange({ ...dateRange, end: val })}
              />
            </div>
            <button 
              onClick={() => { setSelectedMonth('ALL'); closeModal(); }}
              disabled={!dateRange.start || !dateRange.end}
              className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl mt-4 text-xs hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Aplicar período
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'advanced_filters'} onClose={closeModal} title="Filtros Avançados">
        <div className="space-y-5">
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground mb-2 block">Tipo de Movimentação</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'ALL', label: 'Todos' },
                { id: 'INCOME', label: 'Receitas' },
                { id: 'EXPENSE', label: 'Despesas' }
              ].map(t => (
                <button 
                  key={t.id}
                  onClick={() => setFilterType(t.id as any)}
                  className={cn(
                    "py-2 rounded-lg border text-[10px] font-bold transition-all",
                    filterType === t.id ? "bg-primary text-primary-foreground border-primary" : "bg-muted/20 border-border text-muted-foreground"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-muted-foreground mb-2 block">Status</label>
                        <div id="status-pending" className="grid grid-cols-2 gap-2">
              {[
                { id: 'ALL', label: 'Todos os status' },
                { id: 'PAID', label: 'Pago' },
                { id: 'RECEIVED', label: 'Recebido' },
                { id: 'OPEN', label: 'Aberto' },
                { id: 'OVERDUE', label: 'Atrasado' }
              ].map(s => (
                <button 
                  key={s.id}
                  onClick={() => setFilterStatus(s.id)}
                  className={cn(
                    "py-2 px-2 rounded-lg border text-[10px] font-bold transition-all",
                    filterStatus === s.id ? "bg-primary text-primary-foreground border-primary" : "bg-muted/20 border-border text-muted-foreground"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-muted-foreground mb-2 block">Categoria</label>
            <select 
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-[10px] font-bold focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="ALL">Todas as categorias</option>
              {categories
                .filter(c => filterType === 'ALL' || c.type === filterType || c.type === 'BOTH')
                .map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex gap-3">
             <button 
              onClick={() => {
                setFilterType('ALL');
                setFilterStatus('ALL');
                setFilterCategory('ALL');
              }}
              className="flex-1 py-3 border border-border rounded-xl text-xs font-semibold hover:bg-muted transition-all"
            >
              Limpar filtros
            </button>
            <button 
              onClick={closeModal}
              className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl text-xs font-semibold hover:shadow-lg transition-all"
            >
              Concluído
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'balance_details'} onClose={closeModal} title="Detalhes do Saldo Atual">
        <div className="space-y-4">
          <div className="bg-primary/5 p-4 rounded-2xl border border-primary/20 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Saldo Consolidado</span>
            <span className="text-lg font-black font-display text-primary tracking-tight">{formatCurrency(totalBalance)}</span>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Saldos por Conta</p>
            {banks.map(bank => (
              <div key={bank.id} className="flex items-center justify-between p-4 bg-muted/20 border border-border/50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${bank.color}20`, color: bank.color }}>
                    <Wallet className="w-5 h-5" />
                  </div>
                  <span className="text-base font-bold text-foreground/90">{bank.name}</span>
                </div>
                <span className="text-base font-black text-foreground">{formatCurrency(bank.currentBalance)}</span>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'to_pay_details'} onClose={closeModal} title="Despesas a Pagar">
        <div className="space-y-4">
          <div className="bg-red-500/5 p-4 rounded-2xl border border-red-500/20 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total em Aberto</span>
            <span className="text-lg font-black font-display text-red-400 tracking-tight">{formatCurrency(totalToPay)}</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {filteredForStats
              .filter(t => t.type === 'EXPENSE' && (t.status === 'OPEN' || t.status === 'OVERDUE'))
              .sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
              .map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-3 bg-muted/20 border border-border/50 rounded-2xl">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-foreground/90 truncate max-w-[180px]">{tx.description}</span>
                    <span className="text-[10px] text-muted-foreground">
                      Vence em {format(new Date(tx.dueDate), "dd/MM/yyyy")}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-bold text-foreground">{formatCurrency(tx.amount)}</span>
                    {tx.status === 'OVERDUE' && <span className="text-[8px] font-bold text-red-400 uppercase">Atrasado</span>}
                  </div>
                </div>
              ))}
            {filteredForStats.filter(t => t.type === 'EXPENSE' && (t.status === 'OPEN' || t.status === 'OVERDUE')).length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-8">Nenhuma despesa pendente no período.</p>
            )}
          </div>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'projected_details'} onClose={closeModal} title="Conciliação Projetada">
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-2">
            <div className="flex justify-between items-center px-4 py-3 bg-muted/30 rounded-xl border border-border/50">
              <span className="text-xs text-muted-foreground">Saldo Atual</span>
              <span className="text-sm font-bold">{formatCurrency(totalBalance)}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-3 bg-primary/5 rounded-xl border border-primary/20">
              <span className="text-xs text-primary font-semibold">Receitas a Receber (+)</span>
              <span className="text-sm font-bold text-primary">{formatCurrency(totalReceivables)}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-3 bg-red-500/5 rounded-xl border border-red-500/20">
              <span className="text-xs text-red-400 font-semibold">Despesas a Pagar (-)</span>
              <span className="text-sm font-bold text-red-400">{formatCurrency(totalToPay)}</span>
            </div>
            <div className="mt-2 flex justify-between items-center px-4 py-4 bg-foreground/5 rounded-xl border-2 border-primary/30 shadow-lg shadow-primary/5">
              <span className="text-sm font-bold text-foreground tracking-wider">Saldo Final Projetado</span>
              <span className="text-lg font-black font-display text-primary tracking-tight">{formatCurrency(projectedBalance)}</span>
            </div>
          </div>

          <div className="space-y-3">
             <p className="text-[10px] font-bold text-muted-foreground ml-1">Composição das Contas</p>
             <div className="grid grid-cols-2 gap-2">
               {banks.map(bank => (
                 <div key={bank.id} className="p-2.5 bg-muted/20 border border-border/50 rounded-xl flex items-center justify-between">
                    <span className="text-[10px] font-medium text-foreground/80 truncate pr-2">{bank.name}</span>
                    <span className="text-[10px] font-bold">{formatCurrency(bank.currentBalance)}</span>
                 </div>
               ))}
             </div>
          </div>
          
          <p className="text-[9px] text-muted-foreground italic text-center">
            * O saldo projetado considera o saldo disponível em todas as contas somado às receitas previstas e subtraído de todas as despesas em aberto para o período selecionado.
          </p>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'confirm_delete'} onClose={closeModal} title="Confirmar Remoção">
        <div className="space-y-4">
          <p className="text-sm text-center py-4 text-foreground">
            Deseja remover esta movimentação de <span className="text-primary font-bold">{selectedMonth}/{selectedYear}</span>?<br/>
            <strong className="text-primary">"{deletingTransaction?.description}"</strong><br/>
            {deletingTransaction?.id.toString().startsWith('recurring-') 
              ? "Isso ocultará este item apenas neste mês. A regra de recorrência continuará ativa para os outros meses."
              : "Esta ação excluirá permanentemente a transação."}
          </p>
          <div className="flex gap-3">
            <button onClick={closeModal} className="flex-1 py-3 border border-border rounded-xl text-xs font-bold hover:bg-muted transition-all">
              Cancelar
            </button>
            <button onClick={handleDelete} className="flex-1 bg-destructive text-foreground py-3 rounded-xl text-xs font-bold hover:bg-destructive/80 transition-all">
              Remover
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'new_reminder'} onClose={closeModal} title="Novo Lembrete de Pagamento">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Título do Lembrete</label>
            <input 
              type="text" 
              placeholder="Ex: Pagar Internet" 
              value={newReminder.title}
              onChange={e => setNewReminder({...newReminder, title: e.target.value})}
              className="w-full bg-card border border-border/60 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none" 
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Descrição / Motivo</label>
            <textarea 
              placeholder="Descreva o motivo deste pagamento..." 
              value={newReminder.description}
              onChange={e => setNewReminder({...newReminder, description: e.target.value})}
              className="w-full bg-card border border-border/60 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none min-h-[100px] resize-none" 
            />
          </div>
          <PremiumDatePicker 
            label="Data de Vencimento"
            value={newReminder.dueDate}
            onChange={val => setNewReminder({...newReminder, dueDate: val})}
          />
          <button 
            type="button" 
            onClick={handleAddReminder}
            className="w-full bg-primary text-primary-foreground font-semibold py-4 rounded-xl mt-4 hover:shadow-lg transition-all active:scale-95 text-sm"
          >
            Configurar Lembrete
          </button>
        </div>
      </Modal>

      <div className="max-w-[1400px] mx-auto">
        
        {/* Main Grid: Left Column (Content) + Right Column (Sidebar) */}
        <div className="flex flex-col xl:flex-row gap-6">
          
          {/* LEFT COLUMN */}
          <div className="flex-1 flex flex-col gap-6">
            
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl font-bold font-display text-foreground tracking-tighter italic">Painel Financeiro</h1>
                  <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-[10px] font-black my-auto">
                    Global
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">Acompanhe e gerencie sua atividade financeira em tempo real</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <button 
                  onClick={() => setActiveModal('new_transaction_income')}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-xs font-semibold hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Receita
                </button>
                <button 
                  onClick={() => setActiveModal('new_transaction_expense')}
                  className="flex items-center gap-2 bg-red-500 text-foreground px-5 py-2.5 rounded-full text-xs font-semibold hover:shadow-lg hover:shadow-red-500/20 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Despesa
                </button>
                <button 
                  onClick={() => {
                    const now = new Date();
                    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                    setSelectedMonth(months[now.getMonth()]);
                    setSelectedYear(now.getFullYear());
                    setDateRange({start: '', end: ''});
                  }}
                  className="p-2.5 bg-card border border-border rounded-full hover:bg-muted transition-colors text-primary"
                  title="Mês Atual"
                >
                  <RefreshCcw className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2">
                  <div className="w-24">
                    <PremiumSelect
                      label="Ano"
                      value={selectedYear.toString()}
                      onChange={(val) => setSelectedYear(parseInt(val))}
                      options={Array.from({ length: 11 }, (_, i) => {
                        const y = now.getFullYear() - 5 + i;
                        return { value: y.toString(), label: y.toString() };
                      })}
                    />
                  </div>
                  <div className="w-32">
                    <PremiumSelect
                      label="Mês"
                      value={selectedMonth}
                      onChange={(val) => {
                        setSelectedMonth(val);
                        setDateRange({start: '', end: ''});
                      }}
                      options={[
                        { value: 'ALL', label: 'Todos' },
                        ...months.map(m => ({ value: m, label: m }))
                      ]}
                    />
                  </div>
                </div>

                <button 
                  onClick={() => setActiveModal('monthly_filter')}
                  className="flex items-center gap-2 bg-card border border-border p-2.5 rounded-full text-xs font-medium hover:bg-muted transition-colors text-foreground"
                  title="Filtros de data avançados"
                >
                  <Filter className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
              {/* Card 1: Saldo Atual */}
              <div className="bg-card border border-border rounded-3xl p-5 relative overflow-hidden group transition-all duration-300 hover:border-primary/50 cursor-pointer" onClick={() => setActiveModal('balance_details')}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-border flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                    <Wallet className="w-6 h-6 text-foreground" />
                  </div>
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    <span className="text-muted-foreground text-[10px] font-semibold whitespace-nowrap">Saldo atual</span>
                    <div className="text-xl font-bold font-display text-foreground tracking-tight whitespace-nowrap">
                      {formatCurrency(totalBalance)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Valor a Pagar */}
              <div className="bg-card border border-border rounded-3xl p-5 relative overflow-hidden group transition-all duration-300 hover:border-primary/50 cursor-pointer" onClick={() => setActiveModal('to_pay_details')}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-border flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                    <ArrowUpRight className="w-6 h-6 text-red-400" />
                  </div>
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    <span className="text-muted-foreground text-[10px] font-semibold text-red-400 whitespace-nowrap text-red-400">A pagar</span>
                    <div className="text-xl font-bold font-display text-foreground tracking-tight whitespace-nowrap">
                      {formatCurrency(totalToPay)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Valor Projetado */}
              <div className="bg-card border border-border rounded-3xl p-5 relative overflow-hidden group transition-all duration-300 hover:border-primary/50 cursor-pointer" onClick={() => setActiveModal('projected_details')}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-border flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                    <ArrowDownLeft className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    <span className="text-muted-foreground text-[10px] font-semibold whitespace-nowrap">Projetado</span>
                    <div className="text-xl font-bold font-display text-foreground tracking-tight whitespace-nowrap">
                      {formatCurrency(projectedBalance)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cashflow Chart (Visual Mockup) */}
            <div className="bg-card border border-border rounded-3xl p-6 flex flex-col h-[340px]">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                   <div className="flex items-center justify-center w-8 h-8 rounded-full bg-border/50 text-muted-foreground">
                      <TrendingUp className="w-4 h-4" /> 
                   </div>
                   <div>
                     <h2 className="text-lg font-bold text-foreground tracking-tight">Fluxo de Caixa Projetado</h2>
                     <p className="text-[10px] text-muted-foreground font-bold">Projeção Anual {selectedYear}</p>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                   <div className="flex items-center gap-1.5 mr-2">
                     <div className="w-2 h-2 rounded-full bg-primary"></div>
                     <span className="text-[8px] text-muted-foreground font-bold">Saldo</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                     <div className="w-2 h-2 rounded-full bg-foreground/20"></div>
                     <span className="text-[8px] text-muted-foreground font-bold">Projetado</span>
                   </div>
                </div>
              </div>

              <div className="flex-1 relative mt-2 group/chart">
                {/* Horizontal Grid Lines */}
                <div className="absolute inset-0 bottom-6 flex flex-col justify-between pointer-events-none">
                  {[0, 1, 2, 3, 4].map((_, i) => (
                    <div key={i} className="w-full h-px bg-border/20"></div>
                  ))}
                </div>

                {/* Y Axis Labels (Approximate) */}
                <div className="absolute -left-2 top-0 bottom-6 flex flex-col justify-between text-[8px] text-muted-foreground/60 font-bold items-end pointer-events-none">
                  <span>{formatCurrency(maxBalance).split(',')[0]}</span>
                  <span>{formatCurrency(maxBalance * 0.75).split(',')[0]}</span>
                  <span>{formatCurrency(maxBalance * 0.5).split(',')[0]}</span>
                  <span>{formatCurrency(maxBalance * 0.25).split(',')[0]}</span>
                  <span>0</span>
                </div>

                {/* Chart Area */}
                <div className="ml-10 absolute inset-0 bottom-6 flex items-end gap-1.5 sm:gap-3">
                  {cashFlowData.map((d, i) => {
                    const heightValue = Math.max(5, (Math.abs(d.balance) / maxBalance) * 100);
                    return (
                      <div 
                        key={i} 
                        className="flex-1 flex flex-col items-center justify-end h-full relative group/bar cursor-pointer"
                        onClick={() => setCashFlowDetailMonth(d)}
                      >
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-card border border-border pb-4 p-4 rounded-2xl shadow-lg opacity-0 group-hover/bar:opacity-100 transition-all z-30 pointer-events-none min-w-[160px] scale-95 group-hover/bar:scale-100 duration-300">
                           <p className="text-[12px] font-black text-foreground mb-2 italic border-b border-foreground/10 pb-1">{d.fullName}</p>
                           <div className="space-y-1.5">
                             <div className="flex justify-between gap-6">
                                <span className="text-[10px] text-muted-foreground font-medium">Entradas</span>
                                <span className="text-[10px] text-primary font-black">{formatCurrency(d.income)}</span>
                             </div>
                             <div className="flex justify-between gap-6">
                                <span className="text-[10px] text-muted-foreground font-medium">Saídas</span>
                                <span className="text-[10px] text-red-400 font-black">{formatCurrency(d.expense)}</span>
                             </div>
                             <div className="border-t border-foreground/5 mt-2 pt-2 flex justify-between gap-6">
                                <span className="text-[10px] text-foreground/50 font-bold">Resultado</span>
                                <span className={cn(
                                  "text-[10px] font-black",
                                  d.balance >= 0 ? "text-foreground" : "text-red-400"
                                )}>{formatCurrency(d.balance)}</span>
                             </div>
                           </div>
                        </div>

                        {/* Bar */}
                        <div 
                          className={cn(
                            "w-full rounded-t-lg relative transition-all duration-500 overflow-hidden",
                            d.isFuture 
                              ? "bg-foreground/5 border border-foreground/10 group-hover/bar:bg-foreground/10" 
                              : "bg-primary/20 border border-primary/30 group-hover/bar:bg-primary/30",
                            d.isCurrent && "border-2 border-primary shadow-[0_0_15px_rgba(188,242,75,0.2)]",
                            d.balance < 0 && (d.isFuture ? "bg-red-500/5 border-red-500/10" : "bg-red-500/20 border-red-500/30")
                          )} 
                          style={{ height: `${heightValue}%` }}
                        >
                           {/* Highlight line at top */}
                           <div className={cn(
                             "absolute top-0 left-0 right-0 h-[2.5px]",
                             d.isFuture ? (d.balance < 0 ? "bg-red-400/50" : "bg-foreground/20") : (d.balance < 0 ? "bg-red-400" : "bg-primary")
                           )}></div>
                           
                           {/* Fill effect */}
                           <div className={cn(
                             "absolute inset-0 bg-gradient-to-t from-transparent",
                             d.isFuture ? "to-white/5" : "to-primary/10"
                           )}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* X Axis */}
                <div className="ml-10 absolute bottom-0 left-0 right-0 flex justify-between text-[9px] text-muted-foreground font-black pt-2 border-t border-border/50 italic">
                  {cashFlowData.map((d, i) => (
                    <div key={i} className={cn("flex-1 text-center truncate", d.isCurrent && "text-primary")}>{d.name}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Transactions History */}
            <div className="bg-card border border-border rounded-3xl p-6 flex flex-col min-h-[300px]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex flex-col">
                  <h2 className="text-lg font-medium text-foreground/90">Histórico de Transações</h2>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    {filteredTransactions.length} {filteredTransactions.length === 1 ? 'transação encontrada' : 'transações encontradas'}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-none">
                    <input 
                      type="text" 
                      placeholder="Buscar transação..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full sm:w-56 bg-background text-xs text-foreground rounded-full pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary/50 border border-border transition-all"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                  <button 
                    onClick={() => setActiveModal('advanced_filters')}
                    className="flex items-center gap-2 bg-background border border-border px-4 py-2.5 rounded-full text-xs font-medium hover:bg-muted transition-colors text-foreground whitespace-nowrap"
                  >
                    Filtros {(filterType !== 'ALL' || filterStatus !== 'ALL' || filterCategory !== 'ALL' || selectedMonth !== 'ALL' || !!dateRange.start) && <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse ml-1" />} <ChevronDown className="w-4 h-4 ml-1 opacity-70" />
                  </button>
                </div>
              </div>

              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 text-xs text-muted-foreground pb-4 border-b border-border font-medium px-2 select-none">
                <div 
                  onClick={() => handleSort('description')} 
                  className="col-span-5 sm:col-span-3 flex items-center gap-1 cursor-pointer hover:text-primary transition-colors"
                >
                  Descrição {sortField === 'description' && (sortOrder === 'asc' ? '↑' : '↓')}
                </div>
                <div 
                  onClick={() => handleSort('category')} 
                  className="col-span-2 hidden sm:flex items-center gap-1 cursor-pointer hover:text-primary transition-colors"
                >
                  Categoria {sortField === 'category' && (sortOrder === 'asc' ? '↑' : '↓')}
                </div>
                <div 
                  onClick={() => handleSort('dueDate')} 
                  className="col-span-2 hidden md:flex items-center gap-1 cursor-pointer hover:text-primary transition-colors"
                >
                  Vencimento {sortField === 'dueDate' && (sortOrder === 'asc' ? '↑' : '↓')}
                </div>
                <div 
                  onClick={() => handleSort('paymentDate')} 
                  className="col-span-2 hidden md:flex items-center gap-1 cursor-pointer hover:text-primary transition-colors"
                >
                  Pagamento {sortField === 'paymentDate' && (sortOrder === 'asc' ? '↑' : '↓')}
                </div>
                <div 
                  onClick={() => handleSort('amount')} 
                  className="col-span-4 sm:col-span-4 md:col-span-2 flex items-center justify-end gap-1 cursor-pointer hover:text-primary transition-colors text-right"
                >
                  {sortField === 'amount' && (sortOrder === 'asc' ? '↑ ' : '↓ ')} Valor
                </div>
                <div className="col-span-3 sm:col-span-3 md:col-span-1 text-right">Ações</div>
              </div>

              {/* Table Body */}
              <div className="flex flex-col mt-2">
                {filteredTransactions.map((tx, idx) => {
                  const category = categories.find(c => c.id === tx.categoryId);
                  const isPaid = tx.status === 'PAID' || tx.status === 'RECEIVED';
                  const isVirtual = tx.id.toString().startsWith('recurring-');

                  return (
                    <div key={tx.id} className="grid grid-cols-12 gap-4 py-4 items-center border-b border-border last:border-0 hover:bg-muted/50 rounded-xl px-2 -mx-2 transition-colors group">
                      
                      {/* Descrição */}
                      <div className="col-span-5 sm:col-span-3 flex items-center gap-3 text-sm min-w-0">
                        {category ? (
                          <CategoryIcon icon={category.icon} color={category.color} size="md" />
                        ) : (
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                            tx.type === 'INCOME' 
                              ? "bg-primary/10 border-primary/20 text-primary" 
                              : "bg-red-500/10 border-red-500/20 text-red-400"
                          )}>
                            {tx.type === 'INCOME' ? <ArrowDown className="w-5 h-5 flex-shrink-0" /> : <ArrowUp className="w-5 h-5 flex-shrink-0" />}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-foreground/90 font-medium truncate text-sm flex items-center gap-1.5">
                            {tx.description}
                            {isVirtual && <span className="text-[8px] bg-primary/20 text-primary px-1 rounded border border-primary/20">Previsto</span>}
                          </span>
                          {tx.creditCardId && (
                            <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded mt-1 w-fit flex items-center gap-1 animate-pulse">
                              <span>💳</span> Fatura do Cartão
                            </span>
                          )}
                          
                          {/* Em celular ou tablets pequenos, mostre datas de forma compacta para não quebrar o layout */}
                          <div className="md:hidden flex flex-col gap-0.5 text-[10px] text-muted-foreground mt-0.5 font-medium">
                            <span title="Data de Vencimento">Venc: {format(new Date(tx.dueDate || tx.competenceDate), "dd/MM/yyyy", { locale: ptBR })}</span>
                            {isPaid && tx.paymentDate && (
                              <span className="text-primary/70 font-semibold">Pag: {format(new Date(tx.paymentDate), "dd/MM/yyyy", { locale: ptBR })}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Categoria */}
                      <div className="col-span-2 hidden sm:flex items-center gap-2">
                        {category && (
                          <span className={cn(
                            "px-2.5 py-1 text-[10px] font-semibold rounded-full border whitespace-nowrap",
                            "bg-primary/10 text-primary border-primary/20"
                          )}>
                            {category.name}
                          </span>
                        )}
                      </div>

                      {/* Vencimento */}
                      <div className="col-span-2 hidden md:flex items-center text-xs text-muted-foreground font-semibold">
                        {tx.dueDate ? format(new Date(tx.dueDate), "dd MMM yyyy", { locale: ptBR }) : '---'}
                      </div>

                      {/* Pagamento */}
                      <div className="col-span-2 hidden md:flex items-center text-xs text-foreground/80 font-bold">
                        {isPaid && tx.paymentDate ? (
                          <span className="text-primary font-semibold">
                            {format(new Date(tx.paymentDate), "dd MMM yyyy", { locale: ptBR })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40 font-normal">---</span>
                        )}
                      </div>

                      {/* Valor */}
                      <div className="col-span-4 sm:col-span-4 md:col-span-2 flex flex-col items-end text-sm">
                        <span className={cn(
                          "font-bold",
                          tx.type === 'INCOME' ? "text-primary" : "text-foreground/90"
                        )}>
                          {tx.type === 'INCOME' ? '+' : ''} {formatCurrency(tx.amount)}
                        </span>
                        
                        <div className="flex flex-col items-end gap-1 mt-0.5">
                          {!isPaid ? (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                handleQuickPay(tx);
                              }}
                              className={cn(
                                "flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold rounded-full transition-all cursor-pointer border",
                                (() => {
                                  const nowAtStartOfToday = new Date();
                                  nowAtStartOfToday.setHours(0,0,0,0);
                                  const due = new Date(tx.dueDate || '');
                                  due.setHours(0,0,0,0);
                                  const isOverdue = due.getTime() < nowAtStartOfToday.getTime();
                                  return isOverdue
                                    ? "bg-rose-500/10 hover:bg-emerald-500/20 text-rose-400 hover:text-emerald-400 border-rose-500/20 hover:border-emerald-500/30"
                                    : "bg-amber-500/10 hover:bg-emerald-500/20 text-amber-500 hover:text-emerald-400 border-amber-500/20 hover:border-emerald-500/30";
                                })()
                              )}
                              title={tx.type === 'INCOME' ? "Confirmar Recebimento" : "Confirmar Pagamento"}
                            >
                              <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                              <span>
                                {(() => {
                                  const nowAtStartOfToday = new Date();
                                  nowAtStartOfToday.setHours(0,0,0,0);
                                  const due = new Date(tx.dueDate || '');
                                  due.setHours(0,0,0,0);
                                  const isOverdue = due.getTime() < nowAtStartOfToday.getTime();
                                  
                                  const baseAction = tx.type === 'INCOME' ? 'Receber' : 'Pagar';
                                  return isOverdue ? `${baseAction} (Atrasado)` : baseAction;
                                })()}
                              </span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {tx.status === 'PAID' ? 'Pago' : 'Recebido'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="col-span-3 sm:col-span-3 md:col-span-1 flex items-center justify-end gap-1 shrink-0">
                        <button 
                          onClick={() => handleEditClick(tx)}
                          className="p-1 hover:bg-primary/20 text-muted-foreground hover:text-primary rounded-lg transition-all cursor-pointer"
                          title="Editar transação"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => {
                            setDeletingTransaction(tx);
                            setActiveModal('confirm_delete');
                          }}
                          className="p-1 hover:bg-destructive/20 text-muted-foreground hover:text-destructive rounded-lg transition-all cursor-pointer"
                          title="Remover este mês"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
            
          </div>

          {/* RIGHT COLUMN */}
          <div className="w-full xl:w-[400px] flex flex-col gap-6">
            
            <div className="w-full xl:w-[400px] flex flex-col gap-6">
              
              {/* Reminders Card */}
              <div className="bg-card border border-border rounded-3xl p-6 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-foreground font-bold font-display tracking-tight">
                    <Bell className="w-5 h-5 text-amber-400" />
                    Lembretes
                  </div>
                  <button 
                    onClick={() => setActiveModal('new_reminder')}
                    className="p-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-lg transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-3">
                  {activeReminders.length === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed border-border rounded-2xl">
                      <p className="text-[10px] text-muted-foreground italic">Nenhum lembrete pendente.</p>
                    </div>
                  ) : (
                    activeReminders.map(reminder => (
                      <div key={reminder.id} className="p-3 bg-muted/20 border border-border/50 rounded-2xl flex flex-col gap-1 group">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-bold text-foreground/90 group-hover:text-primary transition-colors">{reminder.title}</span>
                          <button 
                            onClick={() => deleteReminder(reminder.id)}
                            className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-2">{reminder.description}</p>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[10px] font-bold text-amber-400">
                            {(() => {
                              try {
                                const dateStr = reminder.dueDate;
                                if (!dateStr) return '';
                                const dateObj = dateStr.includes('T') ? parseISO(dateStr) : new Date(dateStr + 'T12:00:00');
                                return format(dateObj, "dd 'de' MMMM", { locale: ptBR });
                              } catch (e) {
                                console.error("Error formatting reminder dueDate:", e);
                                return '';
                              }
                            })()}
                          </span>
                          <button 
                            onClick={() => completeReminder(reminder.id)}
                            className="text-[9px] font-black text-primary hover:underline"
                          >
                            Concluir
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              {/* Reimbursements Summary Card */}
              {reimbursementReceivables > 0 && (
                <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6">
                   <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-2 text-foreground font-bold font-display tracking-tight">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        Empréstimos/Reembolsos
                      </div>
                      <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-black">A RECEBER</span>
                   </div>
                   <div className="mb-4">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Total Pendente</p>
                      <h3 className="text-3xl font-black text-foreground">{formatCurrency(reimbursementReceivables)}</h3>
                   </div>
                   <div className="space-y-2">
                      {transactions
                        .filter(t => t.categoryId === 'cat-reimb' && t.type === 'INCOME' && (t.status === 'OPEN' || t.status === 'OVERDUE'))
                        .slice(0, 3)
                        .map(t => (
                          <div key={t.id} className="flex justify-between items-center p-2 bg-muted/40 rounded-xl border border-border/50">
                            <span className="text-[10px] text-foreground/80 font-medium truncate max-w-[150px]">{t.description.replace('Reembolso: ', '')}</span>
                            <span className="text-[10px] text-primary font-black">{formatCurrency(t.amount)}</span>
                          </div>
                      ))}
                      {transactions.filter(t => t.categoryId === 'cat-reimb' && t.type === 'INCOME' && (t.status === 'OPEN' || t.status === 'OVERDUE')).length > 3 && (
                        <p className="text-[9px] text-muted-foreground text-center mt-2 italic">E mais outros...</p>
                      )}
                   </div>
                </div>
              )}

              {/* Transactions per Bank summary instead of categories */}
              <div className="bg-card border border-border rounded-3xl p-6 flex-1">
                 <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2 text-foreground font-bold font-display tracking-tight">
                      <CreditCard className="w-5 h-5 text-muted-foreground" />
                      Saldos por Conta
                    </div>
                 </div>
                 <div className="space-y-4">
                    {banks.map(bank => (
                      <div key={bank.id} 
                        onClick={() => setBankDetailInfo(bank)}
                        className="flex items-center justify-between p-3 bg-muted/20 border border-border/50 rounded-2xl hover:border-primary/30 transition-all cursor-pointer">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${bank.color}20`, color: bank.color }}>
                              <Wallet className="w-5 h-5" />
                           </div>
                           <span className="text-base font-bold text-foreground/90">{bank.name}</span>
                        </div>
                        <span className="text-base font-black text-foreground">{formatCurrency(bank.currentBalance)}</span>
                      </div>
                    ))}
                 </div>
              </div>

              {/* Goals Summary Sidebar */}
              <div className="bg-card border border-border rounded-3xl p-6 flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-foreground font-bold font-display tracking-tight">
                    <Target className="w-5 h-5 text-primary" />
                    Resumo de Metas
                  </div>
                  <Link to="/goals" className="text-[10px] font-semibold text-primary hover:underline">
                    Ver todas
                  </Link>
                </div>

                <div className="space-y-6">
                  {/* Savings Goals */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-semibold text-muted-foreground">Reservas de valor</p>
                    {goals.filter(g => g.type === 'SAVINGS').length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Nenhuma meta de reserva ativa.</p>
                    ) : (
                      goals.filter(g => g.type === 'SAVINGS').slice(0, 3).map(goal => {
                        const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
                        const remaining = goal.targetAmount - goal.currentAmount;
                        return (
                          <div key={goal.id} className="space-y-2">
                            <div className="flex justify-between items-end">
                              <span className="text-xs font-medium text-foreground/90">{goal.name}</span>
                              <span className="text-[10px] text-muted-foreground">{progress.toFixed(0)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-border/40 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary transition-all duration-500" 
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[9px] font-medium leading-tight">
                              <div className="flex flex-col">
                                <span className="text-muted-foreground uppercase tracking-tighter">Guardado</span>
                                <span className="text-foreground">{formatCurrency(goal.currentAmount)}</span>
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-muted-foreground uppercase tracking-tighter">Meta</span>
                                <span className="text-foreground">{formatCurrency(goal.targetAmount)}</span>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-muted-foreground uppercase tracking-tighter">Faltam</span>
                                <span className="text-primary">{formatCurrency(Math.max(0, remaining))}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Spending Limits */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-semibold text-red-400/80">Limites de gastos</p>
                    {(() => {
                      const spendingGoals = goals.filter(g => g.type === 'SPENDING_LIMIT');
                      const categoryGoals = categories
                        .filter(c => c.monthlyGoal && c.type !== 'INCOME')
                        .map(c => ({
                          id: `cat-goal-${c.id}`,
                          name: c.name,
                          targetAmount: c.monthlyGoal!,
                          categoryId: c.id,
                        }));
                      
                      const allSpendingLimits = [...spendingGoals, ...categoryGoals].slice(0, 5);

                      if (allSpendingLimits.length === 0) {
                        return <p className="text-xs text-muted-foreground italic">Nenhum limite de gastos definido.</p>;
                      }

                      return allSpendingLimits.map(goal => {
                        const current = (() => {
                          const now = new Date();
                          const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                          return transactions
                            .filter(t => 
                              t.type === 'EXPENSE' && 
                              (goal.categoryId ? t.categoryId === goal.categoryId : true) && 
                              new Date(t.competenceDate) >= firstDayOfMonth
                            )
                            .reduce((acc, t) => acc + t.amount, 0);
                        })();
                        const progress = Math.min((current / goal.targetAmount) * 100, 100);
                        const isExceeded = current > goal.targetAmount;
                        const difference = current - goal.targetAmount;
                        
                        return (
                          <div key={goal.id} className="space-y-2">
                            <div className="flex justify-between items-end">
                              <span className="text-xs font-medium text-foreground/90">{goal.name}</span>
                              <span className={cn(
                                "text-[10px]",
                                isExceeded ? "text-red-400 font-bold" : "text-muted-foreground"
                              )}>{progress.toFixed(0)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-border/40 rounded-full overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full transition-all duration-500",
                                  isExceeded ? "bg-red-500" : (progress > 80 ? "bg-amber-500" : "bg-foreground/40")
                                )}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[9px] font-medium leading-tight">
                              <div className="flex flex-col">
                                <span className="text-muted-foreground uppercase tracking-tighter">Gasto</span>
                                <span className="text-foreground">{formatCurrency(current)}</span>
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-muted-foreground uppercase tracking-tighter">Meta</span>
                                <span className="text-foreground">{formatCurrency(goal.targetAmount)}</span>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-muted-foreground uppercase tracking-tighter">
                                  {isExceeded ? "Excedido" : "Restante"}
                                </span>
                                <span className={cn(
                                  isExceeded ? "text-red-400" : "text-primary"
                                )}>
                                  {formatCurrency(Math.abs(difference))}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50">
                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <div className="flex items-center gap-3 mb-2">
                       <TrendingUp className="w-4 h-4 text-primary" />
                       <span className="text-xs font-semibold text-foreground tracking-tight">Análise e Projeção</span>
                    </div>
                    {(() => {
                      const now = new Date();
                      const currentMonthIdx = now.getMonth();
                      
                      const currentMonthData = cashFlowData.find(d => d.fullName === months[currentMonthIdx] && selectedYear === now.getFullYear());
                      const nextMonthData = cashFlowData[(currentMonthIdx + 1) % 12];
                      
                      const currentExpenses = currentMonthData?.expense || 0;
                      const projectedNextMonthBalance = currentMonthIdx === 11 && selectedYear === now.getFullYear() 
                        ? 0 // Handle year wrap if needed, but for now just show next
                        : cashFlowData[(currentMonthIdx + 1) % 12]?.balance || 0;

                      const topCategory = categories
                        .filter(c => c.type === 'EXPENSE')
                        .map(c => ({
                          name: c.name,
                          amount: transactions
                            .filter(t => t.categoryId === c.id && new Date(t.competenceDate).getMonth() === currentMonthIdx && new Date(t.competenceDate).getFullYear() === selectedYear)
                            .reduce((acc, t) => acc + t.amount, 0)
                        }))
                        .sort((a, b) => b.amount - a.amount)[0];

                      return (
                        <div className="space-y-3">
                          <p className="text-[10px] text-muted-foreground leading-relaxed">
                            Neste mês de <span className="text-foreground font-bold">{months[currentMonthIdx]}</span>, seus gastos totais somam <span className="text-foreground font-bold">{formatCurrency(currentExpenses)}</span>. 
                            {topCategory && topCategory.amount > 0 && (
                              <span> A categoria <span className="text-primary font-bold">{topCategory.name}</span> é a sua maior despesa atual.</span>
                            )}
                          </p>
                          <div className="p-2 bg-foreground/5 rounded-xl border border-foreground/5 space-y-2">
                             <p className="text-[9px] text-primary font-bold uppercase tracking-widest">Projeção {months[(currentMonthIdx + 1) % 12]}</p>
                             <div className="flex justify-between items-center">
                                <span className="text-[9px] text-muted-foreground">Saldo Final Est.</span>
                                <span className="text-xs font-black text-foreground">{formatCurrency(projectedNextMonthBalance)}</span>
                             </div>
                             <div className="flex justify-between items-center">
                                <span className="text-[9px] text-muted-foreground">Movimentação</span>
                                <span className={cn(
                                  "text-[9px] font-bold",
                                  (nextMonthData?.income || 0) > (nextMonthData?.expense || 0) ? "text-primary" : "text-red-400"
                                )}>
                                  {formatCurrency((nextMonthData?.income || 0) - (nextMonthData?.expense || 0))}
                                </span>
                             </div>
                          </div>
                          <p className="text-[9px] text-muted-foreground leading-relaxed">
                            {projectedNextMonthBalance > totalBalance ? (
                              <span className="text-primary">Sua saúde financeira está em trajetória de crescimento.</span>
                            ) : (
                              <span className="text-red-400">Atenção: Suas recorrências podem reduzir seu patrimônio líquido no próximo mês. Recomendamos revisar despesas variáveis.</span>
                            )}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

            </div>

          </div>
          
        </div>
      </div>

      <Modal
        isOpen={activeModal === 'success_created'}
        onClose={() => {
          setActiveModal(null);
          setCreatedTransactionInfo(null);
        }}
        title=""
      >
        <div className="text-center py-6 space-y-4">
          <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4 animate-[bounce_0.5s_ease-in-out]">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-foreground">Tudo certo!</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-[280px] mx-auto">
            A transação <strong className="text-foreground">"{createdTransactionInfo?.description}"</strong> foi registrada com sucesso.
          </p>
          <button 
            onClick={() => {
              setActiveModal(null);
              setCreatedTransactionInfo(null);
            }}
            className="mt-6 px-8 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            Entendido
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={activeModal === 'due_today_prompt'}
        onClose={() => {
          setActiveModal(null);
          setCreatedTransactionInfo(null);
        }}
        title=""
      >
        <div className="text-center py-6 space-y-5">
          <div className="w-16 h-16 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-2 animate-pulse">
            <Bell className="w-8 h-8" />
          </div>
          <div>
             <h3 className="text-xl font-bold text-foreground italic">Olha só!</h3>
             <p className="text-sm text-muted-foreground mt-1 px-4">
               Esta transação vence *hoje*. <br/> 
               <strong className="text-foreground">"{createdTransactionInfo?.description}"</strong> no valor de <strong className="text-foreground">R$ {createdTransactionInfo?.amount?.toFixed(2)}</strong>
               {createdTransactionInfo?.bankId && (
                  <span> no banco <strong className="text-foreground">{banks.find(b => b.id === createdTransactionInfo?.bankId)?.name || 'Desconhecido'}</strong></span>
               )}.
             </p>
          </div>
          
          <div className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/10">
             <p className="text-[14px] font-black uppercase text-amber-500 mb-1 tracking-widest text-center">Que tal pagar agora?</p>
             <p className="text-xs text-muted-foreground mb-4">Você pode marcá-la como paga agora mesmo e evitar dores de cabeça.</p>
             <div className="grid grid-cols-2 gap-3">
               <button 
                 onClick={() => {
                   setActiveModal(null);
                   setCreatedTransactionInfo(null);
                 }}
                 className="w-full py-3 border border-border rounded-xl text-xs font-bold hover:bg-muted text-muted-foreground transition-all uppercase tracking-widest"
               >
                 Depois
               </button>
               <button 
                 onClick={() => {
                   if (createdTransactionInfo?.id) {
                     markTransactionAsPaid(createdTransactionInfo.id, new Date().toISOString());
                   }
                   setActiveModal(null);
                   setCreatedTransactionInfo(null);
                 }}
                 className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-xs font-black uppercase tracking-widest hover:shadow-lg shadow-primary/20 transition-all active:scale-95"
               >
                 Pagar Agora
               </button>
             </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
