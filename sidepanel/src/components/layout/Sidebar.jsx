import { ScrollArea } from '@radix-ui/react-scroll-area';
import { cn } from '../../lib/cn';

export default function Sidebar({ children, className }) {
  return (
    <aside
      className={cn('flex w-60 flex-col bg-background-sidebar border-r border-white/6', className)}
    >
      <ScrollArea className="flex-1">
        <div className="px-3 py-2">
          {children}
        </div>
      </ScrollArea>
    </aside>
  );
}
