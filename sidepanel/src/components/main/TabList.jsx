import { useMemo } from 'react';
import { useTimeSections } from '../../hooks/useTimeSections';
import TimeSectionHeader from './TimeSectionHeader';
import GroupCard from './GroupCard';
import { FileText } from 'lucide-react';
import { memo } from 'react';

/**
 * TabList component - list of time-sectioned tabs
 * @typedef {Object} TabListProps
 */

const TabList = memo(function TabList() {
  const timeSections = useTimeSections();

  const allSections = useMemo(() => {
    return Object.values(timeSections).filter((section) =>
      section.tabs && section.tabs.length > 0
    );
  }, [timeSections]);

  if (allSections.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center p-8">
        <FileText className="h-16 w-16 mb-4 text-white/20" strokeWidth={1.5} />
        <h3 className="text-lg font-semibold text-white mb-2">No tabs yet</h3>
        <p className="text-sm text-[#A0A0B0]">
          Tabs you save will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4 space-y-3">
      {allSections.map((section) => (
        <div key={section.id}>
          <TimeSectionHeader label={section.label} />

          {/* Render tabs as group cards */}
          {section.tabs.map((tab) => (
            <GroupCard
              key={tab.id}
              group={{
                id: tab.id,
                name: tab.title,
                favicon: tab.favicon,
              }}
              tabs={[tab]}
            />
          ))}
        </div>
      ))}
    </div>
  );
});

export default TabList;
