import type { FC, ReactNode } from 'react';
import { motion } from 'motion/react';

interface CardProps {
  children: ReactNode;
  className?: string;
  animate?: boolean;
}

export const Card: FC<CardProps> = ({ children, className = '', animate = true }) => {
  const baseStyles = "bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 w-full overflow-hidden border border-slate-100";
  
  if (animate) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className={`${baseStyles} ${className}`}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={`${baseStyles} ${className}`}>
      {children}
    </div>
  );
};

export const CardHeader: FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`p-10 flex flex-col items-center text-center ${className}`}>
    {children}
  </div>
);

export const CardFooter: FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-slate-50/50 py-4 border-t border-slate-100 flex items-center justify-center gap-2 ${className}`}>
    {children}
  </div>
);
