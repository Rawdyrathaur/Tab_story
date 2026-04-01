import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { useTabStore } from '../../store/useTabStore';
import { FolderOpen } from 'lucide-react';
import TimeSectionHeader from './TimeSectionHeader';
import GroupCard from './GroupCard';

export default function TabList() {
  const containerRef = useRef(null);
  const timeSections = useTabStore((state) => state.timeSections);
  const folders = useTabStore((state) => state.folders);

  // Combine time sections with folders for virtual scrolling
  const allItems = Object.values(timeSections).filter(section =>
    section.tabs && section.tabs.length > 0
  );

  const virtualizer = useVirtualizer({
    count: allItems.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 200, // Estimated height per section
    overscan: 2,
  });

  const virtualRows = virtualizer.getVirtualItems();

  if (allItems.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 mb-4">
          <FolderOpen className="h-8 w-8 text-white/20" strokeWidth={1.5} />
        </div>
        <h3 className="text-[16px] font-medium text-white/90 mb-2">No tabs yet</h3>
        <p className="text-[12px] text-[#707080]">
          Start by creating a new intent to organize your tabs
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col overflow-auto"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualRows.map((virtualRow) => {
          const section = allItems[virtualRow.index];

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <TimeSectionHeader label={section.label} count={section.tabs.length} />

              {/* Render tabs as group cards */}
              <div className="flex flex-col gap-0">
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
