import { Search as SearchIcon } from 'lucide-react';
import { useUIStore } from '../../store/useTabStore';
import { FILTER_OPTIONS } from '../../constants/ui';
import { Chip } from '../ui/Chip';
import { memo, useCallback } from 'react';

/**
 * FilterChips component - filter tabs by status
 * @typedef {Object} FilterChipsProps
 */

const FilterChips = memo(function FilterChips() {
  const activeFilter = useUIStore((state) => state.activeFilter);
  const setActiveFilter = useUIStore((state) => state.setActiveFilter);

  const handleFilterClick = useCallback((filter) => {
    setActiveFilter(activeFilter === filter ? null : filter);
  }, [activeFilter, setActiveFilter]);

  return (
    <div className="ml-4 mt-3 flex gap-2 flex-wrap" role="group" aria-label="Filter tabs by status">
      {FILTER_OPTIONS.map((filter) => {
        const isActive = activeFilter === filter;
        const variant = filter.toLowerCase();

        return (
          <Chip
            key={filter}
            variant={variant}
            size="filter"
            showDot={isActive}
            onClick={handleFilterClick}
            className={isActive ? 'cursor-pointer flex-shrink-0 ring-1 ring-white/20' : 'cursor-pointer flex-shrink-0'}
          >
            {filter === 'Research' && <SearchIcon className="h-3 w-3 flex-shrink-0" strokeWidth={2} />}
            <span className="whitespace-nowrap">{filter}</span>
          </Chip>
        );
      })}
    </div>
  );
});

export default FilterChips;
