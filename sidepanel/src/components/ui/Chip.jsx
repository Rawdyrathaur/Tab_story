import { tv } from 'tailwind-variants';
import { cn } from '../../lib/cn';
import { Dot } from 'lucide-react';

const chipVariants = tv({
  base: 'inline-flex items-center gap-1.5 rounded-full font-semibold transition-all border',
  variants: {
    variant: {
      default: 'bg-white/6 text-[#808090] border-white/8 text-[11px] hover:bg-white/10 hover:border-white/12',
      active: 'bg-[rgba(80,200,120,0.18)] text-[#50C878] border-[rgba(80,200,120,0.35)] text-[11px]',
      research: 'bg-[rgba(91,156,246,0.18)] text-[#5B9CF6] border-[rgba(91,156,246,0.35)] text-[11px]',
      study: 'bg-[rgba(80,200,120,0.18)] text-[#50C878] border-[rgba(80,200,120,0.35)] text-[11px]',
      todo: 'bg-[rgba(212,168,50,0.18)] text-[#D4A832] border-[rgba(212,168,50,0.35)] text-[11px]',
      tag: 'bg-white/6 text-[#9090A0] border-white/8 text-[10px]',
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
  active: '#50C878',
  research: '#5B9CF6',
  study: '#50C878',
  todo: '#D4A832',
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
