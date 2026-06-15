import React, { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { PremiumCard } from '../components/ui/PremiumComponents';
import { formatCurrency, cn } from '../lib/utils';
import { Plus, Landmark, ArrowRight, Activity, X, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { PremiumSelect, PremiumCurrencyInput } from '../components/ui/PremiumInputs';

export default function BanksPage() {
  const { banks, transactions, addBank, updateBank, deleteBank } = useAppContext();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingBank, setEditingBank] = useState<any>(null);
  const [deletingBank, setDeletingBank] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'CHECKING' as any,
    initialBalance: 0,
    color: '#BCF24B',
    excludeFromAnalysis: false
  });

  const handleSaveBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBank) {
      updateBank(editingBank.id, {
        ...formData,
        currentBalance: editingBank.currentBalance - editingBank.initialBalance + formData.initialBalance
      });
    } else {
      addBank({
        ...formData,
        currentBalance: formData.initialBalance
      });
    }
    setActiveModal(null);
    setEditingBank(null);
    setFormData({
      name: '',
      type: 'CHECKING',
      initialBalance: 0,
      color: '#BCF24B',
      excludeFromAnalysis: false
    });
    setShowSuccessModal(true);
  };

  const handleEditBankClick = (bank: any) => {
    setEditingBank(bank);
    setFormData({
      name: bank.name,
      type: bank.type,
      initialBalance: bank.initialBalance,
      color: bank.color,
      excludeFromAnalysis: !!bank.excludeFromAnalysis
    });
    setActiveModal('bank_form');
  };

  const handleDeleteBankClick = (bank: any) => {
    setDeletingBank(bank);
    setActiveModal('confirm_delete');
  };

  const handleDeleteBank = async () => {
    if (deletingBank) {
      await deleteBank(deletingBank.id);
      setActiveModal(null);
      setDeletingBank(null);
    }
  };

  const totalBalance = banks.reduce((acc, bank) => acc + bank.currentBalance, 0);

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto pb-24 md:pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-gradient-gold">Bancos e contas</h1>
          <p className="text-muted-foreground mt-1">Gerencie suas contas correntes, investimentos e carteiras</p>
        </div>
        <button 
          onClick={() => setActiveModal('bank_form')}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Adicionar Conta
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PremiumCard className="p-8 lg:col-span-1 bg-card border-border flex flex-col justify-center shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Landmark className="w-40 h-40 text-primary" />
          </div>
          <div className="relative z-10">
            <h2 className="text-muted-foreground font-medium mb-2">Saldo Total Consolidado</h2>
            <div className="text-4xl font-semibold tracking-tight text-gradient-gold mb-6">
              {formatCurrency(totalBalance)}
            </div>
            <div className="space-y-3">
              {banks.map(bank => (
                <div key={bank.id} className="flex justify-between items-center text-sm border-b border-border/50 pb-2 last:border-0">
                  <span className="text-muted-foreground">{bank.name}</span>
                  <span className="font-semibold text-foreground">{formatCurrency(bank.currentBalance)}</span>
                </div>
              ))}
            </div>
          </div>
        </PremiumCard>

        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {banks.map(bank => {
            const bankTransactions = transactions.filter(t => t.bankId === bank.id);
            const thisMonthIn = bankTransactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
            const thisMonthOut = bankTransactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);

            return (
              <PremiumCard key={bank.id} className="p-0 overflow-hidden flex flex-col hover:border-primary/50 transition-colors group">
                <div className="p-6 border-b border-border flex items-center justify-between gap-4 relative overflow-hidden">
                  <div className="flex items-center gap-4">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:transform group-hover:scale-110 transition-transform">
                      <Landmark className="w-24 h-24" />
                    </div>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-foreground font-semibold text-xl relative z-10 shadow-lg" style={{ backgroundColor: bank.color }}>
                      {bank.name.charAt(0)}
                    </div>
                    <div className="relative z-10">
                      <h3 className="font-semibold text-lg">{bank.name}</h3>
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex items-center gap-1.5 relative z-20">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditBankClick(bank);
                      }}
                      className="p-1.5 hover:bg-primary/20 hover:text-primary rounded-lg transition-all text-muted-foreground cursor-pointer"
                      title="Editar Conta"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBankClick(bank);
                      }}
                      className="p-1.5 hover:bg-rose-500/20 hover:text-rose-400 rounded-lg transition-all text-muted-foreground cursor-pointer"
                      title="Excluir Conta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Saldo Atual</p>
                    <p className="text-2xl font-display font-semibold tracking-tight">{formatCurrency(bank.currentBalance)}</p>
                  </div>

                  <div className="mt-6 flex justify-between text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">Entradas</p>
                      <p className="text-success font-medium">+{formatCurrency(thisMonthIn)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground mb-1">Saídas</p>
                      <p className="text-foreground font-medium">-{formatCurrency(thisMonthOut)}</p>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-3 bg-muted/50 border-t border-border flex items-center justify-between text-sm font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                  <span>Ver estatísticas detalhadas</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </PremiumCard>
            )
          })}
        </div>
      </div>

      <Modal 
        isOpen={activeModal === 'bank_form'} 
        onClose={() => {
          setActiveModal(null);
          setEditingBank(null);
          setFormData({
            name: '',
            type: 'CHECKING',
            initialBalance: 0,
            color: '#BCF24B',
            excludeFromAnalysis: false
          });
        }}
        title={editingBank ? "Editar Conta Bancária" : "Adicionar Nova Conta"}
      >
        <form onSubmit={handleSaveBank} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block pl-1">Nome da Instituição</label>
              <input 
                required 
                type="text" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                placeholder="Ex: Nubank, Itaú, Carteira..." 
                className="w-full bg-card border border-border rounded-xl px-4 py-3.5 text-sm focus:ring-1 focus:ring-primary outline-none" 
              />
            </div>


            <PremiumCurrencyInput 
              label="Saldo Inicial"
              value={formData.initialBalance}
              onChange={val => setFormData({...formData, initialBalance: val})}
            />

            <div 
              className="flex items-center gap-2.5 p-3 bg-muted/20 border border-border/50 rounded-xl hover:bg-muted/30 transition-all cursor-pointer select-none" 
              onClick={() => setFormData({...formData, excludeFromAnalysis: !formData.excludeFromAnalysis})}
            >
              <input 
                type="checkbox"
                checked={formData.excludeFromAnalysis}
                onChange={() => {}} // Div click handles changes
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary bg-card"
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground">Ignorar na Análise de Categorias</span>
                <span className="text-[9px] text-muted-foreground">Exclui transações desta conta dos totais e gráficos de progresso da análise</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block pl-1">Cor</label>
              <div className="flex flex-wrap gap-2">
                {[
                  '#BCF24B', '#8A05BE', '#EC7000', '#004A80', '#D32F2F', '#1B1B1B', '#388E3C', '#FBC02D',
                  '#0284C7', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#7C3AED', '#EAB308'
                ].map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({...formData, color})}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      formData.color === color ? "border-primary scale-110 shadow-lg shadow-primary/20" : "border-transparent opacity-50 hover:opacity-100"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-4">
             <button 
               type="button" 
               onClick={() => {
                 setActiveModal(null);
                 setEditingBank(null);
                 setFormData({
                   name: '',
                   type: 'CHECKING',
                   initialBalance: 0,
                   color: '#BCF24B',
                   excludeFromAnalysis: false
                 });
               }} 
               className="flex-1 py-4 border border-border rounded-2xl text-[10px] font-bold hover:bg-muted transition-all uppercase tracking-widest text-muted-foreground cursor-pointer"
             >
               Cancelar
             </button>
             <button type="submit" className="flex-1 bg-primary text-primary-foreground py-4 rounded-2xl text-[10px] font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest cursor-pointer">
               {editingBank ? "Salvar Alterações" : "Criar Conta"}
             </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={activeModal === 'confirm_delete'} 
        onClose={() => {
          setActiveModal(null);
          setDeletingBank(null);
        }}
        title="Confirmar Exclusão"
      >
        <div className="space-y-4">
           <p className="text-sm text-center py-4 text-foreground leading-relaxed">
             Tem certeza que deseja excluir esta conta bancária? <br/>
             <strong className="text-primary">"{deletingBank?.name}"</strong> <br/>
             Isso removerá a conta do sistema. As transações associadas passarão a ficar sem conta associada. Esta ação não pode ser desfeita.
           </p>
          <div className="flex gap-3">
             <button 
              onClick={() => {
                setActiveModal(null);
                setDeletingBank(null);
              }}
              className="flex-1 py-3 border border-border rounded-xl text-xs font-bold hover:bg-muted transition-all uppercase tracking-widest text-muted-foreground cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              onClick={handleDeleteBank}
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
              A conta bancária foi salva com sucesso e já está disponível para uso.
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
