import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTabStore } from '../../store/useTabStore';
import { Badge } from '../ui/Badge';
import { Chip } from '../ui/Chip';
import { getStatusVariant } from '../../constants';
import { ExternalLink, Share2, FolderPlus, MoreHorizontal } from 'lucide-react';

export default function TabRow({ tab, onClick }) {
  const setPopupOpen = useTabStore((state) => state.setPopupOpen);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPopupOpen(true, tab, { x: rect.right + 10, y: rect.top });
    if (onClick) onClick(tab);
  };

  const getDomain = () => {
    try {
      return new URL(tab.url || '').hostname || 'Unknown';
    } catch {
      return 'Unknown';
    }
  };

  const getRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const handleOpenTab = (e) => {
    e.stopPropagation();
    if (typeof chrome !== 'undefined' && chrome.tabs && tab.url) {
      chrome.tabs.create({ url: tab.url });
    } else if (tab.url) {
      window.open(tab.url, '_blank');
    }
  };

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        className="flex h-12 items-center gap-2.5 rounded-lg cursor-pointer transition-all border border-transparent hover:border-white/8 hover:bg-white/5"
        onClick={handleClick}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        whileHover={{ scale: 1.01, x: 2 }}
      >
        {/* Favicon */}
        <div className="shrink-0 relative">
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
            {getDomain().charAt(0).toUpperCase()}
          </div>
          {/* Hover glow */}
          <div className="absolute inset-0 rounded-md bg-accent-purple/20 scale-0 group-hover:scale-100 transition-transform duration-200" />
        </div>

        {/* Tab Info */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-[14px] font-semibold text-white leading-tight group-hover:text-accent-purple/90 transition-colors">
            {tab.title || 'Untitled'}
          </span>
          <span className="text-[11px] text-[#808090] group-hover:text-[#A0A0B0] transition-colors">
            {tab.domain || getDomain()}
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
              <span className="text-[10px] text-white/40 group-hover:text-white/60 transition-colors">
                +{tab.tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Status Badge */}
        {tab.status && (
          <Badge variant={getStatusVariant(tab.status)}>
            {tab.status}
          </Badge>
        )}

        {/* Action Buttons - Show on Hover */}
        <AnimatePresence mode="wait">
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1"
            >
              <button
                onClick={handleOpenTab}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white/60 hover:bg-accent-purple hover:text-white transition-all"
                aria-label="Open tab"
              >
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (typeof navigator !== 'undefined' && navigator.clipboard && tab.url) {
                    navigator.clipboard.writeText(tab.url);
                  }
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white/60 hover:bg-accent-blue hover:text-white transition-all"
                aria-label="Share"
              >
                <Share2 className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Implement move to folder functionality
                  setPopupOpen(true, tab, { x: e.clientX, y: e.clientY });
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white/60 hover:bg-accent-amber hover:text-white transition-all"
                aria-label="Move to folder"
              >
                <FolderPlus className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Implement more options menu
                  setPopupOpen(true, tab, { x: e.clientX, y: e.clientY });
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white/60 hover:bg-white/20 transition-all"
                aria-label="More options"
              >
                <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Date */}
        {tab.timestamp && !isHovered && (
          <motion.span
            initial={{ opacity: 1 }}
            animate={{ opacity: isHovered ? 0 : 1 }}
            className="ml-auto flex items-center gap-1 text-[10px] text-[#505060]"
          >
            {getRelativeTime(tab.timestamp)}
          </motion.span>
        )}
      </motion.div>
    </div>
  );
}
