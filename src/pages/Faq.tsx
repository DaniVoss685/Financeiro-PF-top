import React, { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { 
  HelpCircle, 
  ChevronDown, 
  Landmark, 
  Wallet, 
  LayoutGrid, 
  RefreshCw, 
  ArrowLeftRight, 
  Sparkles,
  Play,
  AlertTriangle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FaqCategory {
  title: string;
  icon: React.ComponentType<any>;
  items: { q: string; a: string }[];
}

const FAQ_DATA: FaqCategory[] = [
  {
    title: '🏦 Contas e Bancos',
    icon: Landmark,
    items: [
      { q: 'Como cadastrar contas de investimento?', a: 'Ao criar ou editar uma conta, selecione a opção "Investimentos" no campo "Tipo de Conta". Isso ajudará a manter o controle do seu patrimônio consolidado sem misturar com sua conta corrente de uso diário.' },
      { q: 'O saldo inicial afeta as transações passadas?', a: 'Não. O saldo inicial serve estritamente como ponto de partida numérico para a conta na data em que ela foi registrada. Transações cadastradas depois somarão ou subtrairão a partir desse valor inicial base.' },
      { q: 'Como funciona a Conta Padrão (Estrela)?', a: 'Ao definir uma conta como padrão (clicando na estrelinha do card do banco), ela será pré-selecionada automaticamente nos formulários sempre que você criar uma nova transação.' },
      { q: 'Posso ignorar uma conta dos gráficos e análises?', a: 'Sim. Marque a caixinha "Ignorar na Análise de Categorias" ao criar ou editar a conta. Ideal para poupanças ou investimentos de longo prazo, evitando que essas contas inflem seus relatórios mensais.' }
    ]
  },
  {
    title: '💳 Cartões de Crédito',
    icon: Wallet,
    items: [
      { q: 'Como o limite disponível do cartão é calculado?', a: 'O limite disponível é calculado dinamicamente em tempo real: Limite Disponível = Limite Total - Despesas lançadas no cartão que ainda não foram pagas (faturas em aberto).' },
      { q: 'O que acontece quando eu clico em pagar a fatura?', a: 'Ao liquidar a fatura na tela de cartões, o limite do cartão é restabelecido instantaneamente e o saldo da conta bancária vinculada é reduzido pelo valor pago da fatura.' },
      { q: 'Como o sistema trata compras parceladas no cartão?', a: 'O sistema lança a parcela respectiva de cada mês na fatura correspondente. Contudo, o limite total do cartão é reduzido pelo valor TOTAL da compra e liberado mês a mês conforme as parcelas são liquidadas.' },
      { q: 'O que é Fechamento vs. Vencimento do cartão?', a: 'Fechamento é a data em que o banco fecha a fatura (compras feitas a partir deste dia caem na fatura do mês seguinte). Vencimento é o prazo limite para você pagar o boleto da fatura sem juros.' }
    ]
  },
  {
    title: '🏷️ Categorias e Metas',
    icon: LayoutGrid,
    items: [
      { q: 'O que acontece se eu ultrapassar a meta mensal de uma categoria?', a: 'O sistema não impedirá você de cadastrar transações, mas a barra de progresso da categoria ficará vermelha e alertas visuais aparecerão no seu Dashboard.' },
      { q: 'Posso criar minhas próprias categorias?', a: 'Sim! Clique em "+ Nova Categoria" no menu de Categorias. Defina o nome, se ela serve para Despesas, Receitas ou Ambos, e escolha um ícone e cor personalizados.' },
      { q: 'Como desativar categorias que não utilizo?', a: 'Embora as categorias padrões não possam ser excluídas (para manter a integridade dos dados históricos), você pode editá-las e desmarcar a opção "Ativa". Assim, elas sumirão dos menus de seleção.' }
    ]
  },
  {
    title: '🔄 Lançamentos Recorrentes',
    icon: RefreshCw,
    items: [
      { q: 'O que é uma Recorrência e para que serve?', a: 'Recorrências são lançamentos fixos mensais (como Aluguel, Netflix, Internet ou seu Salário). O sistema projeta essas transações para os meses seguintes, gerando previsões do seu fluxo de caixa futuro.' },
      { q: 'Como funciona o alerta de WhatsApp nas recorrências?', a: 'Se o seu celular estiver configurado no perfil e a integração com a Evolution API estiver ativa, nosso robô enviará notificações no WhatsApp nas datas de vencimento configuradas.' },
      { q: 'Posso alterar o valor de um lançamento de recorrência específico?', a: 'Sim! As recorrências servem para projetar transações. Se a conta de luz veio mais cara este mês, basta ir na aba "Transações" e alterar o valor daquela transação individual.' }
    ]
  },
  {
    title: '💸 Transações e Parcelas',
    icon: ArrowLeftRight,
    items: [
      { q: 'Como cadastrar compras parceladas de forma simples?', a: 'Ao criar uma transação de despesa, marque a caixinha "Esta transação é parcelada?". Defina a quantidade de parcelas e se o valor inserido é o de "Cada Parcela" ou o "Valor Total". O sistema fará a divisão e lançará as parcelas nos meses corretos automaticamente.' },
      { q: 'Como registrar uma transferência de saldo entre contas?', a: 'No formulário de Nova Transação, selecione a aba "Transferência" no topo. Informe a conta de origem (de onde sai o dinheiro), a conta de destino (onde entra) e o valor.' },
      { q: 'Para que serve a Data de Competência?', a: 'É a data em que a compra de fato aconteceu. É importante para sabermos em qual período o gasto deve ser contabilizado no seu orçamento, mesmo que o pagamento ocorra em outra data.' }
    ]
  },
  {
    title: '📊 Análises e Inteligência Artificial',
    icon: Sparkles,
    items: [
      { q: 'Como a Inteligência Artificial pode me ajudar?', a: 'No menu "Análise", a IA avalia seus padrões de gastos, a proximidade com suas metas e a projeção de saldo futuro para sugerir planos de economia específicos de acordo com seu comportamento financeiro.' },
      { q: 'O que é a Projeção de Saldo de Fechamento?', a: 'É uma estimativa baseada nas transações fixas e variáveis agendadas até o fim do mês, indicando com quanto dinheiro você provavelmente fechará o período.' },
      { q: 'Os meus dados estão seguros com a IA?', a: 'Sim. Os dados financeiros enviados para análise são limitados apenas a valores e categorias consolidadas, sem qualquer informação pessoal identificável.' }
    ]
  }
];

export default function FaqPage() {
  const { theme, resetOnboarding } = useAppContext();
  const [activeCategoryIdx, setActiveCategoryIdx] = useState<number>(0);
  const [expandedItemIdx, setExpandedItemIdx] = useState<number | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleToggleItem = (idx: number) => {
    setExpandedItemIdx(expandedItemIdx === idx ? null : idx);
  };

  const handleCategoryChange = (idx: number) => {
    setActiveCategoryIdx(idx);
    setExpandedItemIdx(null);
  };

  const activeCategory = FAQ_DATA[activeCategoryIdx];

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-5xl mx-auto pb-24 md:pb-10 font-sans">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-gradient-gold flex items-center gap-2">
            <HelpCircle className="w-8 h-8 text-primary" /> Central de Dúvidas (FAQ)
          </h1>
          <p className="text-muted-foreground mt-1">Tudo o que você precisa saber sobre o preenchimento de campos e recursos do systema</p>
        </div>

        <button
          onClick={() => setShowResetConfirm(true)}
          className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 hover:border-primary/45 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <Play className="w-3.5 h-3.5 fill-primary" /> Reiniciar Tour Guiado
        </button>
      </header>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* Navigation Categories Sidebar */}
        <div className="space-y-2 md:col-span-1">
          <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest pl-2 block mb-3">Tópicos de Ajuda</span>
          
          <div className="flex flex-wrap md:flex-col gap-1.5">
            {FAQ_DATA.map((cat, idx) => {
              const CatIcon = cat.icon;
              const isActive = activeCategoryIdx === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handleCategoryChange(idx)}
                  className={`w-full text-left px-4 py-3 rounded-2xl flex items-center gap-3 transition-all border cursor-pointer ${
                    isActive 
                      ? 'bg-primary text-primary-foreground border-primary font-bold shadow-md' 
                      : 'bg-card border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  <CatIcon className="w-5 h-5 shrink-0" />
                  <span className="text-xs tracking-tight">{cat.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* FAQ Accordion List */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-muted/10 border border-border/60 rounded-3xl p-6 space-y-4 relative overflow-hidden backdrop-blur-sm">
            {/* Ambient blur circle */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center gap-3 border-b border-border/40 pb-4">
              <span className="text-base font-bold text-foreground uppercase tracking-tight">
                Dúvidas em {activeCategory.title}
              </span>
            </div>

            <div className="space-y-3">
              {activeCategory.items.map((item, idx) => (
                <div 
                  key={idx} 
                  className="border border-border/60 rounded-2xl overflow-hidden bg-card hover:border-border transition-all shadow-sm"
                >
                  <button
                    onClick={() => handleToggleItem(idx)}
                    className="w-full px-5 py-4.5 flex items-center justify-between text-left text-xs md:text-sm font-bold text-foreground hover:bg-muted/30 transition-all cursor-pointer"
                  >
                    <span>{item.q}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ml-2 ${
                      expandedItemIdx === idx ? 'transform rotate-180' : ''
                    }`} />
                  </button>
                  
                  <AnimatePresence initial={false}>
                    {expandedItemIdx === idx && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="px-5 pb-5 pt-1.5 text-xs text-muted-foreground leading-relaxed border-t border-border/10 bg-muted/5 font-medium"
                      >
                        {item.a}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação do Reinício do Tour */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setShowResetConfirm(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-card border border-border/80 rounded-[2rem] shadow-2xl p-6 z-10 space-y-6 text-center"
            >
              <div className="w-12 h-12 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Play className="w-6 h-6 fill-primary" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-foreground">Reiniciar o Tour Guiado?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                  Isso irá redefinir o seu progresso de boas-vindas para o primeiro passo, guiando você pelas principais telas do sistema.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="py-3 border border-border rounded-xl text-xs font-black text-muted-foreground hover:bg-muted/50 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    setShowResetConfirm(false);
                    await resetOnboarding();
                  }}
                  className="py-3 bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl text-xs font-black transition-all cursor-pointer shadow-md"
                >
                  Sim, Reiniciar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
