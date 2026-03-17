import type { FC, ReactNode, ButtonHTMLAttributes } from 'react';
import { motion } from 'motion/react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'disabled';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: ReactNode;
  icon?: ReactNode;
}

export const Button: FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false, 
  children, 
  icon, 
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyles = "rounded-2xl font-bold flex items-center justify-center gap-3 transition-all duration-300 shadow-lg disabled:shadow-none disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200",
    secondary: "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-slate-100",
    danger: "bg-red-500 hover:bg-red-600 text-white shadow-red-200",
    success: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200",
    ghost: "bg-transparent text-slate-400 hover:bg-slate-50 hover:text-slate-600 shadow-none",
    disabled: "bg-slate-200 text-slate-400 shadow-none"
  };

  const sizes = {
    sm: "py-2 px-4 text-sm",
    md: "py-4 px-6 text-base",
    lg: "py-5 px-8 text-lg"
  };

  const variantStyle = disabled ? variants.disabled : variants[variant];
  const sizeStyle = sizes[size];
  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button 
      className={`${baseStyles} ${variantStyle} ${sizeStyle} ${widthStyle} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
};
