import * as Popover from '@radix-ui/react-popover';
import * as Portal from '@radix-ui/react-portal';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Share, Move, Circle, ArrowRight, ExternalLink } from 'lucide-react';
import { useTabStore } from '../../store/useTabStore';
import { Chip } from '../ui/Chip';
import { Button } from '../ui/Button';

export default function TabDetailPopup() {
  const isPopupOpen = useTabStore((state) => state.isPopupOpen);
  const selectedTab = useTabStore((state) => state.selectedTab);
  const setPopupOpen = useTabStore((state) => state.setPopupOpen);

  const handleClose = () => {
    setPopupOpen(false);
  };

  if (!selectedTab || !isPopupOpen) return null;

  const handleOpen = () => {
    if (selectedTab.url) {
      chrome.tabs.create({ url: selectedTab.url });
    }
    handleClose();
  };

  const handleShare = () => {
    if (selectedTab.url) {
      navigator.clipboard.writeText(selectedTab.url);
    }
    handleClose();
  };

  return (
    <Portal.Root>
      <Popover.Root open={isPopupOpen} onOpenChange={handleClose}>
        <Popover.Portal forceMount>
          <Popover.Content
            sideOffset={8}
            align="start"
            className="z-50 w-72 rounded-2xl bg-background-popup border border-white/12 shadow-popup outline-none"
          >
            <AnimatePresence>
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                transition={{ type: 'spring', duration: 0.3 }}
                className="overflow-hidden rounded-2xl"
              >
                {/* Header */}
                <div className="flex items-start gap-2.5 p-3.5 pb-2.5">
                  {selectedTab.favicon && (
                    <img
                      src={selectedTab.favicon}
                      alt=""
                      className="h-7 w-7 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <h3 className="truncate text-xs font-semibold text-white">
                      {selectedTab.title}
                    </h3>
                    <span className="text-[11px] text-gray-400">
                      {selectedTab.domain || new URL(selectedTab.url || '').hostname || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        // TODO: Implement favorite/bookmark functionality
                      }}
                      className="text-gray-400 hover:text-accent-amber transition-colors"
                      aria-label="Add to favorites"
                    >
                      <Circle className="h-4.5 w-4.5" strokeWidth={2} />
                    </button>
                    <button
                      onClick={handleClose}
                      className="text-gray-400 hover:text-white/80 transition-colors"
                      aria-label="Close"
                    >
                      <ArrowRight className="h-4.5 w-4.5 rotate-90" strokeWidth={2} />
                    </button>
                  </div>
                </div>

                {/* Tags */}
                {selectedTab.tags && selectedTab.tags.length > 0 && (
                  <div className="px-3.5 pb-1.5">
                    {selectedTab.tags.slice(0, 1).map((tag) => (
                      <Chip key={tag} variant="tag" size="sm">
                        {tag}
                      </Chip>
                    ))}
                  </div>
                )}

                {/* Preview Image */}
                <div className="mx-2.5 mb-2.5 h-20 overflow-hidden rounded-lg bg-white/5 relative">
                  {selectedTab.favicon && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img
                        src={selectedTab.favicon}
                        alt=""
                        className="h-8 w-8 opacity-20 blur-sm"
                      />
                    </div>
                  )}
                  {/* Simulated content preview */}
                  <div className="absolute inset-x-0 bottom-2 px-2.5">
                    <div className="space-y-1">
                      <div className="h-1.5 w-3/4 rounded bg-white/10" />
                      <div className="h-1.5 w-full rounded bg-white/5" />
                      <div className="h-1.5 w-1/2 rounded bg-white/5" />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 p-2.5 px-3.5 border-t border-white/6">
                  <Button
                    variant="ghost"
                    className="flex-1 h-8 gap-1.5 bg-white/8 hover:bg-white/14 rounded-lg"
                    onClick={handleOpen}
                  >
                    <Play className="h-3 w-3" strokeWidth={2} />
                    <span>Open</span>
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1 h-8 gap-1.5 bg-white/8 hover:bg-white/14 rounded-lg"
                    onClick={handleShare}
                  >
                    <Share className="h-3 w-3" strokeWidth={2} />
                    <span>Share</span>
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1 h-8 gap-1.5 bg-white/8 hover:bg-white/14 rounded-lg"
                    onClick={() => {
                      // TODO: Implement move to folder functionality
                      handleClose();
                    }}
                  >
                    <Move className="h-3 w-3" strokeWidth={2} />
                    <span>Move</span>
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </Portal.Root>
  );
}
