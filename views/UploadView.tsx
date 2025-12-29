
import React, { useRef } from 'react';
import { UploadedFile } from '../types';

interface UploadViewProps {
  onBack: () => void;
  onComplete: () => void;
  uploadedFiles: UploadedFile[];
  setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
}

const UploadView: React.FC<UploadViewProps> = ({ onBack, onComplete, uploadedFiles, setUploadedFiles }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map((f: File) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: f.name,
        size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
        progress: 0,
        status: 'processing' as const,
        type: f.name.endsWith('.pdf') ? 'pdf' : f.name.match(/\.(jpg|jpeg|png)$/i) ? 'img' : 'docx' as any
      }));
      setUploadedFiles(prev => [...newFiles, ...prev]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-light dark:bg-surface-dark">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-white/90 dark:bg-slate-900/90 px-4 py-3 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
        <button onClick={onBack} className="flex size-10 items-center justify-center rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined text-[28px]">arrow_back</span>
        </button>
        <div className="flex-1 text-center overflow-hidden">
          <h1 className="text-sm font-black text-primary uppercase tracking-[0.1em] whitespace-nowrap">Địa AI</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase whitespace-nowrap">Học liệu số thông minh</p>
        </div>
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg shadow-sm whitespace-nowrap">
                <span className="material-symbols-outlined text-[14px] text-amber-600 dark:text-amber-400">verified</span>
                <span className="text-[9px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-tighter">AN TOÀN</span>
            </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark pb-32 no-scrollbar">
        <div className="px-6 pt-8 pb-4 fade-up text-center md:text-left">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white leading-tight tracking-tighter mb-3">
            Thêm học liệu số
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-[90%] mx-auto md:mx-0">
            Chỉ dùng cho phiên học này
          </p>
        </div>

        <div className="px-6 mt-4">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="group relative flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-primary/20 hover:border-primary bg-white dark:bg-slate-800/50 px-6 py-12 transition-all active:scale-[0.98] cursor-pointer shadow-soft hover:shadow-glow"
          >
            <div className="rounded-full bg-primary text-white p-5 shadow-glow ring-8 ring-primary/5 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[36px]">upload_file</span>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900 dark:text-white mb-1">Kéo thả hoặc chọn file</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">PDF, DOCX hoặc Ảnh chụp</p>
            </div>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
          </div>
        </div>

        <div className="px-6 mt-10">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Học liệu đã nạp</h3>
            <span className="text-[10px] font-bold text-primary px-2 py-1 bg-primary/10 rounded-lg whitespace-nowrap">{uploadedFiles.length} Tệp</span>
          </div>
          
          <div className="flex flex-col gap-4">
            {uploadedFiles.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700">
                <span className="material-symbols-outlined text-5xl mb-2">folder_open</span>
                <p className="text-xs font-bold uppercase tracking-widest whitespace-nowrap">Chưa có học liệu</p>
              </div>
            ) : uploadedFiles.map(file => (
              <FileCard key={file.id} file={file} onDelete={(id) => setUploadedFiles(prev => prev.filter(f => f.id !== id))} />
            ))}
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-40 mx-auto max-w-md p-6 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light/90 dark:via-background-dark/90 to-transparent">
        <button 
          onClick={onComplete}
          disabled={uploadedFiles.length === 0}
          className="w-full h-14 flex items-center justify-center gap-3 rounded-2xl bg-slate-900 dark:bg-primary hover:opacity-90 text-white font-bold text-base shadow-xl transition-all active:scale-[0.98] disabled:opacity-30 disabled:grayscale"
        >
          <span className="material-symbols-outlined">chat_bubble</span>
          <div className="flex flex-col items-center">
            <span className="whitespace-nowrap">Bắt đầu học ngay</span>
            <span className="text-[8px] font-black uppercase opacity-60 tracking-widest whitespace-nowrap">Dữ liệu an toàn</span>
          </div>
        </button>
      </div>
    </div>
  );
};

const FileCard: React.FC<{ file: UploadedFile, onDelete: (id: string) => void }> = ({ file, onDelete }) => {
  const isDone = file.status === 'completed';
  
  const getStatusMessage = () => {
    if (file.progress < 50) return "AI đang phân tích…";
    return "Sẵn sàng học";
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-5 shadow-soft border transition-all ${isDone ? 'border-green-100 dark:border-green-900/30' : 'border-slate-100 dark:border-slate-700'}`}>
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${isDone ? 'bg-green-50 text-green-500' : 'bg-primary/10 text-primary'}`}>
          <span className="material-symbols-outlined text-[28px]">{file.type === 'pdf' ? 'picture_as_pdf' : file.type === 'img' ? 'image' : 'article'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-white pr-2">{file.name}</p>
            <button onClick={() => onDelete(file.id)} className="ml-2 text-slate-400 hover:text-red-500 transition-colors shrink-0">
              <span className="material-symbols-outlined text-[20px]">delete</span>
            </button>
          </div>
          
          <div className="flex items-center justify-between text-[10px] mb-2">
            <span className={`font-bold uppercase tracking-tight whitespace-nowrap ${isDone ? 'text-green-600' : 'text-primary'}`}>
              {isDone ? 'Sẵn sàng học' : getStatusMessage()}
            </span>
            <span className="text-slate-400 font-black whitespace-nowrap">{isDone ? file.size : `${file.progress}%`}</span>
          </div>
          
          <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${isDone ? 'bg-green-500' : 'bg-primary'}`} 
              style={{ width: `${file.progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadView;
