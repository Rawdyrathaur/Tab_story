import { Plus, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTabStore } from '../../store/useTabStore';
import { Button } from '../ui/Button';

export default function NewIntentButton() {
  const addFolder = useTabStore((state) => state.addFolder);
  const setIsPopupOpen = useTabStore((state) => state.setPopupOpen);

  const handleClick = () => {
    // In a real implementation, this would show a dialog to create an intent
    // For now, it's a placeholder for the intent creation flow
    console.log('New Intent button clicked');
  };

  return (
    <Button
      variant="ghost"
      size="default"
      className="flex h-10 w-full items-center justify-between px-3 text-sm font-semibold text-white hover:bg-white/5 rounded-lg"
      onClick={handleClick}
    >
      <motion.div
        className="flex items-center gap-2"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Plus className="h-4.5 w-4.5 text-accent-purple" strokeWidth={2} />
        <span>New Intent</span>
      </motion.div>
      <ChevronDown className="h-4 w-4 text-white/50" strokeWidth={2} />
    </Button>
  );
}
