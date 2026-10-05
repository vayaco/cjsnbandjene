import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-semibold tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-emerald-500 via-emerald-600 to-emerald-700 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35),0_6px_18px_-2px_rgba(5,150,105,0.38)] hover:from-emerald-400 hover:via-emerald-500 hover:to-emerald-600 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.45),0_8px_24px_-2px_rgba(5,150,105,0.48)] hover:-translate-y-0.5 active:translate-y-0",
        dark:
          "bg-gradient-to-b from-slate-800 via-slate-900 to-black text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.22),0_8px_20px_-4px_rgba(2,6,23,0.45)] hover:from-slate-700 hover:via-slate-850 hover:to-slate-950 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.32),0_10px_24px_-4px_rgba(2,6,23,0.55)] hover:-translate-y-0.5 active:translate-y-0",
        destructive:
          "bg-gradient-to-b from-rose-500 via-rose-600 to-rose-700 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.32),0_6px_18px_-2px_rgba(225,29,72,0.38)] hover:from-rose-400 hover:via-rose-500 hover:to-rose-600 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),0_8px_24px_-2px_rgba(225,29,72,0.48)] hover:-translate-y-0.5 active:translate-y-0",
        outline:
          "border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 text-slate-800 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.95),0_2px_8px_-1px_rgba(0,0,0,0.06)] hover:bg-slate-100 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0",
        secondary:
          "bg-gradient-to-b from-slate-100 to-slate-200 text-slate-900 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.85),0_2px_6px_rgba(0,0,0,0.05)] hover:from-slate-200 hover:to-slate-300 hover:-translate-y-0.5 active:translate-y-0",
        ghost:
          "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900",
        link:
          "text-emerald-600 underline-offset-4 hover:underline",
        subtle:
          "bg-gradient-to-b from-emerald-50 to-emerald-100/80 text-emerald-800 border border-emerald-200/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.95),0_4px_12px_-2px_rgba(16,185,129,0.15)] hover:from-emerald-100 hover:to-emerald-200/90 hover:-translate-y-0.5 active:translate-y-0",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 px-4 text-xs font-semibold",
        lg: "h-13 px-8 text-base font-bold",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
