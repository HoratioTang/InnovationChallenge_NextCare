import { useState, type FC, type ReactNode } from 'react';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: ReactNode;
  onNavigate?: (page: string) => void;
  currentPage?: string;
}

export const Layout: FC<LayoutProps> = ({ children, onNavigate, currentPage }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          onNavigate={onNavigate}
          currentPage={currentPage}
        />
        <main className="flex-1 flex flex-col relative overflow-y-auto">
          {children}
          <footer className="py-6 text-center border-t border-slate-100 mt-auto">
            <p className="text-slate-400 text-xs">
              © 2025 NextCare All rights reserved.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
};
