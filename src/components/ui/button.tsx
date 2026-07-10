import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out active:scale-[0.97] cursor-pointer disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200",
  {
    variants: {
      variant: {
        primary: "bg-teal-600 text-white hover:bg-teal-700",
        danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-200",
        secondary:
          "bg-white text-zinc-700 border border-zinc-300 hover:bg-zinc-100",
        outline:
          "bg-white text-teal-600 border border-zinc-200 hover:bg-teal-50 hover:border-teal-200",
        ghost: "bg-transparent text-zinc-700 hover:bg-zinc-100",
        link: "bg-transparent text-teal-600 hover:underline p-0 h-auto",
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
