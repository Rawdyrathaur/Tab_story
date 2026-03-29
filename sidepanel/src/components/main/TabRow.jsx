import { useUIStore } from '../../store/useTabStore';
import { Badge } from '../ui/Badge';
import { Chip } from '../ui/Chip';
import { TAB_STATUS_VARIANT } from '../../constants/status';
import { memo, useCallback, useMemo } from 'react';

/**
 * TabRow component - displays a single tab in the list
 * @typedef {Object} TabRowProps
 * @property {Object} tab - Tab data
 * @property {Function} [onClick] - Click callback
 * @property {boolean} [isLastInGroup=false] - Last item in group
 */

const getBadgeVariant = (status) => {
  return TAB_STATUS_VARIANT[status] || 'toExplore';
};

const TabRow = memo(function TabRow({ tab, onClick, isLastInGroup = false }) {
  const setPopupOpen = useUIStore((state) => state.setPopupOpen);

  const getFaviconFallback = useCallback((domain) => {
    return (domain || 'Tab').charAt(0).toUpperCase();
  }, []);

  const handleClick = useCallback((e) => {
    if (!tab) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setPopupOpen(true, tab, { x: rect.right + 10, y: rect.top });
    if (onClick) onClick(tab);
  }, [tab, setPopupOpen, onClick]);

  const handleFaviconError = useCallback((e) => {
    e.target.style.display = 'none';
    e.target.nextSibling.style.display = 'flex';
  }, []);

  const faviconFallback = useMemo(() => getFaviconFallback(tab?.domain), [tab?.domain, getFaviconFallback]);
  const badgeVariant = useMemo(() => getBadgeVariant(tab?.status), [tab?.status]);

  if (!tab) return null;

  return (
    <div
      className="group flex h-11 items-center gap-2 rounded-lg hover:bg-white/4 cursor-pointer transition-colors"
      onClick={handleClick}
      role="listitem"
    >
      {/* Favicon */}
      <div className="shrink-0">
        {tab.favicon ? (
          <img
            src={tab.favicon}
            alt=""
            className="h-6 w-6 rounded-md object-cover"
            loading="lazy"
            onError={handleFaviconError}
          />
        ) : (
          <div className="h-6 w-6 flex items-center justify-center rounded-md bg-white/10 text-[10px] font-medium text-white">
            {faviconFallback}
          </div>
        )}
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
        <Badge variant={badgeVariant}>
          <span className="sr-only">{tab.status}</span>
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

      {!isLastInGroup && (
        <div className="ml-8 border-b border-white/4" aria-hidden="true" />
      )}
    </div>
  );
});

export default TabRow;
