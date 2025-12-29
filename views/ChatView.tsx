
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, VaultEntry } from '../types';
import { 
  generateGeographyAnswerStream, 
  generateGeographyInfographic,
  retrieveRelevantContext 
} from '../services/geminiService';
import { GenerateContentResponse } from '@google/genai';

interface ChatViewProps {
  onBack: () => void;
  isTracking?: boolean;
  onAutoSave?: (title: string, content: string) => void;
  restoredEntry?: VaultEntry | null;
  processingProgress: number | null; 
  onQuickUpload?: (files: FileList) => void;
}

const ChatView: React.FC<ChatViewProps> = ({ onBack, isTracking, onAutoSave, restoredEntry, processingProgress, onQuickUpload }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      id: '1', 
      role: 'assistant', 
      content: 'Hãy hỏi **AI** dựa trên tài liệu đã tải.', 
      timestamp: new Date() 
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isDesigning, setIsDesigning] = useState(false);
  const [isScanningImage, setIsScanningImage] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [retrievalStatus, setRetrievalStatus] = useState<'idle' | 'searching' | 'grounding' | 'visualizing'>('idle');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<{ data: string, mimeType: string } | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<{ name: string, data: string, mimeType: string }[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (restoredEntry) {
      const restoredUserMsg: ChatMessage = {
        id: `restored-user-${restoredEntry.id}`,
        role: 'user',
        content: restoredEntry.title,
        timestamp: restoredEntry.timestamp
      };
      
      const restoredAssistantMsg: ChatMessage = {
        id: `restored-assistant-${restoredEntry.id}`,
        role: 'assistant',
        content: `🕒 **[ĐÃ KHÔI PHỤC]**\n\n${restoredEntry.content}`,
        timestamp: restoredEntry.timestamp,
        isRetrieved: true
      };
      
      setMessages([
        { id: 'start', role: 'assistant', content: 'Phiên cũ đã khôi phục.', timestamp: new Date() },
        restoredUserMsg,
        restoredAssistantMsg
      ]);
    }
  }, [restoredEntry]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping, isDesigning, isScanningImage, retrievalStatus]);

  // Setup Voice Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'vi-VN';
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => (prev ? prev + ' ' + transcript : transcript));
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Lỗi nhận diện:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  const checkAndOpenKey = async () => {
    // @ts-ignore
    if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
            await window.aistudio.openSelectKey();
        }
    }
    return true;
  };

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsScanningImage(true); 
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        setImagePreview({ data: base64, mimeType: file.type });
        setTimeout(() => setIsScanningImage(false), 2500);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files) as File[];
      const containsImage = filesArray.some(f => f.type.startsWith('image/'));
      
      if (containsImage) {
        setIsScanningImage(true);
        setTimeout(() => setIsScanningImage(false), 2500);
      }

      filesArray.forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = (event.target?.result as string).split(',')[1];
          
          setAttachedFiles(prev => [...prev, {
            name: file.name,
            data: base64,
            mimeType: file.type || 'application/octet-stream'
          }]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const downloadImage = (base64Data: string, filename: string = 'infographic.png') => {
    const link = document.createElement('a');
    link.href = base64Data;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleSend = async () => {
    if ((!input.trim() && !imagePreview && attachedFiles.length === 0) || isTyping || isScanningImage) return;

    await checkAndOpenKey();

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input || (attachedFiles.length > 0 ? `Đã đính kèm ${attachedFiles.length} tệp` : (imagePreview ? "Phân tích ảnh chụp" : "")),
      timestamp: new Date(),
      image: imagePreview ? `data:${imagePreview.mimeType};base64,${imagePreview.data}` : undefined,
      files: attachedFiles.map(f => ({ name: f.name, type: f.mimeType }))
    };
    
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    const currentImage = imagePreview;
    const currentFiles = [...attachedFiles];
    
    setInput('');
    setImagePreview(null);
    setAttachedFiles([]);
    setIsTyping(true);
    setRetrievalStatus('searching');

    try {
      const context = retrieveRelevantContext(currentInput);
      setRetrievalStatus('grounding');

      const assistantId = (Date.now() + 1).toString();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isRetrieved: !!context
      };
      setMessages(prev => [...prev, assistantMsg]);

      let fullAssistantContent = '';
      
      const textPromise = (async () => {
        try {
          const stream = await generateGeographyAnswerStream(
            currentInput, 
            context, 
            processingProgress, 
            currentImage || undefined,
            currentFiles.length > 0 ? currentFiles.map(f => ({ data: f.data, mimeType: f.mimeType })) : undefined
          );
          for await (const chunk of stream) {
            const c = chunk as GenerateContentResponse;
            const text = c.text;
            if (text) {
              fullAssistantContent += text;
              setMessages(prev => prev.map(m => 
                m.id === assistantId ? { ...m, content: fullAssistantContent } : m
              ));
            }
          }
        } catch (error: any) {
          console.error("Lỗi:", error);
          setMessages(prev => prev.map(m => 
            m.id === assistantId ? { ...m, content: "Có lỗi xảy ra khi phân tích." } : m
          ));
        }
      })();

      const imagePromise = (async () => {
        try {
          setIsDesigning(true);
          const infographicData = await generateGeographyInfographic(
            currentInput || "Giải thích ảnh chụp địa lí này.", 
            context || "Dữ liệu bản đồ học."
          );
          if (infographicData) {
            setMessages(prev => prev.map(m => 
              m.id === assistantId ? { ...m, image: infographicData } : m
            ));
          }
        } catch (error) { 
          console.error("Lỗi minh họa:", error); 
        } finally { 
          setIsDesigning(false); 
        }
      })();

      await Promise.all([textPromise, imagePromise]);
      
      if (isTracking && onAutoSave) {
        onAutoSave(currentInput || (currentFiles.length > 0 ? `Học từ ${currentFiles.length} tệp` : "Học từ ảnh chụp"), fullAssistantContent);
      }

      setIsTyping(false);
      setRetrievalStatus('idle');
    } catch (error) {
      console.error("Lỗi:", error);
      setIsTyping(false);
      setRetrievalStatus('idle');
    }
  };

  /**
   * PHỤ TRỢ: XỬ LÝ ĐỊNH DẠNG BOLD TRONG VĂN BẢN BÌNH THƯỜNG
   */
  const renderBoldParts = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  /**
   * TRUNG TÂM XỬ LÝ NỘI DUNG VĂN BẢN (RAG RENDERER)
   * 1. Xóa bỏ ký tự ### đầu dòng.
   * 2. Phóng to (1.5x) và tô đậm tối đa cho các dòng tiêu mục để làm nổi bật ý chính.
   */
  const renderContent = (content: string) => {
    // Bước 1: Làm sạch các ký tự tiêu đề Markdown (#)
    const cleanedContent = content.replace(/^#+\s+/gm, '');
    const lines = cleanedContent.split('\n');

    return lines.map((line, lineIdx) => {
      if (!line.trim()) return <br key={lineIdx} />;

      // Regex nhận diện tiêu mục ở đầu dòng: "1. " hoặc "a. "
      const bulletMatch = line.match(/^(\d+\.\s|[a-z]\.\s)(.*)/i);

      if (bulletMatch) {
        const bullet = bulletMatch[1];
        const rest = bulletMatch[2];

        // Tự động phân tách tiêu đề nếu có dấu hai chấm ":"
        const colonIndex = rest.indexOf(':');
        
        if (colonIndex !== -1 && colonIndex < 80) { // Tăng nhẹ giới hạn để bao quát tiêu đề dài
          const title = rest.substring(0, colonIndex + 1);
          const body = rest.substring(colonIndex + 1);
          
          return (
            <div key={lineIdx} className="mb-6 leading-tight">
              {/* PHÓNG TO 1.5x và VIẾT ĐẪM (FONT-BLACK) */}
              <span className="text-xl md:text-2xl font-black text-slate-950 dark:text-white inline-block mb-1">
                {bullet}{title}
              </span>
              <div className="text-slate-700 dark:text-slate-300 text-[15px] leading-relaxed">
                {renderBoldParts(body)}
              </div>
            </div>
          );
        } else {
          // Nếu không có dấu hai chấm, làm nổi bật toàn bộ dòng tiêu mục với kích thước lớn
          return (
            <div key={lineIdx} className="mb-6">
              <span className="text-xl md:text-2xl font-black text-slate-950 dark:text-white leading-tight">
                {bullet}{renderBoldParts(rest)}
              </span>
            </div>
          );
        }
      }

      // Render các dòng văn bản thông thường
      return (
        <div key={lineIdx} className="mb-2 text-slate-700 dark:text-slate-300 leading-relaxed text-[15px]">
          {renderBoldParts(line)}
        </div>
      );
    });
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return 'picture_as_pdf';
    if (mimeType.includes('word') || mimeType.includes('officedocument.wordprocessingml')) return 'description';
    if (mimeType.includes('powerpoint') || mimeType.includes('officedocument.presentationml')) return 'slideshow';
    if (mimeType.includes('image')) return 'image';
    return 'insert_drive_file';
  };

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark relative">
      <header className="relative flex items-center justify-between p-4 md:p-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 z-30">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="md:hidden flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Địa AI</h2>
            <div className="flex items-center gap-2">
              {processingProgress !== null ? (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full animate-pulse">
                  <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                    AI đang phân tích… ({processingProgress}%)
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full">
                  <span className="material-symbols-outlined text-[10px] text-green-600">verified</span>
                  <span className="text-[8px] font-black text-green-600 uppercase tracking-widest">Sẵn sàng học</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {processingProgress !== null && (
          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-slate-100 dark:bg-slate-800">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500" 
              style={{ width: `${processingProgress}%` }}
            ></div>
          </div>
        )}
      </header>

      <main ref={scrollRef} className="flex-1 overflow-y-auto w-full no-scrollbar">
        <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
          {messages.map(msg => (
            <div key={msg.id} className={`flex items-start gap-4 fade-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex size-10 shrink-0 items-center justify-center rounded-full shadow-sm ${msg.role === 'assistant' ? 'bg-primary text-white shadow-glow' : 'bg-white dark:bg-slate-800 text-slate-400 border dark:border-slate-700'}`}>
                <span className="material-symbols-outlined text-xl">{msg.role === 'assistant' ? 'smart_toy' : 'person'}</span>
              </div>
              <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`group relative p-5 rounded-2xl shadow-sm border leading-relaxed text-[15px] ${msg.role === 'user' ? 'bg-primary text-white border-primary rounded-tr-none' : 'bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 border-slate-100 dark:border-slate-700 rounded-tl-none shadow-soft'}`}>
                  
                  <div className={`absolute top-2 ${msg.role === 'user' ? 'left-2' : 'right-2'} opacity-0 group-hover:opacity-100 transition-opacity z-20`}>
                    <button 
                      onClick={() => copyToClipboard(msg.content, msg.id)}
                      className={`p-1.5 rounded-lg backdrop-blur-md shadow-sm border flex items-center justify-center transition-all active:scale-90 ${msg.role === 'user' ? 'bg-white/20 border-white/30 text-white' : 'bg-slate-100/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-primary'}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {copiedId === msg.id ? 'check' : 'content_copy'}
                      </span>
                    </button>
                  </div>

                  <div className={`prose prose-sm md:prose-base dark:prose-invert max-w-none ${msg.role === 'user' ? 'prose-headings:text-white prose-p:text-white' : ''}`}>
                     {msg.files && msg.files.length > 0 && (
                       <div className="mb-3 flex flex-wrap gap-2">
                         {msg.files.map((file, fIdx) => (
                           <div key={fIdx} className={`flex items-center gap-2 p-2 rounded-xl border ${msg.role === 'user' ? 'bg-white/10 border-white/20' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
                             <span className="material-symbols-outlined text-sm">{getFileIcon(file.type)}</span>
                             <span className="text-[11px] font-bold truncate max-w-[150px]">{file.name}</span>
                           </div>
                         ))}
                       </div>
                     )}
                     <div className="text-[15px]">{renderContent(msg.content)}</div>
                  </div>
                  
                  {msg.image && (
                    <div className="mt-4 relative group/img rounded-xl overflow-hidden border-2 border-slate-100 dark:border-slate-700 shadow-lg">
                      <img src={msg.image} className="w-full h-auto" alt="Dữ liệu Địa lí" />
                      {msg.role === 'assistant' && (
                        <button onClick={() => msg.image && downloadImage(msg.image)} className="absolute top-2 right-2 p-2 bg-white/90 dark:bg-slate-900/90 rounded-lg text-primary shadow-lg opacity-0 group-hover/img:opacity-100 transition-opacity">
                          <span className="material-symbols-outlined">download</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {(isTyping || isDesigning) && (
            <div className="flex flex-col gap-3 py-4 pl-14">
              {isTyping && (
                <div className="flex items-center gap-3 px-5 py-2.5 bg-primary/5 rounded-full border border-primary/10 w-fit animate-pulse">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                    AI đang phân tích…
                  </span>
                </div>
              )}
              {isDesigning && (
                <div className="flex items-center gap-3 px-5 py-2.5 bg-amber-500/5 rounded-full border border-amber-500/10 w-fit animate-pulse">
                  <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                    Đang vẽ minh họa số…
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="p-4 md:p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-4xl mx-auto space-y-4">
          
          <div className="flex flex-wrap gap-3 max-h-32 overflow-y-auto no-scrollbar">
            {imagePreview && (
              <div className="relative inline-block fade-up">
                <div className="relative h-28 w-28 rounded-xl overflow-hidden border-primary shadow-xl border-2 transition-all">
                  <img src={`data:${imagePreview.mimeType};base64,${imagePreview.data}`} className="h-full w-full object-cover" alt="Preview" />
                  
                  {/* SCANNING OVERLAY */}
                  {isScanningImage && (
                    <div className="absolute inset-0 bg-primary/10 backdrop-blur-[1px] flex items-center justify-center">
                        <div className="scan-line animate-scan"></div>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/20 to-transparent"></div>
                        <span className="text-[8px] font-black text-white bg-primary/90 px-2 py-1 rounded uppercase tracking-tighter shadow-md z-20">AI đang đọc ảnh...</span>
                    </div>
                  )}
                  
                  {!isScanningImage && (
                    <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center">
                        <span className="text-[8px] font-black text-white bg-green-600 px-1 py-0.5 rounded uppercase tracking-tighter shadow-md z-20 flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[8px]">check</span>
                            Đã hiểu dữ liệu
                        </span>
                    </div>
                  )}

                  <button 
                    onClick={() => setImagePreview(null)}
                    className="absolute top-1 right-1 size-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md z-30"
                  >
                    <span className="material-symbols-outlined text-xs">close</span>
                  </button>
                </div>
              </div>
            )}
            {attachedFiles.map((file, index) => {
              const isImage = file.mimeType.startsWith('image/');
              return (
                <div key={index} className="relative inline-block fade-up">
                  {isImage ? (
                    <div className="relative h-28 w-28 rounded-xl overflow-hidden border-primary shadow-xl border-2 transition-all">
                      <img src={`data:${file.mimeType};base64,${file.data}`} className="h-full w-full object-cover" alt="Preview" />
                      {isScanningImage && (
                        <div className="absolute inset-0 bg-primary/10 backdrop-blur-[1px] flex items-center justify-center">
                            <div className="scan-line animate-scan"></div>
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/20 to-transparent"></div>
                            <span className="text-[8px] font-black text-white bg-primary/90 px-2 py-1 rounded uppercase tracking-tighter shadow-md z-20">AI đang đọc tệp...</span>
                        </div>
                      )}
                      {!isScanningImage && (
                        <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center">
                            <span className="text-[8px] font-black text-white bg-green-600 px-1 py-0.5 rounded uppercase tracking-tighter shadow-md z-20 flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[8px]">check</span>
                                Đã hiểu tệp
                            </span>
                        </div>
                      )}
                      <button 
                        onClick={() => removeAttachedFile(index)}
                        className="absolute top-1 right-1 size-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md z-30"
                      >
                        <span className="material-symbols-outlined text-xs">close</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 bg-primary/5 border-2 border-primary rounded-xl px-4 py-3 shadow-md max-w-[200px]">
                      <span className="material-symbols-outlined text-primary">{getFileIcon(file.mimeType)}</span>
                      <span className="text-xs font-black truncate text-primary">{file.name}</span>
                      <button 
                        onClick={() => removeAttachedFile(index)}
                        className="size-5 bg-primary text-white rounded-full flex items-center justify-center shadow-md ml-1"
                      >
                        <span className="material-symbols-outlined text-xs">close</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-end gap-3">
            <div className="flex items-center gap-1.5 mb-1">
              <button 
                onClick={toggleListening}
                className={`p-2.5 rounded-xl transition-all border shadow-sm flex items-center justify-center relative ${isListening ? 'bg-red-500 text-white border-red-600 animate-pulse' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-primary border-slate-200 dark:border-slate-700'}`}
                title="Giọng nói"
              >
                <span className="material-symbols-outlined">{isListening ? 'mic_active' : 'mic'}</span>
              </button>

              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-primary hover:bg-primary/10 transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
                title="Chụp ảnh học liệu"
              >
                <span className="material-symbols-outlined">add_a_photo</span>
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageCapture} />
              </button>

              <button 
                onClick={() => docInputRef.current?.click()}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-primary hover:bg-primary/10 transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
                title="Tải tệp đính kèm"
              >
                <span className="material-symbols-outlined">attach_file</span>
                <input 
                  ref={docInputRef} 
                  type="file" 
                  multiple
                  accept=".pdf,.docx,.pptx,.txt,.doc,.jpg,.jpeg,.png" 
                  className="hidden" 
                  onChange={handleDocUpload} 
                />
              </button>
            </div>

            <div className="flex flex-col flex-1">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-end gap-2 focus-within:border-primary/50 transition-all shadow-inner">
                <textarea 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                  className="flex-1 bg-transparent border-none p-0 focus:ring-0 text-[15px] max-h-32 resize-none dark:text-white outline-none" 
                  placeholder={isListening ? "Đang nghe..." : (isScanningImage ? "AI đang đọc dữ liệu..." : "Hỏi Địa lí với AI")} 
                  rows={1}
                />
                <button 
                  onClick={handleSend} 
                  disabled={isTyping || isScanningImage || (!input.trim() && !imagePreview && attachedFiles.length === 0)} 
                  className="p-2 rounded-xl bg-primary text-white disabled:opacity-30 transition-all active:scale-95 shadow-glow"
                >
                  <span className="material-symbols-outlined font-bold">send</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 ml-2 font-medium">Dựa trên học liệu đã tải.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ChatView;
