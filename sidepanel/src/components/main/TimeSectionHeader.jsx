import { memo } from 'react';

/**
 * TimeSectionHeader component - section label for tab groups
 * @typedef {Object} TimeSectionHeaderProps
 * @property {string} label - Section label (TODAY, YESTERDAY, etc.)
 */

const TimeSectionHeader = memo(function TimeSectionHeader({ label }) {
  return (
    <div className="px-4 py-4 pb-2">
      <h2 className="text-[11px] font-bold tracking-widest text-[#7A7A90] uppercase">
        {label}
      </h2>
    </div>
  );
});

export default TimeSectionHeader;
