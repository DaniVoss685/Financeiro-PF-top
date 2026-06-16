import React, { useState } from 'react';
import { useAppContext, Category } from '../store/AppContext';
import { PremiumCard } from '../components/ui/PremiumComponents';
import { Modal } from '../components/ui/Modal';
import { PremiumCurrencyInput } from '../components/ui/PremiumInputs';
import { formatCurrency, cn } from '../lib/utils';
import { CategoryIcon, ICON_MAP } from '../components/CategoryIcon';
import { 
  Plus, 
  Settings, 
  TrendingUp, 
  TrendingDown, 
  Target,
  HelpCircle,
  Search,
  Check,
} from 'lucide-react';

export default function CategoriesPage() {
  const { categories, transactions, addCategory, updateCategory } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    color: '#BCF24B',
    icon: 'utensils',
    monthlyGoal: '',
    excludeFromAnalysis: false
  });

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const expenseCategories = filteredCategories.filter(c => c.type === 'EXPENSE' || c.type === 'BOTH');
  const incomeCategories = filteredCategories.filter(c => c.type === 'INCOME' || c.type === 'BOTH');

  const handleAddCategory = () => {
    if (!newCategory.name) return;
    
    if (editingCategoryId) {
      updateCategory(editingCategoryId, {
        name: newCategory.name,
        type: newCategory.type as 'INCOME' | 'EXPENSE' | 'BOTH',
        color: newCategory.color,
        icon: newCategory.icon,
        monthlyGoal: newCategory.monthlyGoal ? parseFloat(newCategory.monthlyGoal as string) : undefined,
        excludeFromAnalysis: newCategory.excludeFromAnalysis
      });
    } else {
      addCategory({
        name: newCategory.name,
        type: newCategory.type as 'INCOME' | 'EXPENSE' | 'BOTH',
        color: newCategory.color,
        icon: newCategory.icon,
        monthlyGoal: newCategory.monthlyGoal ? parseFloat(newCategory.monthlyGoal as string) : undefined,
        excludeFromAnalysis: newCategory.excludeFromAnalysis
      });
    }
    
    setIsModalOpen(false);
    setEditingCategoryId(null);
    setShowSuccess(true);
    setNewCategory({
      name: '',
      type: 'EXPENSE',
      color: '#BCF24B',
      icon: 'utensils',
      monthlyGoal: '',
      excludeFromAnalysis: false
    });
  };

  const colors = [
    '#BCF24B', '#FFD700', '#FF6B6B', '#4DABF7', '#51CF66', '#FAB005', '#7950F2', '#BE4BDB',
    '#004A80', '#0284C7', '#0EA5E9', '#06B6D4', '#22C55E', '#10B981', '#F59E0B', '#F97316',
    '#EF4444', '#EC4899', '#D32F2F', '#7C3AED', '#EAB308', '#84CC16', '#EC7000', '#8A05BE'
  ];

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto pb-24 md:pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-display italic">Categorias e metas</h1>
          <p className="text-muted-foreground mt-1">Organize seus gastos e defina limites mensais</p>
        </div>
        <button 
          onClick={() => {
            setEditingCategoryId(null);
            setNewCategory({ name: '', type: 'EXPENSE', color: '#BCF24B', icon: 'utensils', monthlyGoal: '', excludeFromAnalysis: false });
            setIsModalOpen(true);
          }}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all flex items-center gap-2 italic"
        >
          <Plus className="w-5 h-5" /> Nova Categoria
        </button>
      </header>

      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <input 
          type="text" 
          placeholder="Filtrar categorias..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-card/40 border border-border/50 rounded-2xl py-4 pl-12 pr-6 text-sm focus:outline-none focus:border-primary/50 transition-all text-foreground placeholder:text-muted-foreground/50"
        />
      </div>

      <div className="space-y-12">
        {/* Seção de Despesas */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-rose-450 flex items-center gap-2 border-b border-border/40 pb-2">
            <TrendingDown className="w-5 h-5 text-rose-400" /> Categorias de Despesas
          </h2>
          {expenseCategories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhuma categoria de despesa encontrada.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {expenseCategories.map(cat => {
                const catTransactions = transactions.filter(t => t.categoryId === cat.id && t.type === 'EXPENSE');
                const spent = catTransactions.reduce((acc, t) => acc + t.amount, 0);
                
                let pct = 0;
                if (cat.monthlyGoal) {
                  pct = (spent / cat.monthlyGoal) * 100;
                }

                return (
                  <PremiumCard key={cat.id} className="p-6 flex flex-col border border-border/50 hover:border-primary/30 transition-all duration-300 group hover:shadow-xl hover:shadow-primary/5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                        <CategoryIcon icon={cat.icon} color={cat.color} />
                        <div>
                          <h3 className="font-bold text-lg leading-tight text-foreground group-hover:text-primary transition-colors">{cat.name}</h3>
                          <div className="flex items-center gap-1.5">
                            <TrendingDown className="w-3 h-3 text-rose-400" />
                            <p className="text-[10px] text-muted-foreground font-bold">Despesa</p>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setEditingCategoryId(cat.id);
                          setNewCategory({
                            name: cat.name,
                            type: cat.type === 'BOTH' ? 'EXPENSE' : cat.type,
                            color: cat.color,
                            icon: cat.icon,
                            monthlyGoal: cat.monthlyGoal ? cat.monthlyGoal.toString() : '',
                            excludeFromAnalysis: !!cat.excludeFromAnalysis
                          });
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-muted-foreground hover:text-primary opacity-60 lg:opacity-0 lg:group-hover:opacity-100 transition-all hover:bg-primary/10 rounded-lg"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>

                    {!cat.icon && (
                      <div className="mb-4 p-2 bg-primary/5 rounded-lg border border-primary/10 text-[10px] text-primary font-medium flex items-center gap-2 animate-pulse">
                        <HelpCircle className="w-3 h-3" />
                        <span>Sugestão: Clique no "+" acima para escolher um ícone</span>
                      </div>
                    )}

                    {cat.monthlyGoal ? (
                      <div className="mt-auto pt-4 space-y-3">
                        <div 
                          onClick={() => {
                            setEditingCategoryId(cat.id);
                            setNewCategory({
                              name: cat.name,
                              type: cat.type === 'BOTH' ? 'EXPENSE' : cat.type,
                              color: cat.color,
                              icon: cat.icon,
                              monthlyGoal: cat.monthlyGoal ? cat.monthlyGoal.toString() : '',
                              excludeFromAnalysis: !!cat.excludeFromAnalysis
                            });
                            setIsModalOpen(true);
                          }}
                          className="flex justify-between text-xs items-end cursor-pointer group/goal hover:text-primary transition-all"
                        >
                          <span className="text-muted-foreground font-bold group-hover/goal:text-primary">Teto Mensal</span>
                          <div className="text-right">
                            <span className="font-display font-black text-foreground group-hover/goal:text-primary">{formatCurrency(spent)}</span>
                            <span className="text-muted-foreground mx-1 text-[10px]">/</span>
                            <span className="text-muted-foreground text-xs group-hover/goal:text-primary">{formatCurrency(cat.monthlyGoal)}</span>
                          </div>
                        </div>
                        <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden border border-foreground/5">
                          <div 
                            className={cn("h-full rounded-full transition-all duration-500", pct > 90 ? "bg-red-400" : pct > 70 ? "bg-yellow-400" : "bg-primary")} 
                            style={{ width: `${Math.min(pct, 100)}%` }} 
                          />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={cn(
                            "text-[10px] font-bold",
                            pct > 100 ? "text-red-400" : pct > 90 ? "text-yellow-400" : "text-muted-foreground"
                          )}>
                            {pct > 100 ? `${Math.round(pct - 100)}% Acima do Limite` : `${Math.round(pct)}% Utilizado`}
                          </span>
                          {pct > 90 && <p className="text-[9px] text-red-400 font-black animate-bounce">Aviso de limite</p>}
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => {
                          setEditingCategoryId(cat.id);
                          setNewCategory({
                            name: cat.name,
                            type: cat.type === 'BOTH' ? 'EXPENSE' : cat.type,
                            color: cat.color,
                            icon: cat.icon,
                            monthlyGoal: '',
                            excludeFromAnalysis: !!cat.excludeFromAnalysis
                          });
                          setIsModalOpen(true);
                        }}
                        className="mt-auto pt-4 flex items-center gap-2 text-[10px] font-bold text-muted-foreground cursor-pointer hover:text-primary transition-all group/btn"
                      >
                        <Target className="w-3 h-3 group-hover/btn:scale-110 transition-transform" /> 
                        <span>Definir meta mensal</span>
                      </div>
                    )}
                  </PremiumCard>
                );
              })}
            </div>
          )}
        </div>

        {/* Seção de Receitas */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-emerald-450 flex items-center gap-2 border-b border-border/40 pb-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" /> Categorias de Receitas
          </h2>
          {incomeCategories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhuma categoria de receita encontrada.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {incomeCategories.map(cat => {
                return (
                  <PremiumCard key={cat.id} className="p-6 flex flex-col border border-border/50 hover:border-primary/30 transition-all duration-300 group hover:shadow-xl hover:shadow-primary/5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                        <CategoryIcon icon={cat.icon} color={cat.color} />
                        <div>
                          <h3 className="font-bold text-lg leading-tight text-foreground group-hover:text-primary transition-colors">{cat.name}</h3>
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-3 h-3 text-emerald-400" />
                            <p className="text-[10px] text-muted-foreground font-bold">Receita</p>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setEditingCategoryId(cat.id);
                          setNewCategory({
                            name: cat.name,
                            type: cat.type === 'BOTH' ? 'EXPENSE' : cat.type,
                            color: cat.color,
                            icon: cat.icon,
                            monthlyGoal: cat.monthlyGoal ? cat.monthlyGoal.toString() : '',
                            excludeFromAnalysis: !!cat.excludeFromAnalysis
                          });
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-muted-foreground hover:text-primary opacity-60 lg:opacity-0 lg:group-hover:opacity-100 transition-all hover:bg-primary/10 rounded-lg"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>

                    {!cat.icon && (
                      <div className="mb-4 p-2 bg-primary/5 rounded-lg border border-primary/10 text-[10px] text-primary font-medium flex items-center gap-2 animate-pulse">
                        <HelpCircle className="w-3 h-3" />
                        <span>Sugestão: Clique no "+" acima para escolher um ícone</span>
                      </div>
                    )}
                  </PremiumCard>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {filteredCategories.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mb-4">
             <HelpCircle className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Nenhuma categoria encontrada</h3>
          <p className="text-sm text-muted-foreground max-w-xs mt-1">
            Não encontramos nenhuma categoria correspondente à sua busca.
          </p>
        </div>
      )}

      {/* New Category Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingCategoryId ? "Editar Categoria" : "Nova Categoria"}
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground ml-1">Nome da Categoria</label>
            <input 
              type="text" 
              placeholder="Ex: Lazer, Saúde, Almoço..." 
              value={newCategory.name}
              onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
              className="w-full bg-muted/20 border border-border/50 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-primary/50 transition-all text-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground ml-1">Tipo</label>
              <div className="flex gap-2">
                {['EXPENSE', 'INCOME'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setNewCategory({...newCategory, type: type as any})}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-xs font-bold tracking-tighter transition-all italic border",
                      newCategory.type === type 
                        ? "bg-primary border-primary text-primary-foreground" 
                        : "bg-muted/20 border-border/50 text-muted-foreground hover:bg-muted/30"
                    )}
                  >
                    {type === 'EXPENSE' ? 'Despesa' : 'Receita'}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2 flex flex-col justify-end">
              <div 
                className="flex items-center gap-2.5 p-3 bg-muted/20 border border-border/50 rounded-2xl hover:bg-muted/30 transition-all cursor-pointer select-none" 
                onClick={() => setNewCategory({...newCategory, excludeFromAnalysis: !newCategory.excludeFromAnalysis})}
              >
                <input 
                  type="checkbox"
                  checked={newCategory.excludeFromAnalysis}
                  onChange={() => {}} // Controlled by div click
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary bg-card"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-foreground leading-tight">Ignorar na Análise</span>
                  <span className="text-[8px] text-muted-foreground leading-tight">Exclui lançamentos desta categoria</span>
                </div>
              </div>
            </div>
          </div>

          {newCategory.type === 'EXPENSE' && (
            <PremiumCurrencyInput
              label="Meta Mensal (Teto de Gastos)"
              placeholder="Ex: 500,00 (Deixe em R$ 0,00 ou limpe para remover)"
              value={newCategory.monthlyGoal ? parseFloat(newCategory.monthlyGoal) : 0}
              onChange={(val) => setNewCategory({ ...newCategory, monthlyGoal: val > 0 ? val.toString() : '' })}
            />
          )}

          {/* Sugestões Rápidas */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground ml-1">Sugestões Rápidas (Nome, Ícone e Cor)</label>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
              {newCategory.type === 'EXPENSE' ? (
                <>
                  {[
                    { name: 'Alimentação', icon: 'utensils', color: '#FF6B6B', label: '🍔 Alimentação' },
                    { name: 'Transporte', icon: 'car', color: '#4DABF7', label: '🚗 Transporte' },
                    { name: 'Moradia', icon: 'home', color: '#FD7E14', label: '🏠 Moradia' },
                    { name: 'Lazer', icon: 'game', color: '#FAB005', label: '🎮 Lazer' },
                    { name: 'Saúde', icon: 'heart', color: '#FF8787', label: '🏥 Saúde' },
                    { name: 'Viagem', icon: 'plane', color: '#15AABF', label: '✈️ Viagem' },
                    { name: 'Contas/Luz', icon: 'zap', color: '#BE4BDB', label: '🔌 Contas' },
                    { name: 'Academia', icon: 'fitness', color: '#BCF24B', label: '💪 Academia' },
                    { name: 'Pets', icon: 'pet', color: '#7950F2', label: '🐶 Pets' },
                    { name: 'Assinaturas', icon: 'streaming', color: '#FF922B', label: '📺 Assinaturas' },
                    { name: 'Educação', icon: 'education', color: '#0EA5E9', label: '🎓 Educação' },
                    { name: 'Compras', icon: 'shopping', color: '#EC4899', label: '🛍️ Compras' },
                  ].map(sug => (
                    <button
                      key={sug.name}
                      type="button"
                      onClick={() => {
                        setNewCategory({
                          ...newCategory,
                          name: sug.name,
                          icon: sug.icon,
                          color: sug.color
                        });
                      }}
                      className="text-[10px] font-semibold bg-muted/40 hover:bg-muted/70 border border-border/50 text-foreground px-2 py-1 rounded-lg transition-all"
                    >
                      {sug.label}
                    </button>
                  ))}
                </>
              ) : (
                <>
                  {[
                    { name: 'Salário', icon: 'dollar', color: '#51CF66', label: '💵 Salário' },
                    { name: 'Investimentos', icon: 'savings', color: '#12B886', label: '📈 Investimentos' },
                    { name: 'Freelance', icon: 'briefcase', color: '#228BE6', label: '🤝 Freelance' },
                    { name: 'Presentes', icon: 'gift', color: '#FCC419', label: '🎁 Presentes' },
                    { name: 'Reembolso', icon: 'plus-circle', color: '#7950F2', label: '➕ Reembolso' },
                    { name: 'Vendas', icon: 'hand-coins', color: '#FAB005', label: '🛍️ Vendas' },
                    { name: 'Outros', icon: 'plus-circle', color: '#BCF24B', label: '💵 Outros' },
                  ].map(sug => (
                    <button
                      key={sug.name}
                      type="button"
                      onClick={() => {
                        setNewCategory({
                          ...newCategory,
                          name: sug.name,
                          icon: sug.icon,
                          color: sug.color
                        });
                      }}
                      className="text-[10px] font-semibold bg-muted/40 hover:bg-muted/70 border border-border/50 text-foreground px-2 py-1 rounded-lg transition-all"
                    >
                      {sug.label}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="space-y-3">
             <label className="text-[10px] font-bold text-muted-foreground ml-1">Escolha um Ícone</label>
             <div className="grid grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1 border border-border/30 rounded-xl bg-muted/10">
                {Object.entries(ICON_MAP).map(([key, Icon]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setNewCategory({...newCategory, icon: key})}
                    className={cn(
                      "p-2 rounded-xl flex items-center justify-center transition-all border-2",
                      newCategory.icon === key 
                        ? "bg-primary/20 border-primary text-primary" 
                        : "bg-muted/20 border-border/50 text-muted-foreground hover:bg-muted/30 hover:border-muted-foreground/30"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                ))}
             </div>
          </div>

          <div className="space-y-3">
             <label className="text-[10px] font-bold text-muted-foreground ml-1">Cor de Destaque</label>
             <div className="grid grid-cols-8 gap-2 p-1 border border-border/30 rounded-xl bg-muted/10">
                {colors.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewCategory({...newCategory, color})}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all flex items-center justify-center border-2",
                      newCategory.color === color ? "border-white scale-110 shadow-lg shadow-white/10" : "border-transparent opacity-60 hover:opacity-100"
                    )}
                    style={{ backgroundColor: color }}
                  >
                    {newCategory.color === color && <Check className="w-4 h-4 text-foreground" />}
                  </button>
                ))}
             </div>
          </div>

          <button 
            onClick={handleAddCategory}
            disabled={!newCategory.name}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary text-primary-foreground py-4 rounded-2xl font-black text-sm italic shadow-lg shadow-primary/20 transition-all mt-4"
          >
            {editingCategoryId ? 'Salvar Alterações' : 'Salvar Categoria'}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Sucesso"
      >
        <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center border border-primary/30">
            <Check className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Pronto!</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Sua categoria foi salva com sucesso e já está disponível para uso.
            </p>
          </div>
          <button
            onClick={() => setShowSuccess(false)}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-bold transition-all mt-4"
          >
            Entendido
          </button>
        </div>
      </Modal>
    </div>
  );
}
