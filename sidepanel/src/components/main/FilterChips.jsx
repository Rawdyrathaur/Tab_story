import { Search as SearchIcon } from 'lucide-react';
import { useTabStore } from '../../store/useTabStore';
import { Chip } from '../ui/Chip';

export default function FilterChips() {
  const activeFilter = useTabStore((state) => state.activeFilter);
  const setActiveFilter = useTabStore((state) => state.setActiveFilter);

  const filters = ['Research', 'Study', 'To-Do'];

  return (
    <div className="ml-4 mt-2.5 flex gap-2">
      {filters.map((filter) => {
        const variant = filter === activeFilter
          ? 'study'
          : filter.toLowerCase();

        return (
          <Chip
            key={filter}
            variant={variant}
            size="filter"
            showDot={filter === activeFilter}
            onClick={() => setActiveFilter(filter === activeFilter ? null : filter)}
            className="cursor-pointer"
          >
            {filter === 'Research' && <SearchIcon className="h-3 w-3" strokeWidth={2} />}
            {filter}
          </Chip>
        );
      })}
    </div>
  );
}
