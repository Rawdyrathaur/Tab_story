import { MoreHorizontal, ChevronDown } from 'lucide-react';
import { useState, useCallback } from 'react';
import TabRow from './TabRow';
import { memo } from 'react';

/**
 * GroupCard component - collapsible card for tab groups
 * @typedef {Object} GroupCardProps
 * @property {Object} group - Group data
 * @property {Array} [tabs=[]] - Tabs in group
 */

const GroupCard = memo(function GroupCard({ group, tabs = [] }) {
  const [isOpen, setIsOpen] = useState(true);

  const handleMenuClick = useCallback((e) => {
    e.stopPropagation();
    // TODO: Implement group menu
  }, []);

  const handleToggle = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  return (
    <div className="mx-4 mb-3 rounded-xl bg-background-elevated border border-white/6 p-3.5">
      {/* Group Header */}
      <button
        className="flex w-full items-center gap-2 text-left outline-none"
        onClick={handleToggle}
        aria-label={`Toggle ${group.name} group`}
        aria-expanded={isOpen}
        type="button"
      >
        {group.favicon && (
          <img
            src={group.favicon}
            alt=""
            className="h-7 w-7 rounded-lg object-cover"
            loading="lazy"
          />
        )}
        <span className="flex-1 truncate text-sm font-semibold text-white">
          {group.name}
        </span>
        <button
          onClick={handleMenuClick}
          className="ml-2 text-[#606070] hover:text-white/80 transition-colors"
          aria-label="More options for group"
          type="button"
        >
          <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
        </button>
        <ChevronDown
          className={`h-4 w-4 text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          strokeWidth={2}
        />
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="mt-2 flex flex-col gap-0" role="list">
          {tabs.length > 0 ? (
            tabs.map((tab, index) => (
              <TabRow key={tab.id} tab={tab} isLastInGroup={index === tabs.length - 1} />
            ))
          ) : (
            <div className="py-4 text-center text-sm text-[#505060]" aria-live="polite">
              No tabs in this group
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default GroupCard;
