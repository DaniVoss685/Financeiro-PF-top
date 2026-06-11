import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAppContext } from '../../store/AppContext';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Home, 
  Landmark, 
  ArrowLeftRight, 
  Wallet, 
  Settings,
  Moon,
  Sun,
  Search,
  Bell,
  Sparkles,
  RefreshCw,
  LayoutGrid,
  Target,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  RefreshCcw as PayAllIcon,
  MessageSquare,
  Check,
  Loader2
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { getEvolutionSettings, sendWhatsAppMessage } from '../../lib/EvolutionService';

const MENU_ITEMS = [
  { name: 'Dashboard', icon: Home, path: '/' },
  { name: 'Análise', icon: Sparkles, path: '/ai-insights' },
  { name: 'Transações', icon: ArrowLeftRight, path: '/transactions' },
  { name: 'Cartão', icon: Wallet, path: '/cards' },
  { name: 'Recorrências', icon: RefreshCw, path: '/recurring' },
  { name: 'Metas', icon: Target, path: '/goals' },
  { name: 'Bancos', icon: Landmark, path: '/banks' },
  { name: 'Categorias', icon: LayoutGrid, path: '/categories' },
  { name: 'Configurações', icon: Settings, path: '/settings' },
];

export function AppLayout() {
  const { theme, toggleTheme, notifications, markTransactionAsPaid, payAllOverdue, reminders, completeReminder, transactions, updateReminder, currentUser, logoutUser } = useAppContext();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isOverdueModalOpen, setIsOverdueModalOpen] = useState(false);
  const [activeReminder, setActiveReminder] = useState<any>(null);
  const [whatsappStatus, setWhatsappStatus] = useState<'idle' | 'sending' | 'success' | 'failed'>('idle');
  const [whatsappError, setWhatsappError] = useState('');

  const processedRef = useRef<Set<string>>(new Set());

  // Automatic background sending of WhatsApp reminders due today or overdue
  useEffect(() => {
    const autoSendWhatsAppReminders = async () => {
      const activeSettings = getEvolutionSettings();
      if (!activeSettings || !activeSettings.enabled || !activeSettings.apiKey || !activeSettings.host) {
        return;
      }

      const cachedPhone = currentUser?.phone || localStorage.getItem('evolution_test_phone') || '';
      if (!cachedPhone) return;

      const todayStr = format(new Date(), 'yyyy-MM-dd');

      // Filter reminders that are WHATSAPP, not completed, not already sent, and due on or before today
      const pending = reminders.filter(r => {
        if (r.method !== 'WHATSAPP' || r.isCompleted || r.whatsappSent || r.dueDate > todayStr || processedRef.current.has(r.id)) {
          return false;
        }

        // Rule: Do not send overdue/due today notifications if the reminder was created 
        // on or after the due date (user registered an old/current transaction)
        if (r.createdAt) {
          const createdDateStr = format(new Date(r.createdAt), 'yyyy-MM-dd');
          if (createdDateStr >= r.dueDate) {
            return false;
          }
        }

        return true;
      });

      if (pending.length === 0) return;

      for (const reminder of pending) {
        processedRef.current.add(reminder.id);
        
        const relatedTx = transactions.find(t => t.id === reminder.transactionId);
        const txName = relatedTx?.description || reminder.title;
        const txAmount = relatedTx 
          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(relatedTx.amount) 
          : 'Não especificado';
        
        const isDueToday = reminder.dueDate === todayStr;
        const isOverdue = reminder.dueDate < todayStr;
        
        let warningText = `📅 *Aviso:* Esta transação vence em breve!`;
        if (isDueToday) {
          warningText = `🚨 *ATENÇÃO:* Esta transação vence *hoje*!`;
        } else if (isOverdue) {
          warningText = `🚨 *ATENÇÃO:* Esta transação está *ATRASADA*!`;
        }

        const txTypeName = relatedTx?.type === 'INCOME' ? 'Recebimento' : 'Pagamento';
        
        const message = `🔔 *Noble Finance - Alerta de ${txTypeName}* 🔔\n\n` +
                        `📝 *Nome:* ${txName}\n` +
                        `💰 *Valor:* ${txAmount}\n` +
                        `📅 *Vencimento:* ${format(new Date(reminder.dueDate.includes('T') ? reminder.dueDate : reminder.dueDate + 'T12:00:00'), "dd/MM/yyyy")}\n\n` +
                        `${warningText}\n\n` +
                        `Noble Finance App 💰`;

        try {
          const res = await sendWhatsAppMessage(cachedPhone, message, activeSettings);
          if (res.success) {
            updateReminder(reminder.id, { whatsappSent: true });
          } else {
            // Retry after 1 minute in case of transient errors
            setTimeout(() => {
              processedRef.current.delete(reminder.id);
            }, 60000);
          }
        } catch (error) {
          setTimeout(() => {
            processedRef.current.delete(reminder.id);
          }, 60000);
        }
      }
    };

    autoSendWhatsAppReminders();
  }, [reminders, transactions, updateReminder]);

  useEffect(() => {
    if (activeReminder) {
      setWhatsappStatus('idle');
      setWhatsappError('');
    }
  }, [activeReminder]);
  
  const overdueExpenses = notifications.filter(n => n.type === 'OVERDUE' && !n.isIncome);
  const dueTodayExpenses = notifications.filter(n => n.type === 'DUE_SOON' && !n.isIncome && n.title === 'Vence Hoje');
  
  const hasOverdue = overdueExpenses.length > 0;
  const hasDueToday = dueTodayExpenses.length > 0;
  const hasDailyAlerts = hasOverdue || hasDueToday;

  const [isDailyAlertsModalOpen, setIsDailyAlertsModalOpen] = useState(false);

  useEffect(() => {
    // Show modal on first load if there are overdue or due today expenses
    const hasSeenModal = sessionStorage.getItem('hasSeenDailyAlertsModal');
    if (hasDailyAlerts && !hasSeenModal) {
      setIsDailyAlertsModalOpen(true);
      sessionStorage.setItem('hasSeenDailyAlertsModal', 'true');
    }
  }, [hasDailyAlerts]);

  useEffect(() => {
    // Check for active reminders
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    
    const pendingReminders = reminders.filter(r => {
      if (r.isCompleted || r.dueDate > today) return false;
      
      if (r.createdAt) {
        const createdDateStr = format(new Date(r.createdAt), 'yyyy-MM-dd');
        if (createdDateStr >= r.dueDate) return false;
      }
      
      return true;
    });
    if (pendingReminders.length > 0) {
      const firstReminder = pendingReminders[0];
      const hasSeen = sessionStorage.getItem(`seen_reminder_${firstReminder.id}`);
      if (!hasSeen) {
        setActiveReminder(firstReminder);
        sessionStorage.setItem(`seen_reminder_${firstReminder.id}`, 'true');
      }
    }
  }, [reminders]);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL'
    }).format(val);
  };

  const resetTimeout = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!isCollapsed) {
      timeoutRef.current = setTimeout(() => {
        setIsCollapsed(true);
      }, 5000);
    }
  };

  useEffect(() => {
    resetTimeout();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isCollapsed]);

  const handleSidebarInteraction = () => {
    if (isCollapsed) return;
    resetTimeout();
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden font-sans" onMouseMove={handleSidebarInteraction}>
      {/* Top Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-background z-30">
        <div className="w-auto sm:w-56 flex items-center shrink-0">
          <span className="text-foreground font-black font-display text-lg sm:text-2xl tracking-tighter flex items-center gap-1 uppercase italic select-none">
            <span className="text-foreground">Noble</span>
            <span className="text-primary">Finance</span>
          </span>
        </div>

          <div className="flex-1 flex justify-end items-center gap-4">
            {hasDailyAlerts && (
              <button 
                onClick={() => setIsDailyAlertsModalOpen(true)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black transition-all",
                  hasOverdue 
                    ? "bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 animate-pulse" 
                    : "bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500/20"
                )}
              >
                 {hasOverdue ? <AlertTriangle className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                <span className="hidden sm:inline">
                  {hasOverdue ? 'Contas Atrasadas' : 'Vence Hoje'}
                </span>
              </button>
            )}
            
            <div className="relative group hidden md:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar..." 
              className="bg-card border border-border text-sm text-foreground rounded-full pl-10 pr-4 py-2.5 w-64 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all flex items-center shadow-sm"
            />
          </div>
          
          <div className="relative" ref={notificationsRef}>
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className={cn(
                "w-10 h-10 rounded-full bg-card border border-border shadow-sm flex items-center justify-center transition-all relative group",
                notifications.length > 0 ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Bell className={cn("w-4 h-4", notifications.length > 0 && "animate-tada")} />
              {notifications.length > 0 && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#1C1C1C]" />
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-3 w-80 bg-card border border-border rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">Notificações</h3>
                  {notifications.length > 0 && (
                    <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">
                      {notifications.length} {notifications.length === 1 ? 'pendente' : 'pendentes'}
                    </span>
                  )}
                </div>
                <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                  {notifications.length > 0 ? (
                    <div className="flex flex-col">
                      {notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          className={cn(
                            "p-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group/notif",
                            notif.type === 'OVERDUE' && "bg-red-500/5"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                              notif.type === 'OVERDUE' ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"
                            )}>
                              <Bell className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <p className="text-xs font-bold text-foreground group-hover/notif:text-primary transition-colors">{notif.title}</p>
                                <span className="text-[9px] text-muted-foreground whitespace-nowrap ml-2">
                                  {format(new Date(notif.date), "dd/MM", { locale: ptBR })}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{notif.message}</p>
                              
                              {notif.transactionId && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markTransactionAsPaid(notif.transactionId!, new Date().toISOString());
                                  }}
                                  className="mt-3 flex items-center gap-1.5 text-[10px] font-black text-primary hover:underline uppercase tracking-tighter"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Resolver Agora
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Bell className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">Tudo em dia por aqui!</p>
                    </div>
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="p-3 bg-muted/20 border-t border-border text-center">
                    <button className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors">
                      Ver histórico completo
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 bg-muted/25 px-3 py-1.5 rounded-2xl border border-border/40 select-none">
            <span className="text-xs font-black text-foreground hidden sm:inline-block">
              {currentUser?.name || 'Usuário'}
            </span>
            <div className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center text-base overflow-hidden shadow-inner shrink-0 select-none">
              {currentUser?.avatar?.startsWith('data:image') ? (
                <img src={currentUser.avatar} alt="User" className="w-full h-full object-cover" />
              ) : (
                <span>{currentUser?.avatar || '👑'}</span>
              )}
            </div>
            
            <button
              onClick={() => logoutUser()}
              className="p-1 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer hidden sm:block"
              title="Sair do Sistema"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>

        {/* Daily Alerts Modal */}
        <Modal 
          isOpen={isDailyAlertsModalOpen} 
          onClose={() => setIsDailyAlertsModalOpen(false)} 
          title="Avisos do Dia"
          className="max-w-md"
        >
          <div className="space-y-6">
            
            {hasOverdue && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl">
                  <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white shrink-0 animate-bounce">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-foreground uppercase tracking-tighter items-center">Contas em atraso!</h4>
                    <p className="text-[10px] text-muted-foreground leading-tight">Você precisa regularizar essas pendências.</p>
                  </div>
                </div>

                <div className="space-y-2 max-h-[200px] overflow-y-auto no-scrollbar scroll-smooth">
                  {overdueExpenses.map((notif) => (
                    <div key={notif.id} className="flex items-center justify-between p-3 bg-card border border-border/60 rounded-xl group/item">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-foreground">{notif.title}</span>
                        <span className="text-[9px] text-muted-foreground italic">Venceu em {format(new Date(notif.date), "dd 'de' MMMM", { locale: ptBR })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-red-500 whitespace-nowrap">{formatCurrency(notif.amount || 0)}</span>
                        {notif.transactionId && (
                          <button 
                            onClick={() => markTransactionAsPaid(notif.transactionId!, new Date().toISOString())}
                            title="Pagar agora"
                            className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all"
                          >
                            <PayAllIcon className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hasDueToday && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                  <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-background shrink-0">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-foreground uppercase tracking-tighter">Vencendo Hoje!</h4>
                    <p className="text-[10px] text-muted-foreground leading-tight">Coisas para pagar hoje.</p>
                  </div>
                </div>

                <div className="space-y-2 max-h-[200px] overflow-y-auto no-scrollbar scroll-smooth">
                  {dueTodayExpenses.map((notif) => (
                    <div key={notif.id} className="flex items-center justify-between p-3 bg-card border border-border/60 rounded-xl group/item">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-foreground">{notif.title || notif.message}</span>
                        <span className="text-[9px] text-muted-foreground italic">Vence hoje</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-amber-500 whitespace-nowrap">{formatCurrency(notif.amount || 0)}</span>
                        {notif.transactionId && (
                          <button 
                            onClick={() => markTransactionAsPaid(notif.transactionId!, new Date().toISOString())}
                            title="Pagar agora"
                            className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all"
                          >
                            <PayAllIcon className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mt-2">
              <button 
                onClick={() => setIsDailyAlertsModalOpen(false)}
                className="py-3 border border-border rounded-xl text-xs font-black text-muted-foreground hover:bg-muted/50 transition-all"
              >
                Agora Não
              </button>
              {hasOverdue && (
                <button 
                  onClick={() => {
                    payAllOverdue();
                    // Don't close immediately if there are also "Due Today", but since PayAllOverdue handles ALL overdue, we can close it, or just let users see what is remaining.
                    const stillHasAlerts = dueTodayExpenses.some(d => transactions.find(t => t.id === d.transactionId)?.status === 'OPEN');
                    if (!stillHasAlerts) setIsDailyAlertsModalOpen(false);
                  }}
                  className="py-3 bg-primary text-primary-foreground rounded-xl text-xs font-black hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <PayAllIcon className="w-4 h-4" />
                  Pagar Atrasadas
                </button>
              )}
            </div>
          </div>
        </Modal>

        {/* Reminder Modal */}
        <Modal 
          isOpen={!!activeReminder} 
          onClose={() => setActiveReminder(null)} 
          title="Lembrete de Pagamento"
        >
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-amber-400 rounded-full flex items-center justify-center text-primary-foreground shrink-0 animate-pulse">
                <Bell className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-bold text-foreground italic tracking-tight">{activeReminder?.title}</h4>
                <p className="text-xs text-muted-foreground uppercase font-black tracking-widest">Lembrete Agendado</p>
              </div>
            </div>

            <div className="p-5 bg-muted/20 border border-border/50 rounded-[2rem] space-y-3">
              <div className="space-y-1">
                <span className="text-[10px] text-primary font-bold uppercase tracking-widest mb-1.5 block">Motivo / Descrição</span>
                <p className="text-sm text-foreground/90 leading-relaxed italic">
                  "{activeReminder?.description}"
                </p>
              </div>
              <div className="pt-3 border-t border-border/40 flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Data Limite</span>
                <span className="text-sm font-black text-amber-400">
                  {activeReminder?.dueDate && format(new Date(activeReminder.dueDate.includes('T') ? activeReminder.dueDate : activeReminder.dueDate + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                </span>
              </div>
            </div>

            {activeReminder?.method === 'WHATSAPP' && (
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Aviso via WhatsApp</span>
                  {whatsappStatus === 'success' && <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold">Enviado!</span>}
                  {whatsappStatus === 'failed' && <span className="text-[9px] bg-rose-500/10 text-rose-400 px-2.5 py-0.5 rounded-full font-bold">Erro</span>}
                </div>
                
                {whatsappStatus === 'idle' && (
                  <button
                    type="button"
                    onClick={async () => {
                      setWhatsappStatus('sending');
                      const activeSettings = getEvolutionSettings();
                      const cachedPhone = currentUser?.phone || localStorage.getItem('evolution_test_phone') || '';
                      if (!cachedPhone) {
                        setWhatsappStatus('failed');
                        setWhatsappError('Cadastre seu número no menu de Perfil antes de disparar avisos.');
                        return;
                      }
                      
                      const relatedTx = transactions.find(t => t.id === activeReminder.transactionId);
                      const txName = relatedTx?.description || activeReminder.title;
                      const txAmount = relatedTx 
                        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(relatedTx.amount) 
                        : 'Não especificado';
                      const txType = relatedTx 
                        ? (relatedTx.type === 'INCOME' ? 'Receita 🟢' : 'Despesa 🔴') 
                        : 'Transação 💰';
                      
                      const todayStr = format(new Date(), 'yyyy-MM-dd');
                      const isDueToday = activeReminder.dueDate === todayStr;
                      
                      const warningText = isDueToday 
                        ? `🚨 *ATENÇÃO:* Esta transação vence *hoje*!` 
                        : `📅 *Aviso:* Esta transação vence em breve!`;

                      const message = `🔔 *Noble Finance - Lembrete de ${relatedTx?.type === 'INCOME' ? 'Recebimento' : 'Pagamento'}* 🔔\n\n` +
                                      `📝 *Nome:* ${txName}\n` +
                                      `💰 *Valor:* ${txAmount}\n` +
                                      `📅 *Vencimento:* ${format(new Date(activeReminder.dueDate.includes('T') ? activeReminder.dueDate : activeReminder.dueDate + 'T12:00:00'), "dd/MM/yyyy")}\n\n` +
                                      `${warningText}\n\n` +
                                      `Noble Finance App 💰`;
                                      
                      const res = await sendWhatsAppMessage(cachedPhone, message, activeSettings);
                      if (res.success) {
                        setWhatsappStatus('success');
                      } else {
                        setWhatsappStatus('failed');
                        setWhatsappError(res.error || 'Erro desconhecido');
                      }
                    }}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Enviar Notificação por WhatsApp
                  </button>
                )}

                {whatsappStatus === 'sending' && (
                  <div className="w-full py-3 bg-muted text-muted-foreground font-bold rounded-xl text-xs flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando Alerta no WhatsApp...
                  </div>
                )}

                {whatsappStatus === 'success' && (
                  <div className="text-xs text-emerald-400 text-center font-medium py-1">
                    Enviado com sucesso para o número configurado!
                  </div>
                )}

                {whatsappStatus === 'failed' && (
                  <div className="space-y-2">
                    <div className="text-xs text-rose-400 text-center font-medium">
                      Falha ao enviar: {whatsappError}
                    </div>
                    <button
                      type="button"
                      onClick={() => setWhatsappStatus('idle')}
                      className="w-full text-[10px] text-muted-foreground hover:text-foreground underline text-center font-bold"
                    >
                      Tentar Novamente
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setActiveReminder(null)}
                className="py-4 border border-border rounded-2xl text-[10px] font-black uppercase text-muted-foreground hover:bg-muted/50 transition-all tracking-widest"
              >
                Pular
              </button>
              <button 
                onClick={() => {
                  completeReminder(activeReminder.id);
                  setActiveReminder(null);
                }}
                className="py-4 bg-primary text-primary-foreground rounded-2xl text-[10px] font-black uppercase tracking-widest hover:shadow-lg transition-all active:scale-95"
              >
                Marcar Concluído
              </button>
            </div>
          </div>
        </Modal>
      </header>


      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Desktop Sidebar */}
        <aside 
          className={cn(
            "hidden md:flex flex-col bg-background py-4 z-20 border-r border-border transition-all duration-300 relative",
            isCollapsed ? "w-20" : "w-64"
          )}
          onMouseEnter={() => {
            if (isCollapsed) return;
            resetTimeout();
          }}
        >
          {/* Toggle Button */}
          <button 
            onClick={toggleSidebar}
            className="absolute -right-3 top-6 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-lg hover:scale-110 transition-all z-50"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          <nav className="flex-1 flex flex-col gap-2 w-full px-3 overflow-y-auto no-scrollbar">
            {MENU_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (isCollapsed) setIsCollapsed(false);
                  resetTimeout();
                }}
                className={({ isActive }) => cn(
                  "flex items-center gap-4 px-4 py-3 rounded-2xl transition-all relative group overflow-hidden",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md font-bold" 
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent"
                )}
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={cn("w-5 h-5 shrink-0", "transition-all group-hover:scale-110")} strokeWidth={isActive ? 2.5 : 1.5} />
                    {!isCollapsed && (
                      <span className="text-sm font-semibold tracking-tight whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">
                        {item.name}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className={cn("mt-auto pt-4 w-full px-3 flex flex-col gap-3", isCollapsed ? "items-center" : "items-stretch")}>
            <button
              onClick={() => theme !== 'dark' && toggleTheme()}
              className={cn(
                "flex items-center gap-4 rounded-2xl transition-all p-3",
                theme === 'dark' 
                  ? "text-primary border border-primary bg-primary/10" 
                  : "text-muted-foreground hover:bg-muted border border-transparent",
                isCollapsed ? "w-12 h-12 justify-center" : "w-full justify-start"
              )}
            >
              <Moon className="w-5 h-5 shrink-0" strokeWidth={theme === 'dark' ? 2 : 1.5} />
              {!isCollapsed && <span className={cn("text-xs", theme === 'dark' ? "font-bold" : "font-medium")}>Modo Escuro</span>}
            </button>
            <button
              onClick={() => theme === 'dark' && toggleTheme()}
              className={cn(
                "flex items-center gap-4 rounded-2xl transition-all p-3",
                theme !== 'dark' 
                  ? "text-primary border border-primary bg-primary/10" 
                  : "text-muted-foreground hover:bg-muted border border-transparent",
                isCollapsed ? "w-12 h-12 justify-center" : "w-full justify-start"
              )}
            >
              <Sun className="w-5 h-5 shrink-0" strokeWidth={theme !== 'dark' ? 2 : 1.5} />
              {!isCollapsed && <span className={cn("text-xs", theme !== 'dark' ? "font-bold" : "font-medium")}>Modo Claro</span>}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-background">
          <div className="flex-1 overflow-y-auto no-scrollbar z-10 w-full h-full pb-20 md:pb-0">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card/80 backdrop-blur-lg pb-safe z-50">
        <div className="flex justify-around items-center p-2">
          {MENU_ITEMS.slice(0, 4).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg transition-all",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.name.substring(0, 8)}</span>
            </NavLink>
          ))}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center gap-1 p-2 rounded-lg transition-all text-muted-foreground hover:text-foreground"
          >
            <LayoutGrid className="w-5 h-5" />
            <span className="text-[10px] font-medium">Mais</span>
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <div className={cn(
        "fixed inset-0 z-[100] md:hidden transition-all duration-300",
        isMobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"
      )}>
        {/* Backdrop */}
        <div 
          className={cn(
            "absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-300",
            isMobileMenuOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setIsMobileMenuOpen(false)}
        />
        {/* Drawer Content */}
        <div className={cn(
          "absolute top-0 bottom-0 left-0 w-[280px] bg-card border-r border-border p-6 flex flex-col gap-6 transition-transform duration-300 shadow-2xl",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          {/* Header */}
          <div className="flex justify-between items-center pb-4 border-b border-border">
            <span className="text-lg font-black tracking-tight text-primary italic">NOBLE FINANCE</span>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
            >
              <ChevronLeft size={20} />
            </button>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 flex flex-col gap-2 overflow-y-auto no-scrollbar">
            {MENU_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => cn(
                  "flex items-center gap-4 px-4 py-3 rounded-2xl transition-all relative overflow-hidden",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md font-bold" 
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="text-sm font-semibold tracking-tight">
                  {item.name}
                </span>
              </NavLink>
            ))}
          </nav>

          {/* Theme & Actions footer */}
          <div className="pt-4 border-t border-border flex flex-col gap-3">
            <button
              onClick={() => {
                toggleTheme();
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-4 rounded-2xl transition-all p-3 text-muted-foreground hover:bg-muted"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              <span className="text-xs font-semibold">Alternar Tema</span>
            </button>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                logoutUser();
              }}
              className="flex items-center gap-4 rounded-2xl transition-all p-3 text-red-500 hover:bg-red-500/10"
            >
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="text-xs font-bold">Sair da Conta</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
