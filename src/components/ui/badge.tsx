import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#79FE0C]/15 text-[#79FE0C] border border-[#79FE0C]/30",
        secondary:
          "border-transparent bg-slate-800 text-slate-200",
        destructive:
          "border-transparent bg-rose-950/60 text-rose-300 border border-rose-800/60",
        outline:
          "text-slate-200 border border-slate-800",
        warning:
          "border-transparent bg-amber-950/60 text-amber-300 border border-amber-800/60",
        info:
          "border-transparent bg-sky-950/60 text-sky-300 border border-sky-800/60",
        purple:
          "border-transparent bg-purple-950/60 text-purple-300 border border-purple-800/60",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
