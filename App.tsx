
import React, { useState, useEffect, useMemo } from 'react';
import { ViewType, VaultEntry, UploadedFile } from './types';
import LandingView from './views/LandingView';
import UploadView from './views/UploadView';
import ChatView from './views/ChatView';
import VaultView from './views/VaultView';
import { processDocumentToChunks } from './services/geminiService';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.LANDING);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(false);
  const [restoredEntry, setRestoredEntry] = useState<VaultEntry | null>(null);
  
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const [vaultEntries, setVaultEntries] = useState<VaultEntry[]>(() => {
    const saved = localStorage.getItem('galaxy_vault_entries');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((e: any) => ({ ...e, timestamp: new Date(e.timestamp) }));
      } catch (e) { return []; }
    }
    return [];
  });

  useEffect(() => {
    const hasProcessing = uploadedFiles.some(f => f.status === 'processing');
    if (hasProcessing) {
      const timer = setInterval(() => {
        setUploadedFiles(prev => {
          let updated = false;
          const newFiles = prev.map(f => {
            if (f.status === 'processing') {
              updated = true;
              const nextProgress = f.progress + 10;
              if (nextProgress >= 100) {
                processDocumentToChunks(f.name, "Nội dung tài liệu.", f.id);
                return { ...f, progress: 100, status: 'completed' as const };
              }
              return { ...f, progress: nextProgress };
            }
            return f;
          });
          return updated ? newFiles : prev;
        });
      }, 300);
      return () => clearInterval(timer);
    }
  }, [uploadedFiles]);

  useEffect(() => {
    localStorage.setItem('galaxy_vault_entries', JSON.stringify(vaultEntries));
  }, [vaultEntries]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const addVaultEntry = (title: string, content: string) => {
    if (!isTrackingEnabled) return;
    const newEntry: VaultEntry = {
      id: Date.now().toString(),
      title: title.length > 100 ? title.substring(0, 100) + '...' : title,
      content,
      timestamp: new Date(),
      size: `${(content.length / 1024).toFixed(1)} KB`,
      status: 'cloud_upload'
    };
    setVaultEntries(prev => [newEntry, ...prev]);
  };

  const handleRestoreFromVault = (entry: VaultEntry) => {
    setRestoredEntry(entry);
    setCurrentView(ViewType.CHAT);
  };

  const handleQuickUpload = (files: FileList) => {
    const newFiles = Array.from(files).map((f: File) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: f.name,
      size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
      progress: 0,
      status: 'processing' as const,
      type: f.name.endsWith('.pdf') ? 'pdf' : f.name.match(/\.(jpg|jpeg|png)$/i) ? 'img' : 'docx' as any
    }));
    setUploadedFiles(prev => [...newFiles, ...prev]);
  };

  const globalProgress = useMemo(() => {
    if (uploadedFiles.length === 0) return null;
    const processingFiles = uploadedFiles.filter(f => f.status === 'processing');
    if (processingFiles.length === 0) return null;
    const sum = processingFiles.reduce((acc, f) => acc + f.progress, 0);
    return Math.round(sum / processingFiles.length);
  }, [uploadedFiles]);

  const renderView = () => {
    switch (currentView) {
      case ViewType.LANDING:
        return <LandingView onNavigate={setCurrentView} />;
      case ViewType.UPLOAD:
        return (
          <UploadView 
            onBack={() => setCurrentView(ViewType.LANDING)} 
            onComplete={() => setCurrentView(ViewType.CHAT)}
            uploadedFiles={uploadedFiles}
            setUploadedFiles={setUploadedFiles}
          />
        );
      case ViewType.CHAT:
        return (
          <ChatView 
            onBack={() => {
              setCurrentView(ViewType.LANDING);
              setRestoredEntry(null);
            }} 
            isTracking={isTrackingEnabled} 
            onAutoSave={addVaultEntry}
            restoredEntry={restoredEntry}
            processingProgress={globalProgress}
            onQuickUpload={handleQuickUpload}
          />
        );
      case ViewType.VAULT:
        return (
          <VaultView 
            onBack={() => setCurrentView(ViewType.LANDING)} 
            isTracking={isTrackingEnabled} 
            setIsTracking={setIsTrackingEnabled}
            entries={vaultEntries}
            setEntries={setVaultEntries}
            onRestore={handleRestoreFromVault}
          />
        );
      default:
        return <LandingView onNavigate={setCurrentView} />;
    }
  };

  const navItems = [
    { type: ViewType.LANDING, icon: 'home', label: 'Trang chủ' },
    { type: ViewType.UPLOAD, icon: 'cloud_upload', label: 'Tải học liệu' },
    { type: ViewType.CHAT, icon: 'chat', label: 'Hỏi AI' },
    { type: ViewType.VAULT, icon: 'verified_user', label: 'Bảo mật' },
  ];

  return (
    <div className="relative w-full min-h-screen bg-background-light dark:bg-background-dark flex flex-row overflow-hidden text-slate-900 dark:text-slate-100">
      
      {/* Dark Mode Toggle */}
      <button 
        onClick={toggleDarkMode}
        className="fixed top-4 right-4 md:top-6 md:right-6 z-[100] p-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 hover:scale-110 active:scale-95 transition-all text-primary"
      >
        <span className="material-symbols-outlined block">
          {isDarkMode ? 'light_mode' : 'dark_mode'}
        </span>
      </button>

      {/* Desktop Sidebar Nav */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 shadow-soft">
        <div className="p-6 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-glow">
            <span className="material-symbols-outlined text-[24px]">public</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-widest text-primary uppercase leading-tight">Địa AI</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Học liệu số thông minh</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.type}
              onClick={() => {
                setCurrentView(item.type);
                if (item.type !== ViewType.CHAT) setRestoredEntry(null);
              }}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                currentView === item.type
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <div className="flex-1 text-left flex items-center justify-between">
                <span>{item.label}</span>
              </div>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col h-screen overflow-hidden">
        {renderView()}
      </main>
    </div>
  );
};

export default App;
