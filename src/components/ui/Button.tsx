import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost" | "success";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  className = "",
  disabled,
  ...props
}) => {
  const baseStyle =
    "inline-flex items-center justify-center font-extrabold tracking-tight transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-full shadow-2xs active:scale-[0.98]";

  const variants = {
    primary:
      "bg-[#7E8920] hover:bg-[#6b7519] text-white focus:ring-[#565E14] border border-transparent shadow-xs",
    secondary:
      "bg-[#ECEFDE] hover:bg-[#dfe3ca] text-[#1A1C12] focus:ring-[#A8B542] border border-[#d2d8b0]/80 shadow-2xs",
    outline:
      "bg-white hover:bg-[#F7F6F0] text-[#1A1C12] border border-slate-300 shadow-2xs focus:ring-[#7E8920]",
    danger:
      "bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500 border border-transparent shadow-xs",
    success:
      "bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500 border border-transparent shadow-xs",
    ghost:
      "bg-transparent hover:bg-[#ECEFDE] text-[#1A1C12] shadow-none focus:ring-[#A8B542]",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-xs font-extrabold gap-2",
    lg: "px-5 py-2.5 text-sm font-extrabold gap-2.5",
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};
