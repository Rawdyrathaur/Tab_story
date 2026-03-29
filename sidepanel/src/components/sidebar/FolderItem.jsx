import { Folder, ChevronDown, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { tv } from 'tailwind-variants';
import { cn } from '../../lib/cn';
import { useFolderStore } from '../../store/useTabStore';
import { useUIStore } from '../../store/useTabStore';
import { memo, useCallback } from 'react';

/**
 * FolderItem component
 * @typedef {Object} FolderItemProps
 * @property {string} id - Folder ID
 * @property {string} name - Folder name
 * @property {boolean} [expanded=false] - Whether folder is expanded
 * @property {boolean} [selected=false] - Whether folder is selected
 * @property {number} [level=1] - Indent level
 * @property {boolean} [hasChildren=false] - Has child folders
 * @property {boolean} [showMenu=false] - Show menu button
 * @property {Function} [onToggle] - Toggle callback
 * @property {Function} [onSelect] - Select callback
 * @property {Function} [onMenuClick] - Menu click callback
 */

const folderItemVariants = tv({
  base: 'flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors cursor-pointer',
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

const FolderItem = memo(function FolderItem({
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
  const toggleFolder = useFolderStore((state) => state.toggleFolder);
  const setSelectedFolder = useFolderStore((state) => state.setSelectedFolder);
  const selectedFolder = useFolderStore((state) => state.selectedFolder);

  const handleToggle = useCallback((e) => {
    e.stopPropagation();
    if (hasChildren && onToggle) {
      toggleFolder(id);
    }
  }, [hasChildren, onToggle, id, toggleFolder]);

  const handleSelect = useCallback(() => {
    if (onSelect) {
      onSelect(id === selectedFolder ? null : id);
    }
  }, [selectedFolder, id, onSelect]);

  const handleMenuClick = useCallback((e) => {
    e.stopPropagation();
    if (onMenuClick) {
      onMenuClick(e, id);
    }
  }, [onMenuClick, id]);

  return (
    <div
      className={cn(folderItemVariants({ selected, level }))}
      onClick={handleSelect}
      role="treeitem"
      aria-expanded={expanded}
      aria-selected={selected}
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
          type="button"
        >
          <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
        </button>
      )}
    </div>
  );
});

export default FolderItem;
