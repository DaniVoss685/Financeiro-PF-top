import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../../store/AppContext';
import { 
  Landmark, 
  Wallet, 
  LayoutGrid, 
  RefreshCw, 
  ArrowLeftRight, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  HelpCircle, 
  ChevronDown, 
  BookOpen, 
  CheckCircle2,
  FileText,
  Play,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ModalField {
  name: string;
  desc: string;
}

interface FaqItem {
  q: string;
  a: string;
}

interface TourStep {
  number: number;
  title: string;
  path: string;
  icon: React.ComponentType<any>;
  description: string;
  screenTip: string;
  highlights: string[];
  modalTitle: string;
  modalFields: ModalField[];
  faq: FaqItem[];
  modalTriggerText: string; // The button text to look for in the page to trigger modal
}

const TOUR_STEPS: TourStep[] = [
  {
    number: 1,
    title: '🏦 Passo 1: Cadastro de Bancos e Contas',
    path: '/banks',
    icon: Landmark,
    description: 'Para organizar sua vida financeira do zero, comece cadastrando todas as suas contas bancárias, carteiras físicas ou contas poupança. Informe o saldo inicial de cada uma delas. Isso criará uma base consolidada para calcularmos o seu saldo geral disponível de forma correta!',
    screenTip: '💡 Para começar, clique no botão azul "+ Adicionar Conta" localizado no canto superior direito desta tela. O modal de cadastro se abrirá e o guia lateral de preenchimento irá aparecer automaticamente ao seu lado!',
    highlights: ['Definição de Saldo Inicial', 'Múltiplas Contas Simultâneas', 'Personalização de Cores'],
    modalTriggerText: 'Adicionar Conta',
    modalTitle: 'Preenchimento da Conta Bancária',
    modalFields: [
      { name: 'Nome da Instituição', desc: 'Identifique sua conta (Ex: "Nubank Principal", "Dinheiro na Carteira", "Reserva Poupança").' },
      { name: 'Tipo de Conta', desc: 'Selecione a finalidade: Conta Corrente (movimentações), Conta Poupança (reservas), Investimentos (corretoras/renda fixa) ou Dinheiro em Espécie (dinheiro físico).' },
      { name: 'Saldo Inicial', desc: 'O valor exato que você tem disponível nela hoje. O sistema usará isso como base histórica para o saldo atual.' },
      { name: 'Ignorar na Análise de Categorias', desc: 'Se marcar, os gastos/receitas desta conta não entram nos gráficos principais (ótimo para contas poupança ou investimentos que não devem inflar as despesas diárias).' },
      { name: 'Vincular Cartão de Crédito', desc: 'Uma facilidade! Se você tem um cartão desse banco, marque esta caixinha e defina o limite e as datas. O sistema criará o banco e o cartão ao mesmo tempo.' }
    ],
    faq: [
      { q: 'Posso cadastrar contas de investimento?', a: 'Sim! Selecione o Tipo de Conta como "Investimentos". Isso ajudará a manter o controle do seu patrimônio consolidado sem misturar com a conta corrente.' },
      { q: 'O saldo inicial afeta as transações passadas?', a: 'Não. O saldo inicial é apenas o ponto de partida numérico da conta. Seus lançamentos de transações futuros somarão ou subtrairão a partir deste valor inicial.' },
      { q: 'Como funciona o Banco Padrão?', a: 'Ao definir uma conta como padrão (clicando na estrelinha do card), ela será pré-selecionada automaticamente sempre que você criar uma nova transação.' }
    ]
  },
  {
    number: 2,
    title: '💳 Passo 2: Cartões de Crédito e Limites',
    path: '/cards',
    icon: Wallet,
    description: 'Cadastre os seus cartões de crédito. Informe o limite total do cartão, o dia de fechamento da fatura e o dia de vencimento. O Contaju Pessoal irá controlar os limites disponíveis automaticamente conforme você adicionar novas despesas no cartão ou registrar pagamentos!',
    screenTip: '💡 Clique no botão "+ Novo Cartão" no topo da tela para abrir o modal de cadastro. O guia detalhado de preenchimento de faturas irá aparecer aqui na lateral!',
    highlights: ['Ajuste automático de limites', 'Associação à conta bancária', 'Fechamento vs. Vencimento'],
    modalTriggerText: 'Novo Cartão',
    modalTitle: 'Preenchimento do Cartão de Crédito',
    modalFields: [
      { name: 'Nome do Cartão', desc: 'Apelido para identificar (Ex: "Nubank Ultravioleta", "Itaú Corporativo").' },
      { name: 'Banco Vinculado', desc: 'Associe à conta bancária de onde sai o pagamento da fatura. Importante para a conciliação automática.' },
      { name: 'Bandeira & Últimos 4 Dígitos', desc: 'Para identificação visual rápida na listagem de cartões.' },
      { name: 'Limite Total', desc: 'O limite total liberado pelo banco. O limite disponível será reduzido na hora sempre que você cadastrar despesas no cartão.' },
      { name: 'Dia de Fechamento', desc: 'O dia em que a fatura fecha. Compras feitas após este dia entram apenas na fatura do mês seguinte.' },
      { name: 'Dia de Vencimento', desc: 'O dia limite para pagar o boleto da fatura sem cobrança de juros.' }
    ],
    faq: [
      { q: 'Como funciona o cálculo de limite?', a: 'O limite disponível é calculado dinamicamente: Limite Disponível = Limite Total - Despesas lançadas no cartão que ainda não foram pagas.' },
      { q: 'O que acontece ao pagar a fatura?', a: 'Ao pagar a fatura na tela de cartões, o limite do cartão é restabelecido instantaneamente e o saldo da conta vinculada é reduzido pelo valor da fatura.' },
      { q: 'E as compras parceladas no cartão?', a: 'O sistema lança a parcela respectiva de cada mês na fatura correspondente. O limite é reduzido pelo valor TOTAL da compra e liberado conforme as parcelas são pagas.' }
    ]
  },
  {
    number: 3,
    title: '🏷️ Passo 3: Categorias e Metas Mensais',
    path: '/categories',
    icon: LayoutGrid,
    description: 'Configure as categorias para classificar suas despesas e receitas. Uma das funções mais poderosas aqui é a Meta Mensal: você pode definir um teto de gastos para cada categoria. O sistema avisará se você chegar perto do limite!',
    screenTip: '💡 Clique em "+ Nova Categoria" para criar ou em "Editar" nas categorias existentes para configurar metas de gastos específicas.',
    highlights: ['Metas de gastos individuais', 'Controle visual de progresso', 'Categorias do sistema e personalizadas'],
    modalTriggerText: 'Nova Categoria',
    modalTitle: 'Preenchimento de Categoria',
    modalFields: [
      { name: 'Nome da Categoria', desc: 'Identificador curto (Ex: "Supermercado", "Academia", "Freelance").' },
      { name: 'Tipo de Categoria', desc: 'Defina se é uma despesa (gastos), receita (ganhos) ou ambos (categorias de uso misto, como transferências).' },
      { name: 'Meta Mensal de Gastos', desc: 'O limite orçamentário que você deseja estipular para esta categoria no mês. Opcional (deixe R$ 0,00 se não quiser definir uma meta).' },
      { name: 'Cor & Ícone', desc: 'Escolha uma cor marcante e um ícone para facilitar a visualização nos gráficos de pizza e de colunas.' }
    ],
    faq: [
      { q: 'O que acontece se eu ultrapassar a meta mensal?', a: 'O sistema não bloqueia suas transações, mas a barra de progresso da categoria no Dashboard ficará vermelha e alertas visuais aparecerão.' },
      { q: 'Posso apagar categorias padrões?', a: 'Categorias padrões do sistema não podem ser apagadas para evitar erros de banco, mas você pode desativá-las (desmarcando "Ativa") ou editá-las para que não apareçam nos menus.' }
    ]
  },
  {
    number: 4,
    title: '🔄 Passo 4: Contas Fixas (Despesas Recorrentes)',
    path: '/recurring',
    icon: RefreshCw,
    description: 'Cadastre todas as despesas ou receitas recorrentes, ou seja, aquelas contas que se repetem todo mês (como Aluguel, Energia, Internet, mensalidade escolar ou seu Salário). O sistema projeta esses lançamentos para os meses seguintes, poupando seu trabalho diário!',
    screenTip: '💡 Clique no botão "+ Nova Recorrência" no topo da tela para abrir o modal de configuração de cobranças recorrentes.',
    highlights: ['Projeção automática futura', 'Lançamentos inteligentes', 'Economia de tempo no dia a dia'],
    modalTriggerText: 'Nova Recorrência',
    modalTitle: 'Preenchimento de Lançamento Recorrente',
    modalFields: [
      { name: 'Descrição/Nome', desc: 'Identificador do serviço ou ganho (Ex: "Assinatura Netflix", "Salário Mensal").' },
      { name: 'Valor', desc: 'Custo ou rendimento fixado por período.' },
      { name: 'Categoria', desc: 'Classifique corretamente para alimentar as metas e análises futuras.' },
      { name: 'Dia do Vencimento', desc: 'Dia do mês em que a transação ocorre. O sistema gerará a transação automaticamente no extrato nesse dia.' },
      { name: 'Método de Notificação', desc: 'Escolha "Apenas no Sistema" ou "WhatsApp" se desejar que nosso robô te envie avisos no celular nas datas de vencimento!' }
    ],
    faq: [
      { q: 'Como funciona o alerta de WhatsApp?', a: 'Se o celular estiver configurado no seu Perfil e a Evolution API estiver ativa, você receberá mensagens automáticas no WhatsApp avisando sobre o vencimento das contas.' },
      { q: 'Posso alterar o valor de uma parcela específica?', a: 'Sim! As recorrências projetam transações. Se a conta de luz veio mais cara este mês, basta ir em Transações e editar o valor daquele lançamento específico.' }
    ]
  },
  {
    number: 5,
    title: '💸 Passo 5: Transações do Dia a Dia',
    path: '/transactions',
    icon: ArrowLeftRight,
    description: 'Aqui é o coração do sistema, onde você lança suas despesas e receitas diárias, compras à vista ou parceladas. Quando faz uma compra parcelada, informe o número de parcelas: o aplicativo divide e lança o valor exato em cada mês futuro de forma inteligente!',
    screenTip: '💡 Clique no botão "+ Nova Transação" (ou no botão flutuante no canto da tela) para abrir o modal de registro.',
    highlights: ['Lançamento de parcelados simplificado', 'Filtros rápidos de busca', 'Histórico detalhado por período'],
    modalTriggerText: 'Nova Transação',
    modalTitle: 'Preenchimento de Transação',
    modalFields: [
      { name: 'Tipo (Receita ou Despesa)', desc: 'Escolha se o dinheiro está entrando (verde) ou saindo (vermelho).' },
      { name: 'Valor', desc: 'Importante: para parcelamentos, digite o valor de CADA parcela ou use a caixinha "Valor Total" para o sistema dividir.' },
      { name: 'Descrição', desc: 'Nome amigável da compra (Ex: "Mercado da semana").' },
      { name: 'Data de Competência', desc: 'O dia em que a compra de fato aconteceu.' },
      { name: 'Conta / Banco ou Cartão', desc: 'Selecione "Conta/Banco" se pagou no débito/dinheiro, ou "Cartão de Crédito" para entrar na fatura do cartão.' },
      { name: 'Esta transação é parcelada?', desc: 'Marque e defina a quantidade de parcelas. O sistema criará as parcelas futuras com nomenclatura exata (Ex: "Compra [1/3]").' }
    ],
    faq: [
      { q: 'Qual a diferença entre Competência e Vencimento?', a: 'Competência é quando você realizou o gasto. Vencimento é o prazo limite para pagamento. Em compras no cartão, a competência é a data da compra e o vencimento é o dia de pagamento da fatura.' },
      { q: 'Como lançar transferência entre minhas contas?', a: 'No formulário de Transação, selecione a aba "Transferência". Selecione a conta de origem, a conta de destino e o valor.' }
    ]
  },
  {
    number: 6,
    title: '📊 Passo 6: Análises Gráficas e Insights com IA',
    path: '/ai-insights',
    icon: Sparkles,
    description: 'Parabéns por chegar até aqui! Com tudo cadastrado, acesse a aba de Análise para ver o painel com gráficos consolidados sobre sua saúde financeira. Acompanhe a evolução de gastos por categoria e obtenha insights gerados por inteligência artificial para otimizar suas finanças.',
    screenTip: '💡 Explore os gráficos interativos. Você pode fazer perguntas no chat de inteligência artificial para entender melhor suas finanças.',
    highlights: ['Análise comparativa mensal', 'Gráfico detalhado por categorias', 'Insights automáticos de economia'],
    modalTriggerText: '',
    modalTitle: 'Como Analisar seus Lançamentos',
    modalFields: [
      { name: 'Gráfico de Pizza', desc: 'Mostra a porcentagem de gastos em cada categoria. Ideal para ver para onde vai a maior fatia do seu dinheiro.' },
      { name: 'Metas no Dashboard', desc: 'Termômetro visual de gastos. Evite deixar as barras atingirem a cor vermelha.' },
      { name: 'Chat com IA Inteligente', desc: 'Digite perguntas como "Qual foi minha maior despesa este mês?" ou "Como posso economizar R$ 500?" para que a IA analise seus lançamentos e dê conselhos.' }
    ],
    faq: [
      { q: 'Como a Inteligência Artificial calcula os insights?', a: 'A IA lê os totais de gastos de suas categorias, saldo consolidado e transações do mês e aplica modelos matemáticos financeiros para identificar comportamentos de risco ou oportunidades de poupança.' },
      { q: 'Meus dados são enviados para fora?', a: 'Seus dados financeiros são processados de forma anônima e segura de acordo com os termos de privacidade do sistema, garantindo segurança.' }
    ]
  }
];

function getElementForField(fieldName: string, stepPath: string): HTMLElement | null {
  const nameLower = fieldName.toLowerCase();
  
  if (stepPath === '/banks') {
    if (nameLower.includes('nome') || nameLower.includes('instituição')) {
      const el = document.querySelector('input[placeholder*="Nubank"]') || 
                 document.querySelector('input[placeholder*="Itaú"]') ||
                 document.querySelector('input[placeholder*="Carteira"]');
      if (el) return el as HTMLElement;
    }
    if (nameLower.includes('tipo')) {
      const labels = Array.from(document.querySelectorAll('label'));
      const typeLabel = labels.find(l => l.textContent?.toLowerCase().includes('tipo de conta'));
      if (typeLabel && typeLabel.parentElement) {
        const btn = typeLabel.parentElement.querySelector('button');
        if (btn) return btn;
      }
      const btn = Array.from(document.querySelectorAll('button')).find(b => 
        b.textContent?.includes('Conta Corrente') || 
        b.textContent?.includes('Conta Poupança') || 
        b.textContent?.includes('Investimentos') || 
        b.textContent?.includes('Dinheiro em Espécie')
      );
      if (btn) return btn;
    }
    if (nameLower.includes('saldo')) {
      const labels = Array.from(document.querySelectorAll('label'));
      const saldoLabel = labels.find(l => l.textContent?.toLowerCase().includes('saldo inicial'));
      if (saldoLabel && saldoLabel.parentElement) {
        const input = saldoLabel.parentElement.querySelector('input');
        if (input) return input;
      }
      const el = document.querySelector('input[placeholder*="R$ 0,00"]') || document.querySelector('input[placeholder*="0,00"]');
      if (el) return el as HTMLElement;
    }
    if (nameLower.includes('ignorar') || nameLower.includes('análise')) {
      const checkboxText = Array.from(document.querySelectorAll('span, label, div')).find(el => 
        el.textContent?.toLowerCase().includes('ignorar na análise')
      );
      if (checkboxText) {
        const parent = checkboxText.closest('div.flex') || checkboxText.parentElement;
        if (parent) return parent as HTMLElement;
      }
    }
    if (nameLower.includes('vincular') || nameLower.includes('cartão')) {
      const checkboxText = Array.from(document.querySelectorAll('span, label, div')).find(el => 
        el.textContent?.toLowerCase().includes('deseja cadastrar um cartão')
      );
      if (checkboxText) {
        const parent = checkboxText.closest('div.flex') || checkboxText.parentElement;
        if (parent) return parent as HTMLElement;
      }
    }
  }

  if (stepPath === '/cards') {
    if (nameLower.includes('nome')) {
      const el = document.querySelector('input[placeholder*="Nubank Ultravioleta"]') || 
                 document.querySelector('input[placeholder*="Itaú Visa"]');
      if (el) return el as HTMLElement;
    }
    if (nameLower.includes('banco')) {
      const labels = Array.from(document.querySelectorAll('label'));
      const labelEl = labels.find(l => l.textContent?.toLowerCase().includes('banco vinculado'));
      if (labelEl && labelEl.parentElement) {
        const btn = labelEl.parentElement.querySelector('button');
        if (btn) return btn;
      }
    }
    if (nameLower.includes('bandeira')) {
      const labels = Array.from(document.querySelectorAll('label'));
      const labelEl = labels.find(l => l.textContent?.toLowerCase().includes('bandeira'));
      if (labelEl && labelEl.parentElement) {
        const btn = labelEl.parentElement.querySelector('button');
        if (btn) return btn;
      }
    }
    if (nameLower.includes('limite')) {
      const labels = Array.from(document.querySelectorAll('label'));
      const labelEl = labels.find(l => l.textContent?.toLowerCase().includes('limite total'));
      if (labelEl && labelEl.parentElement) {
        const input = labelEl.parentElement.querySelector('input');
        if (input) return input;
      }
    }
    if (nameLower.includes('fechamento')) {
      const labels = Array.from(document.querySelectorAll('label'));
      const labelEl = labels.find(l => l.textContent?.toLowerCase().includes('fechamento'));
      if (labelEl && labelEl.parentElement) {
        const input = labelEl.parentElement.querySelector('input');
        if (input) return input;
      }
    }
    if (nameLower.includes('vencimento')) {
      const labels = Array.from(document.querySelectorAll('label'));
      const labelEl = labels.find(l => l.textContent?.toLowerCase().includes('vencimento'));
      if (labelEl && labelEl.parentElement) {
        const input = labelEl.parentElement.querySelector('input');
        if (input) return input;
      }
    }
  }

  if (stepPath === '/categories') {
    if (nameLower.includes('nome')) {
      const el = document.querySelector('input[placeholder*="Lazer, Saúde"]') || 
                 document.querySelector('input[placeholder*="Almoço"]');
      if (el) return el as HTMLElement;
    }
    if (nameLower.includes('tipo')) {
      const labels = Array.from(document.querySelectorAll('label'));
      const labelEl = labels.find(l => l.textContent?.toLowerCase().includes('tipo de categoria') || l.textContent?.toLowerCase().includes('tipo'));
      if (labelEl && labelEl.parentElement) {
        const btn = labelEl.parentElement.querySelector('button');
        if (btn) return btn;
      }
    }
    if (nameLower.includes('meta')) {
      const labels = Array.from(document.querySelectorAll('label'));
      const labelEl = labels.find(l => l.textContent?.toLowerCase().includes('meta mensal'));
      if (labelEl && labelEl.parentElement) {
        const input = labelEl.parentElement.querySelector('input');
        if (input) return input;
      }
    }
    if (nameLower.includes('cor') || nameLower.includes('ícone')) {
      const labels = Array.from(document.querySelectorAll('label'));
      const labelEl = labels.find(l => l.textContent?.toLowerCase().includes('cor') || l.textContent?.toLowerCase().includes('ícone'));
      if (labelEl && labelEl.parentElement) {
        return labelEl.parentElement;
      }
    }
  }

  if (stepPath === '/recurring') {
    if (nameLower.includes('descrição') || nameLower.includes('nome')) {
      const el = document.querySelector('input[placeholder*="Assinatura Netflix"]') || 
                 document.querySelector('input[placeholder*="Salário Mensal"]');
      if (el) return el as HTMLElement;
    }
    if (nameLower.includes('valor')) {
      const labels = Array.from(document.querySelectorAll('label'));
      const labelEl = labels.find(l => l.textContent?.toLowerCase().includes('valor'));
      if (labelEl && labelEl.parentElement) {
        const input = labelEl.parentElement.querySelector('input');
        if (input) return input;
      }
    }
    if (nameLower.includes('categoria')) {
      const labels = Array.from(document.querySelectorAll('label'));
      const labelEl = labels.find(l => l.textContent?.toLowerCase() === 'categoria');
      if (labelEl && labelEl.parentElement) {
        const btn = labelEl.parentElement.querySelector('button');
        if (btn) return btn;
      }
    }
    if (nameLower.includes('vencimento') || nameLower.includes('dia')) {
      const labels = Array.from(document.querySelectorAll('label'));
      const labelEl = labels.find(l => l.textContent?.toLowerCase().includes('vencimento') || l.textContent?.toLowerCase().includes('dia'));
      if (labelEl && labelEl.parentElement) {
        const input = labelEl.parentElement.querySelector('input');
        if (input) return input;
      }
    }
    if (nameLower.includes('notificação') || nameLower.includes('método')) {
      const labels = Array.from(document.querySelectorAll('label'));
      const labelEl = labels.find(l => l.textContent?.toLowerCase().includes('notificação') || l.textContent?.toLowerCase().includes('aviso'));
      if (labelEl && labelEl.parentElement) {
        const btn = labelEl.parentElement.querySelector('button');
        if (btn) return btn;
      }
    }
  }

  if (stepPath === '/transactions') {
    if (nameLower.includes('tipo')) {
      const el = document.querySelector('.grid-cols-2') || 
                 Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Receita') || b.textContent?.includes('Despesa'));
      if (el) return el as HTMLElement;
    }
    if (nameLower.includes('valor')) {
      const labels = Array.from(document.querySelectorAll('label'));
      const labelEl = labels.find(l => l.textContent?.toLowerCase() === 'valor');
      if (labelEl && labelEl.parentElement) {
        const input = labelEl.parentElement.querySelector('input');
        if (input) return input;
      }
    }
    if (nameLower.includes('descrição')) {
      const el = document.querySelector('input[placeholder*="Supermercado"]') || 
                 document.querySelector('input[placeholder*="Aluguel"]');
      if (el) return el as HTMLElement;
    }
    if (nameLower.includes('competência') || nameLower.includes('data')) {
      const labels = Array.from(document.querySelectorAll('label'));
      const labelEl = labels.find(l => l.textContent?.toLowerCase().includes('data'));
      if (labelEl && labelEl.parentElement) {
        const input = labelEl.parentElement.querySelector('input');
        if (input) return input;
      }
    }
    if (nameLower.includes('conta') || nameLower.includes('banco') || nameLower.includes('cartão')) {
      const labels = Array.from(document.querySelectorAll('label'));
      const labelEl = labels.find(l => l.textContent?.toLowerCase().includes('conta') || l.textContent?.toLowerCase().includes('banco') || l.textContent?.toLowerCase().includes('cartão'));
      if (labelEl && labelEl.parentElement) {
        const btn = labelEl.parentElement.querySelector('button');
        if (btn) return btn;
      }
    }
    if (nameLower.includes('parcela')) {
      const checkboxText = Array.from(document.querySelectorAll('span, label, div')).find(el => 
        el.textContent?.toLowerCase().includes('parcelada')
      );
      if (checkboxText) {
        const parent = checkboxText.closest('div.flex') || checkboxText.parentElement;
        if (parent) return parent as HTMLElement;
      }
    }
  }

  const labels = Array.from(document.querySelectorAll('label'));
  for (const label of labels) {
    const text = label.textContent?.toLowerCase() || '';
    if (text.includes(nameLower) || nameLower.includes(text)) {
      const parent = label.parentElement;
      if (parent) {
        const input = parent.querySelector('input, select, button, textarea');
        if (input) return input as HTMLElement;
      }
    }
  }

  const placeholderInput = Array.from(document.querySelectorAll('input')).find(input => 
    input.placeholder?.toLowerCase().includes(nameLower)
  );
  if (placeholderInput) return placeholderInput as HTMLElement;

  return null;
}

export function OnboardingTour() {
  const navigate = useNavigate();
  const location = useLocation();
  const { onboardingCompleted, completeOnboarding, theme } = useAppContext();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [minimized, setMinimized] = useState(false);
  
  // State to track if form modal is open in the active view
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  
  // State for FAQ expanded indices
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);

  // Custom confirmation modal state
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  // Focus and highlight states
  const [activeFieldIdx, setActiveFieldIdx] = useState<number>(0);
  const [highlightRect, setHighlightRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const currentStep = TOUR_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;
  const isFirstStep = currentStepIndex === 0;
  const isCurrentRouteCorrect = location.pathname === currentStep.path;

  // DOM check to auto-detect if the specific form modal is open
  useEffect(() => {
    if (onboardingCompleted) return;

    const checkModalInDOM = () => {
      let isOpen = false;
      const path = currentStep.path;
      
      if (path === '/banks') {
        isOpen = !!document.querySelector('input[placeholder*="Nubank, Itaú"]');
      } else if (path === '/cards') {
        isOpen = !!document.querySelector('input[placeholder*="Nubank Ultravioleta"]');
      } else if (path === '/categories') {
        isOpen = !!document.querySelector('input[placeholder*="Lazer, Saúde, Almoço"]');
      } else if (path === '/recurring') {
        isOpen = !!document.querySelector('input[placeholder*="Assinatura Netflix"]');
      } else if (path === '/transactions') {
        isOpen = !!document.querySelector('input[placeholder*="Supermercado, Aluguel"]');
      }
      
      setIsFormModalOpen(isOpen);
    };

    checkModalInDOM();
    const interval = setInterval(checkModalInDOM, 500);
    return () => clearInterval(interval);
  }, [currentStep.path, onboardingCompleted]);

  // Reset FAQ and active field states on step changes
  useEffect(() => {
    setExpandedFaqIndex(null);
    setActiveFieldIdx(0);
    setHighlightRect(null);
  }, [currentStepIndex]);

  // Reset active field state when modal opens/closes
  useEffect(() => {
    if (!isFormModalOpen) {
      setActiveFieldIdx(0);
      setHighlightRect(null);
    }
  }, [isFormModalOpen]);

  // Polling to calculate current highlight rectangle position
  useEffect(() => {
    if (!isFormModalOpen) {
      setHighlightRect(null);
      return;
    }

    const updateHighlightRect = () => {
      const field = currentStep.modalFields[activeFieldIdx];
      if (!field) {
        setHighlightRect(null);
        return;
      }

      const el = getElementForField(field.name, currentStep.path);
      if (el) {
        const rect = el.getBoundingClientRect();
        setHighlightRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        });
      } else {
        setHighlightRect(null);
      }
    };

    updateHighlightRect();
    const interval = setInterval(updateHighlightRect, 300);
    window.addEventListener('resize', updateHighlightRect);
    window.addEventListener('scroll', updateHighlightRect, true);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updateHighlightRect);
      window.removeEventListener('scroll', updateHighlightRect, true);
    };
  }, [isFormModalOpen, activeFieldIdx, currentStepIndex]);

  // If onboarding is completed, do not render anything

  if (onboardingCompleted || !mounted) return null;

  const handleNext = () => {
    if (isLastStep) {
      completeOnboarding();
    } else {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      navigate(TOUR_STEPS[nextIndex].path);
      setMinimized(false);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      navigate(TOUR_STEPS[prevIndex].path);
      setMinimized(false);
    }
  };

  const handleGoToRoute = () => {
    navigate(currentStep.path);
  };

  const triggerClick = () => {
    const triggerText = currentStep.modalTriggerText;
    if (!triggerText) return;

    const btn = Array.from(document.querySelectorAll('button')).find(
      el => el.textContent?.includes(triggerText)
    );
    
    if (btn) {
      btn.click();
    } else {
      // Fallback: try finding mobile button or button by title attributes
      const fallbackBtn = document.querySelector(`[title*="${triggerText}"]`) || 
                          document.querySelector(`[aria-label*="${triggerText}"]`);
      if (fallbackBtn) {
        (fallbackBtn as HTMLElement).click();
      }
    }
  };

  // Triggers navigation if needed and then clicks the open modal button programmatically
  const handleShowHowToFill = () => {
    if (!isCurrentRouteCorrect) {
      navigate(currentStep.path);
      // Wait for route render, then click
      setTimeout(() => {
        triggerClick();
      }, 400);
    } else {
      triggerClick();
    }
  };

  const StepIcon = currentStep.icon;

  // Render Sidebar Layout if Modal is Open
  const renderSidebarLayout = () => {
    return (
      <motion.div
        initial={{ x: 250, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 250, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 120 }}
        className="fixed top-20 right-4 lg:right-6 bottom-24 md:bottom-6 w-80 lg:w-96 bg-card/95 border border-border/80 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[10001] flex flex-col backdrop-blur-lg overflow-hidden max-h-[85vh] animate-in slide-in-from-right-5 duration-300"
      >
        {/* Top Header */}
        <div className="px-6 py-4 bg-muted/30 border-b border-border/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
              Guia do Formulário
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setMinimized(true)}
              className="text-[10px] text-muted-foreground hover:text-foreground font-black uppercase tracking-wider cursor-pointer"
            >
              Minimizar
            </button>
            <button 
              onClick={() => setShowSkipConfirm(true)}
              className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-red-400 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground tracking-tight uppercase">
                {currentStep.modalTitle}
              </h3>
              <p className="text-[10px] text-muted-foreground">Instruções de preenchimento campo a campo</p>
            </div>
          </div>

          {/* Form Fields explanations */}
          <div className="space-y-3">
            {currentStep.modalFields.map((field, idx) => {
              const isActive = idx === activeFieldIdx;
              return (
                <div 
                  key={idx} 
                  onClick={() => setActiveFieldIdx(idx)}
                  className={`p-3.5 border rounded-xl space-y-1 hover:border-primary/40 transition-all cursor-pointer select-none ${
                    isActive
                      ? 'border-primary bg-primary/5 shadow-md shadow-primary/5 ring-1 ring-primary/25'
                      : 'bg-muted/10 border-border/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase tracking-wider block ${
                      isActive ? 'text-primary' : 'text-muted-foreground/80'
                    }`}>
                      • {field.name}
                    </span>
                    {isActive && (
                      <span className="text-[8px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                        Focado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-foreground/90 font-medium leading-relaxed">
                    {field.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* FAQ Accordion in Sidebar */}
          <div className="pt-4 border-t border-border/40 space-y-3">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Dúvidas Frequentes (FAQ)
            </h4>
            
            <div className="space-y-2">
              {currentStep.faq.map((item, idx) => (
                <div key={idx} className="border border-border/60 rounded-xl overflow-hidden bg-muted/10">
                  <button
                    onClick={() => setExpandedFaqIndex(expandedFaqIndex === idx ? null : idx)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-semibold text-foreground hover:bg-muted/30 transition-all cursor-pointer"
                  >
                    <span>{item.q}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ml-2 ${
                      expandedFaqIndex === idx ? 'transform rotate-180' : ''
                    }`} />
                  </button>
                  
                  <AnimatePresence initial={false}>
                    {expandedFaqIndex === idx && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="px-4 pb-3 pt-1 text-[11px] text-muted-foreground leading-relaxed border-t border-border/20 bg-muted/5 font-medium"
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

        {/* Footer controls in Sidebar */}
        <div className="px-6 py-4 bg-muted/30 border-t border-border/40 flex flex-col gap-3 shrink-0">
          {/* Form field navigation */}
          <div className="flex items-center justify-between border-b border-border/30 pb-2.5">
            <button
              onClick={() => setActiveFieldIdx(prev => Math.max(0, prev - 1))}
              disabled={activeFieldIdx === 0}
              className={`flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider transition-colors ${
                activeFieldIdx === 0 ? 'text-muted-foreground/30 pointer-events-none' : 'text-primary hover:text-primary/80'
              }`}
            >
              ‹ Campo Anterior
            </button>
            <span className="text-[10px] font-bold text-muted-foreground">
              Campo {activeFieldIdx + 1} de {currentStep.modalFields.length}
            </span>
            <button
              onClick={() => setActiveFieldIdx(prev => Math.min(currentStep.modalFields.length - 1, prev + 1))}
              disabled={activeFieldIdx === currentStep.modalFields.length - 1}
              className={`flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider transition-colors ${
                activeFieldIdx === currentStep.modalFields.length - 1 ? 'text-muted-foreground/30 pointer-events-none' : 'text-primary hover:text-primary/80'
              }`}
            >
              Próximo Campo ›
            </button>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              disabled={isFirstStep}
              className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${
                isFirstStep ? 'text-muted-foreground/30 pointer-events-none' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Voltar
            </button>
            
            <button
              onClick={handleNext}
              className="px-4 py-2.5 bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-wider rounded-lg transition-all shadow-md hover:scale-[1.01] active:scale-[0.99] flex items-center gap-1 cursor-pointer"
            >
              {isLastStep ? 'Concluir!' : 'Avançar'}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  return createPortal(
    <AnimatePresence>
      {/* 1. Custom Skip Confirmation Modal */}
      {showSkipConfirm && (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowSkipConfirm(false)}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-sm bg-card border border-border/80 rounded-[2rem] shadow-2xl p-6 z-10 space-y-6 text-center"
          >
            <div className="w-12 h-12 bg-amber-400/20 text-amber-400 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <AlertTriangle className="w-6 h-6" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-foreground">Deseja pular o guia?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                Você pode reativar este guia interativo a qualquer momento através da **Central de Dúvidas (FAQ)** ou nas configurações do seu **Perfil**.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowSkipConfirm(false)}
                className="py-3 border border-border rounded-xl text-xs font-black text-muted-foreground hover:bg-muted/50 transition-all cursor-pointer"
              >
                Continuar Guia
              </button>
              <button
                onClick={() => {
                  setShowSkipConfirm(false);
                  completeOnboarding();
                }}
                className="py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md"
              >
                Sim, Pular
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 2. Main Onboarding Render (either sidebar or central) */}
      {!minimized ? (
        isFormModalOpen ? (
          /* Render lateral tour alongside open form modal */
          renderSidebarLayout()
        ) : (
          /* Render central tour welcome modal */
          <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
            {/* Backdrop Blur overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/70 backdrop-blur-md"
              onClick={() => setMinimized(true)}
            />

            {/* Modal Container */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative w-full max-w-2xl bg-card border border-border/80 rounded-[2.5rem] shadow-[0_25px_70px_rgba(0,0,0,0.6)] overflow-hidden z-10 flex flex-col max-h-[90vh]"
            >
              {/* Ambient glows */}
              <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

              {/* Modal Header */}
              <div className="flex items-center justify-between px-8 py-5 border-b border-border/40 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                    Guia de Início
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground">
                    Passo {currentStep.number} de {TOUR_STEPS.length}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setMinimized(true)}
                    className="text-xs text-muted-foreground hover:text-foreground font-black uppercase tracking-wider cursor-pointer"
                    title="Minimizar guia"
                  >
                    Minimizar
                  </button>
                  <button
                    onClick={() => setShowSkipConfirm(true)}
                    className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Progress Bar Indicators */}
              <div className="grid grid-cols-6 gap-1 px-8 py-2.5 bg-muted/20 border-b border-border/20 shrink-0">
                {TOUR_STEPS.map((s, idx) => (
                  <div 
                    key={s.number} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentStepIndex 
                        ? 'bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]' 
                        : idx < currentStepIndex 
                          ? 'bg-primary/50' 
                          : 'bg-muted-foreground/20'
                    }`}
                  />
                ))}
              </div>

              {/* Modal Content Scroll Area */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0 shadow-sm">
                    <StepIcon className="w-7 h-7" />
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-xl md:text-2xl font-black font-display text-foreground tracking-tight italic">
                      {currentStep.title}
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                      {currentStep.description}
                    </p>
                  </div>
                </div>

                {/* Highlights tags */}
                <div className="flex flex-wrap items-center gap-2">
                  {currentStep.highlights.map(tag => (
                    <span key={tag} className="text-[10px] bg-muted/40 border border-border/60 text-foreground/80 px-3 py-1 rounded-lg font-bold">
                      ✓ {tag}
                    </span>
                  ))}
                </div>

                {/* Action and Contextual Screen Tip */}
                <div className="p-5 rounded-2xl border border-border bg-muted/10 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-[10px] uppercase font-black tracking-widest text-primary">Status da Página</h4>
                      <p className="text-xs font-semibold">
                        {isCurrentRouteCorrect 
                          ? '🟢 Você já está na página correta do passo!' 
                          : '🔴 Você está navegando em outra página.'}
                      </p>
                    </div>
                    {!isCurrentRouteCorrect && (
                      <button
                        onClick={handleGoToRoute}
                        className="px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Ir para a tela
                      </button>
                    )}
                  </div>

                  {isCurrentRouteCorrect && currentStep.modalTriggerText && (
                    <div className="pt-3 border-t border-border/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <p className="text-xs text-foreground/90 font-medium leading-relaxed italic max-w-md">
                        {currentStep.screenTip}
                      </p>
                      <button
                        type="button"
                        onClick={handleShowHowToFill}
                        className="px-4 py-3 bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider rounded-xl hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shrink-0"
                      >
                        {currentStep.number === 4 || currentStep.number === 5 ? '🚀 Ver como fazer lançamentos' : '🚀 Ver como preencher'}
                      </button>
                    </div>
                  )}
                  
                  {isCurrentRouteCorrect && !currentStep.modalTriggerText && (
                    <div className="pt-3 border-t border-border/40">
                      <p className="text-xs text-foreground/90 font-medium leading-relaxed italic">
                        {currentStep.screenTip}
                      </p>
                    </div>
                  )}
                </div>

                {/* Central FAQ Accordion */}
                <div className="pt-4 border-t border-border/40 space-y-3">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-2 uppercase tracking-wide">
                    <BookOpen className="w-4 h-4 text-primary" />
                    Dúvidas Frequentes desta Etapa
                  </h4>
                  
                  <div className="space-y-2.5">
                    {currentStep.faq.map((item, idx) => (
                      <div key={idx} className="border border-border/60 rounded-xl overflow-hidden bg-muted/10 hover:border-border/90 transition-all">
                        <button
                          onClick={() => setExpandedFaqIndex(expandedFaqIndex === idx ? null : idx)}
                          className="w-full px-5 py-3.5 flex items-center justify-between text-left text-xs font-semibold text-foreground hover:bg-muted/30 transition-all cursor-pointer"
                        >
                          <span>{item.q}</span>
                          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ml-2 ${
                            expandedFaqIndex === idx ? 'transform rotate-180' : ''
                          }`} />
                        </button>
                        
                        <AnimatePresence initial={false}>
                          {expandedFaqIndex === idx && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="px-5 pb-4 pt-1.5 text-xs text-muted-foreground leading-relaxed border-t border-border/10 bg-muted/5 font-medium"
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

              {/* Modal Footer Controls */}
              <div className="px-8 py-5 border-t border-border/40 bg-muted/10 flex items-center justify-between shrink-0">
                <button
                  onClick={handleBack}
                  disabled={isFirstStep}
                  className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    isFirstStep 
                      ? 'text-muted-foreground/30 pointer-events-none' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Voltar
                </button>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowSkipConfirm(true)}
                    className="px-4 py-3 text-xs font-black text-muted-foreground hover:text-foreground uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Pular Guia
                  </button>
                  <button
                    onClick={handleNext}
                    className="px-6 py-3.5 bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-primary/10 hover:scale-[1.01] active:scale-[0.99] flex items-center gap-2 cursor-pointer"
                  >
                    {isLastStep ? 'Concluir Guia!' : 'Avançar Passo'}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )
      ) : (
        /* Floating Minimized Widget to restore the tour */
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 100, opacity: 0 }}
          className="fixed bottom-20 right-6 md:bottom-6 md:right-6 z-[10000]"
        >
          <button
            onClick={() => setMinimized(false)}
            className="flex items-center gap-3 px-5 py-4 bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider rounded-full shadow-[0_10px_25px_rgba(var(--primary-rgb),0.3)] hover:scale-105 transition-all cursor-pointer group animate-bounce"
          >
            <HelpCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>Guia de Onboarding ({currentStep.number}/6)</span>
          </button>
        </motion.div>
      )}

      {/* Retângulo de destaque visual sobre o formulário ativo */}
      <AnimatePresence>
        {isFormModalOpen && highlightRect && (
          <motion.div
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              top: highlightRect.top - 6,
              left: highlightRect.left - 6,
              width: highlightRect.width + 12,
              height: highlightRect.height + 12,
              pointerEvents: 'none',
              zIndex: 10000,
              borderRadius: '12px',
              border: '3px solid #E7B63F', // Dourado premium
              boxShadow: '0 0 25px rgba(231, 182, 63, 0.7), inset 0 0 12px rgba(231, 182, 63, 0.4)',
            }}
            className="animate-pulse"
          />
        )}
      </AnimatePresence>
    </AnimatePresence>,
    document.body
  );
}
