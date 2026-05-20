import React from 'react';
import { 
  Utensils,
  Home,
  Briefcase,
  Car,
  ShoppingBag,
  Heart,
  Plane,
  Gamepad2,
  LucideIcon,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  Coffee,
  Smartphone,
  Gift,
  DollarSign,
  Plus
} from 'lucide-react';
import { cn } from '../lib/utils';

export const ICON_MAP: Record<string, LucideIcon> = {
  utensils: Utensils,
  home: Home,
  briefcase: Briefcase,
  car: Car,
  shopping: ShoppingBag,
  heart: Heart,
  plane: Plane,
  game: Gamepad2,
  zap: Zap,
  shield: Shield,
  coffee: Coffee,
  smartphone: Smartphone,
  gift: Gift,
  dollar: DollarSign,
};

interface CategoryIconProps {
  icon?: string;
  className?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function CategoryIcon({ icon, className, color, size = 'md' }: CategoryIconProps) {
  const IconComponent = icon ? ICON_MAP[icon] : null;
  
  const sizeClasses = {
    sm: "w-8 h-8 rounded-lg",
    md: "w-10 h-10 rounded-xl",
    lg: "w-12 h-12 rounded-2xl"
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6"
  };

  if (!IconComponent) {
    return (
      <div 
        className={cn(
          sizeClasses[size], 
          "flex items-center justify-center text-foreground/50 border border-dashed border-foreground/20 transition-all", 
          className
        )}
      >
        <HelpCircle className={cn(iconSizes[size])} />
      </div>
    );
  }

  return (
    <div 
      className={cn(sizeClasses[size], "flex items-center justify-center text-foreground shadow-lg", className)} 
      style={{ backgroundColor: color }}
    >
      <IconComponent className={cn(iconSizes[size])} />
    </div>
  );
}
