import React, { useState } from 'react';
import { useAppContext, Goal } from '../store/AppContext';
import { PremiumCard } from '../components/ui/PremiumComponents';
import { formatCurrency, cn } from '../lib/utils';
import { Plus, Target, TrendingUp, AlertTriangle, CheckCircle2, Trash2, Edit2, Wallet, LayoutGrid, AlertCircle, Plane, ShoppingBag, Car, Home } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Modal } from '../components/ui/Modal';
import { PremiumSelect, PremiumDatePicker, PremiumCurrencyInput } from '../components/ui/PremiumInputs';
import { motion } from 'motion/react';

const GoalCard = ({ goal, onEdit, onDelete, onAddFunds, transactions }: { goal: Goal, onEdit: (goal: Goal) => void, onDelete: (id: string) => void, onAddFunds: (goal: Goal) => void, transactions: any[], key?: any }) => {
  const calculateGoalProgress = (goal: Goal) => {
    if (goal.type === 'SPENDING_LIMIT' && goal.categoryId) {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      
      const monthlySpent = transactions
        .filter(t => t.type === 'EXPENSE' && t.categoryId === goal.categoryId && t.competenceDate >= firstDayOfMonth)
        .reduce((acc, t) => acc + t.amount, 0);
        
      return monthlySpent;
    }
    return goal.currentAmount;
  };

  const current = calculateGoalProgress(goal);
  const progress = Math.min((current / goal.targetAmount) * 100, 100);
  const isExceeded = goal.type === 'SPENDING_LIMIT' && current > goal.targetAmount;
  const isClose = goal.type === 'SPENDING_LIMIT' && current > goal.targetAmount * 0.8 && !isExceeded;
  const isCompleted = goal.type === 'SAVINGS' && current >= goal.targetAmount;

  return (
    <motion.div
      animate={isExceeded ? {
        scale: [1, 1.01, 1],
        boxShadow: [
          "0 0 0px rgba(239, 68, 68, 0)",
          "0 0 15px rgba(239, 68, 68, 0.2)",
          "0 0 0px rgba(239, 68, 68, 0)"
        ]
      } : {}}
      transition={{
        duration: 2.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      className="h-full"
    >
      <PremiumCard className={cn(
        "p-6 h-full space-y-4 relative overflow-hidden group border-border/40 transition-all",
        isExceeded ? "border-red-500/50 bg-red-500/[0.03]" : "hover:border-primary/30"
      )}>
        {isExceeded && (
          <div className="absolute top-0 right-0 pt-2 pr-4 z-10">
            <motion.div 
              animate={{ opacity: [0.7, 1, 0.7], scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex items-center gap-1.5 text-red-500 bg-red-500/20 border border-red-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter"
            >
              <AlertCircle className="w-3.5 h-3.5 animate-pulse" /> 
              <span>Limite Excedido</span>
            </motion.div>
          </div>
        )}
        {isClose && !isExceeded && (
          <div className="absolute top-0 right-0 pt-2 pr-4">
            <div className="flex items-center gap-1 text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full text-[10px] font-semibold">
              <AlertTriangle className="w-3 h-3" /> Próximo do limite
            </div>
          </div>
        )}
        {isCompleted && (
          <div className="absolute top-0 right-0 pt-2 pr-4">
            <div className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full text-[10px] font-semibold">
              <CheckCircle2 className="w-3 h-3" /> Meta batida
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className={cn(
            "p-3 rounded-2xl transition-colors w-12 h-12 flex items-center justify-center",
            isExceeded ? "bg-red-500/20 text-red-500" : ""
          )} 
          style={!isExceeded ? { backgroundColor: `${goal.color}20`, color: goal.color } : {}}>
            {goal.icon === 'plane' ? <Plane className="w-5 h-5" /> : 
             goal.icon === 'shopping' ? <ShoppingBag className="w-5 h-5" /> : 
             goal.icon === 'car' ? <Car className="w-5 h-5" /> : 
             goal.icon === 'home' ? <Home className="w-5 h-5" /> : 
             goal.type === 'SAVINGS' ? <Wallet className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
          </div>
          <div>
            <h3 className={cn("font-bold tracking-tight transition-colors", isExceeded ? "text-red-500" : "text-foreground")}>{goal.name}</h3>
            <p className="text-[10px] text-muted-foreground font-semibold">
              {goal.type === 'SAVINGS' ? 'Meta de reserva' : 'Limite de gastos'}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold">Progresso</p>
              <p className={cn("text-xl font-display font-bold", isExceeded ? "text-red-400" : "")}>
                {formatCurrency(current)} <span className="text-sm font-normal text-muted-foreground">/ {formatCurrency(goal.targetAmount)}</span>
              </p>
            </div>
            <p className={cn("text-sm font-bold", isExceeded ? "text-red-500" : "text-muted-foreground")}>{progress.toFixed(0)}%</p>
          </div>
          
          <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-1000",
                isExceeded ? "bg-red-500" : isClose ? "bg-amber-500" : "bg-primary"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {isExceeded && (
            <p className="text-[9px] text-red-400/80 font-bold uppercase tracking-tight flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Você ultrapassou em {formatCurrency(current - goal.targetAmount)}!
            </p>
          )}
        </div>

        <div className="pt-4 flex items-center justify-between border-t border-border/30">
          <div className="flex gap-2">
            <button 
              onClick={() => onEdit(goal)}
              className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-all"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button 
              onClick={() => onDelete(goal.id)}
              className="p-2 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-500 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            {goal.type === 'SAVINGS' && (
              <button 
                onClick={() => onAddFunds(goal)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-[10px] font-semibold transition-all"
              >
                <Plus className="w-3 h-3" /> Alocar
              </button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground font-medium italic">
            Prazo: {goal.deadlineDate ? format(parseISO(goal.deadlineDate), "dd MMM yyyy") : '---'}
          </p>
        </div>
      </PremiumCard>
    </motion.div>
  );
};

export default function GoalsPage() {
  const { goals, categories, banks, addGoal, updateGoal, deleteGoal, transactions, addTransaction } = useAppContext();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalToAddFunds, setGoalToAddFunds] = useState<Goal | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: 0,
    deadlineDate: format(new Date(), 'yyyy-MM-dd'),
    type: 'SAVINGS' as 'SAVINGS' | 'SPENDING_LIMIT',
    categoryId: '',
    bankId: '',
    color: '#EAB308',
    icon: 'wallet'
  });

  const [fundAmount, setFundAmount] = useState(0);

  const getBank = (id?: string) => banks.find(b => b.id === id);
  const bankOptions = banks.map(b => ({ value: b.id, label: b.name, color: b.color }));
  const categoryOptions = categories.filter(c => c.type !== 'INCOME').map(c => ({ value: c.id, label: c.name, color: c.color }));

  const handleAddFunds = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalToAddFunds || !fundAmount) return;

    const amount = fundAmount;
    updateGoal(goalToAddFunds.id, {
      currentAmount: goalToAddFunds.currentAmount + amount
    });

    if (goalToAddFunds.bankId) {
      addTransaction({
        type: 'EXPENSE',
        description: `Alocação meta: ${goalToAddFunds.name}`,
        amount,
        bankId: goalToAddFunds.bankId,
        categoryId: 'cat-savings-link',
        competenceDate: new Date().toISOString(),
        dueDate: new Date().toISOString(),
        paymentDate: new Date().toISOString(),
        status: 'PAID',
        isRecurring: false,
        isInstallment: false
      });
    }

    setFundAmount(0);
    setGoalToAddFunds(null);
    setActiveModal(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: formData.name,
      targetAmount: formData.targetAmount,
      currentAmount: editingGoal ? editingGoal.currentAmount : 0,
      deadlineDate: new Date(formData.deadlineDate + 'T12:00:00').toISOString(),
      type: formData.type,
      categoryId: formData.type === 'SPENDING_LIMIT' ? formData.categoryId : undefined,
      bankId: formData.type === 'SAVINGS' ? formData.bankId : undefined,
      color: formData.color,
      icon: formData.icon
    };

    if (editingGoal) {
      updateGoal(editingGoal.id, data);
    } else {
      addGoal(data);
    }
    setActiveModal(null);
    setShowSuccessModal(true);
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      targetAmount: goal.targetAmount,
      deadlineDate: format(parseISO(goal.deadlineDate), 'yyyy-MM-dd'),
      type: goal.type,
      categoryId: goal.categoryId || '',
      bankId: goal.bankId || '',
      color: goal.color || '#EAB308',
      icon: goal.icon || 'wallet'
    });
    setActiveModal('new_goal');
  };

  return (
    <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto pb-24 md:pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary">
            <Target className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-gradient-gold">Central de metas</h1>
            <p className="text-muted-foreground mt-1">Defina limites de gastos e planeje seu futuro financeiro</p>
          </div>
        </div>
        <button 
          onClick={() => {
            setEditingGoal(null);
            setFormData({
              name: '',
              targetAmount: 0,
              deadlineDate: format(new Date(), 'yyyy-MM-dd'),
              type: 'SAVINGS' as 'SAVINGS' | 'SPENDING_LIMIT',
              categoryId: '',
              bankId: '',
              color: '#00D1FF'
            });
            setActiveModal('new_goal');
          }}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-2xl font-semibold shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5 text-primary-foreground" /> <span className="text-primary-foreground">Nova meta</span>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GoalMetric 
          title="Metas de Economia" 
          value={goals.filter(g => g.type === 'SAVINGS').length} 
          icon={TrendingUp}
          subtitle="Ativas este mês"
        />
        <GoalMetric 
          title="Limites de Gastos" 
          value={goals.filter(g => g.type === 'SPENDING_LIMIT').length} 
          icon={LayoutGrid}
          subtitle="Em monitoramento"
        />
        <GoalMetric 
          title="Total Projetado" 
          value={formatCurrency(goals.reduce((acc, g) => acc + g.targetAmount, 0))} 
          icon={TrendingUp}
          variant="premium"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map(goal => (
          <GoalCard 
            key={goal.id} 
            goal={goal} 
            onEdit={handleEdit} 
            onDelete={(id) => setDeletingGoalId(id)} 
            onAddFunds={(g) => {
              setGoalToAddFunds(g);
              setActiveModal('add_funds');
            }}
            transactions={transactions}
          />
        ))}
        {goals.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="bg-muted/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
              <Target className="w-8 h-8 text-muted-foreground opacity-20" />
            </div>
            <p className="text-muted-foreground">Você ainda não definiu nenhuma meta financeira.</p>
          </div>
        )}
      </div>

      <Modal 
        isOpen={activeModal === 'add_funds'} 
        onClose={() => setActiveModal(null)} 
        title={`Alocar para: ${goalToAddFunds?.name}`}
      >
        <form onSubmit={handleAddFunds} className="space-y-6">
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl">
            <p className="text-xs text-muted-foreground text-center">
              Este valor será deduzido da conta {getBank(goalToAddFunds?.bankId)?.name || 'selecionada'} para ser contabilizado nesta meta de reserva.
            </p>
          </div>
              <PremiumCurrencyInput 
                label="Valor do Aporte"
                value={fundAmount}
                onChange={val => setFundAmount(val)}
              />
          <div className="pt-4 flex gap-4">
             <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-4 border border-border rounded-2xl text-[10px] font-bold hover:bg-muted transition-all uppercase tracking-widest text-muted-foreground">Cancelar</button>
             <button type="submit" className="flex-1 bg-primary text-primary-foreground py-4 rounded-2xl text-[10px] font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest">Confirmar Aporte</button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={activeModal === 'new_goal'} 
        onClose={() => setActiveModal(null)} 
        title={editingGoal ? "Editar Meta" : "Nova Meta Financeira"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex bg-muted/40 p-1.5 rounded-2xl">
             <button type="button" onClick={() => setFormData({...formData, type: 'SAVINGS'})} className={cn("flex-1 py-3 text-[10px] font-bold uppercase rounded-xl transition-all", formData.type === 'SAVINGS' ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground")}>Reserva / Economia</button>
             <button type="button" onClick={() => setFormData({...formData, type: 'SPENDING_LIMIT'})} className={cn("flex-1 py-3 text-[10px] font-bold uppercase rounded-xl transition-all", formData.type === 'SPENDING_LIMIT' ? "bg-white text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground")}>Limite de Gasto</button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block tracking-widest pl-1">Título da Meta</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Reserva de Emergência, Teto de Lazer..." className="w-full bg-card border border-border rounded-xl px-4 py-3.5 text-sm focus:ring-1 focus:ring-primary outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <PremiumCurrencyInput 
                label="Valor Alvo"
                value={formData.targetAmount}
                onChange={val => setFormData({...formData, targetAmount: val})}
              />
              <PremiumDatePicker label="Prazo Final" value={formData.deadlineDate} onChange={val => setFormData({...formData, deadlineDate: val})} />
            </div>
            {formData.type === 'SAVINGS' ? (
              <PremiumSelect label="Conta de Origem" required options={bankOptions} value={formData.bankId} onChange={val => setFormData({...formData, bankId: val})} />
            ) : (
              <PremiumSelect label="Categoria Monitorada" required options={categoryOptions} value={formData.categoryId} onChange={val => setFormData({...formData, categoryId: val})} />
            )}
            <div>
               <label className="text-[10px] font-bold uppercase text-muted-foreground mb-2 block tracking-widest pl-1">Cor da Identidade</label>
               <div className="flex gap-3">
                 {['#00D1FF', '#EAB308', '#F87171', '#C084FC', '#4ADE80'].map((color) => (
                   <button key={color} type="button" onClick={() => setFormData({...formData, color})} className={cn("w-10 h-10 rounded-xl border-2 transition-all", formData.color === color ? "border-white scale-110 shadow-lg shadow-foreground/10" : "border-transparent opacity-50")} style={{ backgroundColor: color }} />
                 ))}
               </div>
            </div>
            <div>
               <label className="text-[10px] font-bold uppercase text-muted-foreground mb-2 block tracking-widest pl-1">Ícone</label>
               <div className="flex gap-3">
                 {['wallet', 'plane', 'shopping', 'car', 'home'].map((icon) => (
                   <button 
                     key={icon} 
                     type="button" 
                     onClick={() => setFormData({...formData, icon})} 
                     className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-muted border-2", formData.icon === icon ? "border-primary text-primary scale-110 shadow-lg" : "border-transparent text-muted-foreground")}
                   >
                     {icon === 'wallet' && <Wallet className="w-5 h-5" />}
                     {icon === 'plane' && <Plane className="w-5 h-5" />}
                     {icon === 'shopping' && <ShoppingBag className="w-5 h-5" />}
                     {icon === 'car' && <Car className="w-5 h-5" />}
                     {icon === 'home' && <Home className="w-5 h-5" />}
                   </button>
                 ))}
               </div>
            </div>
          </div>
          <div className="pt-4 flex gap-4">
             <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-4 border border-border rounded-2xl text-[10px] font-bold hover:bg-muted transition-all uppercase tracking-widest text-muted-foreground">Cancelar</button>
             <button type="submit" className="flex-1 bg-primary text-primary-foreground py-4 rounded-2xl text-[10px] font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest">{editingGoal ? "Salvar Meta" : "Ativar Meta"}</button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!deletingGoalId}
        onClose={() => setDeletingGoalId(null)}
        title="Confirmar Exclusão"
      >
        <div className="space-y-4">
          <p className="text-sm text-center py-4 text-foreground leading-relaxed">
            Tem certeza que deseja excluir esta meta financeira? <br/>
            Isso removerá a meta e todo o histórico de progresso associado a ela. Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-3">
            <button 
              onClick={() => setDeletingGoalId(null)}
              className="flex-1 py-3 border border-border rounded-xl text-xs font-bold hover:bg-muted transition-all uppercase tracking-widest text-muted-foreground cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              onClick={() => {
                if (deletingGoalId) {
                  deleteGoal(deletingGoalId);
                  setDeletingGoalId(null);
                }
              }}
              className="flex-1 bg-rose-500 text-white py-3 rounded-xl text-xs font-bold hover:bg-rose-600 transition-all uppercase tracking-widest cursor-pointer"
            >
              Excluir
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Sucesso"
      >
        <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center border border-primary/30">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Pronto!</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Sua meta financeira foi salva com sucesso e já está ativa.
            </p>
          </div>
          <button
            onClick={() => setShowSuccessModal(false)}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-bold transition-all mt-4"
          >
            Entendido
          </button>
        </div>
      </Modal>
    </div>
  );
}

function GoalMetric({ title, value, subtitle, icon: Icon, variant = 'default' }: { title: string, value: string | number, subtitle?: string, icon: any, variant?: 'default' | 'premium' }) {
  return (
    <PremiumCard className={cn("p-6 flex flex-col", variant === 'premium' && "bg-primary/5 border-primary/20")}>
      <div className="flex justify-between items-start mb-6">
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{title}</p>
        <div className="p-2.5 bg-muted rounded-xl text-muted-foreground">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <h3 className={cn("text-3xl font-display font-bold", variant === 'premium' ? "text-gradient-gold" : "text-foreground")}>{value}</h3>
      {subtitle && <p className="mt-2 text-xs text-muted-foreground font-medium">{subtitle}</p>}
    </PremiumCard>
  );
}
