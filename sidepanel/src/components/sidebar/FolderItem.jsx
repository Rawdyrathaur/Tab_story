import { Folder, ChevronDown, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { tv } from 'tailwind-variants';
import { cn } from '../../lib/cn';

const folderItemVariants = tv({
  base: 'flex h-10 items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium transition-all cursor-pointer hover:bg-white/5 hover:translate-x-1',
  variants: {
    selected: {
      true: 'bg-white/7 text-white',
      false: 'text-white hover:bg-white/5',
    },
    level: {
      1: 'pl-3',
      2: 'pl-7',
    },
  },
  defaultVariants: {
    selected: false,
    level: 1,
  },
});

const chevronVariants = {
  expanded: { rotate: 180 },
  collapsed: { rotate: 0 },
};

export default function FolderItem({
  id,
  name,
  expanded = false,
  selected = false,
  level = 1,
  hasChildren = false,
  showMenu = false,
  onToggle,
  onSelect,
  onMenuClick,
}) {
  const handleToggle = (e) => {
    e.stopPropagation();
    if (hasChildren && onToggle) {
      onToggle(id);
    }
  };

  const handleSelect = () => {
    if (onSelect) {
      onSelect(id);
    }
  };

  const handleMenuClick = (e) => {
    e.stopPropagation();
    if (onMenuClick) {
      onMenuClick(e, id);
    }
  };

  return (
    <div
      className={cn(folderItemVariants({ selected, level }))}
      onClick={handleSelect}
    >
      {hasChildren && (
        <motion.div
          variants={chevronVariants}
          initial={false}
          animate={expanded ? 'expanded' : 'collapsed'}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          onClick={handleToggle}
          className="text-white/40 hover:text-white/70"
        >
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
        </motion.div>
      )}

      {!hasChildren && <div className="w-3.5" />}

      <Folder
        className={cn(
          'h-4 w-4',
          selected ? 'text-accent-purple' : 'text-amber-500/70'
        )}
        strokeWidth={2}
        fill="none"
      />

      <span className="flex-1 truncate">{name}</span>

      {showMenu && (
        <button
          onClick={handleMenuClick}
          className="text-white/40 hover:text-white/70 transition-colors"
          aria-label="More options"
        >
          <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
