
import React, { useState, useMemo, useRef } from 'react';
import { Topic, QuestionType } from '../types';
import { getExamMatrix, generateExamSets, extractMatrixFromMedia, extractMatrixFromText } from '../services/geminiService';
// @ts-ignore
import mammoth from 'https://esm.sh/mammoth@1.8.0';
// @ts-ignore
import { Document, Packer, Paragraph, TextRun, AlignmentType, Spacing } from 'https://esm.sh/docx@9.1.0';

interface ArchitectViewProps {
  onBack: () => void;
}

const ArchitectView: React.FC<ArchitectViewProps> = ({ onBack }) => {
  const [topics, setTopics] = useState<Topic[]>([
    { 
      id: '1', 
      name: 'Vị trí địa lí và phạm vi lãnh thổ', 
      subject: 'Địa lí', 
      questionType: 'TN4LC', 
      quantity: 16, 
      levels: { remember: 16, understand: 0, apply: 0, highApply: 0 } 
    },
    { 
      id: '2', 
      name: 'Thiên nhiên nhiệt đới ẩm gió mùa', 
      subject: 'Địa lí', 
      questionType: 'TN4LC', 
      quantity: 12, 
      levels: { remember: 0, understand: 12, apply: 0, highApply: 0 } 
    },
    { 
        id: '3', 
        name: 'Sử dụng và bảo vệ tài nguyên', 
        subject: 'Địa lí', 
        questionType: 'TN4LC', 
        quantity: 12, 
        levels: { remember: 0, understand: 0, apply: 8, highApply: 4 } 
      },
  ]);
  const [topicInput, setTopicInput] = useState('');
  const [grade, setGrade] = useState('Khối 12');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const totalItems: number = topics.reduce((sum, t) => sum + (t.quantity || 0), 0);
    const totalPoints: number = topics.reduce((sum, t) => {
        const levels = t.levels || { remember: 0, understand: 0, apply: 0, highApply: 0 };
        const points = (levels.remember + levels.understand + levels.apply + levels.highApply) * 0.25;
        return sum + points;
    }, 0);

    const levelCounts = { remember: 0, understand: 0, apply: 0, highApply: 0 };

    topics.forEach(t => {
      if (t.levels) {
        levelCounts.remember += t.levels.remember || 0;
        levelCounts.understand += t.levels.understand || 0;
        levelCounts.apply += t.levels.apply || 0;
        levelCounts.highApply += t.levels.highApply || 0;
      }
    });

    const totalLevels = levelCounts.remember + levelCounts.understand + levelCounts.apply + levelCounts.highApply;
    const ratio = {
        nb: totalLevels > 0 ? (levelCounts.remember / totalLevels) * 100 : 0,
        th: totalLevels > 0 ? (levelCounts.understand / totalLevels) * 100 : 0,
        vd: totalLevels > 0 ? ((levelCounts.apply + levelCounts.highApply) / totalLevels) * 100 : 0,
    };

    return { totalItems, totalPoints, levelCounts, ratio };
  }, [topics]);

  const isStandardCompliant = useMemo(() => {
    return Math.abs(stats.totalPoints - 10) < 0.01 && 
           Math.abs(stats.ratio.nb - 40) < 1 && 
           Math.abs(stats.ratio.th - 30) < 1 && 
           Math.abs(stats.ratio.vd - 30) < 1;
  }, [stats]);

  const updateTopic = (id: string, field: string, value: any) => {
    setTopics(prev => prev.map(t => {
        if (t.id === id) {
            if (field === 'levels') return { ...t, levels: { ...t.levels, ...value } };
            return { ...t, [field]: value };
        }
        return t;
    }));
  };

  const handleGenerate = async () => {
    if (!topicInput.trim()) return;
    setIsLoading(true);
    try {
      const matrix = await getExamMatrix(topicInput, grade);
      setTopics(matrix.map((item: any, idx: number) => ({ id: Date.now() + idx + '', ...item })));
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    try {
        if (file.name.endsWith('.json')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const data = JSON.parse(event.target?.result as string);
                if (data.topics) setTopics(data.topics);
                setIsLoading(false);
            };
            reader.readAsText(file);
        } else if (file.name.toLowerCase().endsWith('.docx')) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const result = await mammoth.extractRawText({ arrayBuffer: event.target?.result as ArrayBuffer });
                const matrix = await extractMatrixFromText(result.value);
                setTopics(matrix.map((item: any, idx: number) => ({ id: Date.now() + idx + '', ...item })));
                setIsLoading(false);
            };
            reader.readAsArrayBuffer(file);
        } else {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64 = (event.target?.result as string).split(',')[1];
                const matrix = await extractMatrixFromMedia(base64, file.type);
                setTopics(matrix.map((item: any, idx: number) => ({ id: Date.now() + idx + '', ...item })));
                setIsLoading(false);
            };
            reader.readAsDataURL(file);
        }
    } catch (err) { console.error(err); setIsLoading(false); }
  };

  const handleExportExams = async () => {
    if (!isStandardCompliant) {
        if (!confirm("Ma trận chưa đạt chuẩn 10đ hoặc tỉ lệ 4:3:3. Bạn vẫn muốn tiếp tục xuất đề?")) return;
    }
    
    setIsLoading(true);
    try {
      const resultText = await generateExamSets(topics, topicInput, grade);
      const lines = resultText.split('\n');
      const paragraphs = lines.map((line: string) => {
        const isHeader = line.startsWith('#') || (line.length > 5 && line === line.toUpperCase());
        return new Paragraph({
          children: [
            new TextRun({
              text: line.replace(/^#+\s*/, ''),
              font: "Times New Roman",
              size: isHeader ? 28 : 26,
              bold: isHeader || line.startsWith('**'),
            }),
          ],
          alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
          spacing: { line: 360, before: 120, after: 120 },
        });
      });

      const doc = new Document({ sections: [{ children: paragraphs }] });
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeTopic = (topicInput || 'ChuaDatTen').replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '_');
      a.href = url;
      a.download = `DeThi_CV7991_${grade}_${safeTopic}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Lỗi xuất file.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark overflow-hidden">
      
      {/* Top Header Desktop */}
      <header className="flex items-center justify-between px-8 py-5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 z-30">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="md:hidden flex size-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h2 className="text-2xl font-black tracking-tighter">AI Architect Desktop</h2>
            <div className="flex items-center gap-2">
               <span className={`size-2 rounded-full animate-pulse ${isStandardCompliant ? 'bg-green-500' : 'bg-primary'}`}></span>
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                 Standards Inspection Module Active
               </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition-all">
             <span className="material-symbols-outlined text-xl">upload_file</span>
             Import Matrix File
             <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
           </button>
           <button onClick={handleExportExams} disabled={isLoading || topics.length === 0} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-black text-sm shadow-glow hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
             <span className="material-symbols-outlined text-xl">rocket_launch</span>
             Xuất đề thi chuẩn CV7991
           </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Left Sidebar: Controls & Stats */}
        <aside className="w-full md:w-[400px] border-r border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 overflow-y-auto no-scrollbar p-8 space-y-8">
           
           <section className="space-y-4">
             <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Cấu hình tham số</h3>
             <div className="space-y-4">
                <div className="relative">
                   <input 
                     value={topicInput} 
                     onChange={(e) => setTopicInput(e.target.value)}
                     className="w-full h-14 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-12 font-bold text-sm focus:border-primary transition-all" 
                     placeholder="Tên đề thi / Chủ đề..." 
                   />
                   <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary">auto_stories</span>
                </div>
                <select value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full h-14 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-4 font-bold text-sm">
                   {['Khối 6','Khối 7','Khối 8','Khối 9','Khối 10','Khối 11','Khối 12'].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <button 
                  onClick={handleGenerate} 
                  disabled={isLoading || !topicInput.trim()}
                  className="w-full h-14 bg-slate-900 dark:bg-primary text-white rounded-2xl font-black text-sm uppercase shadow-lg flex items-center justify-center gap-3 transition-all hover:opacity-90 active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined">{isLoading ? 'cyclone' : 'bolt'}</span>
                  {isLoading ? 'Đang phân tích...' : 'Kích hoạt AI Architect'}
                </button>
             </div>
           </section>

           <section className="space-y-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Dashboard Kiểm định</h3>
              
              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-soft flex flex-col items-center">
                 <p className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-widest text-center">Tỉ lệ Nhận thức (Chuẩn 4:3:3)</p>
                 <div className="flex h-40 items-end justify-center gap-12 w-full">
                    {/* Stats columns */}
                    <div className="flex flex-col items-center w-10">
                        <div className="w-full bg-slate-100 dark:bg-slate-900 h-full rounded-xl overflow-hidden flex flex-col-reverse">
                            <div className="bg-blue-400 w-full transition-all duration-1000" style={{height: `${stats.ratio.nb}%`}}></div>
                        </div>
                        <span className="text-[10px] font-black mt-3">NB</span>
                        <span className="text-[10px] font-bold text-blue-500">{Math.round(stats.ratio.nb)}%</span>
                    </div>
                    <div className="flex flex-col items-center w-10">
                        <div className="w-full bg-slate-100 dark:bg-slate-900 h-full rounded-xl overflow-hidden flex flex-col-reverse">
                            <div className="bg-blue-600 w-full transition-all duration-1000" style={{height: `${stats.ratio.th}%`}}></div>
                        </div>
                        <span className="text-[10px] font-black mt-3">TH</span>
                        <span className="text-[10px] font-bold text-blue-700">{Math.round(stats.ratio.th)}%</span>
                    </div>
                    <div className="flex flex-col items-center w-10">
                        <div className="w-full bg-slate-100 dark:bg-slate-900 h-full rounded-xl overflow-hidden flex flex-col-reverse">
                            <div className="bg-blue-800 w-full transition-all duration-1000" style={{height: `${stats.ratio.vd}%`}}></div>
                        </div>
                        <span className="text-[10px] font-black mt-3">VD</span>
                        <span className="text-[10px] font-bold text-blue-900">{Math.round(stats.ratio.vd)}%</span>
                    </div>
                 </div>
              </div>

              <div className={`p-6 rounded-3xl border flex items-center justify-between ${isStandardCompliant ? 'bg-green-500/5 border-green-500/20 text-green-600' : 'bg-amber-500/5 border-amber-500/20 text-amber-600'}`}>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined">{isStandardCompliant ? 'verified' : 'warning'}</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-black uppercase">{isStandardCompliant ? 'Hợp lệ 7991' : 'Chưa đạt chuẩn'}</span>
                    <span className="text-[10px] font-medium opacity-80">{stats.totalPoints.toFixed(1)} / 10.0 điểm</span>
                  </div>
                </div>
                {isStandardCompliant && <span className="material-symbols-outlined text-3xl">check_circle</span>}
              </div>
           </section>
        </aside>

        {/* Right Content: Matrix Table */}
        <section className="flex-1 bg-background-light dark:bg-background-dark overflow-y-auto p-10 space-y-6">
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-black tracking-tight">Cấu trúc chi tiết Ma trận</h3>
              <button onClick={() => setTopics([...topics, { id: Date.now() + '', name: 'Chủ đề mới', subject: 'Địa lí', questionType: 'TN4LC', quantity: 0, levels: { remember: 0, understand: 0, apply: 0, highApply: 0 } }])} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all">
                <span className="material-symbols-outlined text-sm text-primary">add</span>
                Thêm chủ đề
              </button>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {topics.map((t, idx) => (
                <div key={t.id} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-soft fade-up flex flex-col" style={{ animationDelay: `${idx*50}ms` }}>
                    <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
                        <input 
                          value={t.name} 
                          onChange={(e) => updateTopic(t.id, 'name', e.target.value)} 
                          className="bg-transparent border-none p-0 text-sm font-black focus:ring-0 flex-1 text-slate-900 dark:text-white" 
                        />
                        <button onClick={() => setTopics(prev => prev.filter(item => item.id !== t.id))} className="text-slate-300 hover:text-red-500 ml-2 transition-colors">
                            <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                    </div>
                    <div className="p-8 grid grid-cols-4 gap-6">
                        {['remember', 'understand', 'apply', 'highApply'].map((lvl) => (
                            <div key={lvl} className="flex flex-col items-center gap-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  {lvl === 'remember' ? 'Nhận biết' : lvl === 'understand' ? 'Thông hiểu' : lvl === 'apply' ? 'Vận dụng' : 'VDC'}
                                </span>
                                <input 
                                  type="number" 
                                  value={(t.levels as any)[lvl]} 
                                  onChange={(e) => updateTopic(t.id, 'levels', { [lvl]: parseInt(e.target.value) || 0 })} 
                                  className="w-full text-center text-xl font-black bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 focus:border-primary transition-all outline-none" 
                                />
                                <span className="text-[10px] font-bold text-slate-400">câu</span>
                            </div>
                        ))}
                    </div>
                </div>
             ))}
           </div>
        </section>
      </main>
    </div>
  );
};

export default ArchitectView;
