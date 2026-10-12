import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-semibold tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[#79FE0C] hover:bg-[#6de809] text-black font-extrabold shadow-[0_0_20px_rgba(121,254,12,0.3)] hover:shadow-[0_0_30px_rgba(121,254,12,0.45)] hover:-translate-y-0.5 active:translate-y-0",
        dark:
          "bg-gradient-to-b from-slate-800 via-slate-900 to-black text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.22),0_8px_20px_-4px_rgba(2,6,23,0.45)] hover:from-slate-700 hover:via-slate-850 hover:to-slate-950 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.32),0_10px_24px_-4px_rgba(2,6,23,0.55)] hover:-translate-y-0.5 active:translate-y-0",
        destructive:
          "bg-gradient-to-b from-rose-500 via-rose-600 to-rose-700 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.32),0_6px_18px_-2px_rgba(225,29,72,0.38)] hover:from-rose-400 hover:via-rose-500 hover:to-rose-600 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),0_8px_24px_-2px_rgba(225,29,72,0.48)] hover:-translate-y-0.5 active:translate-y-0",
        outline:
          "border border-slate-700 bg-slate-900 text-slate-200 shadow-sm hover:bg-slate-800 hover:text-white hover:border-slate-600 hover:-translate-y-0.5 active:translate-y-0",
        secondary:
          "bg-slate-800 text-slate-100 hover:bg-slate-700 hover:-translate-y-0.5 active:translate-y-0",
        ghost:
          "text-slate-300 hover:bg-slate-800 hover:text-white",
        link:
          "text-[#79FE0C] underline-offset-4 hover:underline",
        subtle:
          "bg-[#79FE0C]/15 text-[#79FE0C] border border-[#79FE0C]/30 hover:bg-[#79FE0C]/25 hover:-translate-y-0.5 active:translate-y-0",
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
