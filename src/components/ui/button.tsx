import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out active:scale-[0.97] cursor-pointer disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200 dark:focus-visible:ring-teal-500/40",
  {
    variants: {
      // primary/danger are teal-600/red-600 on white text — already legible in
      // dark; the neutral variants below add dark: overrides so they aren't a
      // bright white slab on a dark card. Light-mode classes are unchanged.
      variant: {
        primary: "bg-teal-600 text-white hover:bg-teal-700",
        danger:
          "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-200 dark:focus-visible:ring-red-500/40",
        secondary:
          "bg-white text-zinc-700 border border-zinc-300 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-700",
        outline:
          "bg-white text-teal-600 border border-zinc-200 hover:bg-teal-50 hover:border-teal-200 dark:bg-transparent dark:text-teal-400 dark:border-zinc-700 dark:hover:bg-teal-500/10 dark:hover:border-teal-500/40",
        ghost:
          "bg-transparent text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
        link: "bg-transparent text-teal-600 hover:underline p-0 h-auto dark:text-teal-400",
      },
      size: {
        sm: "px-2.5 py-1 text-xs",
        default: "px-3.5 py-2 text-[13px]",
        lg: "px-[18px] py-2.5 text-sm",
        icon: "size-[34px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { buttonVariants };
