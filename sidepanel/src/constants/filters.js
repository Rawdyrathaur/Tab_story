/**
 * Filter Constants - Define all filter options here
 * @version 1.0
 *
 * Usage:
 *   import { FILTER } from '../constants/filters'
 *   Then: FILTER.RESEARCH or FILTER.STUDY
 *
 * Example:
 *   const activeFilter = FILTER.RESEARCH;
 *   console.log(activeFilter.name); // 'Research'
 *   console.log(activeFilter.color); // '#5B9CF6'
 */

export const FILTER = Object.freeze({
  RESEARCH: {
    id: 'filter-research',
    name: 'Research',
    variant: 'research',
    color: '#5B9CF6',
    bgColor: 'rgba(91, 156, 246, 0.18)',
    borderColor: 'rgba(91, 156, 246, 0.35)',
    icon: 'Search',
    description: 'Research and reference materials'
  },
  STUDY: {
    id: 'filter-study',
    name: 'Study',
    variant: 'study',
    color: '#50C878',
    bgColor: 'rgba(80, 200, 120, 0.18)',
    borderColor: 'rgba(80, 200, 120, 0.35)',
    icon: 'FileText',
    description: 'Learning and educational content'
  },
  TODO: {
    id: 'filter-todo',
    name: 'To-Do',
    variant: 'todo',
    color: '#D4A832',
    bgColor: 'rgba(212, 168, 50, 0.18)',
    borderColor: 'rgba(212, 168, 50, 0.35)',
    icon: 'CheckCircle2',
    description: 'Tasks and action items'
  }
});

// Helper only for complex logic - getting filter by name
export function getFilterByName(name) {
  return Object.values(FILTER).find(f => f.name === name) ?? null;
}

// Helper for getting variant from name
export function getFilterVariant(name) {
  const filter = getFilterByName(name);
  return filter?.variant ?? FILTER.RESEARCH.variant;
}

// Export as array if needed elsewhere
export const FILTER_ARRAY = Object.values(FILTER);

// Export names array for simple uses
export const FILTER_NAMES = FILTER_ARRAY.map(f => f.name);
