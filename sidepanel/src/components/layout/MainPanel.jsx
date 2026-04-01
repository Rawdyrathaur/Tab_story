import { ScrollArea } from '@radix-ui/react-scroll-area';
import { cn } from '../../lib/cn';

export default function MainPanel({ children, className }) {
  return (
    <main
      className={cn('flex flex-1 flex-col bg-background-base overflow-hidden', className)}
    >
      <ScrollArea className="flex-1">
        <div className="px-5 py-4">
          {children}
        </div>
      </ScrollArea>
    </main>
  );
}
