import { tv } from 'tailwind-variants';
import { cn } from '../../lib/cn';

const buttonVariants = tv({
  base: 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  variants: {
    variant: {
      default: 'bg-white/8 hover:bg-white/14 text-white',
      primary: 'bg-accent-purple hover:bg-accent-purple/90 text-white',
      ghost: 'hover:bg-white/6 text-white',
      icon: 'h-9 w-9 rounded-full bg-white/6 hover:bg-white/12 text-white border border-white/8',
      pill: 'h-8 px-3 rounded-full text-xs font-semibold text-white',
    },
    size: {
      default: 'h-10 px-4 py-2',
      sm: 'h-9 rounded-md px-3 text-xs',
      lg: 'h-11 rounded-md px-8',
      icon: 'h-9 w-9',
      pill: 'h-8 px-3',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

function Button({ className, variant, size, ...props }) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
