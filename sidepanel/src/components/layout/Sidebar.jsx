import { cn } from '../../lib/cn';
import { memo } from 'react';

/**
 * Sidebar component for navigation and folder tree
 * @typedef {Object} SidebarProps
 * @property {React.ReactNode} [children] - Child components
 * @property {string} [className] - Additional CSS classes
 */

const Sidebar = memo(function Sidebar({ children, className }) {
  return (
    <aside className={cn('flex w-72 flex-shrink-0 flex-col bg-background-sidebar border-r border-white/6', className)}>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {children}
      </div>
    </aside>
  );
});

export default Sidebar;
