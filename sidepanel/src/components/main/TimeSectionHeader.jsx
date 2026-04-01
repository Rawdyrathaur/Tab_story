import { Calendar, Clock } from 'lucide-react';
import { getTimeSectionById } from '../../constants';

// Icon component mapping
const iconMap = {
  Calendar: Calendar,
  Clock: Clock,
};

export default function TimeSectionHeader({ label, count = 0 }) {
  const section = getTimeSectionById(label.toLowerCase().replace(' ', '_'));

  const getIcon = () => {
    if (!section || !section.icon) return null;

    const IconComponent = iconMap[section.icon];
    if (!IconComponent) return null;

    return <IconComponent className="h-3.5 w-3.5" strokeWidth={2} style={{ color: section.color.replace('text-', '') }} />;
  };

  const getColor = () => {
    return section?.color ?? 'text-[#505060]';
  };

  return (
    <div className="sticky top-0 z-10 py-3 bg-background-base/95 backdrop-blur-sm border-b border-white/4">
      <div className="flex items-center gap-2.5">
        {getIcon()}
        <h2 className={`text-[11px] font-bold tracking-widest uppercase ${getColor()}`}>
          {label}
        </h2>
        {count > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/8 text-[10px] font-medium text-white/60">
            {count}
          </span>
        )}
      </div>
    </div>
  );
}
