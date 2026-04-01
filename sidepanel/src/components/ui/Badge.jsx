import { tv } from 'tailwind-variants';
import { cn } from '../../lib/cn';
import { Dot } from 'lucide-react';

const badgeVariants = tv({
  base: 'inline-flex items-center gap-1.5 rounded-full font-semibold transition-all border hover:scale-105',
  variants: {
    variant: {
      toExplore: 'bg-[rgba(212,168,50,0.18)] text-[#D4A832] border-[rgba(212,168,50,0.35)]',
      inProgress: 'bg-[rgba(91,156,246,0.18)] text-[#5B9CF6] border-[rgba(91,156,246,0.35)]',
      done: 'bg-[rgba(80,200,120,0.18)] text-[#50C878] border-[rgba(80,200,120,0.35)]',
    },
    size: {
      default: 'h-6 px-2.5 text-[10px]',
    },
  },
  defaultVariants: {
    variant: 'toExplore',
    size: 'default',
  },
});

const badgeDotColors = {
  toExplore: 'text-[#D4A832]',
  inProgress: 'text-[#5B9CF6]',
  done: 'text-[#50C878]',
};

function Badge({ className, variant, size, children, ...props }) {
  const dotColor = badgeDotColors[variant];

  return (
    <span className={cn(badgeVariants({ variant, size, className }))} {...props}>
      <Dot size={8} className={dotColor} />
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
