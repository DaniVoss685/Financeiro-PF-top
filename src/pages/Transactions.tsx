import React, { useState } from 'react';
import { useAppContext, Transaction, Category } from '../store/AppContext';
import { PremiumCard } from '../components/ui/PremiumComponents';
import { formatCurrency, cn } from '../lib/utils';
import { Search, Filter, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, Share2, Printer, Download, Search as SearchIcon, ArrowUp, ArrowDown, CheckCircle2, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Modal } from '../components/ui/Modal';
import { CategoryIcon } from '../components/CategoryIcon';
import { PremiumSelect, PremiumDatePicker, PremiumCurrencyInput } from '../components/ui/PremiumInputs';
import TransactionsImporter from '../components/TransactionsImporter';

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

function getCardDueDatesOptions(dueDay: number, closingDay: number = 5) {
  const options = [];
  const now = new Date();
  
  // Calcular a primeira fatura válida para uma compra feita hoje
  const dateStr = format(now, 'yyyy-MM-dd');
  const firstValid = calculateCardDueDate(dateStr, closingDay, dueDay);

  const monthsNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  
  for (let i = 0; i < 12; i++) {
    const d = new Date(firstValid.getFullYear(), firstValid.getMonth() + i, dueDay);
    const val = format(d, 'yyyy-MM-dd');
    const label = `${dueDay} de ${monthsNames[d.getMonth()]} de ${d.getFullYear()}`;
    options.push({ value: val, label });
  }
  return options;
}

const TransactionTable = ({ 
  data, 
  type, 
  searchTerm, 
  onSearchChange, 
  onFilterClick,
  isFilterActive,
  sortField,
  sortOrder,
  onSort,
  categories,
  banks,
  creditCards,
  reminders,
  onCreateReminder,
  onQuickPay,
  onEdit,
  onDeleteClick
}: { 
  data: Transaction[], 
  type: 'INCOME' | 'EXPENSE',
  searchTerm: string,
  onSearchChange: (val: string) => void,
  onFilterClick: () => void,
  isFilterActive: boolean,
  sortField: string,
  sortOrder: 'asc' | 'desc',
  onSort: (field: string) => void,
  categories: Category[],
  banks: any[],
  creditCards: any[],
  reminders: any[],
  onCreateReminder: (t: Transaction) => void,
  onQuickPay: (t: Transaction) => void,
  onEdit: (t: Transaction) => void,
  onDeleteClick: (t: Transaction) => void
}) => {
  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <div className="w-3" />;
    return sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 text-primary" /> : <ArrowDown className="w-3 h-3 ml-1 text-primary" />;
  };

  const getCategory = (id: string) => categories.find(c => c.id === id);
  const getBank = (id: string) => banks.find(b => b.id === id);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full text-foreground">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder={`Buscar em ${type === 'INCOME' ? 'receitas' : 'despesas'}...`} 
            className="w-full pl-11 pr-4 py-3 bg-muted/20 border border-border/50 rounded-2xl focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/50 text-sm"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <button 
          onClick={onFilterClick}
          className={cn(
            "flex items-center justify-center gap-2 px-6 py-3 bg-card border rounded-2xl hover:bg-muted transition-all whitespace-nowrap text-xs font-semibold",
            isFilterActive ? "border-primary text-primary" : "border-border text-muted-foreground"
          )}
        >
          <Filter className="w-4 h-4" /> Filtros Avançados
        </button>
      </div>

      <PremiumCard className="overflow-x-auto border border-border/50 bg-card/50">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-border/60 bg-muted/20">
              <th 
                className="p-4 font-semibold text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                onClick={() => onSort('description')}
              >
                <div className="flex items-center">Descrição <SortIcon field="description" /></div>
              </th>

              <th 
                className="p-4 font-semibold text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                onClick={() => onSort('category')}
              >
                <div className="flex items-center">Categoria <SortIcon field="category" /></div>
              </th>

              <th 
                className="p-4 font-semibold text-[10px] text-muted-foreground text-right cursor-pointer hover:text-foreground transition-colors"
                onClick={() => onSort('amount')}
              >
                <div className="flex items-center justify-end">Valor <SortIcon field="amount" /></div>
              </th>

              <th 
                className="p-4 font-semibold text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                onClick={() => onSort('date')}
              >
                <div className="flex items-center">Pagamento <SortIcon field="date" /></div>
              </th>

              <th 
                className="p-4 font-semibold text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                onClick={() => onSort('dueDate')}
              >
                <div className="flex items-center">Vencimento <SortIcon field="dueDate" /></div>
              </th>
              
              <th 
                className="p-4 font-semibold text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                onClick={() => onSort('bank')}
              >
                <div className="flex items-center">Banco <SortIcon field="bank" /></div>
              </th>
              
              <th 
                className="p-4 font-semibold text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                onClick={() => onSort('status')}
              >
                <div className="flex items-center">Status <SortIcon field="status" /></div>
              </th>
              
              <th className="p-4 font-semibold text-[10px] text-muted-foreground text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {data.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-12 text-center text-muted-foreground italic">
                  Nenhuma {type === 'INCOME' ? 'receita' : 'despesa'} encontrada.
                </td>
              </tr>
            ) : data.map(t => {
                const cat = getCategory(t.categoryId);
                let bank = getBank(t.bankId);
                if (!bank && t.creditCardId && creditCards) {
                  const card = creditCards.find(cc => cc.id === t.creditCardId);
                  if (card) {
                    bank = getBank(card.bankId);
                  }
                }
                const isPaid = t.status === 'PAID' || t.status === 'RECEIVED';

                return (
                  <tr key={t.id} className="hover:bg-primary/5 transition-colors group">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <p className="font-bold text-base text-foreground/90 leading-tight">{t.description}</p>
                        {t.creditCardId && (
                          t.isRecurring ? (
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-lg w-fit">
                              🔄 Assinatura recorrente no cartão (Sem consumir limite)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-lg w-fit">
                              💳 Esta despesa está na fatura do cartão
                            </span>
                          )
                        )}
                        {t.isInstallment && t.installmentTotal && t.installmentCurrent && (
                          <span className="text-[10px] text-muted-foreground/80 font-semibold tracking-tight mt-1 animate-in fade-in duration-200">
                            {(() => {
                              const remaining = t.installmentTotal - t.installmentCurrent;
                              if (remaining <= 0) return '✨ Última parcela!';
                              const currentDueDate = new Date(t.dueDate);
                              const lastInstallmentDate = addMonths(currentDueDate, remaining);
                              const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                              return `📅 Última em ${months[lastInstallmentDate.getMonth()]} de ${lastInstallmentDate.getFullYear()}`;
                            })()}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {cat && <CategoryIcon icon={cat.icon} color={cat.color} size="sm" />}
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-foreground/80">{cat?.name || 'Sem Categoria'}</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 text-right">
                      <span className={cn(
                        "font-bold text-sm tracking-tight",
                        t.type === 'INCOME' ? "text-primary" : "text-foreground/90"
                      )}>
                        {t.type === 'INCOME' ? '+' : ''}{formatCurrency(t.amount)}
                      </span>
                    </td>

                    <td className="p-4">
                      <span className="text-sm font-bold text-foreground/80">
                        {isPaid && t.paymentDate ? format(parseISO(t.paymentDate), "dd/MM/yyyy") : '---'}
                      </span>
                    </td>

                    <td className="p-4">
                      <span className={cn(
                        "text-sm font-bold",
                        t.status === 'OVERDUE' ? "text-red-400" : "text-muted-foreground/80"
                      )}>
                        {t.dueDate ? format(parseISO(t.dueDate), "dd/MM/yyyy") : '---'}
                      </span>
                    </td>

                    <td className="p-4">
                      {bank ? (
                        <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: bank.color }} />
                           <span className="text-sm text-muted-foreground font-semibold tracking-tight">{bank.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/40 italic">Não informado</span>
                      )}
                    </td>

                    <td className="p-4">
                      <span className={cn(
                        "text-[9px] font-semibold px-2 py-1.5 rounded-lg tracking-wider block text-center border",
                        (t.status === 'PAID' || t.status === 'RECEIVED') ? "bg-success/10 text-success border-success/30" : 
                        (() => {
                          const nowAtStartOfToday = new Date();
                          nowAtStartOfToday.setHours(0,0,0,0);
                          const due = new Date(t.dueDate);
                          due.setHours(0,0,0,0);
                          return (due < nowAtStartOfToday && !t.paymentDate) ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-amber-400/10 text-amber-400 border-amber-400/30";
                        })()
                      )}>
                        {(() => {
                          if (t.status === 'PAID' || t.status === 'RECEIVED') return t.type === 'INCOME' ? 'Recebido' : 'Pago';
                          const nowAtStartOfToday = new Date();
                          nowAtStartOfToday.setHours(0,0,0,0);
                          const due = new Date(t.dueDate);
                          due.setHours(0,0,0,0);
                          return (due < nowAtStartOfToday && !t.paymentDate) ? 'Vencido' : 'Aberto';
                        })()}
                      </span>
                    </td>
                    
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {!isPaid && (
                          <>
                            {(() => {
                              const hasReminder = reminders && reminders.some(r => r.transactionId === t.id && !r.isCompleted);
                              return (
                                <button 
                                  onClick={() => onCreateReminder(t)}
                                  title={hasReminder ? "Editar Lembrete" : "Criar Lembrete"}
                                  className={`p-1.5 rounded-lg transition-all ${
                                    hasReminder 
                                      ? 'bg-amber-400/20 text-amber-500 hover:bg-amber-400/35' 
                                      : 'hover:bg-amber-400/20 hover:text-amber-500 text-muted-foreground'
                                  }`}
                                >
                                  <Bell className={`w-4 h-4 ${hasReminder ? 'fill-current' : ''}`} />
                                </button>
                              );
                            })()}
                            <button 
                              onClick={() => onQuickPay(t)}
                              title="Marcar como Pago hoje"
                              className="p-1.5 bg-success/10 text-success hover:bg-success/20 rounded-lg transition-all"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => onEdit(t)}
                          className="p-1.5 hover:bg-primary/20 hover:text-primary rounded-lg transition-all text-muted-foreground"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onDeleteClick(t)}
                          className="p-1.5 hover:bg-destructive/20 hover:text-destructive rounded-lg transition-all text-muted-foreground"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
          {data.length > 0 && (
            <tfoot>
              <tr className="border-t border-border/60 bg-muted/5 font-bold">
                <td className="p-4 text-xs font-bold text-muted-foreground uppercase" colSpan={2}>
                  Total de {type === 'INCOME' ? 'Receitas' : 'Despesas'} (Filtrado)
                </td>
                <td className="p-4 text-right">
                  <span className={cn(
                    "font-black text-sm tracking-tight",
                    type === 'INCOME' ? "text-primary" : "text-red-500"
                  )}>
                    {formatCurrency(data.reduce((acc, t) => acc + t.amount, 0))}
                  </span>
                </td>
                <td colSpan={5} className="p-4" />
              </tr>
            </tfoot>
          )}
        </table>
      </PremiumCard>
    </div>
  );
};

export default function TransactionsPage() {
  const { 
    transactions, 
    categories, 
    banks, 
    creditCards,
    goals,
    defaultBankId,
    addTransaction, 
    updateTransaction, 
    deleteTransaction,
    addCategory,
    excludeRecurringMonth,
    reminders,
    addReminder,
    updateReminder,
    markTransactionAsPaid
  } = useAppContext();
  
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [createdTransactionInfo, setCreatedTransactionInfo] = useState<any>(null);
  const [reminderTransaction, setReminderTransaction] = useState<Transaction | null>(null);
  const [reminderData, setReminderData] = useState({
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    method: 'WHATSAPP'
  });

  const handleCreateReminderClick = (t: Transaction) => {
    setReminderTransaction(t);
    const existing = reminders.find(r => r.transactionId === t.id && !r.isCompleted);
    if (existing) {
      setReminderData({
        description: existing.description,
        date: existing.dueDate,
        method: existing.method || 'WHATSAPP'
      });
    } else {
      setReminderData({
        description: `Lembrete: ${t.description}`,
        date: t.dueDate ? format(parseISO(t.dueDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        method: 'WHATSAPP'
      });
    }
    setActiveModal('create_reminder');
  };

  const now = new Date();
  const [selectedDate, setSelectedDate] = useState(now);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const getPeriodForDate = (year: number, month: number) => {
    const start = format(new Date(year, month, 1), 'yyyy-MM-dd');
    const end = format(new Date(year, month + 1, 0), 'yyyy-MM-dd');
    return { start, end };
  };

  const currentMonthPeriod = getPeriodForDate(selectedYear, selectedDate.getMonth());

  // Income Filters State
  const [searchIncome, setSearchIncome] = useState('');
  const [statusIncome, setStatusIncome] = useState('ALL');
  const [categoryIncome, setCategoryIncome] = useState('ALL');
  const [startDateIncome, setStartDateIncome] = useState(currentMonthPeriod.start);
  const [endDateIncome, setEndDateIncome] = useState(currentMonthPeriod.end);

  // Expense Filters State
  const [searchExpense, setSearchExpense] = useState('');
  const [statusExpense, setStatusExpense] = useState('ALL');
  const [categoryExpense, setCategoryExpense] = useState('ALL');
  const [startDateExpense, setStartDateExpense] = useState(currentMonthPeriod.start);
  const [endDateExpense, setEndDateExpense] = useState(currentMonthPeriod.end);

  const handleMonthSelect = (month: number) => {
    const newDate = new Date(selectedYear, month, 1);
    setSelectedDate(newDate);
    const { start, end } = getPeriodForDate(selectedYear, month);
    
    setStartDateIncome(start);
    setEndDateIncome(end);
    setStartDateExpense(start);
    setEndDateExpense(end);
  };

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    const newDate = new Date(year, selectedDate.getMonth(), 1);
    setSelectedDate(newDate);
    const { start, end } = getPeriodForDate(year, selectedDate.getMonth());
    
    setStartDateIncome(start);
    setEndDateIncome(end);
    setStartDateExpense(start);
    setEndDateExpense(end);
  };

  // Transition Filter Type for Modal
  const [modalFilterType, setModalFilterType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  
  // New Transaction Form State
  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    categoryId: '',
    newCategoryName: '',
    bankId: defaultBankId || '',
    creditCardId: '',
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    isPaid: true,
    isRecurring: false,
    isInstallment: false,
    installmentCount: '1',
    installmentStart: '0',
    installmentBasedOn: 'purchase_date',
    linkedGoalId: '',
    affectLimitImmediately: true
  });

  React.useEffect(() => {
    if (formData.isInstallment && formData.creditCardId) {
      if (formData.installmentBasedOn !== 'next_due_date') {
        setFormData(prev => ({ ...prev, installmentBasedOn: 'next_due_date' }));
        return;
      }
      const card = creditCards.find(cc => cc.id === formData.creditCardId);
      if (card) {
        const options = getCardDueDatesOptions(card.dueDay, card.closingDay);
        if (!options.some(opt => opt.value === formData.dueDate)) {
          setFormData(prev => ({ ...prev, dueDate: options[0].value }));
        }
      }
    }
  }, [formData.isInstallment, formData.installmentBasedOn, formData.creditCardId, creditCards]);

  // Income Sort State
  const [sortFieldIncome, setSortFieldIncome] = useState<string>('date');
  const [sortOrderIncome, setSortOrderIncome] = useState<'asc' | 'desc'>('desc');

  // Expense Sort State
  const [sortFieldExpense, setSortFieldExpense] = useState<string>('date');
  const [sortOrderExpense, setSortOrderExpense] = useState<'asc' | 'desc'>('desc');

  const getCategory = (id: string) => categories.find(c => c.id === id);
  const getBank = (id?: string) => banks.find(b => b.id === id);

  const bankOptions = banks.map(b => ({ value: b.id, label: b.name, color: b.color }));
  const cardOptions = creditCards.map(cc => ({ value: cc.id, label: cc.name, color: cc.color }));
  
  const categoryOptions = categories
    .filter(c => formData.type === 'INCOME' ? (c.type === 'INCOME' || c.type === 'BOTH') : (c.type === 'EXPENSE' || c.type === 'BOTH'))
    .map(c => ({ value: c.id, label: c.name, color: c.color }));
  
  const categoryOptionsWithNew = [...categoryOptions, { value: 'NEW', label: '+ Nova Categoria' }];

  // Quick Pay Handler
  const handleQuickPay = (t: Transaction) => {
    const isVirtual = t.id.toString().startsWith('recurring-');
    
    if (isVirtual) {
      const parentId = t.id.toString().split('-')[1];
      const monthYearKey = `${new Date(t.competenceDate).getFullYear()}-${(new Date(t.competenceDate).getMonth() + 1).toString().padStart(2, '0')}`;
      
      addTransaction({
        type: t.type,
        description: t.description,
        amount: t.amount,
        categoryId: t.categoryId,
        bankId: t.bankId,
        creditCardId: t.creditCardId,
        competenceDate: t.competenceDate,
        dueDate: t.dueDate,
        paymentDate: new Date().toISOString(),
        status: t.type === 'INCOME' ? 'RECEIVED' : 'PAID',
        isRecurring: false,
        isInstallment: t.isInstallment,
        installmentTotal: t.installmentTotal,
        installmentCurrent: t.installmentCurrent,
        linkedGoalId: t.linkedGoalId
      });

      excludeRecurringMonth(parentId, monthYearKey);
    } else {
      updateTransaction(t.id, {
        paymentDate: new Date().toISOString(),
        status: t.type === 'INCOME' ? 'RECEIVED' : 'PAID'
      });
    }
  };

  // Filtering & Sorting Logic helper
  const filterTransactions = (
    type: 'INCOME' | 'EXPENSE', 
    search: string, 
    status: string, 
    category: string,
    startDate: string,
    endDate: string,
    sortField: string,
    sortOrder: 'asc' | 'desc'
  ) => {
    // Determine the monthYearKey if we are filtering by a specific month
    const startRange = startDate ? new Date(startDate + 'T00:00:00') : null;
    const endRange = endDate ? new Date(endDate + 'T23:59:59') : null;
    const isSingleMonth = startRange && endRange && 
                         startRange.getMonth() === endRange.getMonth() && 
                         startRange.getFullYear() === endRange.getFullYear();
    
    const monthYearKey = isSingleMonth ? format(startRange!, 'yyyy-MM') : '';

    // Filter out real transactions that are specifically excluded for the current view
    let list = transactions.filter(t => {
      if (t.isRecurring && monthYearKey) {
        return !t.recurringExclusions?.includes(monthYearKey);
      }
      return true;
    });

    const recurringTxs = transactions.filter(t => t.isRecurring);

    // If a month/year is filtered, project recurring ones
    if (startRange && endRange) {
      recurringTxs.forEach(rt => {
        const rtStart = new Date(rt.competenceDate);
        
        // Limitar a simulação a começar no máximo 12 meses antes de startRange
        const limitDate = new Date(startRange.getFullYear(), startRange.getMonth() - 12, 1);
        const simStartDate = rtStart > limitDate ? rtStart : limitDate;
        
        let current = new Date(simStartDate.getFullYear(), simStartDate.getMonth(), 1);
        while (current <= endRange) {
          const m = current.getMonth();
          const y = current.getFullYear();
          const currentMonthYearKey = format(current, 'yyyy-MM');
          
          // Skip if excluded
          if (rt.recurringExclusions?.includes(currentMonthYearKey)) {
            current = addMonths(current, 1);
            continue;
          }

          if (y > rtStart.getFullYear() || (y === rtStart.getFullYear() && m >= rtStart.getMonth())) {
            // Broader existence check: same description in same month
            const alreadyExists = transactions.some(t => {
              if (t.id.toString().startsWith('recurring-') || t.id.toString().startsWith('projected-')) return false;
              const tDate = new Date(t.competenceDate);
              return t.description === rt.description && 
                     tDate.getMonth() === m && 
                     tDate.getFullYear() === y &&
                     t.id !== rt.id;
            });

            const isSourceMonth = rtStart.getMonth() === m && rtStart.getFullYear() === y;

            if (!alreadyExists && !isSourceMonth) {
               const projectedDate = new Date(y, m, rtStart.getDate());
               let projectedDueDate = projectedDate.toISOString();
               if (rt.creditCardId) {
                 const card = creditCards.find(c => c.id === rt.creditCardId);
                 if (card) {
                   const dateStr = format(projectedDate, 'yyyy-MM-dd');
                   projectedDueDate = calculateCardDueDate(dateStr, card.closingDay, card.dueDay).toISOString();
                 }
               } else if (rt.dueDate) {
                 const oDate = new Date(rt.dueDate);
                 projectedDueDate = new Date(y, m, oDate.getDate()).toISOString();
               }
               list.push({
                 ...rt,
                 id: `recurring-${rt.id}-${y}-${m}`,
                 competenceDate: projectedDate.toISOString(),
                 dueDate: projectedDueDate,
                 paymentDate: undefined,
                 status: 'OPEN'
               });
            }
          }
          current = addMonths(current, 1);
        }
      });
    }

    return list.filter(t => {
      if (t.type !== type) return false;

      const cat = categories.find(c => c.id === t.categoryId);
      const bank = banks.find(b => b.id === t.bankId);
      
      const matchesSearch = t.description.toLowerCase().includes(search.toLowerCase()) ||
                           cat?.name.toLowerCase().includes(search.toLowerCase()) ||
                           bank?.name.toLowerCase().includes(search.toLowerCase());
                           
      const currentStatus = (() => {
        if (t.status === 'PAID' || t.status === 'RECEIVED') return t.status;
        const nowAtStartOfDay = new Date();
        nowAtStartOfDay.setHours(0, 0, 0, 0);
        const dueAtStartOfDay = new Date(t.dueDate);
        dueAtStartOfDay.setHours(0, 0, 0, 0);
        return (dueAtStartOfDay < nowAtStartOfDay && !t.paymentDate) ? 'OVERDUE' : 'OPEN';
      })();

      const matchesStatus = status === 'ALL' || currentStatus === status;
      const matchesCategory = category === 'ALL' || t.categoryId === category;
      
      const txDateStr = (t.paymentDate || (t.creditCardId ? t.dueDate : t.competenceDate)).split('T')[0];
      const matchesStartDate = !startDate || txDateStr >= startDate;
      const matchesEndDate = !endDate || txDateStr <= endDate;
      
      return matchesSearch && matchesStatus && matchesCategory && matchesStartDate && matchesEndDate;
    }).sort((a, b) => {
      let comparison = 0;
      
      const dateA = a.paymentDate || (a.creditCardId ? a.dueDate : a.competenceDate);
      const dateB = b.paymentDate || (b.creditCardId ? b.dueDate : b.competenceDate);
      
      switch (sortField) {
        case 'date':
          comparison = new Date(dateA).getTime() - new Date(dateB).getTime();
          break;
        case 'dueDate':
          comparison = new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime();
          break;
        case 'description':
          comparison = a.description.localeCompare(b.description);
          break;
        case 'category':
          const catA = categories.find(c => c.id === a.categoryId)?.name || '';
          const catB = categories.find(c => c.id === b.categoryId)?.name || '';
          comparison = catA.localeCompare(catB);
          break;
        case 'bank':
          const bankA = banks.find(b => b.id === a.bankId)?.name || '';
          const bankB = banks.find(b => b.id === b.bankId)?.name || '';
          comparison = bankA.localeCompare(bankB);
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        default:
          comparison = new Date(a.competenceDate).getTime() - new Date(b.competenceDate).getTime();
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  const filteredIncome = filterTransactions('INCOME', searchIncome, statusIncome, categoryIncome, startDateIncome, endDateIncome, sortFieldIncome, sortOrderIncome);
  const filteredExpense = filterTransactions('EXPENSE', searchExpense, statusExpense, categoryExpense, startDateExpense, endDateExpense, sortFieldExpense, sortOrderExpense);

  const totalIncome = filteredIncome.reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = filteredExpense.reduce((acc, t) => acc + t.amount, 0);

  const handleOpenNewTransaction = (type: 'INCOME' | 'EXPENSE' = 'EXPENSE') => {
    setFormData({
      description: '',
      amount: 0,
      type,
      categoryId: '',
      newCategoryName: '',
      bankId: defaultBankId || banks[0]?.id || '',
      creditCardId: '',
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      isPaid: true,
      isInstallment: false,
      installmentCount: '1',
      installmentStart: '0',
      installmentBasedOn: 'purchase_date',
      linkedGoalId: ''
    });
    setEditingTransaction(null);
    setActiveModal('new_transaction');
  };

  const handleEditClick = (t: Transaction) => {
    const isVirtual = t.id.toString().startsWith('recurring-');
    setEditingTransaction(t);
    setFormData({
      description: t.description,
      amount: t.amount,
      type: (t.type === 'INCOME' ? 'INCOME' : 'EXPENSE') as 'INCOME' | 'EXPENSE',
      categoryId: t.categoryId,
      newCategoryName: '',
      bankId: t.bankId || '',
      creditCardId: t.creditCardId || '',
      dueDate: t.creditCardId ? format(parseISO(t.competenceDate), 'yyyy-MM-dd') : (t.dueDate ? format(parseISO(t.dueDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')),
      paymentDate: t.paymentDate ? format(parseISO(t.paymentDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      isPaid: t.status === 'PAID' || t.status === 'RECEIVED',
      isRecurring: t.isRecurring,
      isInstallment: t.isInstallment,
      installmentCount: t.installmentTotal?.toString() || '1',
      installmentStart: t.installmentCurrent?.toString() || '1',
      installmentBasedOn: 'purchase_date',
      linkedGoalId: t.linkedGoalId || '',
      affectLimitImmediately: t.affectLimitImmediately !== false
    });
    setActiveModal('new_transaction');
  };

  const handleCardChange = (cardId: string) => {
    const card = creditCards.find(cc => cc.id === cardId);
    if (card) {
      setFormData({
        ...formData,
        creditCardId: cardId,
        bankId: card.bankId,
        isPaid: false
      });
    } else {
      setFormData({
        ...formData,
        creditCardId: cardId,
        isPaid: true
      });
    }
  };

  const isTxFormValid = 
    formData.description.trim() !== '' &&
    formData.amount > 0 &&
    formData.categoryId !== '' &&
    (formData.categoryId !== 'NEW' || formData.newCategoryName.trim() !== '') &&
    (formData.type === 'INCOME' 
      ? formData.bankId !== '' 
      : (formData.bankId !== '' || formData.creditCardId !== ''));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isTxFormValid) return;
    
    let categoryId = formData.categoryId;
    if (formData.categoryId === 'NEW' && formData.newCategoryName) {
      categoryId = addCategory({
        name: formData.newCategoryName,
        type: formData.type
      });
    }

    const card = formData.creditCardId ? creditCards.find(cc => cc.id === formData.creditCardId) : null;
    const calculatedDueDate = card 
      ? calculateCardDueDate(formData.dueDate, card.closingDay, card.dueDay)
      : new Date(formData.dueDate + 'T12:00:00');

    const txData = {
      description: formData.description,
      amount: Number(formData.amount),
      type: formData.type,
      categoryId,
      bankId: formData.bankId || undefined,
      creditCardId: formData.creditCardId || undefined,
      dueDate: calculatedDueDate.toISOString(),
      paymentDate: formData.isPaid ? new Date(formData.paymentDate + 'T12:00:00').toISOString() : undefined,
      status: formData.isPaid ? (formData.type === 'INCOME' ? 'RECEIVED' : 'PAID') : 'OPEN' as any,
      isRecurring: formData.isRecurring,
      installmentTotal: formData.isInstallment ? Number(formData.installmentCount) : undefined,
      installmentCurrent: formData.isInstallment ? (editingTransaction?.installmentCurrent || 1) : undefined,
      linkedGoalId: formData.linkedGoalId || undefined,
      affectLimitImmediately: formData.affectLimitImmediately !== false
    };

    if (editingTransaction) {
      const isVirtual = editingTransaction.id.toString().startsWith('recurring-');
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
            competenceDate: new Date(formData.dueDate + 'T12:00:00').toISOString()
          });
        }
      }
      setActiveModal(null);
    } else {
      let createdId = '';
      if (formData.isInstallment && Number(formData.installmentCount) > 1) {
        const count = Number(formData.installmentCount);
        const paid = Number(formData.installmentStart) || 0;
        const start = paid + 1;
        const baseDueDate = new Date(formData.dueDate + 'T12:00:00');
        const basePaymentDate = new Date(formData.paymentDate + 'T12:00:00');

        let offset = 0;
        for (let j = start; j <= count; j++) {
          let installmentDueDate: Date;
          let finalInstallmentDueDate: Date;

          if (formData.installmentBasedOn === 'next_due_date') {
            finalInstallmentDueDate = addMonths(baseDueDate, j - start);
            installmentDueDate = card ? addMonths(finalInstallmentDueDate, -1) : finalInstallmentDueDate;
          } else {
            installmentDueDate = addMonths(baseDueDate, j - 1);
            if (card) {
              const dateStr = format(installmentDueDate, 'yyyy-MM-dd');
              finalInstallmentDueDate = calculateCardDueDate(dateStr, card.closingDay, card.dueDay);
            } else {
              finalInstallmentDueDate = installmentDueDate;
            }
          }

          const installmentPaymentDate = addMonths(basePaymentDate, j - start);

          const id = addTransaction({
            ...txData,
            competenceDate: installmentDueDate.toISOString(),
            dueDate: finalInstallmentDueDate.toISOString(),
            paymentDate: (offset === 0 && formData.isPaid) ? installmentPaymentDate.toISOString() : undefined,
            status: (offset === 0 && formData.isPaid) ? txData.status : 'OPEN',
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
          competenceDate: new Date(formData.dueDate + 'T12:00:00').toISOString(),
          dueDate: calculatedDueDate.toISOString(),
          paymentDate: formData.isPaid ? new Date(formData.paymentDate + 'T12:00:00').toISOString() : undefined,
          isInstallment: false
        });
      }

      setCreatedTransactionInfo({ 
        ...txData, 
        id: createdId,
        dueDate: calculatedDueDate.toISOString()
      });

      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const dueStr = formData.dueDate;

      if (txData.type === 'EXPENSE' && dueStr === todayStr && !formData.isPaid) {
        setActiveModal('due_today_prompt');
      } else {
        setActiveModal('success_created');
      }
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

  const handleSortIncome = (field: string) => {
    if (sortFieldIncome === field) {
      setSortOrderIncome(sortOrderIncome === 'asc' ? 'desc' : 'asc');
    } else {
      setSortFieldIncome(field);
      setSortOrderIncome('asc');
    }
  };

  const handleSortExpense = (field: string) => {
    if (sortFieldExpense === field) {
      setSortOrderExpense(sortOrderExpense === 'asc' ? 'desc' : 'asc');
    } else {
      setSortFieldExpense(field);
      setSortOrderExpense('asc');
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto pb-24 md:pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-gradient-gold">Transações</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie suas movimentações financeiras por período</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
           <button className="flex-1 md:flex-none bg-card hover:bg-muted border border-border px-5 py-3 rounded-2xl font-medium transition-all flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Share2 className="w-4 h-4" /> Exportar
          </button>
          
          <button 
            onClick={() => setActiveModal('import_statement')}
            className="flex-1 md:flex-none bg-card hover:bg-muted border border-border px-5 py-3 rounded-2xl font-bold text-foreground hover:text-primary transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-primary shrink-0" /> Importar Extrato
          </button>

          <button 
            onClick={() => handleOpenNewTransaction()}
            className="flex-1 md:flex-none bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
          >
            <Plus className="w-5 h-5" /> Nova Transação
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-4 bg-card/30 border border-border/40 rounded-[2rem] p-4 backdrop-blur-xl shadow-2xl w-fit">
        <div className="w-[120px]">
          <PremiumSelect
            label="Ano"
            value={selectedYear.toString()}
            onChange={(val) => handleYearSelect(parseInt(val))}
            options={Array.from({ length: 11 }, (_, i) => {
              const y = now.getFullYear() - 5 + i;
              return { value: y.toString(), label: y.toString() };
            })}
            disableSort={true}
          />
        </div>
        <div className="w-[160px]">
          <PremiumSelect
            label="Mês"
            value={selectedDate.getMonth().toString()}
            onChange={(val) => handleMonthSelect(parseInt(val))}
            options={Array.from({ length: 12 }, (_, i) => {
              const d = new Date(2000, i, 1);
              const monthName = format(d, 'MMMM', { locale: ptBR });
              return { 
                value: i.toString(), 
                label: monthName.charAt(0).toUpperCase() + monthName.slice(1)
              };
            })}
            disableSort={true}
          />
        </div>
      </div>

      <section className="space-y-6">
        <div className="flex items-center justify-between border-l-4 border-primary pl-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foreground tracking-widest">Receitas</h2>
            <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">{filteredIncome.length}</span>
          </div>
          <span className="text-xs font-black px-3 py-1.5 bg-primary/10 text-primary rounded-xl border border-primary/20 shadow-sm">
            Total: {formatCurrency(totalIncome)}
          </span>
        </div>
        <TransactionTable 
          type="INCOME"
          data={filteredIncome}
          searchTerm={searchIncome}
          onSearchChange={setSearchIncome}
          onFilterClick={() => {
            setModalFilterType('INCOME');
            setActiveModal('filters');
          }}
          isFilterActive={statusIncome !== 'ALL' || categoryIncome !== 'ALL' || startDateIncome !== '' || endDateIncome !== ''}
          sortField={sortFieldIncome}
          sortOrder={sortOrderIncome}
          onSort={handleSortIncome}
          categories={categories}
          banks={banks}
          creditCards={creditCards}
          reminders={reminders}
          onCreateReminder={handleCreateReminderClick}
          onQuickPay={handleQuickPay}
          onEdit={handleEditClick}
          onDeleteClick={(t) => {
            setDeletingTransaction(t);
            setActiveModal('confirm_delete');
          }}
        />
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between border-l-4 border-red-400 pl-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foreground tracking-widest">Despesas</h2>
            <span className="text-[10px] bg-red-400/20 text-red-400 px-2 py-0.5 rounded-full font-bold">{filteredExpense.length}</span>
          </div>
          <span className="text-xs font-black px-3 py-1.5 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 shadow-sm">
            Total: {formatCurrency(totalExpense)}
          </span>
        </div>
        <TransactionTable 
          type="EXPENSE"
          data={filteredExpense}
          searchTerm={searchExpense}
          onSearchChange={setSearchExpense}
          onFilterClick={() => {
            setModalFilterType('EXPENSE');
            setActiveModal('filters');
          }}
          isFilterActive={statusExpense !== 'ALL' || categoryExpense !== 'ALL' || startDateExpense !== '' || endDateExpense !== ''}
          sortField={sortFieldExpense}
          sortOrder={sortOrderExpense}
          onSort={handleSortExpense}
          categories={categories}
          banks={banks}
          creditCards={creditCards}
          reminders={reminders}
          onCreateReminder={handleCreateReminderClick}
          onQuickPay={handleQuickPay}
          onEdit={handleEditClick}
          onDeleteClick={(t) => {
            setDeletingTransaction(t);
            setActiveModal('confirm_delete');
          }}
        />
      </section>

      {/* MODALS */}

      <Modal 
        isOpen={activeModal === 'new_transaction'} 
        onClose={() => setActiveModal(null)} 
        title={editingTransaction ? "Editar Transação" : "Nova Transação"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex bg-muted/40 p-1 rounded-xl">
             <button 
              type="button"
              onClick={() => setFormData({...formData, type: 'INCOME'})}
              className={cn(
                "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                formData.type === 'INCOME' ? "bg-success text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
              )}
             >
               Receita
             </button>
             <button 
              type="button"
              onClick={() => setFormData({...formData, type: 'EXPENSE'})}
              className={cn(
                "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                formData.type === 'EXPENSE' ? "bg-destructive text-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
              )}
             >
               Despesa
             </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground mb-1 block">Descrição</label>
              <input 
                required
                type="text" 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Ex: Supermercado, Aluguel..." 
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <PremiumCurrencyInput 
                label="Valor"
                value={formData.amount}
                onChange={val => setFormData({...formData, amount: val})}
              />
              <PremiumSelect 
                label="Conta / Banco"
                required
                options={bankOptions}
                value={formData.bankId}
                onChange={val => setFormData({...formData, bankId: val})}
                disabled={!!formData.creditCardId}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <PremiumSelect 
                label="Categoria"
                required
                options={categoryOptionsWithNew}
                value={formData.categoryId}
                onChange={val => setFormData({...formData, categoryId: val})}
              />
              {formData.type === 'EXPENSE' ? (
                <PremiumSelect 
                  label="Cartão de Crédito"
                  options={[{ value: '', label: 'Nenhum' }, ...cardOptions]}
                  value={formData.creditCardId || ''}
                  onChange={handleCardChange}
                />
              ) : <div />}
            </div>

            {formData.type === 'EXPENSE' && formData.creditCardId && (
              <div 
                tabIndex={0}
                role="checkbox"
                aria-checked={formData.affectLimitImmediately !== false}
                className="mt-4 flex items-center justify-between p-3.5 bg-muted/20 border border-border/50 rounded-2xl cursor-pointer hover:bg-muted/30 transition-all select-none focus:ring-2 focus:ring-primary focus:outline-none animate-in fade-in slide-in-from-top-1 duration-200"
                onClick={() => setFormData(prev => ({...prev, affectLimitImmediately: !prev.affectLimitImmediately}))}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    setFormData(prev => ({...prev, affectLimitImmediately: !prev.affectLimitImmediately}));
                  }
                }}
              >
                <div className="flex flex-col pr-2">
                  <span className="text-xs font-semibold text-foreground/90">Consome o limite</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    {formData.affectLimitImmediately !== false 
                      ? "Consome o limite do cartão agora (ideal para compras/parcelados)" 
                      : "Debitar limite apenas na data de vencimento (ideal para assinaturas/mensalidades)"}
                  </span>
                </div>
                <div className={cn(
                  "w-10 h-5 rounded-full transition-all relative flex items-center px-1 flex-shrink-0",
                  formData.affectLimitImmediately !== false ? "bg-primary" : "bg-muted"
                )}>
                  <div className={cn(
                    "w-3.5 h-3.5 rounded-full bg-white transition-all shadow-sm",
                    formData.affectLimitImmediately !== false ? "translate-x-5" : "translate-x-0"
                  )} />
                </div>
              </div>
            )}

            {formData.categoryId === 'NEW' && (
              <div className="animate-in slide-in-from-top-1 duration-200">
                <label className="text-[10px] font-bold text-muted-foreground mb-1 block">Nova Categoria</label>
                <input 
                  type="text" 
                  value={formData.newCategoryName}
                  onChange={e => setFormData({...formData, newCategoryName: e.target.value})}
                  placeholder="Nome da categoria" 
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none" 
                />
              </div>
            )}

            {formData.type === 'EXPENSE' && (
              <PremiumSelect 
                label="Vincular a uma Meta de Reserva"
                options={[{ value: '', label: 'Não vincular' }, ...goals.filter(g => g.type === 'SAVINGS').map(g => ({ value: g.id, label: g.name, color: g.color }))]}
                value={formData.linkedGoalId || ''}
                onChange={val => setFormData({...formData, linkedGoalId: val})}
              />
            )}

            <div className={cn("grid gap-4", formData.creditCardId ? "grid-cols-1" : "grid-cols-2")}>
               <div>
                  {formData.isInstallment && formData.installmentBasedOn === 'next_due_date' && formData.creditCardId ? (() => {
                    const card = creditCards.find(cc => cc.id === formData.creditCardId);
                    return card ? (
                      <PremiumSelect
                        label="Vencimento da Próxima Parcela"
                        options={getCardDueDatesOptions(card.dueDay, card.closingDay)}
                        value={formData.dueDate}
                        onChange={val => setFormData({ ...formData, dueDate: val })}
                        disableSort={true}
                      />
                    ) : null;
                  })() : (
                    <PremiumDatePicker 
                      label={
                        formData.isInstallment && formData.installmentBasedOn === 'next_due_date'
                          ? "Vencimento da Próxima Parcela"
                          : (formData.creditCardId ? "Data da Compra" : "Vencimento")
                      }
                      value={formData.dueDate}
                      onChange={val => setFormData({...formData, dueDate: val})}
                    />
                  )}
               </div>
               {!formData.creditCardId && (
                 <div className={cn(!formData.isPaid && "opacity-50 pointer-events-none")}>
                   <PremiumDatePicker 
                    label="Pagamento"
                    value={formData.isPaid ? formData.paymentDate : ''}
                    onChange={val => setFormData({...formData, paymentDate: val})}
                   />
                 </div>
               )}
            </div>

            <div className="flex flex-col gap-3">
               {!formData.creditCardId && (
                 <div 
                        tabIndex={formData.creditCardId ? -1 : 0}
                        role="checkbox"
                        aria-checked={formData.isPaid}
                        className={cn(
                          "flex items-center justify-between p-3.5 bg-muted/20 rounded-2xl border border-border/50 group transition-all focus:ring-2 focus:ring-primary focus:outline-none",
                          formData.creditCardId ? "opacity-50 pointer-events-none" : "cursor-pointer hover:bg-muted/30"
                        )} 
                        onClick={() => {
                          if (!formData.creditCardId) {
                            setFormData({...formData, isPaid: !formData.isPaid});
                          }
                        }}
                        onKeyDown={(e) => {
                          if (!formData.creditCardId && (e.key === ' ' || e.key === 'Enter')) {
                            e.preventDefault();
                            setFormData(prev => ({...prev, isPaid: !prev.isPaid}));
                          }
                        }}>
                   <div className="flex flex-col">
                     <span className="text-xs font-semibold tracking-tight text-foreground/90">Confirmar Pagamento / Recebimento</span>
                     <span className="text-[10px] text-muted-foreground">
                       {formData.creditCardId ? "Despesas no cartão são pagas na fatura" : "Esta transação já foi realizada?"}
                     </span>
                   </div>
                    <div className={cn(
                      "w-10 h-5 rounded-full transition-all relative flex items-center px-1",
                      formData.isPaid ? "bg-primary" : "bg-muted"
                    )}>
                      <div className={cn(
                        "w-3.5 h-3.5 rounded-full bg-white transition-all shadow-sm",
                        formData.isPaid ? "translate-x-5" : "translate-x-0"
                      )} />
                    </div>
                  </div>
               )}

               {formData.type === 'EXPENSE' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                   {/* Compra Parcelada */}
                   <div 
                     tabIndex={formData.isRecurring ? -1 : 0}
                     role="checkbox"
                     aria-checked={formData.isInstallment}
                     className={cn(
                       "flex items-center justify-between p-3.5 bg-muted/20 rounded-2xl border border-border/50 group transition-all focus:ring-2 focus:ring-primary focus:outline-none",
                       formData.isRecurring ? "opacity-50 pointer-events-none" : "cursor-pointer hover:bg-muted/30"
                     )}
                     onClick={() => {
                       if (!formData.isRecurring) {
                         setFormData({ ...formData, isInstallment: !formData.isInstallment });
                       }
                     }}
                     onKeyDown={(e) => {
                       if (!formData.isRecurring && (e.key === ' ' || e.key === 'Enter')) {
                         e.preventDefault();
                         setFormData(prev => ({ ...prev, isInstallment: !prev.isInstallment }));
                       }
                     }}
                   >
                     <div className="flex flex-col pr-1">
                       <span className="text-xs font-semibold tracking-tight text-foreground/90">Compra Parcelada</span>
                       <span className="text-[10px] text-muted-foreground mt-0.5">Configurar parcelados?</span>
                     </div>
                     <div className={cn(
                       "w-10 h-5 rounded-full transition-all relative flex items-center px-1 flex-shrink-0",
                       formData.isInstallment ? "bg-primary" : "bg-muted"
                     )}>
                       <div className={cn(
                         "w-3.5 h-3.5 rounded-full bg-white transition-all shadow-sm",
                         formData.isInstallment ? "translate-x-5" : "translate-x-0"
                       )} />
                     </div>
                   </div>

                   {/* Repetir Lançamento (Recorrência) */}
                   <div 
                     tabIndex={formData.isInstallment ? -1 : 0}
                     role="checkbox"
                     aria-checked={formData.isRecurring}
                     className={cn(
                       "flex items-center justify-between p-3.5 bg-muted/20 rounded-2xl border border-border/50 group transition-all focus:ring-2 focus:ring-primary focus:outline-none",
                       formData.isInstallment ? "opacity-50 pointer-events-none" : "cursor-pointer hover:bg-muted/30"
                     )}
                     onClick={() => {
                       if (!formData.isInstallment) {
                         const nextVal = !formData.isRecurring;
                         setFormData({ 
                           ...formData, 
                           isRecurring: nextVal,
                           affectLimitImmediately: nextVal ? false : true
                         });
                       }
                     }}
                     onKeyDown={(e) => {
                       if (!formData.isInstallment && (e.key === ' ' || e.key === 'Enter')) {
                         e.preventDefault();
                         const nextVal = !formData.isRecurring;
                         setFormData(prev => ({ 
                           ...prev, 
                           isRecurring: nextVal,
                           affectLimitImmediately: nextVal ? false : true
                         }));
                       }
                     }}
                   >
                     <div className="flex flex-col pr-1">
                       <span className="text-xs font-semibold tracking-tight text-foreground/90">Repetir Mensalmente</span>
                       <span className="text-[10px] text-muted-foreground mt-0.5">Assinaturas recorrentes?</span>
                     </div>
                     <div className={cn(
                       "w-10 h-5 rounded-full transition-all relative flex items-center px-1 flex-shrink-0",
                       formData.isRecurring ? "bg-primary" : "bg-muted"
                     )}>
                       <div className={cn(
                         "w-3.5 h-3.5 rounded-full bg-white transition-all shadow-sm",
                         formData.isRecurring ? "translate-x-5" : "translate-x-0"
                       )} />
                     </div>
                   </div>
                 </div>
               )}
             </div>

             {formData.isInstallment && formData.type === 'EXPENSE' && (
               <div className="space-y-3 animate-in fade-in duration-300">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nº Total de Parcelas</label>
                       <input 
                         type="number" 
                         min="1"
                         max="120"
                         value={formData.installmentCount}
                         onChange={e => setFormData({...formData, installmentCount: e.target.value})}
                         className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none" 
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
                          value={formData.installmentStart}
                          onChange={e => setFormData({...formData, installmentStart: e.target.value})}
                          className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none" 
                        />
                     </div>
                 </div>
                 <div className="bg-muted/30 border border-border/40 p-3 rounded-xl text-xs text-muted-foreground font-medium">
                     {(() => {
                        const total = Number(formData.installmentCount) || 1;
                        const paid = Number(formData.installmentStart) || 0;
                        const remaining = Math.max(0, total - paid);
                        const start = paid + 1;

                        const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                        const baseDueDate = new Date(formData.dueDate + 'T12:00:00');
                        
                        let firstCreatedDueDate = baseDueDate;
                        if (formData.installmentBasedOn !== 'next_due_date') {
                          const card = creditCards.find(c => c.id === formData.creditCardId);
                          if (card) {
                            const dateStr = format(baseDueDate, 'yyyy-MM-dd');
                            firstCreatedDueDate = calculateCardDueDate(dateStr, card.closingDay, card.dueDay);
                          }
                        }

                        const firstAbsoluteDueDate = addMonths(firstCreatedDueDate, -paid);
                        const lastAbsoluteDueDate = addMonths(firstCreatedDueDate, total - start);

                        const firstInstallmentMonthStr = `${months[firstAbsoluteDueDate.getMonth()]} de ${firstAbsoluteDueDate.getFullYear()}`;
                        const lastInstallmentMonthStr = `${months[lastAbsoluteDueDate.getMonth()]} de ${lastAbsoluteDueDate.getFullYear()}`;

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
                            <div className="text-[10px] text-muted-foreground/80 mt-1.5 flex flex-col gap-1">
                              <div>
                                <span>📅 A 1ª parcela (1ª/{total}) {paid > 0 ? "venceu" : "vencerá"} em </span>
                                <strong className="text-foreground">{firstInstallmentMonthStr}</strong>.
                              </div>
                              <div>
                                <span>📅 A última parcela ({total}ª/{total}) vencerá em </span>
                                <strong className="text-foreground">{lastInstallmentMonthStr}</strong>.
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                  </div>
               </div>
             )}
          </div>

          <div className="pt-4 flex gap-3">
             <button 
              type="button" 
              onClick={() => setActiveModal(null)}
              className="flex-1 py-3 border border-border rounded-xl text-xs font-bold hover:bg-muted transition-all text-muted-foreground"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={!isTxFormValid}
              className={cn(
                "flex-1 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer",
                !isTxFormValid 
                  ? "bg-muted text-muted-foreground opacity-50 cursor-not-allowed border border-border" 
                  : "bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/20"
              )}
            >
              {editingTransaction ? "Salvar" : "Cadastrar"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={activeModal === 'confirm_delete'} 
        onClose={() => {
          setActiveModal(null);
          setDeletingTransaction(null);
        }} 
        title="Confirmar Exclusão"
      >
        <div className="space-y-4">
          {(() => {
            const isInstallmentTx = deletingTransaction?.isInstallment && deletingTransaction?.installmentTotal && deletingTransaction.installmentTotal > 1;
            
            if (isInstallmentTx) {
              return (
                <>
                  <p className="text-sm text-center py-4 text-foreground leading-relaxed">
                    A transação <strong className="text-primary">"{deletingTransaction?.description}"</strong> é parcelada. <br/>
                    Deseja excluir todas as parcelas ou apenas a parcela deste mês?
                  </p>
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => {
                        if (deletingTransaction) {
                          deleteTransaction(deletingTransaction.id, true);
                          setActiveModal(null);
                          setDeletingTransaction(null);
                        }
                      }}
                      className="w-full bg-rose-600 text-white py-3 rounded-xl text-xs font-bold hover:bg-rose-700 transition-all uppercase tracking-widest cursor-pointer"
                    >
                      Excluir todas as parcelas
                    </button>
                    <button 
                      onClick={() => {
                        if (deletingTransaction) {
                          deleteTransaction(deletingTransaction.id, false);
                          setActiveModal(null);
                          setDeletingTransaction(null);
                        }
                      }}
                      className="w-full bg-amber-600 text-white py-3 rounded-xl text-xs font-bold hover:bg-amber-700 transition-all uppercase tracking-widest cursor-pointer"
                    >
                      Excluir apenas esta parcela
                    </button>
                    <button 
                      onClick={() => {
                        setActiveModal(null);
                        setDeletingTransaction(null);
                      }}
                      className="w-full py-3 border border-border rounded-xl text-xs font-bold hover:bg-muted transition-all uppercase tracking-widest text-muted-foreground cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              );
            }

            return (
              <>
                <p className="text-sm text-center py-4 text-foreground">
                  Tem certeza que deseja excluir esta transação? <br/>
                  <strong className="text-primary">"{deletingTransaction?.description}"</strong> <br/>
                  Esta ação não pode ser desfeita.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setActiveModal(null);
                      setDeletingTransaction(null);
                    }}
                    className="flex-1 py-3 border border-border rounded-xl text-xs font-bold hover:bg-muted transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleDelete}
                    className="flex-1 bg-destructive text-foreground py-3 rounded-xl text-xs font-bold hover:bg-destructive/80 transition-all"
                  >
                    Excluir
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      </Modal>

      <Modal 
        isOpen={activeModal === 'filters'} 
        onClose={() => setActiveModal(null)} 
        title={`Filtros: ${modalFilterType === 'INCOME' ? 'Receitas' : 'Despesas'}`}
      >
         <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground mb-3 block pl-1">Status da Movimentação</label>
              <div className="grid grid-cols-2 gap-3">
                 {['ALL', 'RECEIVED', 'PAID', 'OPEN', 'OVERDUE'].filter(s => {
                   if (modalFilterType === 'INCOME' && s === 'PAID') return false;
                   if (modalFilterType === 'EXPENSE' && s === 'RECEIVED') return false;
                   return true;
                 }).map((s) => (
                   <button 
                    key={s}
                    onClick={() => modalFilterType === 'INCOME' ? setStatusIncome(s) : setStatusExpense(s)}
                    className={cn(
                      "py-3 px-1 text-[10px] font-bold rounded-xl border transition-all",
                      (modalFilterType === 'INCOME' ? statusIncome : statusExpense) === s 
                        ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20" 
                        : "border-border text-muted-foreground hover:bg-muted/50 hover:border-muted-foreground"
                    )}
                   >
                     {s === 'ALL' ? 'Todos' : s === 'PAID' ? 'Pagas' : s === 'RECEIVED' ? 'Recebidas' : s === 'OPEN' ? 'Aberto' : 'Atrasadas'}
                   </button>
                 ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 pt-2">
              <PremiumSelect 
                label="Categoria"
                options={[{ value: 'ALL', label: 'Todas as Categorias' }, ...categories
                  .filter(c => modalFilterType === 'INCOME' ? (c.type === 'INCOME' || c.type === 'BOTH') : (c.type === 'EXPENSE' || c.type === 'BOTH'))
                  .map(c => ({ value: c.id, label: c.name, color: c.color }))]}
                value={modalFilterType === 'INCOME' ? categoryIncome : categoryExpense}
                onChange={val => modalFilterType === 'INCOME' ? setCategoryIncome(val) : setCategoryExpense(val)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <PremiumDatePicker 
                label="De"
                value={modalFilterType === 'INCOME' ? startDateIncome : startDateExpense}
                onChange={val => modalFilterType === 'INCOME' ? setStartDateIncome(val) : setStartDateExpense(val)}
               />
               <PremiumDatePicker 
                label="Até"
                value={modalFilterType === 'INCOME' ? endDateIncome : endDateExpense}
                onChange={val => modalFilterType === 'INCOME' ? setEndDateIncome(val) : setEndDateExpense(val)}
               />
            </div>

            <div className="pt-4 flex gap-3">
              <button 
                onClick={() => {
                  if (modalFilterType === 'INCOME') {
                    setStatusIncome('ALL');
                    setCategoryIncome('ALL');
                    setStartDateIncome('');
                    setEndDateIncome('');
                  } else {
                    setStatusExpense('ALL');
                    setCategoryExpense('ALL');
                    setStartDateExpense('');
                    setEndDateExpense('');
                  }
                }}
                className="flex-1 py-3 border border-border rounded-xl text-[10px] font-bold hover:bg-muted"
              >
                Limpar
              </button>
              <button 
                onClick={() => setActiveModal(null)}
                className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl text-[10px] font-bold"
              >
                Aplicar
              </button>
            </div>
         </div>
      </Modal>

      <Modal
        isOpen={activeModal === 'create_reminder'}
        onClose={() => {
          setActiveModal(null);
          setReminderTransaction(null);
        }}
        title="Criar Lembrete"
      >
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!reminderTransaction) return;
          
          const existing = reminders.find(r => r.transactionId === reminderTransaction.id && !r.isCompleted);
          if (existing) {
            updateReminder(existing.id, {
              title: reminderData.description,
              description: reminderData.description,
              dueDate: reminderData.date,
              method: reminderData.method
            });
          } else {
            addReminder({
              title: reminderData.description,
              description: reminderData.description,
              dueDate: reminderData.date,
              transactionId: reminderTransaction.id,
              method: reminderData.method
            });
          }
          
          setActiveModal('reminder_success');
        }} className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-amber-400/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Lembrete de Transação</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Configure o lembrete para <strong className="text-foreground">"{reminderTransaction?.description}"</strong> de {formatCurrency(reminderTransaction?.amount || 0)}.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Descrição do Lembrete</label>
              <input 
                type="text"
                required
                value={reminderData.description}
                onChange={(e) => setReminderData({...reminderData, description: e.target.value})}
                placeholder="Ex: Pagar fatura do cartão" 
                className="w-full bg-card border border-border/60 rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-medium"
              />
            </div>
            
            <PremiumDatePicker 
              label="Data do Lembrete"
              required
              value={reminderData.date}
              onChange={(val) => setReminderData({...reminderData, date: val})}
            />

            <PremiumSelect
              label="Como deseja ser lembrado?"
              options={[
                { value: 'APP', label: 'Notificação no App' },
                { value: 'EMAIL', label: 'Email (econtajuridico@gmail.com)' },
                { value: 'WHATSAPP', label: 'WhatsApp' }
              ]}
              value={reminderData.method || 'APP'}
              onChange={(val) => setReminderData({...reminderData, method: val})}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
             <button 
              type="button"
              onClick={() => {
                setActiveModal(null);
                setReminderTransaction(null);
              }}
              className="w-full py-3 border border-border rounded-xl text-sm font-bold hover:bg-muted text-muted-foreground transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              Salvar Lembrete
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={activeModal === 'reminder_success'}
        onClose={() => {
          setActiveModal(null);
          setReminderTransaction(null);
        }}
        title=""
      >
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-foreground">Lembrete Salvo com Sucesso!</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-[280px] mx-auto">
            Seu lembrete de <strong className="text-foreground">"{reminderTransaction?.description}"</strong> foi configurado para o dia <strong>{reminderData.date ? format(parseISO(reminderData.date), "dd 'de' MMMM", { locale: ptBR }) : ''}</strong>!
          </p>
          {reminderData.method === 'WHATSAPP' && (
            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 font-medium">
              Nota: Para que o lembrete de WhatsApp funcione, certifique-se de configurar as credenciais da Evolution API.
            </div>
          )}
          <button 
            onClick={() => {
              setActiveModal(null);
              setReminderTransaction(null);
            }}
            className="mt-6 px-8 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            Entendido
          </button>
        </div>
      </Modal>

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

      <Modal
        isOpen={activeModal === 'import_statement'}
        onClose={() => setActiveModal(null)}
        title="Importar Lançamentos de Extratos"
        className="max-w-4xl"
      >
        <TransactionsImporter 
          onClose={() => setActiveModal(null)}
          onImportComplete={() => {
            setActiveModal(null);
          }}
        />
      </Modal>

    </div>
  );
}
