/**
 * Time Section Constants - Define all timeline sections here
 * @version 1.0
 *
 * Usage:
 *   import { TIME_SECTION } from '../constants/time'
 *   Then: TIME_SECTION.TODAY or TIME_SECTION.YESTERDAY
 *
 * Example:
 *   const section = TIME_SECTION.TODAY;
 *   console.log(section.label); // 'TODAY'
 *   console.log(section.id);    // 'today'
 */

export const TIME_SECTION = Object.freeze({
  TODAY: {
    id: 'today',
    label: 'TODAY',
    description: 'Tabs from today',
    hours: 24,
    color: 'text-accent-purple',
    icon: 'Calendar'
  },
  YESTERDAY: {
    id: 'yesterday',
    label: 'YESTERDAY',
    description: 'Tabs from yesterday',
    hours: 48,
    color: 'text-accent-blue',
    icon: 'Clock'
  },
  WEEK: {
    id: 'week',
    label: 'THIS WEEK',
    description: 'Tabs from this week',
    days: 7,
    color: 'text-accent-green',
    icon: null
  },
  OLDER: {
    id: 'older',
    label: 'OLDER',
    description: 'Tabs older than a week',
    days: 7,
    color: 'text-[#505060]',
    icon: null
  }
});

// Helper for getting section by id
export function getTimeSectionById(id) {
  return Object.values(TIME_SECTION).find(s => s.id === id) ?? null;
}

// Helper for determining which section a timestamp belongs to
export function getTimeSectionForTimestamp(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const hours = diff / (1000 * 60 * 60);
  const days = diff / (1000 * 60 * 60 * 24);

  if (hours < 24) return TIME_SECTION.TODAY;
  if (hours < 48) return TIME_SECTION.YESTERDAY;
  if (days < 7) return TIME_SECTION.WEEK;
  return TIME_SECTION.OLDER;
}

// Export as array if needed
export const TIME_SECTION_ARRAY = Object.values(TIME_SECTION);

// Default empty time sections structure
export const DEFAULT_TIME_SECTIONS = Object.freeze({
  today: { id: TIME_SECTION.TODAY.id, label: TIME_SECTION.TODAY.label, tabs: [] },
  yesterday: { id: TIME_SECTION.YESTERDAY.id, label: TIME_SECTION.YESTERDAY.label, tabs: [] },
  week: { id: TIME_SECTION.WEEK.id, label: TIME_SECTION.WEEK.label, tabs: [] },
  older: { id: TIME_SECTION.OLDER.id, label: TIME_SECTION.OLDER.label, tabs: [] }
});
