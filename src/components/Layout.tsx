import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, GearSix, Trash, List, SignOut } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { Badge } from './ui/badge';

type ViewType = 'frontend' | 'backoffice' | 'trash';

interface LayoutProps {
  children: ReactNode;
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  trashCount: number;
}

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

function SidebarContent({ currentView, onViewChange, trashCount, logout, onNavigate }: {
  currentView: ViewType;
  onViewChange: (v: ViewType) => void;
  trashCount: number;
  logout: () => void;
  onNavigate?: () => void;
}) {
  const navItems: { id: ViewType; label: string; icon: React.ReactNode }[] = [
    { id: 'frontend', label: 'Mis Zonas', icon: <Package className="w-5 h-5" /> },
    { id: 'backoffice', label: 'Back Office', icon: <GearSix className="w-5 h-5" /> },
    { id: 'trash', label: 'Papelera', icon: <Trash className="w-5 h-5" /> },
  ];

  return (
    <>
      <div className="p-5 shrink-0">
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <img src="/logo.jpg" alt="Sistema Tarjetas" className="w-10 h-10 rounded-2xl object-cover" />
          <div>
            <span className="font-bold text-foreground text-sm">Sistema</span>
            <span className="block text-[11px] text-muted-foreground font-medium">Tarjetas</span>
          </div>
        </motion.div>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            whileTap={{ scale: 0.97 }}
            onClick={() => { onViewChange(item.id); onNavigate?.(); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 ${
              currentView === item.id
                ? 'bg-white text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/50'
            }`}
          >
            {item.icon}
            <span className="flex-1 text-left">{item.label}</span>
            {item.id === 'trash' && trashCount > 0 && (
              <Badge variant="destructive" className="px-2 py-0.5 text-[10px]">
                {trashCount}
              </Badge>
            )}
          </motion.button>
        ))}
      </nav>

      <div className="p-3 shrink-0">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
        >
          <SignOut className="w-5 h-5" />
          Cerrar Sesion
        </motion.button>
      </div>
    </>
  );
}

export default function Layout({ children, currentView, onViewChange, trashCount }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 lg:left-0 bg-secondary/50 z-30">
        <SidebarContent
          currentView={currentView}
          onViewChange={onViewChange}
          trashCount={trashCount}
          logout={logout}
        />
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring' as const, stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 left-0 z-50 w-64 bg-white flex flex-col lg:hidden"
          >
            <SidebarContent
              currentView={currentView}
              onViewChange={onViewChange}
              trashCount={trashCount}
              logout={logout}
              onNavigate={() => setMobileOpen(false)}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 lg:ml-60">
        <header className="h-14 sm:h-16 bg-background/80 backdrop-blur-xl flex items-center px-4 sm:px-6 gap-4 sticky top-0 z-20">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-xl hover:bg-secondary text-muted-foreground transition-colors"
          >
            <List className="w-5 h-5" />
          </motion.button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-9 h-9 bg-primary/10 rounded-2xl flex items-center justify-center cursor-pointer"
            >
              <span className="text-sm font-bold text-primary">A</span>
            </motion.div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
