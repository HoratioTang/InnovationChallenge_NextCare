import type { FC } from 'react';
import { 
  LayoutGrid, 
  History, 
  Users, 
  Settings, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onNavigate?: (page: string) => void;
}

export const Sidebar: FC<SidebarProps> = ({ isOpen, onToggle, onNavigate }) => {
  const sidebarItems = [
    { icon: LayoutGrid, label: 'Dashboard', active: true, page: 'recording' },
    { icon: History, label: 'History', active: false, page: '' },
    { icon: Users, label: 'Patients', active: false, page: '' },
    { icon: Settings, label: 'Settings', active: false, page: '' },
  ];

  return (
    <motion.aside 
      initial={false}
      animate={{ width: isOpen ? 240 : 80 }}
      className="bg-white border-r border-slate-200 flex flex-col items-center py-8 relative shrink-0"
    >
      <nav className="flex flex-col gap-4 w-full px-4 flex-1">
        {sidebarItems.map((item, idx) => (
          <button
            key={idx}
            onClick={() => item.page && onNavigate?.(item.page)}
            className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-200 w-full ${
              item.active
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
            }`}
          >
            <div className="shrink-0">
              <item.icon size={24} />
            </div>
            <AnimatePresence mode="wait">
              {isOpen && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="font-medium whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        ))}
      </nav>

      <div className="px-4 w-full">
        <button 
          onClick={onToggle}
          className="flex items-center gap-4 p-3 text-slate-400 hover:bg-slate-50 rounded-xl w-full transition-all"
        >
          <div className="shrink-0">
            {isOpen ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
          </div>
          <AnimatePresence>
            {isOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-medium whitespace-nowrap"
              >
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
};
