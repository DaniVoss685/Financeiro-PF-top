import React, { useState } from 'react';
import { useAppContext, Category } from '../store/AppContext';
import { PremiumCard } from '../components/ui/PremiumComponents';
import { Modal } from '../components/ui/Modal';
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

  const colors = ['#BCF24B', '#FFD700', '#FF6B6B', '#4DABF7', '#51CF66', '#FAB005', '#7950F2', '#BE4BDB'];

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCategories.map(cat => {
          // Calculate amount spent this month
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
                      {cat.type === 'INCOME' ? (
                        <TrendingUp className="w-3 h-3 text-primary" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-400" />
                      )}
                      <p className="text-[10px] text-muted-foreground font-bold">
                        {cat.type === 'INCOME' ? 'Receita' : 'Despesa'}
                      </p>
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
                  className="p-2 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10 rounded-lg"
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

              {cat.monthlyGoal && cat.type === 'EXPENSE' ? (
                <div className="mt-auto pt-4 space-y-3">
                  <div className="flex justify-between text-xs items-end">
                    <span className="text-muted-foreground font-bold">Teto Mensal</span>
                    <div className="text-right">
                      <span className="font-display font-black text-foreground">{formatCurrency(spent)}</span>
                      <span className="text-muted-foreground mx-1 text-[10px]">/</span>
                      <span className="text-muted-foreground text-xs">{formatCurrency(cat.monthlyGoal)}</span>
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
                      monthlyGoal: ''
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

          <div className="space-y-3">
             <label className="text-[10px] font-bold text-muted-foreground ml-1">Escolha um Ícone</label>
             <div className="grid grid-cols-4 gap-3">
                {Object.entries(ICON_MAP).map(([key, Icon]) => (
                  <button
                    key={key}
                    onClick={() => setNewCategory({...newCategory, icon: key})}
                    className={cn(
                      "w-full aspect-square rounded-2xl flex items-center justify-center transition-all border-2",
                      newCategory.icon === key 
                        ? "bg-primary/20 border-primary text-primary" 
                        : "bg-muted/20 border-border/50 text-muted-foreground hover:bg-muted/30 hover:border-muted-foreground/30"
                    )}
                  >
                    <Icon className="w-6 h-6" />
                  </button>
                ))}
             </div>
          </div>

          <div className="space-y-3">
             <label className="text-[10px] font-bold text-muted-foreground ml-1">Cor de Destaque</label>
             <div className="flex flex-wrap gap-3">
                {colors.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewCategory({...newCategory, color})}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all flex items-center justify-center border-2",
                      newCategory.color === color ? "border-white scale-110" : "border-transparent"
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
