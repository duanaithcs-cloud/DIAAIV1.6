
import React, { useState, useRef } from 'react';
import { VaultEntry } from '../types';

interface VaultViewProps {
  onBack: () => void;
  isTracking: boolean;
  setIsTracking: (val: boolean) => void;
  entries: VaultEntry[];
  setEntries: React.Dispatch<React.SetStateAction<VaultEntry[]>>;
  onRestore: (entry: VaultEntry) => void;
}

const VaultView: React.FC<VaultViewProps> = ({ onBack, isTracking, setIsTracking, entries, setEntries, onRestore }) => {
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success'>('idle');
  const [selectedCloud, setSelectedCloud] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const downloadEntriesAsJson = () => {
    const dataStr = JSON.stringify(entries, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `galaxy_rag_vault_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleSync = (provider: string, providerId: string) => {
    setSelectedCloud(provider);
    setSyncStatus('syncing');
    
    setTimeout(() => {
      if (providerId === 'local') {
        downloadEntriesAsJson();
      }
      setSyncStatus('success');
      setEntries(prev => prev.map(e => ({ ...e, status: 'cloud_done' })));
      setTimeout(() => {
        setSyncStatus('idle');
        setShowSyncModal(false);
        setSelectedCloud(null);
      }, 2000);
    }, 2000);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        // Fix: Do not cast to VaultEntry[] yet as timestamps are strings in JSON
        const importedEntries = JSON.parse(content);
        
        if (Array.isArray(importedEntries) && importedEntries.length > 0) {
          // Fix: Explicitly type validatedImports and convert string timestamps to Date objects
          const validatedImports: VaultEntry[] = importedEntries.map((entry: any) => ({
            ...entry,
            id: entry.id || Date.now().toString() + Math.random(),
            timestamp: new Date(entry.timestamp),
            status: 'cloud_done' as const
          }));
          
          setEntries(prev => {
            // MERGE LOGIC (Upsert): 
            // Nếu trùng title, cập nhật nội dung. Nếu chưa có, thêm mới vào đầu.
            // Fix: Explicitly type the Map to ensure proper inference for merged array and its sort properties
            const newEntriesMap = new Map<string, VaultEntry>(prev.map(e => [e.title, e]));
            let updatedCount = 0;
            let addedCount = 0;

            validatedImports.forEach(imp => {
              if (newEntriesMap.has(imp.title)) {
                newEntriesMap.set(imp.title, imp);
                updatedCount++;
              } else {
                newEntriesMap.set(imp.title, imp);
                addedCount++;
              }
            });

            const merged = Array.from(newEntriesMap.values());
            // Sắp xếp lại theo thời gian mới nhất
            // Fix: Use explicit types to avoid 'unknown' error on timestamp
            merged.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            
            alert(`✅ Galaxy Vault: Đã đồng bộ thành công ${validatedImports.length} mục tri thức (Thêm mới ${addedCount}, Cập nhật ${updatedCount}).`);
            return merged;
          });
        }
      } catch (err) {
        alert("Có lỗi xảy ra khi phân tích file JSON. Vui lòng kiểm tra lại định dạng.");
      }
    };
    reader.readAsText(file);
    if (uploadInputRef.current) uploadInputRef.current.value = '';
  };

  const cloudProviders = [
    { id: 'gdrive', name: 'Google Drive', icon: 'drive_file_move', color: 'text-green-500', desc: 'Lưu trữ nhanh vào tài khoản Google.' },
    { id: 'onedrive', name: 'OneDrive', icon: 'cloud_upload', color: 'text-blue-500', desc: 'Đồng bộ hóa với Microsoft Office 365.' },
    { id: 'email', name: 'Email Archive', icon: 'mail', color: 'text-amber-500', desc: 'Gửi bản sao lưu vào hòm thư cá nhân.' },
    { id: 'local', name: 'Tải về máy (.json)', icon: 'download', color: 'text-slate-600', desc: 'Đóng gói JSON và tự động tải về máy.' },
  ];

  return (
    <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark relative">
      <header className="sticky top-0 z-50 flex items-center justify-between bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 pb-2 border-b border-gray-100 dark:border-gray-800 shadow-sm">
        <button onClick={onBack} className="flex size-10 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-primary">
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h2 className="text-lg font-black flex-1 text-center pr-10 text-slate-900 dark:text-white uppercase tracking-tight">Lưu trữ & Bảo mật dữ liệu</h2>
      </header>

      <main className="flex-1 flex flex-col gap-5 p-4 pb-24 no-scrollbar overflow-y-auto">
        {/* Profile Card */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-soft border border-gray-100 dark:border-gray-700 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="bg-slate-200 rounded-full h-24 w-24 border-4 border-white dark:border-gray-800 shadow-lg flex items-center justify-center overflow-hidden">
                <img src="https://picsum.photos/seed/pvt/200" alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div className="absolute bottom-0 right-0 bg-green-500 rounded-full p-1 border-2 border-white dark:border-gray-800">
              <span className="material-symbols-outlined text-[14px] text-white block">check</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xl font-black text-slate-900 dark:text-white leading-tight">Th.S Phùng Văn Tiến</p>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-tighter mt-1">Phòng Nghiên cứu Địa lí</p>
          </div>
          <button onClick={() => setShowSyncModal(true)} className="flex w-full items-center justify-center gap-2 rounded-xl h-12 bg-primary hover:bg-primary-dark text-white font-black shadow-lg shadow-primary/20 transition-all active:scale-95">
            <span className="material-symbols-outlined">sync</span>
            <span>Đồng bộ đám mây</span>
          </button>
        </section>

        {/* Tracking Section */}
        <section className="space-y-2">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Cài đặt ghi nhớ</h3>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
            <div className="flex gap-3">
              <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary shrink-0">
                <span className="material-symbols-outlined">history_edu</span>
              </div>
              <div>
                <p className="text-sm font-black">Tự động lưu lịch sử</p>
                <p className="text-[11px] text-slate-500 font-medium">Ghi nhớ mọi câu trả lời của Chatbot vào kho tri thức cá nhân.</p>
              </div>
            </div>
            <button onClick={() => setIsTracking(!isTracking)} className={`relative flex h-7 w-12 items-center rounded-full transition-all duration-300 p-1 ${isTracking ? 'bg-primary justify-end' : 'bg-slate-200 dark:bg-slate-700 justify-start'}`}>
              <div className="h-5 w-5 rounded-full bg-white shadow-sm"></div>
            </button>
          </div>
        </section>

        {/* Knowledge List */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Kho tri thức cá nhân</h3>
            <button 
              onClick={() => uploadInputRef.current?.click()}
              className="text-[10px] font-black text-primary flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary hover:text-white transition-all"
            >
              <span className="material-symbols-outlined text-sm">publish</span>
              NẠP TỪ FILE JSON
              <input type="file" ref={uploadInputRef} onChange={handleFileUpload} accept=".json" className="hidden" />
            </button>
          </div>
          
          <div className="space-y-3">
            {entries.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 bg-white/50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                 <span className="material-symbols-outlined text-4xl mb-2">inventory_2</span>
                 <p className="text-[10px] font-black uppercase tracking-[0.2em]">Kho dữ liệu trống</p>
              </div>
            ) : entries.map(entry => (
              <button key={entry.id} onClick={() => onRestore(entry)} className="w-full flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-glow hover:border-primary/50 transition-all text-left group">
                <div className="size-11 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                  <span className="material-symbols-outlined">article</span>
                </div>
                <div className="flex-1 min-w-0">
                   <p className="text-sm font-black truncate">{entry.title}</p>
                   <p className="text-[10px] text-slate-500 font-bold mt-0.5 uppercase">{entry.size} • {new Date(entry.timestamp).toLocaleDateString('vi-VN')}</p>
                </div>
                <span className="material-symbols-outlined text-green-500 text-xl">{entry.status}</span>
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* Sync Modal Logic Remains Same but Styled Cleaner */}
      {showSyncModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="w-full max-sm:w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
               <h3 className="text-lg font-black uppercase tracking-tight">Chọn đám mây</h3>
               <button onClick={() => setShowSyncModal(false)} className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><span className="material-symbols-outlined text-sm">close</span></button>
            </div>
            <div className="p-4 space-y-2">
               {syncStatus === 'idle' ? cloudProviders.map(p => (
                 <button key={p.id} onClick={() => handleSync(p.name, p.id)} className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-50 dark:border-slate-800 hover:bg-primary/5 transition-all text-left">
                   <span className={`material-symbols-outlined text-2xl ${p.color}`}>{p.icon}</span>
                   <span className="font-bold text-sm">{p.name}</span>
                 </button>
               )) : (
                 <div className="py-10 text-center space-y-4">
                    <span className={`material-symbols-outlined text-5xl ${syncStatus === 'syncing' ? 'animate-spin text-primary' : 'text-green-500'}`}>{syncStatus === 'syncing' ? 'sync' : 'check_circle'}</span>
                    <p className="font-black uppercase tracking-widest text-xs">{syncStatus === 'syncing' ? 'Đang mã hóa...' : 'Đã bảo vệ!'}</p>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VaultView;
