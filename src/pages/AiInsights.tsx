import React, { useState, useMemo } from 'react';
import { PremiumCard } from '../components/ui/PremiumComponents';
import { Sparkles, Send, Bot, User, ArrowRight, BrainCircuit, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { useAppContext } from '../store/AppContext';
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AiInsightsPage() {
  const { transactions, categories, banks, goals } = useAppContext();
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Olá! Sou seu assistente Noble Finance. Analisei suas transações e estou pronto para transformar seus dados em estratégia. Como posso te ajudar hoje?' }
  ]);
  const [input, setInput] = useState('');

  // Real Data Calculations
  const metrics = useMemo(() => {
    const now = new Date();
    const startOfCurrMonth = startOfMonth(now);
    const endOfCurrMonth = endOfMonth(now);
    const last7Days = subDays(now, 7);
    const last15Days = subDays(now, 15);

    const monthTransactions = transactions.filter(t => 
      isWithinInterval(new Date(t.competenceDate), { start: startOfCurrMonth, end: endOfCurrMonth })
    );

    const totalIncome = monthTransactions
      .filter(t => t.type === 'INCOME' && (t.status === 'RECEIVED' || t.status === 'PAID'))
      .reduce((acc, t) => acc + t.amount, 0);

    const totalExpense = monthTransactions
      .filter(t => t.type === 'EXPENSE' && (t.status === 'RECEIVED' || t.status === 'PAID'))
      .reduce((acc, t) => acc + t.amount, 0);

    const weekExpenses = transactions
      .filter(t => t.type === 'EXPENSE' && new Date(t.competenceDate).getTime() >= last7Days.getTime())
      .reduce((acc, t) => acc + t.amount, 0);

    const biweeklyExpenses = transactions
      .filter(t => t.type === 'EXPENSE' && new Date(t.competenceDate).getTime() >= last15Days.getTime())
      .reduce((acc, t) => acc + t.amount, 0);

    const expensesByCategory = monthTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((acc, t) => {
        const cat = categories.find(c => c.id === t.categoryId)?.name || 'Outros';
        acc[cat] = (acc[cat] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    const topCategories = (Object.entries(expensesByCategory) as [string, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const totalBalance = banks.reduce((acc, b) => acc + b.currentBalance, 0);
    
    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      weekExpenses,
      biweeklyExpenses,
      topCategories,
      totalBalance,
      monthName: format(now, 'MMMM', { locale: ptBR })
    };
  }, [transactions, categories, banks]);

  const handleSend = (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
    if (!textOverride) setInput('');

    // AI response logic based on REAL data
    setTimeout(() => {
      let response = '';
      const prompt = textToSend.toLowerCase();
      
      if (prompt.includes('mensal')) {
        response = `Seu RELATÓRIO MENSAL de ${metrics.monthName} está pronto: Você recebeu ${formatCurrency(metrics.totalIncome)} e gastou ${formatCurrency(metrics.totalExpense)}. Seu saldo operacional do mês é de ${formatCurrency(metrics.balance)}. ${metrics.balance > 0 ? 'Excelente! Você está operando no azul.' : 'Atenção: seus gastos superaram sua receita este mês.'}`;
      } else if (prompt.includes('semanal')) {
        response = `RELATÓRIO SEMANAL: Nos últimos 7 dias, suas despesas somaram ${formatCurrency(metrics.weekExpenses)}. ${metrics.weekExpenses > metrics.totalIncome * 0.25 ? 'Notamos que seu ritmo de gastos semanal está acima do recomendado para sua renda.' : 'Seus gastos semanais estão sob controle.'}`;
      } else if (prompt.includes('quinzenal')) {
        response = `RELATÓRIO QUINZENAL: Nas últimas duas semanas, você movimentou ${formatCurrency(metrics.biweeklyExpenses)} em despesas. Isso representa aproximadamente ${( (metrics.biweeklyExpenses / (metrics.totalIncome || 1)) * 100 ).toFixed(1)}% da sua receita mensal estimada.`;
      } else if (prompt.includes('gastos')) {
        if (metrics.topCategories.length > 0) {
          const catList = metrics.topCategories.map(([name, val]) => `${name} (${formatCurrency(val)})`).join(', ');
          response = `ANÁLISE DE GASTOS: Suas maiores categorias este mês são: ${catList}. Identifiquei que você pode economizar se reduzir em 10% os gastos na categoria ${metrics.topCategories[0][0]}.`;
        } else {
          response = 'Ainda não tenho dados suficientes de gastos este mês para uma análise detalhada. Comece a lançar suas despesas para eu te ajudar!';
        }
      } else {
        response = `Interessante sua pergunta. Analisando seu patrimônio total de ${formatCurrency(metrics.totalBalance)}, recomendo focar em ${metrics.balance > 0 ? 'diversificar seus investimentos' : 'ajustar seu custo fixo'} para atingir suas metas mais rápido.`;
      }

      setMessages(prev => [...prev, { role: 'ai', text: response }]);
    }, 1200);
  };

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto h-screen flex flex-col pb-24 md:pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <BrainCircuit className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-semibold tracking-tight text-gradient-gold capitalize">Análise Nobre</h1>
            <p className="text-muted-foreground mt-1">Sua vida financeira interpretada por IA avançada</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">
        
        {/* Left Column: Smart Insights (4 cols) */}
        <div className="lg:col-span-4 space-y-6 overflow-y-auto pr-2 no-scrollbar">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest pl-1">Insights Estratégicos</h2>
          
          <PremiumCard className="p-5 border-l-4 border-l-emerald-500 glass-effect relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5">
              <TrendingUp className="w-12 h-12" />
            </div>
            <h3 className="font-bold flex items-center gap-2 mb-2 text-emerald-500">
               Oportunidade de Investimento
            </h3>
            <p className="text-sm text-foreground/80 mb-4 tracking-tight leading-relaxed">
              Você possui <strong>{formatCurrency(metrics.totalBalance)}</strong> consolidados em contas. Se alocar R$ 10.000 em uma LCA de 95% do CDI, você deixaria de "perder" <strong>R$ 90/mês</strong> pela inflação.
            </p>
            <button className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 hover:text-emerald-400 flex items-center gap-1 transition-all">
              Acompanhar rendimentos <ArrowRight className="w-3 h-3" />
            </button>
          </PremiumCard>
          
          <PremiumCard className="p-5 border-l-4 border-l-red-500 glass-effect relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5">
              <TrendingDown className="w-12 h-12" />
            </div>
            <h3 className="font-bold flex items-center gap-2 mb-2 text-red-500">
               Alerta de Gastos
            </h3>
            <p className="text-sm text-foreground/80 mb-4 tracking-tight leading-relaxed">
              {metrics.topCategories.length > 0 ? (
                <>Suas despesas em <strong>{metrics.topCategories[0][0]}</strong> representam {((metrics.topCategories[0][1] / (metrics.totalIncome || 1)) * 100).toFixed(0)}% da sua renda. Este é o setor de maior risco no seu orçamento atual.</>
              ) : (
                <>Seu orçamento está estável, mas recomendo revisar seus gastos fixos para aumentar sua margem de poupança.</>
              )}
            </p>
            <button className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-400 flex items-center gap-1 transition-all">
              Ver lançamentos <ArrowRight className="w-3 h-3" />
            </button>
          </PremiumCard>

          <PremiumCard className="p-5 border-l-4 border-l-primary glass-effect relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5">
              <Target className="w-12 h-12" />
            </div>
            <h3 className="font-bold flex items-center gap-2 mb-2 text-primary">
               Projeção de Objetivos
            </h3>
            <p className="text-sm text-foreground/80 mb-4 tracking-tight leading-relaxed">
              {goals.length > 0 ? (
                <>Com seu saldo mensal de <strong>{formatCurrency(metrics.balance)}</strong>, você levaria aproximadamente {Math.ceil((goals[0].targetAmount - goals[0].currentAmount) / (metrics.balance > 0 ? metrics.balance : 1))} meses para atingir sua meta de "{goals[0].name}".</>
              ) : (
                <>Você ainda não definiu metas financeiras. Estabelecer um objetivo de longo prazo aumenta em 40% a probabilidade de economia constante.</>
              )}
            </p>
            <button className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/80 flex items-center gap-1 transition-all">
              Criar nova meta <ArrowRight className="w-3 h-3" />
            </button>
          </PremiumCard>
        </div>

        {/* Right Column: Interactive Chat (8 cols) */}
        <PremiumCard className="lg:col-span-8 flex flex-col h-[500px] lg:h-full border-primary/20 bg-[#0d0d0d]/80 rounded-[2rem] overflow-hidden">
          <div className="p-6 border-b border-border/50 bg-card/30 backdrop-blur-md flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary relative overflow-hidden group">
                <Sparkles className="w-6 h-6 group-hover:scale-125 transition-transform" />
                <div className="absolute inset-0 bg-primary/10 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-lg tracking-tight">Conselheiro Noble AI</h3>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Estrategista Financeiro Ativo</span>
                </div>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase text-muted-foreground mr-2">Ações Rápidas:</span>
              <button onClick={() => handleSend("Gerar meu Relatório Mensal")} className="text-[9px] font-bold uppercase px-2 py-1 border border-border rounded-lg hover:border-primary transition-colors active:scale-95">Relatório Mensal</button>
              <button onClick={() => handleSend("Gerar meu Relatório Quinzenal")} className="text-[9px] font-bold uppercase px-2 py-1 border border-border rounded-lg hover:border-primary transition-colors active:scale-95">Quinzenal</button>
              <button onClick={() => handleSend("Gerar meu Relatório Semanal")} className="text-[9px] font-bold uppercase px-2 py-1 border border-border rounded-lg hover:border-primary transition-colors active:scale-95">Relatório Semanal</button>
              <button onClick={() => handleSend("Fazer uma Análise de Gastos detalhada")} className="text-[9px] font-bold uppercase px-2 py-1 border border-border rounded-lg hover:border-primary transition-colors active:scale-95">Análise de Gastos</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex gap-4 max-w-[85%]", m.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg", m.role === 'user' ? "bg-muted text-foreground" : "bg-primary text-primary-foreground")}>
                  {m.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>
                <div className={cn(
                  "p-5 rounded-2xl text-sm leading-relaxed tracking-tight",
                  m.role === 'user' 
                    ? "bg-muted/80 rounded-tr-none border border-border/50" 
                    : "bg-card border border-border/50 rounded-tl-none text-foreground/90 shadow-xl"
                )}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 bg-muted/20 border-t border-border/50 mt-auto">
            <div className="relative max-w-4xl mx-auto">
              <input
                type="text"
                placeholder="Pergunte sobre seus rendimentos, gastos por categoria ou planejamento..."
                className="w-full bg-card border border-border/50 rounded-2xl pl-6 pr-14 py-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all shadow-inner"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
              <button 
                onClick={() => handleSend()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all shadow-lg active:scale-95"
              >
                <Send className="w-4 h-4" strokeWidth={3} />
              </button>
            </div>
          </div>
        </PremiumCard>
      </div>
    </div>
  );
}

