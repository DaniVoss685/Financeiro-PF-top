import React, { useState } from 'react';
import { useAppContext, CreditCard, Transaction } from '../store/AppContext';
import { PremiumCard } from '../components/ui/PremiumComponents';
import { formatCurrency, cn } from '../lib/utils';
import { Plus, Edit2, Trash2, ChevronDown, CheckCircle2, AlertCircle, CreditCard as CardIcon, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Modal } from '../components/ui/Modal';
import { PremiumSelect, PremiumCurrencyInput, PremiumDatePicker } from '../components/ui/PremiumInputs';
import { CategoryIcon } from '../components/CategoryIcon';

export default function CardsPage() {
  const { creditCards, transactions, categories, banks, addCreditCard, updateCreditCard, deleteCreditCard, addTransaction, deleteTransaction, markTransactionAsPaid } = useAppContext();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [deletingCardName, setDeletingCardName] = useState('');

  const [viewingInvoiceId, setViewingInvoiceId] = useState<string | null>(null);

  // New purchase registration state for credit card
  const [newPurchaseDesc, setNewPurchaseDesc] = useState('');
  const [newPurchaseAmount, setNewPurchaseAmount] = useState('');
  const [newPurchaseDate, setNewPurchaseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newPurchaseCategory, setNewPurchaseCategory] = useState('');

  React.useEffect(() => {
    if (viewingInvoiceId) {
      setNewPurchaseDesc('');
      setNewPurchaseAmount('');
      setNewPurchaseDate(format(new Date(), 'yyyy-MM-dd'));
      const firstExpCat = categories.find(c => c.type === 'EXPENSE' || c.type === 'BOTH');
      setNewPurchaseCategory(firstExpCat ? firstExpCat.id : '');
    }
  }, [viewingInvoiceId, categories]);

  const [formData, setFormData] = useState({
    name: '',
    bankId: '',
    brand: 'Mastercard',
    lastFour: '',
    totalLimit: 0,
    closingDay: 5,
    dueDay: 12,
    color: '#8A05BE'
  });

  const handleOpenNewCard = () => {
    setEditingCard(null);
    setFormData({
      name: '',
      bankId: '',
      brand: 'Mastercard',
      lastFour: '',
      totalLimit: 0,
      closingDay: 5,
      dueDay: 12,
      color: '#8A05BE'
    });
    setActiveModal('card_form');
  };

  const handleEditCard = (card: CreditCard) => {
    setEditingCard(card);
    setFormData({
      name: card.name,
      bankId: card.bankId,
      brand: card.brand,
      lastFour: card.lastFour,
      totalLimit: card.totalLimit,
      closingDay: card.closingDay,
      dueDay: card.dueDay,
      color: card.color
    });
    setActiveModal('card_form');
  };

  const handleDeleteCard = (id: string, name: string) => {
    setDeletingCardId(id);
    setDeletingCardName(name);
  };

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCard) {
      updateCreditCard(editingCard.id, formData);
    } else {
      addCreditCard(formData);
    }
    setActiveModal(null);
    setShowSuccessModal(true);
  };

  // Filter transactions for a specific credit card
  const getCardTransactions = (cardId: string) => {
    return transactions.filter(t => t.creditCardId === cardId)
      .sort((a, b) => new Date(b.competenceDate).getTime() - new Date(a.competenceDate).getTime());
  };

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const getInvoiceTransactions = (cardId: string, month: number, year: number) => {
    const cardTxs = getCardTransactions(cardId);
    return cardTxs.filter(t => {
      // Use due date if possible, fallback to competence date
      const dateToCheck = parseISO(t.dueDate || t.competenceDate);
      return dateToCheck.getMonth() === month && dateToCheck.getFullYear() === year;
    });
  };

  const currentInvoiceTotal = (cardId: string) => {
    return getInvoiceTransactions(cardId, selectedMonth, selectedYear)
      .reduce((acc, t) => acc + t.amount, 0);
  };


  function calculateCardDueDate(purchaseDateStr: string, closingDay: number, dueDay: number): Date {
    const purchaseDate = new Date(purchaseDateStr + 'T12:00:00');
    let dueYear = purchaseDate.getFullYear();
    let dueMonth = purchaseDate.getMonth();

    // If the purchase date is after the closing day of the current month,
    // it jumps to the next cycle.
    if (purchaseDate.getDate() > closingDay) {
      dueMonth += 1;
    }

    // If the due day is numerically before the closing day (e.g. closes on 20th, due on 5th),
    // it inherently means the invoice is due in the following month.
    if (dueDay < closingDay) {
      dueMonth += 1;
    }

    return new Date(dueYear, dueMonth, dueDay, 12, 0, 0);
  }

  const handleAddPurchaseClick = (cardId: string) => {
    if (!newPurchaseDesc.trim()) {
      alert('Por favor, informe a descrição da compra.');
      return;
    }
    const val = parseFloat(newPurchaseAmount);
    if (isNaN(val) || val <= 0) {
      alert('Por favor, informe um valor válido para a compra.');
      return;
    }
    const card = creditCards.find(c => c.id === cardId);
    if (!card) return;

    const calculatedDueDate = calculateCardDueDate(newPurchaseDate, card.closingDay, card.dueDay);

    const txData = {
      description: newPurchaseDesc,
      amount: val,
      type: 'EXPENSE' as const,
      categoryId: newPurchaseCategory || categories.filter(c => c.type === 'EXPENSE' || c.type === 'BOTH')[0]?.id || '',
      creditCardId: cardId,
      bankId: card.bankId,
      competenceDate: new Date(newPurchaseDate + 'T12:00:00').toISOString(),
      dueDate: calculatedDueDate.toISOString(),
      status: 'OPEN' as const,
      isRecurring: false,
      isInstallment: false
    };

    addTransaction(txData);

    // Reset input fields
    setNewPurchaseDesc('');
    setNewPurchaseAmount('');
    setNewPurchaseDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handlePayInvoice = async (cardId: string, txs: Transaction[]) => {
    const openTxs = txs.filter(t => t.status === 'OPEN');
    if (openTxs.length === 0) return;

    const paymentDate = format(new Date(), 'yyyy-MM-dd');

    try {
      for (const t of openTxs) {
        await markTransactionAsPaid(t.id, paymentDate);
      }
      setActiveModal('invoice_payment_success');
    } catch (error) {
      console.error("Erro ao pagar a fatura:", error);
      alert("Ocorreu um erro ao processar o pagamento da fatura.");
    }
  };

  const getCategory = (id: string) => categories.find(c => c.id === id);

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const selectedDateObject = new Date(selectedYear, selectedMonth, 1);

  return (
    <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto pb-24 md:pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CardIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-semibold tracking-tight text-gradient-gold">Cartões de Crédito ({creditCards.length})</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-[140px]">
              <PremiumSelect
                label="Mês"
                value={selectedMonth.toString()}
                onChange={(val) => setSelectedMonth(parseInt(val))}
                options={Array.from({ length: 12 }, (_, i) => {
                  const d = new Date(2000, i, 1);
                  const monthName = format(d, 'MMMM', { locale: ptBR });
                  return { 
                    value: i.toString(), 
                    label: monthName.charAt(0).toUpperCase() + monthName.slice(1)
                  };
                })}
              />
            </div>
            <div className="w-[110px]">
              <PremiumSelect
                label="Ano"
                value={selectedYear.toString()}
                onChange={(val) => setSelectedYear(parseInt(val))}
                options={Array.from({ length: 10 }, (_, i) => {
                  const year = new Date().getFullYear() - 5 + i;
                  return { value: year.toString(), label: year.toString() };
                })}
              />
            </div>
          </div>
        </div>
        <button 
          onClick={handleOpenNewCard}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Novo Cartão
        </button>
      </header>

      {/* Cards Selector Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
        {creditCards.map(card => {
          const invoiceTotalMonth = currentInvoiceTotal(card.id);
          const usedPct = card.totalLimit > 0 ? (card.usedLimit / card.totalLimit) * 100 : 0;
          const cardTxs = getInvoiceTransactions(card.id, selectedMonth, selectedYear);
          
          return (
            <div key={card.id} className="flex flex-col gap-4">
              {/* Horizontal Card Mockup */}
              <div 
                className="relative w-full aspect-[1.58/1] rounded-3xl p-6 shadow-xl flex flex-col justify-between overflow-hidden"
                style={{ 
                  background: card.color.startsWith('#') 
                    ? `linear-gradient(135deg, ${card.color}, ${card.color}dd)` 
                    : card.color 
                }}
              >
                <div className="flex justify-between items-start">
                   <CardIcon className="w-8 h-8 text-white/50" />
                   <h3 className="text-white/40 text-2xl font-black tracking-tighter opacity-90 italic mix-blend-overlay">{card.brand}</h3>
                </div>
                <div>
                   <h3 className="text-white text-xl md:text-2xl font-black tracking-tight mb-1 truncate">{card.name}</h3>
                   <div className="flex justify-between items-end">
                     <p className="text-white/80 font-mono tracking-widest mt-2">{card.lastFour ? `•••• ${card.lastFour}` : '••••'} </p>
                   </div>
                </div>
              </div>

              {/* Details Card */}
              <PremiumCard className="p-5 flex flex-col gap-5 border border-border/50 shadow-sm rounded-[24px]">
                <div>
                  <h3 className="font-bold text-foreground text-lg">{card.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Final {card.lastFour}</p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-muted/30 p-2 rounded-xl">
                     <span className="text-sm font-medium text-muted-foreground">Fatura do Mês:</span>
                     <span className="text-sm font-bold text-foreground">{formatCurrency(invoiceTotalMonth)}</span>
                  </div>
                  <div className="flex justify-between items-center px-2">
                     <span className="text-sm font-medium text-muted-foreground">Disponível:</span>

                     <span className="text-sm font-bold text-emerald-500">{formatCurrency(card.availableLimit)}</span>
                  </div>
                  
                  <div className="w-full bg-muted/50 rounded-full h-1.5 overflow-hidden mt-1">
                    <div 
                      className={cn(
                        "h-full transition-all duration-1000 rounded-full",
                        usedPct > 90 ? "bg-red-500" : usedPct > 70 ? "bg-amber-500" : "bg-emerald-500"
                      )}
                      style={{ width: `${Math.min(usedPct, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pb-2 border-b border-border/40">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <div className="w-4 h-4 rounded bg-muted flex items-center justify-center">🗓️</div>
                    Fecha: <span className="text-foreground font-bold capitalize">{format(new Date(selectedYear, card.dueDay < card.closingDay ? selectedMonth - 1 : selectedMonth, card.closingDay), "d 'de' MMM", { locale: ptBR })}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <div className="w-4 h-4 rounded bg-muted flex items-center justify-center">🗓️</div>
                    Vence: <span className="text-foreground font-bold capitalize">{format(new Date(selectedYear, selectedMonth, card.dueDay), "d 'de' MMM", { locale: ptBR })}</span>
                  </div>
                </div>

                {(() => {
                  const previewTxs = cardTxs.slice(0, 4);
                  const remainingTxsCount = cardTxs.length - previewTxs.length;

                  if (cardTxs.length === 0) return null;
                  return (
                    <div className="space-y-2 border-b border-border/40 pb-4">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Compras Recentes da Fatura</div>
                      <div className="space-y-1.5">
                        {previewTxs.map(t => {
                          const cat = getCategory(t.categoryId);
                          const isPaid = t.status === 'PAID' || t.status === 'RECEIVED';
                          return (
                            <div key={t.id} className="flex justify-between items-center bg-muted/20 px-3 py-2 rounded-lg relative overflow-hidden group">
                              <div className="flex items-center gap-2 truncate">
                                <span className={cn("w-2 h-2 rounded-full hidden sm:block")} style={{ backgroundColor: cat?.color || '#888' }} />
                                <span className={cn(
                                  "text-xs font-medium truncate flex items-center gap-1.5",
                                  isPaid ? "text-muted-foreground/60 line-through decoration-emerald-500/40" : "text-foreground"
                                )}>
                                  <span className="text-muted-foreground mr-1">Dia {format(parseISO(t.competenceDate || t.dueDate), "dd")}</span>
                                  <span className="truncate">{t.description}</span>
                                  {t.affectLimitImmediately === false && (
                                    <span className="text-[8px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 px-1 py-0.2 rounded shrink-0">
                                      Agendado
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 ml-2">
                                <span className={cn(
                                  "text-xs font-bold",
                                  isPaid ? "text-emerald-500 font-bold" : "text-foreground"
                                )}>
                                  {formatCurrency(t.amount)}
                                </span>
                                {isPaid && (
                                  <span className="text-[10px] text-emerald-500 font-bold" title="Pago">✓</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {remainingTxsCount > 0 && (
                          <div className="text-center pt-1 pb-0">
                            <span className="text-[10px] text-muted-foreground font-semibold italic">e mais {remainingTxsCount} {remainingTxsCount === 1 ? 'compra' : 'compras'} aqui...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div className="pt-1">
                  {(() => {
                    const openTxs = cardTxs.filter(t => t.status === 'OPEN');
                    const hasTransactions = cardTxs.length > 0;
                    
                    return (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setViewingInvoiceId(card.id)}
                          className={cn(
                            "flex items-center justify-center gap-2 py-2.5 bg-muted/40 hover:bg-muted text-foreground rounded-xl text-xs font-bold transition-all border border-border/50",
                            hasTransactions ? "w-1/2" : "w-full"
                          )}
                        >
                          <CardIcon className="w-4 h-4" /> Ver Fatura
                        </button>
                        
                        {hasTransactions && (
                          openTxs.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => handlePayInvoice(card.id, cardTxs)}
                              className="w-1/2 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/15"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Pagar
                            </button>
                          ) : (
                            <div className="w-1/2 flex items-center justify-center gap-1 py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-bold text-xs uppercase tracking-wider rounded-xl select-none">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Paga 🎉
                            </div>
                          )
                        )}
                      </div>
                    );
                  })()}
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <button 
                      onClick={() => handleEditCard(card)}
                      className="p-2 text-muted-foreground hover:text-foreground transition-colors hover:bg-muted rounded-full"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteCard(card.id, card.name)}
                      className="p-2 text-muted-foreground hover:text-red-500 transition-colors hover:bg-red-500/10 rounded-full"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </PremiumCard>
            </div>
          );
        })}
      </div>

      {/* Invoice Modal */}
      {viewingInvoiceId && (
        <Modal
          isOpen={!!viewingInvoiceId}
          onClose={() => setViewingInvoiceId(null)}
          title={`Fatura: ${creditCards.find(c => c.id === viewingInvoiceId)?.name}`}
          className="max-w-4xl"
        >
          <div className="space-y-6">
            {(() => {
              const card = creditCards.find(c => c.id === viewingInvoiceId);
              if (!card) return null;
              
              const cardTxs = getInvoiceTransactions(card.id, selectedMonth, selectedYear);
              const invoiceTotal = currentInvoiceTotal(card.id);

              return (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                  {/* Left Column: Card Details, Summary Dashboard and direct Purchase Registration */}
                  <div className="lg:col-span-5 space-y-6">
                    {/* Header with stylized enlarged icon */}
                    <div className="flex items-center gap-4 p-5 rounded-2xl bg-muted/20 border border-border/50">
                      <div className="p-4 bg-background/80 rounded-2xl border border-border/50 flex items-center justify-center shadow-md animate-pulse">
                        <CardIcon className="w-12 h-12" style={{ color: card.color }} />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Cartão Selecionado</h4>
                        <p className="text-base font-black text-foreground">{card.name}</p>
                        <p className="text-xs text-muted-foreground font-medium">Bandeira: {card.brand} • Final {card.lastFour}</p>
                      </div>
                    </div>

                    {/* Massive Balance Info Card */}
                    <div className="p-6 rounded-2xl border border-border/50 bg-gradient-to-br from-card to-muted/10 relative overflow-hidden group shadow-sm">
                      <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 transition-all duration-700" style={{ backgroundColor: card.color }} />
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest pl-0.5">Total da Fatura de {format(selectedDateObject, 'MMMM', { locale: ptBR })}</p>
                      <p className="text-3xl font-black text-foreground mt-1 tracking-tight">{formatCurrency(invoiceTotal)}</p>
                      <p className="text-[10px] text-emerald-500 font-bold mt-1.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        Limite Disponível: {formatCurrency(card.availableLimit)}
                      </p>
                      <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-border/40 text-[10px] text-muted-foreground font-semibold">
                        <div>Fechamento: Dia <span className="text-foreground font-black capitalize">{format(new Date(selectedYear, card.dueDay < card.closingDay ? selectedMonth - 1 : selectedMonth, card.closingDay), "d 'de' MMM", { locale: ptBR })}</span></div>
                        <div>Vencimento: Dia <span className="text-foreground font-black capitalize">{format(new Date(selectedYear, selectedMonth, card.dueDay), "d 'de' MMM", { locale: ptBR })}</span></div>
                      </div>

                      {invoiceTotal > 0 ? (
                        cardTxs.some(t => t.status === 'OPEN') ? (
                          <button
                            type="button"
                            onClick={() => handlePayInvoice(card.id, cardTxs)}
                            className="w-full mt-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/15 hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Pagar Fatura
                          </button>
                        ) : (
                          <div className="w-full mt-5 py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 select-none">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Fatura Paga 🎉
                          </div>
                        )
                      ) : null}
                    </div>

                    {/* Form: Register Purchase */}
                    <div className="p-5 rounded-2xl border border-border/50 bg-card space-y-4">
                      <h4 className="text-xs font-black uppercase text-gradient-gold tracking-widest flex items-center gap-1.5 pb-2 border-b border-border/40">
                        <span>💳</span> Cadastrar Compra no Cartão
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="text-[9px] font-bold uppercase text-muted-foreground block mb-1">Descrição do Item</label>
                          <input 
                            type="text" 
                            placeholder="Ex: Supermercado, Uber, Restaurante..." 
                            value={newPurchaseDesc}
                            onChange={e => setNewPurchaseDesc(e.target.value)}
                            className="w-full bg-muted/40 border border-border/60 rounded-xl px-3 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:border-primary/50 outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <PremiumCurrencyInput
                              label="Valor (R$)"
                              value={newPurchaseAmount ? Number(newPurchaseAmount) : 0}
                              onChange={val => setNewPurchaseAmount(val ? val.toString() : '')}
                            />
                          </div>
                          <div>
                            <PremiumDatePicker
                              label="Data da Compra"
                              value={newPurchaseDate}
                              onChange={val => setNewPurchaseDate(val)}
                              required
                            />
                          </div>
                        </div>
                        <div className="relative">
                          <PremiumSelect
                            label="Categoria da Despesa"
                            value={newPurchaseCategory}
                            onChange={val => setNewPurchaseCategory(val)}
                            options={categories.filter(c => c.type === 'EXPENSE' || c.type === 'BOTH').map(c => ({
                              value: c.id,
                              label: c.name,
                              color: c.color
                            }))}
                          />
                        </div>

                        {(() => {
                          const purchaseDateObj = new Date(newPurchaseDate + 'T12:00:00');
                          const isNextInvoice = purchaseDateObj.getDate() > card.closingDay;
                          const calculatedDue = calculateCardDueDate(newPurchaseDate, card.closingDay, card.dueDay);
                          
                          return (
                            <div className={cn("p-3 rounded-xl border flex items-start gap-2 mt-2", isNextInvoice ? 'bg-amber-500/10 border-amber-500/30' : 'bg-primary/10 border-primary/30')}>
                              {isNextInvoice ? (
                                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                              )}
                              <div className="flex-1">
                                <p className={cn("text-[10px] font-bold uppercase tracking-wider", isNextInvoice ? 'text-amber-500' : 'text-primary')}>
                                  {isNextInvoice ? 'Fatura do Próximo Mês' : 'Fatura Deste Mês'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5 font-medium leading-snug">
                                  {isNextInvoice 
                                    ? `Após o fechamento (dia ${card.closingDay}). Esta compra entrará na próxima fatura, vencendo em ${format(calculatedDue, "dd 'de' MMMM", { locale: ptBR })}.` 
                                    : `Dentro do ciclo atual (fecha dia ${card.closingDay}). Esta compra entrará na fatura vigente, vencendo em ${format(calculatedDue, "dd 'de' MMMM", { locale: ptBR })}.`}
                                </p>
                              </div>
                            </div>
                          );
                        })()}
                        
                        <button
                          type="button"
                          onClick={() => handleAddPurchaseClick(card.id)}
                          className="w-full mt-2 py-3 bg-primary hover:bg-primary/95 text-primary-foreground font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md shadow-primary/10 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                        >
                          Salvar compra no cartão
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Purchases List in this billing cycle */}
                  <div className="lg:col-span-7 flex flex-col space-y-4">
                    <div className="flex items-center justify-between border-b border-border/40 pb-3">
                      <p className="text-xs font-black text-muted-foreground uppercase tracking-wider">Compras na Fatura ({cardTxs.length})</p>
                      <p className="text-[10px] text-muted-foreground italic font-medium">As compras são ordenadas por data de aquisição</p>
                    </div>

                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar flex-1">
                      {cardTxs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/5 border border-border/30 rounded-2xl space-y-2">
                          <span className="text-2xl">🛍️</span>
                          <p className="text-muted-foreground text-xs font-semibold">Nenhuma compra adicionada ainda.</p>
                          <p className="text-[10px] text-muted-foreground">Registre uma compra à esquerda para começar.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {cardTxs.map(t => {
                            const cat = getCategory(t.categoryId);
                            return (
                              <div key={t.id} className="flex justify-between items-center p-4 rounded-xl border border-border/40 bg-card hover:border-primary/30 transition-all duration-200 group">
                                <div className="flex items-center gap-3.5">
                                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-muted/60 shrink-0">
                                    {cat && <CategoryIcon icon={cat.icon} color={cat.color} size="sm" />}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-bold text-foreground text-sm flex items-center gap-1.5 flex-wrap">
                                      {t.description}
                                      {t.isInstallment && <span className="text-[10px] text-muted-foreground font-semibold italic bg-muted/40 px-1.5 py-0.5 rounded">({t.installmentCurrent}/{t.installmentTotal})</span>}
                                      {t.affectLimitImmediately === false ? (
                                        <span className="text-[9px] font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20 px-1.5 py-0.5 rounded-md" title="Não consome o limite imediatamente. Consome apenas na data de vencimento/débito.">
                                          Débito Agendado
                                        </span>
                                      ) : (
                                        <span className="text-[9px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded-md" title="Consome o limite do cartão imediatamente.">
                                          Utilizando Limite
                                        </span>
                                      )}
                                    </span>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-[10px] text-muted-foreground mt-1">
                                      <span className="font-semibold text-primary">
                                        Compra em: {format(parseISO(t.competenceDate || t.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                                      </span>
                                      <span className="hidden sm:inline text-muted-foreground/30">•</span>
                                      <span>
                                        Vencto: {format(parseISO(t.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                                      </span>
                                      <span className="hidden sm:inline text-muted-foreground/30">•</span>
                                      <span>{cat?.name || 'Sem Categoria'}</span>
                                      {t.status === 'PAID' && t.paymentDate && (
                                        <>
                                          <span className="hidden sm:inline text-muted-foreground/30">•</span>
                                          <span className="font-semibold text-emerald-500">
                                            Pago em: {format(parseISO(t.paymentDate), "dd/MM/yyyy", { locale: ptBR })}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex flex-col items-end gap-1">
                                    <span className="font-black text-foreground text-sm">
                                      {formatCurrency(t.amount)}
                                    </span>
                                    <span className={cn(
                                      "text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                                      t.status === 'PAID' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                                    )}>
                                      {t.status === 'PAID' ? 'Pago' : 'Em Aberto'}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`Deseja realmente remover a compra "${t.description}"?`)) {
                                        deleteTransaction(t.id);
                                      }
                                    }}
                                    className="p-2 text-muted-foreground hover:text-red-500 hover:bg-rose-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-pointer"
                                    title="Excluir Compra"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </Modal>
      )}

      <Modal 
        isOpen={activeModal === 'card_form'} 
        onClose={() => setActiveModal(null)}
        title={editingCard ? 'Editar Cartão' : 'Novo Cartão'}
      >
        <form onSubmit={handleSaveCard} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block tracking-widest pl-1">Nome do Cartão</label>
              <input 
                required 
                type="text" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                placeholder="Ex: Nubank Ultravioleta, Itaú Black..." 
                className="w-full bg-card border border-border rounded-xl px-4 py-3.5 text-sm focus:ring-1 focus:ring-primary outline-none" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <PremiumSelect 
                label="Instituição / Banco"
                options={banks.map(b => ({ value: b.id, label: b.name, color: b.color }))}
                value={formData.bankId}
                onChange={val => setFormData({...formData, bankId: val})}
                required
              />
              <PremiumSelect 
                label="Bandeira"
                options={[
                  { value: 'Mastercard', label: 'Mastercard' },
                  { value: 'Visa', label: 'Visa' },
                  { value: 'Elo', label: 'Elo' },
                  { value: 'Amex', label: 'Amex' },
                  { value: 'Outros', label: 'Outros' }
                ]}
                value={formData.brand}
                onChange={val => setFormData({...formData, brand: val})}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block tracking-widest pl-1">Últimos 4 Dígitos</label>
                <input 
                  required 
                  type="text" 
                  maxLength={4}
                  value={formData.lastFour} 
                  onChange={e => setFormData({...formData, lastFour: e.target.value.replace(/\D/g, '')})} 
                  placeholder="0000" 
                  className="w-full bg-card border border-border rounded-xl px-4 py-3.5 text-sm focus:ring-1 focus:ring-primary outline-none" 
                />
              </div>
              <PremiumCurrencyInput 
                label="Limite Total"
                value={formData.totalLimit}
                onChange={val => setFormData({...formData, totalLimit: val})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block tracking-widest pl-1">Dia de Fechamento</label>
                <input 
                  required 
                  type="number" 
                  min={1} 
                  max={31}
                  value={formData.closingDay} 
                  onChange={e => setFormData({...formData, closingDay: parseInt(e.target.value)})} 
                  className="w-full bg-card border border-border rounded-xl px-4 py-3.5 text-sm focus:ring-1 focus:ring-primary outline-none" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block tracking-widest pl-1">Dia de Vencimento</label>
                <input 
                  required 
                  type="number" 
                  min={1} 
                  max={31}
                  value={formData.dueDay} 
                  onChange={e => setFormData({...formData, dueDay: parseInt(e.target.value)})} 
                  className="w-full bg-card border border-border rounded-xl px-4 py-3.5 text-sm focus:ring-1 focus:ring-primary outline-none" 
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block tracking-widest pl-1">Cor do Cartão</label>
              <div className="flex flex-wrap gap-2">
                {['#8A05BE', '#EC7000', '#004A80', '#D32F2F', '#1B1B1B', '#388E3C', '#FBC02D', '#7B1FA2'].map(color => (
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
             <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-4 border border-border rounded-2xl text-[10px] font-bold hover:bg-muted transition-all uppercase tracking-widest text-muted-foreground">Cancelar</button>
             <button type="submit" className="flex-1 bg-primary text-primary-foreground py-4 rounded-2xl text-[10px] font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest">
               {editingCard ? 'Salvar Alterações' : 'Criar Cartão'}
             </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!deletingCardId}
        onClose={() => {
          setDeletingCardId(null);
          setDeletingCardName('');
        }}
        title="Confirmar Exclusão"
      >
        <div className="space-y-4">
          <p className="text-sm text-center py-4 text-foreground leading-relaxed">
            Tem certeza que deseja excluir o cartão de crédito <strong className="text-primary">"{deletingCardName}"</strong>? <br/>
            As transações associadas a este cartão não serão excluídas, mas ficarão sem cartão de crédito associado. Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-3">
            <button 
              onClick={() => {
                setDeletingCardId(null);
                setDeletingCardName('');
              }}
              className="flex-1 py-3 border border-border rounded-xl text-xs font-bold hover:bg-muted transition-all uppercase tracking-widest text-muted-foreground cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              onClick={() => {
                if (deletingCardId) {
                  deleteCreditCard(deletingCardId);
                  setDeletingCardId(null);
                  setDeletingCardName('');
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
              Seu cartão de crédito foi salvo com sucesso e já está disponível para compras.
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

      <Modal
        isOpen={activeModal === 'invoice_payment_success'}
        onClose={() => setActiveModal(null)}
        title="Fatura Paga com Sucesso"
      >
        <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 animate-bounce" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Pagamento Confirmado!</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Todas as compras deste ciclo de fatura foram marcadas como pagas com sucesso.
            </p>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-bold transition-all mt-4"
          >
            Ótimo!
          </button>
        </div>
      </Modal>
    </div>
  );
}

