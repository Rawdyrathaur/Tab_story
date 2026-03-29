import { useMemo } from 'react';
import { useTabStore } from '../store/useTabStore';
import { useUIStore } from '../store/useTabStore';

/**
 * Group tabs by time
 */
const groupTabsByTime = (tabs) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const week = new Date(today);
  week.setDate(week.getDate() - 7);

  const groups = {
    today: { id: 'today', label: 'TODAY', tabs: [] },
    yesterday: { id: 'yesterday', label: 'YESTERDAY', tabs: [] },
    week: { id: 'week', label: 'THIS WEEK', tabs: [] },
    older: { id: 'older', label: 'OLDER', tabs: [] },
  };

  tabs.forEach((tab) => {
    const tabDate = new Date(tab.timestamp || tab.createdAt);
    if (tabDate >= today) {
      groups.today.tabs.push(tab);
    } else if (tabDate >= yesterday) {
      groups.yesterday.tabs.push(tab);
    } else if (tabDate >= week) {
      groups.week.tabs.push(tab);
    } else {
      groups.older.tabs.push(tab);
    }
  });

  return groups;
};

/**
 * Hook for filtered tabs grouped by time
 */
export const useTimeSections = () => {
  const tabs = useTabStore((state) => state.tabs);
  const activeFilter = useUIStore((state) => state.activeFilter);
  const searchQuery = useUIStore((state) => state.searchQuery);

  return useMemo(() => {
    let filteredTabs = [...tabs];

    if (activeFilter) {
      const filterMap = {
        Research: 'To Explore',
        Study: 'In Progress',
        'To-Do': 'Done',
      };
      const targetStatus = filterMap[activeFilter];
      if (targetStatus) {
        filteredTabs = filteredTabs.filter((tab) => tab.status === targetStatus);
      }
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredTabs = filteredTabs.filter(
        (tab) =>
          (tab.title?.toLowerCase().includes(query) ||
            tab.domain?.toLowerCase().includes(query) ||
            tab.tags?.some((tag) => tag.toLowerCase().includes(query)))
      );
    }

    return groupTabsByTime(filteredTabs);
  }, [tabs, activeFilter, searchQuery]);
};
