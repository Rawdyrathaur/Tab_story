import { motion } from 'framer-motion';
import { useTabStore } from '../../store/useTabStore';
import { Badge } from '../ui/Badge';
import { Chip } from '../ui/Chip';

export default function TabRow({ tab, onClick, isLastInGroup = false }) {
  const setPopupOpen = useTabStore((state) => state.setPopupOpen);

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPopupOpen(true, tab, { x: rect.right + 10, y: rect.top });
    if (onClick) onClick(tab);
  };

  const getBadgeVariant = (status) => {
    const statusMap = {
      'To Explore': 'toExplore',
      'In Progress': 'inProgress',
      'Done': 'done',
    };
    return statusMap[status] || 'toExplore';
  };

  return (
    <motion.div
      className="group flex h-11 items-center gap-2 rounded-lg hover:bg-white/4 cursor-pointer transition-colors"
      onClick={handleClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      {/* Favicon */}
      <div className="shrink-0">
        {tab.favicon ? (
          <img
            src={tab.favicon}
            alt=""
            className="h-6 w-6 rounded-md object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div className="hidden h-6 w-6 items-center justify-center rounded-md bg-white/10 text-[10px] font-medium text-white">
          {(tab.domain || tab.url || 'Tab').charAt(0).toUpperCase()}
        </div>
      </div>

      {/* Tab Info */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-xs font-medium text-white">
          {tab.title || 'Untitled'}
        </span>
        <span className="text-[11px] text-[#606070]">
          {tab.domain || new URL(tab.url || '').hostname || 'Unknown'}
        </span>
      </div>

      {/* Tags */}
      {tab.tags && tab.tags.length > 0 && (
        <div className="flex items-center gap-1">
          {tab.tags.slice(0, 2).map((tag) => (
            <Chip key={tag} variant="tag" size="sm">
              {tag}
            </Chip>
          ))}
          {tab.tags.length > 2 && (
            <span className="text-[10px] text-white/40">
              +{tab.tags.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Status Badge */}
      {tab.status && (
        <Badge variant={getBadgeVariant(tab.status)}>
          {tab.status}
        </Badge>
      )}

      {/* Date */}
      {tab.timestamp && (
        <span className="ml-auto text-[11px] text-[#505060]">
          {new Date(tab.timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </span>
      )}
    </motion.div>
  );
}
