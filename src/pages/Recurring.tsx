import React, { useState } from 'react';
import { useAppContext, Transaction } from '../store/AppContext';
import { PremiumCard } from '../components/ui/PremiumComponents';
import { formatCurrency, cn } from '../lib/utils';
import { Plus, RefreshCw, Calendar, ArrowUpCircle, ArrowDownCircle, Search, Filter, Edit2, Trash2, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Modal } from '../components/ui/Modal';
import { PremiumSelect, PremiumDatePicker } from '../components/ui/PremiumInputs';

export default function RecurringPage() {
  const { transactions, categories, banks, addTransaction, updateTransaction, deleteTransaction } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    categoryId: '',
    bankId: '',
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    competenceDate: format(new Date(), 'yyyy-MM-dd'),
    status: 'OPEN' as any
  });

  const recurringTransactions = transactions.filter(t => t.isRecurring);
  
  const filteredRecurring = recurringTransactions.filter(t => 
    t.type === activeTab &&
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategory = (id: string) => categories.find(c => c.id === id);

  const handleEditClick = (t: Transaction) => {
    setEditingTransaction(t);
    setFormData({
      description: t.description,
      amount: t.amount.toString(),
      type: t.type as 'INCOME' | 'EXPENSE',
      categoryId: t.categoryId,
      bankId: t.bankId || '',
      dueDate: t.dueDate ? format(parseISO(t.dueDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      competenceDate: t.competenceDate ? format(parseISO(t.competenceDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      status: t.status
    });
    setActiveModal('recurring_form');
  };

  const handleNewRecurring = () => {
    setEditingTransaction(null);
    setFormData({
      description: '',
      amount: '',
      type: activeTab,
      categoryId: categories.find(c => c.type === activeTab)?.id || '',
      bankId: banks[0]?.id || '',
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      competenceDate: format(new Date(), 'yyyy-MM-dd'),
      status: 'OPEN'
    });
    setActiveModal('recurring_form');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      amount: parseFloat(formData.amount),
      isRecurring: true,
      isInstallment: false,
      competenceDate: new Date(formData.competenceDate).toISOString(),
      dueDate: new Date(formData.dueDate).toISOString(),
    };

    if (editingTransaction) {
      updateTransaction(editingTransaction.id, data);
    } else {
      addTransaction(data as any);
    }
    setActiveModal(null);
  };

  const categoryOptions = categories
    .filter(c => formData.type === 'INCOME' ? (c.type === 'INCOME' || c.type === 'BOTH') : (c.type === 'EXPENSE' || c.type === 'BOTH'))
    .map(c => ({ value: c.id, label: c.name, color: c.color }));

  const bankOptions = banks.map(b => ({ value: b.id, label: b.name, color: b.color }));

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto pb-24 md:pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <RefreshCw className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-semibold tracking-tight text-gradient-gold">Recorrências</h1>
            <p className="text-muted-foreground mt-1 text-xs">Gerencie suas assinaturas e rendimentos automáticos</p>
          </div>
        </div>
        <button 
          onClick={handleNewRecurring}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all flex items-center gap-2 text-xs"
        >
          <Plus className="w-5 h-5" /> Nova Recorrência
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="flex bg-muted/20 p-1 rounded-xl w-full md:w-auto">
          <button 
            onClick={() => setActiveTab('EXPENSE')}
            className={cn(
              "px-6 py-2 rounded-lg text-xs font-bold transition-all",
              activeTab === 'EXPENSE' ? "bg-red-500 text-foreground shadow-lg" : "text-muted-foreground hover:bg-muted/50"
            )}
          >
            Despesas
          </button>
          <button 
            onClick={() => setActiveTab('INCOME')}
            className={cn(
              "px-6 py-2 rounded-lg text-xs font-bold transition-all",
              activeTab === 'INCOME' ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:bg-muted/50"
            )}
          >
            Receitas
          </button>
        </div>
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Buscar recorrências..." 
            className="w-full pl-9 pr-4 py-2.5 bg-muted/30 border border-border/50 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecurring.length === 0 ? (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="bg-muted/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
              <RefreshCw className="w-8 h-8 text-muted-foreground opacity-20" />
            </div>
            <p className="text-muted-foreground italic text-xs">Nenhuma recorrência encontrada.</p>
          </div>
        ) : filteredRecurring.map(t => {
          const cat = getCategory(t.categoryId);
          return (
            <PremiumCard key={t.id} className="p-6 space-y-4 border-l-4 group transition-all hover:-translate-y-1 shadow-xl bg-card/50" style={{ borderLeftColor: cat?.color || '#333' }}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-muted rounded-xl">
                    {t.type === 'INCOME' ? <ArrowUpCircle className="w-5 h-5 text-primary" /> : <ArrowDownCircle className="w-5 h-5 text-red-500" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground/90 leading-tight">{t.description}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: cat?.color }} />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{cat?.name}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full uppercase tracking-tighter">Mensal</span>
                </div>
              </div>

              <div className="flex justify-between items-center py-3 border-y border-border/40">
                <div className="flex flex-col gap-0.5">
                   <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-bold leading-none">Próximo Venc.</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-foreground/70 ml-5 underline decoration-primary/30 underline-offset-4">
                    {format(parseISO(t.dueDate), 'dd/MM/yyyy')}
                  </span>
                </div>
                <p className={cn(
                  "font-bold text-xl tracking-tight",
                  t.type === 'INCOME' ? "text-primary" : "text-foreground"
                )}>
                  {formatCurrency(t.amount)}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => handleEditClick(t)}
                  className="flex-1 py-2.5 bg-muted/40 hover:bg-muted rounded-xl text-[10px] font-bold transition-all border border-border/50 text-foreground flex items-center justify-center gap-2 leading-none"
                >
                  <Edit2 className="w-3 h-3" /> Editar
                </button>
                <button 
                  onClick={() => {
                    if(confirm('Tem certeza?')) deleteTransaction(t.id);
                  }}
                  className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all border border-red-500/20"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </PremiumCard>
          );
        })}
      </div>

      <Modal 
        isOpen={activeModal === 'recurring_form'} 
        onClose={() => setActiveModal(null)}
        title={editingTransaction ? 'Editar Recorrência' : 'Nova Recorrência'}
      >
        <div className="space-y-6">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex bg-muted/30 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setFormData({...formData, type: 'EXPENSE'})}
                className={cn(
                  "flex-1 py-2 rounded-lg text-[10px] font-bold transition-all",
                  formData.type === 'EXPENSE' ? "bg-red-500 text-foreground shadow-md" : "text-muted-foreground hover:bg-muted"
                )}
              >
                Despesa
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, type: 'INCOME'})}
                className={cn(
                  "flex-1 py-2 rounded-lg text-[10px] font-bold transition-all",
                  formData.type === 'INCOME' ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted"
                )}
              >
                Receita
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground ml-1 tracking-widest">Descrição</label>
              <input
                type="text"
                required
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full bg-[#0a0a0a] border border-border rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
                placeholder="Ex: Assinatura Netflix"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground ml-1 tracking-widest">Valor</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: e.target.value})}
                    className="w-full bg-[#0a0a0a] border border-border rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none transition-all font-mono"
                    placeholder="0,00"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
            <PremiumSelect
              label="Categoria"
              options={categoryOptions}
              value={formData.categoryId}
              onChange={val => setFormData({...formData, categoryId: val})}
            />
            <PremiumSelect
              label="Conta/Banco"
              options={bankOptions}
              value={formData.bankId}
              onChange={val => setFormData({...formData, bankId: val})}
            />
          </div>

            <div className="grid grid-cols-2 gap-4">
              <PremiumDatePicker
                label="Próximo Vencimento"
                value={formData.dueDate}
                onChange={val => setFormData({...formData, dueDate: val})}
              />
              <PremiumDatePicker
                label="Data Competência"
                value={formData.competenceDate}
                onChange={val => setFormData({...formData, competenceDate: val})}
              />
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex-1 py-3.5 bg-muted/50 hover:bg-muted text-foreground rounded-xl text-[10px] font-bold transition-all border border-border/50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-[2] py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-[10px] font-bold transition-all shadow-lg shadow-primary/20"
              >
                {editingTransaction ? 'Salvar Alterações' : 'Criar Recorrência'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
