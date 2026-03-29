import { cn } from '../../lib/cn';
import { memo } from 'react';

/**
 * MainPanel component for content area
 * @typedef {Object} MainPanelProps
 * @property {React.ReactNode} [children] - Child components
 * @property {string} [className] - Additional CSS classes
 */

const MainPanel = memo(function MainPanel({ children, className }) {
  return (
    <main className={cn('flex flex-1 flex-col bg-background-base overflow-hidden', className)}>
      <div className="flex-1 overflow-y-auto p-0">
        {children}
      </div>
    </main>
  );
});

export default MainPanel;
