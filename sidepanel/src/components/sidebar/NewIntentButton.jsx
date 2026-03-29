import { Plus, ChevronDown } from 'lucide-react';
import { useUIStore } from '../../store/useTabStore';
import { Button } from '../ui/Button';
import { memo, useCallback } from 'react';

/**
 * NewIntentButton component
 * @typedef {Object} NewIntentButtonProps
 */

const NewIntentButton = memo(function NewIntentButton() {
  const setPopupOpen = useUIStore((state) => state.setPopupOpen);

  const handleClick = useCallback(() => {
    // Show intent creation dialog
    setPopupOpen(true, null, { x: 0, y: 0 });
  }, [setPopupOpen]);

  return (
    <Button
      variant="ghost"
      size="default"
      className="flex h-10 w-full items-center justify-between px-3 text-sm font-semibold text-white hover:bg-white/5 rounded-lg"
      onClick={handleClick}
    >
      <div className="flex items-center gap-2">
        <Plus className="h-4.5 w-4.5 text-accent-purple" strokeWidth={2} />
        <span>New Intent</span>
      </div>
      <ChevronDown className="h-4 w-4 text-white/50" strokeWidth={2} />
    </Button>
  );
});

export default NewIntentButton;
