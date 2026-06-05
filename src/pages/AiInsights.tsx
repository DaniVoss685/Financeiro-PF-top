import React, { useState, useMemo } from 'react';
import { PremiumCard } from '../components/ui/PremiumComponents';
import { Sparkles, Send, Bot, User, ArrowRight, BrainCircuit, TrendingUp, TrendingDown, Target, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { useAppContext, Category } from '../store/AppContext';
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CategoryIcon } from '../components/CategoryIcon';

export default function AiInsightsPage() {
  const { transactions, categories, banks, goals } = useAppContext();
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Olá! Sou seu assistente Noble Finance. Analisei suas transações e estou pronto para transformar seus dados em estratégia. Como posso te ajudar hoje?' }
  ]);
  const [input, setInput] = useState('');

  const [activeTab, setActiveTab] = useState<'CHAT' | 'CATEGORIES'>('CHAT');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  const filteredTransactionsForAnalysis = useMemo(() => {
    return transactions.filter(t => {
      const idStr = t.id.toString();
      if (idStr.startsWith('recurring-') || idStr.startsWith('projected-')) {
        return false;
      }
      
      const cat = categories.find(c => c.id === t.categoryId);
      if (cat?.excludeFromAnalysis) {
        return false;
      }

      const bank = banks.find(b => b.id === t.bankId);
      if (bank?.excludeFromAnalysis) {
        return false;
      }

      const date = new Date(t.competenceDate);
      return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
    });
  }, [transactions, categories, banks, selectedMonth, selectedYear]);

  const analysisData = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;

    const incomeByCategory: Record<string, { category: Category; amount: number; count: number }> = {};
    const expenseByCategory: Record<string, { category: Category; amount: number; count: number }> = {};

    filteredTransactionsForAnalysis.forEach(t => {
      const amount = Number(t.amount) || 0;
      const cat = categories.find(c => c.id === t.categoryId);
      const catId = t.categoryId || 'other';
      const categoryObj = cat || {
        id: 'other',
        name: 'Outros',
        color: '#94a3b8',
        icon: 'HelpCircle',
        userId: '',
        createdAt: ''
      };

      if (t.type === 'INCOME') {
        totalIncome += amount;
        if (!incomeByCategory[catId]) {
          incomeByCategory[catId] = { category: categoryObj, amount: 0, count: 0 };
        }
        incomeByCategory[catId].amount += amount;
        incomeByCategory[catId].count += 1;
      } else if (t.type === 'EXPENSE') {
        totalExpense += amount;
        if (!expenseByCategory[catId]) {
          expenseByCategory[catId] = { category: categoryObj, amount: 0, count: 0 };
        }
        expenseByCategory[catId].amount += amount;
        expenseByCategory[catId].count += 1;
      }
    });

    const sortedExpenses = Object.values(expenseByCategory).sort((a, b) => b.amount - a.amount);
    const sortedIncomes = Object.values(incomeByCategory).sort((a, b) => b.amount - a.amount);

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      expenses: sortedExpenses,
      incomes: sortedIncomes
    };
  }, [filteredTransactionsForAnalysis, categories]);

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
  }, [transactions, categories, banks]);  const handleSend = (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
    if (!textOverride) setInput('');

    // AI response logic based on REAL data
    setTimeout(() => {
      let response = '';
      const prompt = textToSend.toLowerCase().trim();
      
      const cleanString = (str: string) => 
        str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      
      const cleanPrompt = cleanString(prompt);

      // 1. Pergunta sobre parcelas restantes
      if (cleanPrompt.includes('parcela') || cleanPrompt.includes('faltam') || cleanPrompt.includes('acabar')) {
        const installmentTx = transactions.filter(t => t.isInstallment && t.installmentTotal && t.installmentCurrent);
        
        if (installmentTx.length === 0) {
          response = "Não encontrei nenhuma despesa parcelada ativa no seu histórico financeiro.";
        } else {
          // Agrupar transações pelo nome base
          const groups: Record<string, typeof installmentTx> = {};
          installmentTx.forEach(t => {
            const baseName = t.description.replace(/\s*\(\d+\/\d+\)\s*/g, '').replace(/\s*\d+\/\d+\s*/g, '').trim();
            if (!groups[baseName]) {
              groups[baseName] = [];
            }
            groups[baseName].push(t);
          });

          let targetGroup = '';
          for (const baseName of Object.keys(groups)) {
            if (cleanPrompt.includes(cleanString(baseName))) {
              targetGroup = baseName;
              break;
            }
          }

          if (targetGroup) {
            const txs = groups[targetGroup];
            const sorted = [...txs].sort((a, b) => (b.installmentCurrent || 0) - (a.installmentCurrent || 0));
            const latest = sorted[0];
            const current = latest.installmentCurrent || 0;
            const total = latest.installmentTotal || 0;
            const remaining = total - current;
            const amount = latest.amount;
            const remainingValue = remaining * amount;

            if (remaining <= 0) {
              response = `A despesa "${targetGroup}" já foi totalmente quitada (todas as ${total} parcelas foram pagas ou lançadas).`;
            } else {
              response = `Para a despesa **"${targetGroup}"** (parcela atual: ${current}/${total}), faltam ainda **${remaining} parcelas** para acabar.\n\n` +
                         `• **Valor por parcela**: ${formatCurrency(amount)}\n` +
                         `• **Total restante a pagar**: ${formatCurrency(remainingValue)}\n` +
                         `• **Próximo vencimento**: ${latest.dueDate ? format(new Date(latest.dueDate), "dd/MM/yyyy") : 'Não informado'}.`;
            }
          } else {
            let listResponse = "Aqui estão as parcelas restantes das suas despesas ativas:\n\n";
            let foundActive = false;

            Object.entries(groups).forEach(([name, txs]) => {
              const sorted = [...txs].sort((a, b) => (b.installmentCurrent || 0) - (a.installmentCurrent || 0));
              const latest = sorted[0];
              const current = latest.installmentCurrent || 0;
              const total = latest.installmentTotal || 0;
              const remaining = total - current;
              
              if (remaining > 0) {
                foundActive = true;
                const remainingValue = remaining * latest.amount;
                listResponse += `• **${name}**: Faltam **${remaining} parcelas** de **${formatCurrency(latest.amount)}** (Total restante: ${formatCurrency(remainingValue)}). Parcela atual: ${current}/${total}.\n`;
              }
            });

            if (foundActive) {
              response = listResponse;
            } else {
              response = "Todas as suas despesas parceladas cadastradas já foram quitadas!";
            }
          }
        }
      } 
      // 2. Pergunta sobre gastos em categoria/período
      else if (cleanPrompt.includes('gastei') || cleanPrompt.includes('gastos') || cleanPrompt.includes('gasto') || cleanPrompt.includes('comida') || cleanPrompt.includes('alimentacao')) {
        const isWeekly = cleanPrompt.includes('semana');
        const isMonthly = cleanPrompt.includes('mes') || cleanPrompt.includes('mensal');
        
        const now = new Date();
        let startDate = startOfMonth(now);
        let periodName = "deste mês";

        if (isWeekly) {
          startDate = subDays(now, 7);
          periodName = "desta semana (últimos 7 dias)";
        } else if (isMonthly) {
          startDate = startOfMonth(now);
          periodName = "deste mês";
        }

        let targetCategory: Category | undefined = undefined;
        let categorySearchTerm = '';
        
        if (cleanPrompt.includes('comida') || cleanPrompt.includes('alimentacao') || cleanPrompt.includes('restaurante') || cleanPrompt.includes('mercado')) {
          categorySearchTerm = 'Alimentação';
        } else if (cleanPrompt.includes('moradia') || cleanPrompt.includes('aluguel') || cleanPrompt.includes('casa')) {
          categorySearchTerm = 'Moradia';
        } else if (cleanPrompt.includes('emprestimo') || cleanPrompt.includes('reembolso')) {
          categorySearchTerm = 'Empréstimos/Reembolsos';
        } else if (cleanPrompt.includes('salario') || cleanPrompt.includes('receita')) {
          categorySearchTerm = 'Salário';
        } else {
          const matchedCat = categories.find(c => cleanPrompt.includes(cleanString(c.name)));
          if (matchedCat) {
            targetCategory = matchedCat;
          }
        }

        if (!targetCategory && categorySearchTerm) {
          targetCategory = categories.find(c => cleanString(c.name).includes(cleanString(categorySearchTerm)));
        }

        if (targetCategory) {
          const filteredTxs = transactions.filter(t => {
            const txDate = new Date(t.competenceDate);
            const inPeriod = txDate.getTime() >= startDate.getTime();
            const matchesCategory = t.categoryId === targetCategory!.id;
            return inPeriod && matchesCategory;
          });

          const total = filteredTxs.reduce((acc, t) => acc + t.amount, 0);

          if (filteredTxs.length === 0) {
            response = `Você não teve nenhum gasto registrado na categoria **${targetCategory.name}** ${periodName}.`;
          } else {
            response = `Seus gastos na categoria **${targetCategory.name}** ${periodName} somam **${formatCurrency(total)}** em ${filteredTxs.length} lançamento(s):\n\n`;
            filteredTxs.forEach(t => {
              response += `• **${t.description}**: ${formatCurrency(t.amount)} em ${format(new Date(t.competenceDate), "dd/MM/yyyy")}\n`;
            });
          }
        } else {
          const filteredTxs = transactions.filter(t => {
            const txDate = new Date(t.competenceDate);
            return txDate.getTime() >= startDate.getTime() && t.type === 'EXPENSE';
          });
          const total = filteredTxs.reduce((acc, t) => acc + t.amount, 0);

          if (filteredTxs.length === 0) {
            response = `Você não registrou nenhuma despesa ${periodName}.`;
          } else {
            response = `Suas despesas gerais ${periodName} somam **${formatCurrency(total)}** em ${filteredTxs.length} lançamento(s). Para detalhar por categoria, pergunte algo como *"quanto gastei em comida ${isWeekly ? 'essa semana' : 'este mês'}"*.`;
          }
        }
      }
      // 3. Relatórios do menu rápido
      else if (cleanPrompt.includes('relatorio mensal')) {
        response = `Seu RELATÓRIO MENSAL de ${metrics.monthName} está pronto: Você recebeu ${formatCurrency(metrics.totalIncome)} e gastou ${formatCurrency(metrics.totalExpense)}. Seu saldo operacional do mês é de ${formatCurrency(metrics.balance)}. ${metrics.balance > 0 ? 'Excelente! Você está operando no azul.' : 'Atenção: seus gastos superaram sua receita este mês.'}`;
      } else if (cleanPrompt.includes('semanal')) {
        response = `RELATÓRIO SEMANAL: Nos últimos 7 dias, suas despesas somaram ${formatCurrency(metrics.weekExpenses)}. ${metrics.weekExpenses > metrics.totalIncome * 0.25 ? 'Notamos que seu ritmo de gastos semanal está acima do recomendado para sua renda.' : 'Seus gastos semanais estão sob controle.'}`;
      } else if (cleanPrompt.includes('quinzenal')) {
        response = `RELATÓRIO QUINZENAL: Nas últimas duas semanas, você movimentou ${formatCurrency(metrics.biweeklyExpenses)} em despesas. Isso representa aproximadamente ${( (metrics.biweeklyExpenses / (metrics.totalIncome || 1)) * 100 ).toFixed(1)}% da sua receita mensal estimada.`;
      } else {
        response = `Olá! Analisando seus dados financeiros, encontrei um patrimônio total consolidado de **${formatCurrency(metrics.totalBalance)}** nas suas contas bancárias.\n\n` +
                   `Você pode me fazer perguntas dinâmicas e úteis sobre os seus dados reais como:\n` +
                   `• *"Quantas parcelas faltam para acabar a despesa X?"*\n` +
                   `• *"Quanto eu gastei em comida esta semana?"*\n` +
                   `• *"Qual foi meu gasto em moradia este mês?"*\n` +
                   `• *"Gerar meu Relatório Mensal"*`;
      }

      setMessages(prev => [...prev, { role: 'ai', text: response }]);
    }, 1000);
  };

  return (
    <div className="p-6 md:p-10 space-y-6 max-w-7xl mx-auto h-screen flex flex-col pb-24 md:pb-10">
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

      {/* Seletor de Abas Premium */}
      <div className="flex bg-muted/40 p-1 rounded-xl border border-border/50 max-w-md shrink-0">
        <button
          onClick={() => setActiveTab('CHAT')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200",
            activeTab === 'CHAT'
              ? "bg-card text-foreground shadow-sm border border-border/30"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Bot className="w-4 h-4 text-primary" />
          Conselheiro IA
        </button>
        <button
          onClick={() => setActiveTab('CATEGORIES')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200",
            activeTab === 'CATEGORIES'
              ? "bg-card text-foreground shadow-sm border border-border/30"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Target className="w-4 h-4 text-primary" />
          Análise de Categorias
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">
        
        {activeTab === 'CHAT' ? (
          /* Interactive Chat (12 cols) */
          <PremiumCard className="lg:col-span-12 flex flex-col h-full border border-border/80 bg-card rounded-[2rem] overflow-hidden shadow-xl">
            <div className="p-6 border-b border-border/50 bg-card/30 backdrop-blur-md flex items-center justify-between shrink-0">
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
                <button onClick={() => handleSend("Gerar meu Relatório Semanal")} className="text-[9px] font-bold uppercase px-2 py-1 border border-border rounded-lg hover:border-primary transition-colors active:scale-95">Relatório Semanal</button>
                <button onClick={() => handleSend("Qual foi meus gastos em comida nessa semana?")} className="text-[9px] font-bold uppercase px-2 py-1 border border-border rounded-lg hover:border-primary transition-colors active:scale-95">Gastos Comida (Semana)</button>
                <button onClick={() => handleSend("Quantas parcelas faltam para acabar a despesa?")} className="text-[9px] font-bold uppercase px-2 py-1 border border-border rounded-lg hover:border-primary transition-colors active:scale-95">Parcelas Restantes</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
              {messages.map((m, i) => (
                <div key={i} className={cn("flex gap-4 max-w-[85%]", m.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg", m.role === 'user' ? "bg-muted text-foreground" : "bg-primary text-primary-foreground")}>
                    {m.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                  </div>
                  <div className={cn(
                    "p-5 rounded-2xl text-sm leading-relaxed tracking-tight whitespace-pre-line",
                    m.role === 'user' 
                      ? "bg-muted/80 rounded-tr-none border border-border/50" 
                      : "bg-card border border-border/50 rounded-tl-none text-foreground/90 shadow-xl"
                  )}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 bg-muted/20 border-t border-border/50 mt-auto shrink-0">
              <div className="relative max-w-4xl mx-auto">
                <input
                  type="text"
                  placeholder="Pergunte sobre seus rendimentos, gastos por categoria ou planejamento..."
                  className="w-full bg-card border border-border/50 rounded-2xl pl-6 pr-14 py-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all shadow-inner text-foreground placeholder:text-muted-foreground/50"
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
        ) : (
          /* Category Analysis Tab */
          <PremiumCard className="lg:col-span-12 flex flex-col h-full border border-border/80 bg-card rounded-[2rem] overflow-hidden shadow-xl">
            <div className="p-6 border-b border-border/50 bg-card/30 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
              <div>
                <h3 className="font-bold text-lg tracking-tight">Análise por Categoria</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Visão consolidada de todas as despesas e receitas do mês selecionado</p>
              </div>
              
              {/* Seletor de Período */}
              <div className="flex items-center gap-2 bg-muted/60 border border-border/30 rounded-xl p-1 shadow-sm shrink-0">
                <button 
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-card hover:shadow-sm rounded-lg transition-all active:scale-90 text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-4 text-xs font-semibold min-w-[120px] text-center capitalize text-foreground flex items-center justify-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  {format(new Date(selectedYear, selectedMonth), 'MMMM yyyy', { locale: ptBR })}
                </span>
                <button 
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-card hover:shadow-sm rounded-lg transition-all active:scale-90 text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
              {/* Cards de Resumo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Receitas */}
                <div className="bg-muted/10 border border-border/40 rounded-2xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Receitas do Período</p>
                    <h4 className="text-xl font-bold mt-1 text-emerald-500 font-display">{formatCurrency(analysisData.totalIncome)}</h4>
                  </div>
                  <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500 group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                
                {/* Despesas */}
                <div className="bg-muted/10 border border-border/40 rounded-2xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-rose-500/20 transition-all duration-300">
                  <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Despesas do Período</p>
                    <h4 className="text-xl font-bold mt-1 text-rose-500 font-display">{formatCurrency(analysisData.totalExpense)}</h4>
                  </div>
                  <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-500 group-hover:scale-110 transition-transform">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                </div>

                {/* Saldo Líquido */}
                <div className="bg-muted/10 border border-border/40 rounded-2xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-primary/20 transition-all duration-300">
                  <div className={cn("absolute top-0 left-0 w-1 h-full", analysisData.balance >= 0 ? "bg-primary" : "bg-rose-500")} />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Saldo Líquido</p>
                    <h4 className={cn("text-xl font-bold mt-1 font-display", analysisData.balance >= 0 ? "text-primary" : "text-rose-500")}>
                      {formatCurrency(analysisData.balance)}
                    </h4>
                  </div>
                  <div className={cn("p-2.5 rounded-xl group-hover:scale-110 transition-transform", analysisData.balance >= 0 ? "bg-primary/10 text-primary" : "bg-rose-500/10 text-rose-500")}>
                    <BrainCircuit className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Listagem de Categorias em Duas Colunas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
                {/* Gastos por Categoria */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-rose-500" />
                      Gastos por Categoria
                    </h4>
                    <span className="text-[10px] bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full font-bold uppercase">
                      Saídas
                    </span>
                  </div>
                  
                  {analysisData.expenses.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-border/50 rounded-2xl bg-muted/5">
                      <p className="text-xs text-muted-foreground">Nenhuma despesa registrada para este mês.</p>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {analysisData.expenses.map(({ category, amount, count }) => {
                        const percentage = analysisData.totalExpense > 0 ? (amount / analysisData.totalExpense) * 100 : 0;
                        return (
                          <div key={category.id} className="p-4 bg-muted/5 border border-border/30 rounded-xl hover:bg-muted/10 transition-colors">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-3">
                                <CategoryIcon icon={category.icon} color={category.color} size="sm" />
                                <div>
                                  <span className="font-semibold text-xs text-foreground block">{category.name}</span>
                                  <span className="text-[10px] text-muted-foreground block">{count} {count === 1 ? 'transação' : 'transações'}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-xs text-rose-500 block font-display">{formatCurrency(amount)}</span>
                                <span className="text-[10px] text-muted-foreground block font-medium">{percentage.toFixed(1)}% do total</span>
                              </div>
                            </div>
                            <div className="w-full bg-muted/40 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all duration-500" 
                                style={{ 
                                  width: `${percentage}%`, 
                                  backgroundColor: category.color || '#F59E0B' 
                                }} 
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Receitas por Categoria */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      Receitas por Categoria
                    </h4>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-bold uppercase">
                      Entradas
                    </span>
                  </div>
                  
                  {analysisData.incomes.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-border/50 rounded-2xl bg-muted/5">
                      <p className="text-xs text-muted-foreground">Nenhuma receita registrada para este mês.</p>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {analysisData.incomes.map(({ category, amount, count }) => {
                        const percentage = analysisData.totalIncome > 0 ? (amount / analysisData.totalIncome) * 100 : 0;
                        return (
                          <div key={category.id} className="p-4 bg-muted/5 border border-border/30 rounded-xl hover:bg-muted/10 transition-colors">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-3">
                                <CategoryIcon icon={category.icon} color={category.color} size="sm" />
                                <div>
                                  <span className="font-semibold text-xs text-foreground block">{category.name}</span>
                                  <span className="text-[10px] text-muted-foreground block">{count} {count === 1 ? 'transação' : 'transações'}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-xs text-emerald-500 block font-display">{formatCurrency(amount)}</span>
                                <span className="text-[10px] text-muted-foreground block font-medium">{percentage.toFixed(1)}% do total</span>
                              </div>
                            </div>
                            <div className="w-full bg-muted/40 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all duration-500" 
                                style={{ 
                                  width: `${percentage}%`, 
                                  backgroundColor: category.color || '#10B981' 
                                }} 
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </PremiumCard>
        )}
      </div>
    </div>
  );
}

