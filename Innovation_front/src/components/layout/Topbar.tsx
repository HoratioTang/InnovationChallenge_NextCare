import type { FC } from 'react';
import { Bell } from 'lucide-react';
import PsychologyIcon from '@mui/icons-material/Psychology';

export const Topbar: FC = () => {
  return (
    <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shrink-0">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center">
          <PsychologyIcon className="text-blue-600 scale-x-[-1]" sx={{ fontSize: 32 }} />
        </div>
        <span className="text-xl font-bold tracking-tight text-slate-800">NextCare</span>
      </div>

      <div className="flex items-center gap-6">
        <nav className="flex items-center gap-6 mr-4">
          <button className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">Support</button>
          <button className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">Settings</button>
        </nav>
        
        <div className="flex items-center gap-4">
          <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-full relative">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </button>
          <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden">
            <img 
              src="https://picsum.photos/seed/user123/100/100" 
              alt="User" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
