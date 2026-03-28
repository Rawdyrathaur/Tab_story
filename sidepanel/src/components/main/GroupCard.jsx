import * as Collapsible from '@radix-ui/react-collapsible';
import { MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import TabRow from './TabRow';

export default function GroupCard({ group, tabs = [] }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible.Root open={isOpen} onOpenChange={setIsOpen}>
      <div className="mx-4 mb-3 rounded-xl bg-background-elevated border border-white/6 p-3.5">
        {/* Group Header */}
        <Collapsible.Trigger asChild>
          <button className="flex w-full items-center gap-2 text-left outline-none">
            {/* Favicon */}
            {group.favicon && (
              <img
                src={group.favicon}
                alt=""
                className="h-7 w-7 rounded-lg object-cover"
              />
            )}

            {/* Group Name */}
            <span className="flex-1 truncate text-sm font-semibold text-white">
              {group.name}
            </span>

            {/* Menu Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log('Menu clicked for', group.id);
              }}
              className="ml-2 text-[#606070] hover:text-white/80 transition-colors"
              aria-label="More options"
            >
              <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
            </button>
          </button>
        </Collapsible.Trigger>

        {/* Collapsible Content */}
        <Collapsible.Content asChild>
          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="mt-2 flex flex-col gap-0">
                  {tabs.length > 0 ? (
                    tabs.map((tab, index) => (
                      <div key={tab.id}>
                        <TabRow tab={tab} />
                        {index < tabs.length - 1 && (
                          <div className="ml-8 border-b border-white/4" />
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="py-4 text-center text-sm text-[#505060]">
                      No tabs in this group
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Collapsible.Content>
      </div>
    </Collapsible.Root>
  );
}
