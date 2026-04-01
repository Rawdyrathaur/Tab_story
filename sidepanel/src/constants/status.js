/**
 * Status Constants - Define all tab statuses here
 * @version 1.0
 *
 * Usage:
 *   import { STATUS } from '../constants/status'
 *   Then: STATUS.DONE or STATUS.IN_PROGRESS
 *
 * Example:
 *   const statusBadge = STATUS.IN_PROGRESS;
 *   console.log(statusBadge.label); // 'In Progress'
 *   console.log(statusBadge.color); // '#5B9CF6'
 */

export const STATUS = Object.freeze({
  DONE: {
    id: 'done',
    label: 'Done',
    variant: 'done',
    color: '#50C878',
    bgColor: 'rgba(80, 200, 120, 0.18)',
    borderColor: 'rgba(80, 200, 120, 0.35)',
    icon: '✓',
    description: 'Completed tasks'
  },
  IN_PROGRESS: {
    id: 'in_progress',
    label: 'In Progress',
    variant: 'inProgress',
    color: '#5B9CF6',
    bgColor: 'rgba(91, 156, 246, 0.18)',
    borderColor: 'rgba(91, 156, 246, 0.35)',
    icon: '▶',
    description: 'Currently working on'
  },
  TO_EXPLORE: {
    id: 'to_explore',
    label: 'To Explore',
    variant: 'toExplore',
    color: '#D4A832',
    bgColor: 'rgba(212, 168, 50, 0.18)',
    borderColor: 'rgba(212, 168, 50, 0.35)',
    icon: '○',
    description: 'Not started, to be explored'
  }
});

// Helper only for complex logic - getting status by label string
export function getStatusByLabel(label) {
  return Object.values(STATUS).find(s => s.label === label) ?? null;
}

// Helper for getting variant from label
export function getStatusVariant(label) {
  const status = getStatusByLabel(label);
  return status?.variant ?? STATUS.TO_EXPLORE.variant;
}

// Export as array if needed elsewhere (e.g., for dropdowns)
export const STATUS_ARRAY = Object.values(STATUS);

// Export labels array for simple uses
export const STATUS_LABELS = STATUS_ARRAY.map(s => s.label);

// Default status for new tabs
export const DEFAULT_STATUS = STATUS.TO_EXPLORE;
