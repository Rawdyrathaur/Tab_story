import { tv } from 'tailwind-variants';
import { cn } from '../../lib/cn';
import { Dot } from 'lucide-react';

const chipVariants = tv({
  base: 'inline-flex items-center gap-1.5 rounded-full font-medium transition-colors',
  variants: {
    variant: {
      default: 'bg-white/6 text-[#C0C0D0] border border-white/10 text-xs',
      active: 'bg-[#2A6F4F] text-[#5DDFB0] border-transparent text-xs',
      research: 'bg-white/6 text-[#C0C0D0] border border-white/12 text-[12px]',
      study: 'bg-[#2A6F4F] text-[#5DDFB0] border-transparent text-[12px]',
      todo: 'bg-white/6 text-[#D4A832] border border-white/12 text-[12px]',
      tag: 'bg-white/6 text-[#C0C0D0] border border-white/10 text-[10px]',
    },
    size: {
      default: 'h-6 px-2.5',
      sm: 'h-5 px-2',
      filter: 'h-7.5 px-3',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

const chipDotColors = {
  default: null,
  active: 'text-[#5DDFB0]',
  research: null,
  study: 'text-[#5DDFB0]',
  todo: 'text-[#D4A832]',
  tag: null,
};

function Chip({ className, variant, size, children, showDot = false, ...props }) {
  return (
    <span className={cn(chipVariants({ variant, size, className }))} {...props}>
      {showDot && chipDotColors[variant] && <Dot size={8} className={chipDotColors[variant]} />}
      {children}
    </span>
  );
}

export { Chip, chipVariants };
