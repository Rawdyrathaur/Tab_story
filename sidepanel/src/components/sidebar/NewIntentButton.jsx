import { Plus, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTabStore } from '../../store/useTabStore';
import { Button } from '../ui/Button';

export default function NewIntentButton() {
  const addFolder = useTabStore((state) => state.addFolder);
  const setIsPopupOpen = useTabStore((state) => state.setPopupOpen);

  const handleClick = () => {
    const intentName = prompt('Enter intent name:');
    if (intentName && intentName.trim()) {
      addFolder(intentName.trim());
    }
  };

  return (
    <Button
      variant="ghost"
      size="default"
      className="flex h-11 w-full items-center justify-between px-3 text-[13px] font-medium text-white/90 hover:bg-white/5 hover:translate-x-1 hover:text-white transition-all rounded-lg border border-transparent hover:border-white/8"
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
