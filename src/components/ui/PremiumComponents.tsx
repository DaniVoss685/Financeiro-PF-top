import React from 'react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

export function PremiumCard({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof motion.div>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "relative overflow-hidden rounded-[20px] bg-card border border-border shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function GlassCard({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof motion.div>) {
  return (
    <motion.div
      className={cn("bg-card/80 backdrop-blur-md rounded-2xl p-6 border border-border/50 shadow-sm", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | React.ReactNode;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'premium';
}

export function MetricCard({ title, value, subtitle, icon: Icon, trend, trendValue, variant = 'default' }: MetricCardProps) {
  const isPremium = variant === 'premium';
  
  return (
    <PremiumCard className={cn("p-5 flex flex-col", isPremium && "")}>
      <div className="flex justify-between items-start mb-4">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <div className="p-2 rounded-2xl bg-muted text-muted-foreground">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <h3 className={cn("text-3xl font-bold", isPremium ? "text-foreground" : "text-foreground")}>
        {value}
      </h3>
      {(trend || subtitle) && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          {trend && trendValue && (
            <span className={cn(
              "font-medium px-2 py-0.5 rounded-md",
              trend === 'up' ? "bg-primary/20 text-primary" : 
              trend === 'down' ? "bg-destructive/10 text-destructive" : ""
            )}>
              {trend === 'down' ? '↓' : '↑'} {trendValue}
            </span>
          )}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </PremiumCard>
  );
}
