import { Search as SearchIcon, FileText, CheckCircle2 } from 'lucide-react';
import { useTabStore } from '../../store/useTabStore';
import { Chip } from '../ui/Chip';
import { FILTER } from '../../constants';

// Icon component mapping
const iconMap = {
  Search: SearchIcon,
  FileText: FileText,
  CheckCircle2: CheckCircle2,
};

export default function FilterChips() {
  const activeFilter = useTabStore((state) => state.activeFilter);
  const setActiveFilter = useTabStore((state) => state.setActiveFilter);

  const filters = [
    { ...FILTER.RESEARCH, icon: iconMap[FILTER.RESEARCH.icon] },
    { ...FILTER.STUDY, icon: iconMap[FILTER.STUDY.icon] },
    { ...FILTER.TODO, icon: iconMap[FILTER.TODO.icon] },
  ];

  return (
    <div className="mt-4 flex items-center gap-2">
      <span className="text-[10px] font-semibold tracking-wider text-white/35 uppercase mr-1">
        Filter by:
      </span>
      {filters.map((filter) => {
        const isActive = filter.name === activeFilter;

        return (
          <Chip
            key={filter.id}
            variant={isActive ? filter.variant : 'default'}
            size="filter"
            showDot={isActive}
            onClick={() => setActiveFilter(isActive ? null : filter.name)}
            className="cursor-pointer hover:scale-105 transition-transform"
          >
            <filter.icon className="h-3 w-3" strokeWidth={2} />
            {filter.name}
          </Chip>
        );
      })}
    </div>
  );
}
