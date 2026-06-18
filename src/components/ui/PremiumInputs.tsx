import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';
import { ChevronDown, Calendar as CalendarIcon, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  format, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- Utility for Portals ---
function DropdownPortal({ children, triggerRef, isOpen, onClose, minWidth = 240 }: { children: React.ReactNode, triggerRef: React.RefObject<HTMLElement>, isOpen: boolean, onClose: () => void, minWidth?: number }) {
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, placement: 'bottom' as 'top' | 'bottom' });

  const updateCoords = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;
      
      const dropdownWidth = Math.max(rect.width, minWidth);
      const spaceBelow = windowHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 350; // Estimated max height for calendar/select

      // Calcular left com clamp para não sair da tela
      const MARGIN = 8; // margem das bordas
      let calculatedLeft = rect.left + scrollX;
      // Garante que não ultrapasse a direita da tela
      if (calculatedLeft + dropdownWidth > windowWidth + scrollX - MARGIN) {
        calculatedLeft = windowWidth + scrollX - dropdownWidth - MARGIN;
      }
      // Garante que não ultrapasse a esquerda da tela
      if (calculatedLeft < scrollX + MARGIN) {
        calculatedLeft = scrollX + MARGIN;
      }

      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        setCoords({
          top: rect.top + scrollY,
          left: calculatedLeft,
          width: rect.width,
          placement: 'top'
        });
      } else {
        setCoords({
          top: rect.bottom + scrollY,
          left: calculatedLeft,
          width: rect.width,
          placement: 'bottom'
        });
      }
    }
  }, [triggerRef]);

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      };

      // Listen to all scroll events in the capture phase to catch scrolls inside modals
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
      window.addEventListener('keydown', handleKeyDown, true);
      
      return () => {
        window.removeEventListener('scroll', updateCoords, true);
        window.removeEventListener('resize', updateCoords);
        window.removeEventListener('keydown', handleKeyDown, true);
      };
    }
  }, [isOpen, updateCoords, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[99990]" onClick={onClose} />
      <div 
        style={{ 
          position: 'absolute', 
          top: coords.top, 
          left: coords.left, 
          width: coords.width,
          minWidth: Math.max(coords.width, 240),
          zIndex: 100000,
          transform: coords.placement === 'top' ? 'translateY(-100%)' : 'none'
        }}
        className="pointer-events-none"
      >
        <div className="pointer-events-auto">
          {children}
        </div>
      </div>
    </>,
    document.body
  );
}

// --- PremiumSelect ---
interface SelectOption {
  value: string;
  label: string;
  icon?: React.ElementType;
  color?: string;
}

interface PremiumSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  disableSort?: boolean;
}

export function PremiumSelect({ options, value, onChange, placeholder = 'Selecione...', label, className, required, disabled, disableSort }: PremiumSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selectedOption = options.find(o => o.value === value);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (activeRef.current) {
          activeRef.current.scrollIntoView({
            behavior: 'auto',
            block: 'center'
          });
        }
      }, 50);
      
      const focusTimer = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);

      return () => {
        clearTimeout(timer);
        clearTimeout(focusTimer);
      };
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Ordenar opções de forma inteligente
  const sortedOptions = useMemo(() => {
    if (disableSort) return options;

    // Separa opções normais de especiais (como "+ Nova Categoria", "+ Novo Cartão", "+ Novo Banco", etc.)
    const normalOptions = options.filter(o => 
      !o.label.startsWith('+') && 
      !o.label.includes('Nova') && 
      !o.label.includes('Novo') &&
      o.value !== '' && 
      o.value !== 'NEW'
    );
    const specialOptions = options.filter(o => 
      o.label.startsWith('+') || 
      o.label.includes('Nova') || 
      o.label.includes('Novo') ||
      o.value === '' || 
      o.value === 'NEW'
    );

    normalOptions.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

    // As opções especiais (como "Nenhum" ou "+ Nova Categoria") devem ficar nos seus lugares:
    // Geralmente "Nenhum" ou valores vazios ficam no início. "+ Nova" fica no final.
    const emptyValueOptions = specialOptions.filter(o => o.value === '');
    const otherSpecialOptions = specialOptions.filter(o => o.value !== '');

    return [...emptyValueOptions, ...normalOptions, ...otherSpecialOptions];
  }, [options, disableSort]);

  // Filtrar as opções com base na busca
  const filteredOptions = useMemo(() => {
    if (!searchQuery) return sortedOptions;
    const lowerQuery = searchQuery.toLowerCase();
    return sortedOptions.filter(o => 
      o.label.toLowerCase().includes(lowerQuery)
    );
  }, [sortedOptions, searchQuery]);

  return (
    <div className={cn("space-y-1.5 relative", className)} ref={containerRef}>
      {label && <label className="text-[10px] font-semibold text-muted-foreground ml-1">{label}</label>}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 bg-card border border-border/60 rounded-xl text-sm transition-all text-left outline-none shadow-sm",
          isOpen ? "border-primary ring-1 ring-primary/10" : "hover:border-primary/50",
          !selectedOption && "text-muted-foreground",
          disabled && "opacity-60 cursor-not-allowed bg-muted/20 hover:border-border/60"
        )}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {selectedOption?.color && (
            <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.5)] border border-foreground/10" style={{ backgroundColor: selectedOption.color }} />
          )}
          <span className={cn("truncate leading-tight py-0.5 font-medium flex-1 text-left text-xs", selectedOption ? "text-foreground/90" : "text-muted-foreground")}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform duration-300", isOpen && "rotate-180 text-primary")} />
      </button>

      <DropdownPortal triggerRef={triggerRef} isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="w-full mt-2 bg-card border border-border shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden backdrop-blur-xl flex flex-col"
            >
              {/* Campo de busca */}
              <div className="p-2 border-b border-border/40 bg-muted/5">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Pesquisar..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      if (filteredOptions.length === 1) {
                        e.preventDefault();
                        e.stopPropagation();
                        onChange(filteredOptions[0].value);
                        setIsOpen(false);
                      }
                    }
                  }}
                  className="w-full bg-muted/40 border border-border/50 rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                  onClick={e => e.stopPropagation()} // Impede fechar o dropdown ao clicar no input
                />
              </div>

              <div className="p-1.5 max-h-[280px] overflow-y-auto no-scrollbar">
                {filteredOptions.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-muted-foreground italic">
                    Nenhuma opção encontrada
                  </div>
                ) : filteredOptions.map((option) => {
                  const isSingleOption = filteredOptions.length === 1;
                  const isItemActive = value === option.value || (isSingleOption && filteredOptions[0].value === option.value);
                  return (
                    <button
                      ref={isItemActive ? activeRef : undefined}
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onChange(option.value);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all text-left group mb-1 last:mb-0",
                        isItemActive 
                          ? "bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/10" 
                          : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0 py-0.5">
                        {option.color && (
                          <div 
                            className={cn(
                              "w-2 h-2 rounded-full border shrink-0",
                              isItemActive ? "border-black/20" : "border-foreground/10"
                            )} 
                            style={{ backgroundColor: option.color }} 
                          />
                        )}
                        <span className="truncate text-left flex-1 text-xs leading-tight">{option.label}</span>
                      </div>
                      {isItemActive && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DropdownPortal>
      <input type="hidden" value={value} required={required} />
    </div>
  );
}

// --- PremiumDatePicker ---
interface PremiumDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  required?: boolean;
}

export function PremiumDatePicker({ value, onChange, label, className, required }: PremiumDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? parseISO(value) : new Date());
  const triggerRef = useRef<HTMLButtonElement>(null);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 }),
  });

  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const handleDayClick = (day: Date) => {
    onChange(format(day, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const handleToday = () => {
    const today = new Date();
    onChange(format(today, 'yyyy-MM-dd'));
    setCurrentMonth(today);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  return (
    <div className={cn("space-y-1.5 relative", className)}>
      {label && <label className="text-[10px] font-semibold text-muted-foreground ml-1">{label}</label>}
      <div className="relative group">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center justify-between px-4 py-3 bg-card border border-border/60 rounded-xl text-sm transition-all text-left outline-none shadow-sm",
            isOpen ? "border-primary ring-1 ring-primary/10" : "hover:border-primary/50",
            !value && "text-muted-foreground"
          )}
        >
          <span className={cn("font-medium", value ? "text-foreground/90" : "text-muted-foreground")}>
            {value ? format(parseISO(value), 'dd/MM/yyyy') : 'DD/MM/AAAA'}
          </span>
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarIcon className={cn("w-4 h-4 transition-colors", isOpen ? "text-primary" : "text-muted-foreground")} />
          </div>
        </button>

        <DropdownPortal triggerRef={triggerRef} isOpen={isOpen} onClose={() => setIsOpen(false)} minWidth={310}>
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                className="w-full mt-2 bg-card border border-border shadow-lg rounded-2xl overflow-hidden p-4 min-w-[300px]"
              >
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                  <button type="button" onClick={prevMonth} className="p-1 hover:bg-foreground/10 rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h3 className="text-sm font-bold text-foreground capitalize">
                    <span className="capitalize">{format(currentMonth, 'MMMM', { locale: ptBR })}</span>
                    <span className="text-primary ml-1.5">{format(currentMonth, 'yyyy')}</span>
                  </h3>
                  <button type="button" onClick={nextMonth} className="p-1 hover:bg-foreground/10 rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Grid Header */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {weekDays.map((day, i) => (
                    <div key={i} className="text-center text-[10px] font-semibold text-muted-foreground py-1">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Grid Days */}
                <div className="grid grid-cols-7 gap-1">
                  {days.map((day, i) => {
                    const isSelected = value ? isSameDay(day, parseISO(value)) : false;
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleDayClick(day)}
                        className={cn(
                          "aspect-square flex items-center justify-center text-xs rounded-xl transition-all relative font-medium",
                          !isCurrentMonth ? "text-muted-foreground/30" : "text-foreground/90",
                          isSelected 
                            ? "bg-primary/10 text-primary border border-primary/40 font-bold" 
                            : "hover:bg-foreground/5",
                          isToday(day) && !isSelected && "text-primary border border-primary/20",
                          isSelected && "shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]"
                        )}
                      >
                        {format(day, 'd')}
                        {isSelected && (
                          <div className="absolute inset-0 border border-primary/50 rounded-xl" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-border/40 flex justify-between items-center">
                  <button 
                    type="button" 
                    onClick={handleClear}
                    className="text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Limpar
                  </button>
                  <button 
                    type="button" 
                    onClick={handleToday}
                    className="text-[10px] font-semibold text-primary hover:underline transition-all"
                  >
                    Hoje
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DropdownPortal>
      </div>
      <input type="hidden" value={value} required={required} />
    </div>
  );
}

// --- PremiumCurrencyInput ---
interface PremiumCurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export function PremiumCurrencyInput({ value, onChange, label, placeholder = '0,00', className }: PremiumCurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState('');

  // Format number to local currency string for display
  const formatValue = (val: number) => {
    if (!val && val !== 0) return '';
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  useEffect(() => {
    setDisplayValue(formatValue(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '');
    
    // Convert cents to decimal number
    const numValue = Number(raw) / 100;
    
    if (isNaN(numValue)) return;
    
    onChange(numValue);
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <label className="text-[10px] font-semibold text-muted-foreground ml-1">{label}</label>}
      <div className="relative group">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium pointer-events-none group-focus-within:text-primary transition-colors">R$</span>
        <input
          type="text"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full bg-card border border-border/60 rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all hover:border-primary/40 font-medium"
        />
      </div>
    </div>
  );
}
