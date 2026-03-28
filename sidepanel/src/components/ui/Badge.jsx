import { tv } from 'tailwind-variants';
import { cn } from '../../lib/cn';
import { Dot } from 'lucide-react';

const badgeVariants = tv({
  base: 'inline-flex items-center gap-1 rounded-full font-semibold transition-colors',
  variants: {
    variant: {
      toExplore: 'bg-[#D4A832]/15 text-[#D4A832]',
      inProgress: 'bg-[#5B9CF6]/15 text-[#5B9CF6]',
      done: 'bg-[#50C878]/15 text-[#50C878]',
    },
    size: {
      default: 'h-5 px-2 text-[10px]',
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
