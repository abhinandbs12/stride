import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none select-none',
  {
    variants: {
      variant: {
        primary: 'bg-[#D22B2B] text-white hover:bg-[#B91C1C] shadow-sm active:scale-[0.98]',
        dark: 'bg-[#111827] text-white hover:bg-[#1F2937] shadow-sm active:scale-[0.98]',
        outline: 'bg-white text-[#111827] border border-[#E5E7EB] hover:bg-gray-50 shadow-sm active:scale-[0.98]',
        ghost: 'text-[#6B7280] hover:text-[#111827] hover:bg-gray-100',
        danger: 'bg-red-50 text-[#D22B2B] border border-red-200 hover:bg-red-100',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

export function Button({ className, variant, size, children, ...props }) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {children}
    </button>
  );
}
