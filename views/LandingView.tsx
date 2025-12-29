
import React from 'react';
import { ViewType } from '../types';

interface LandingViewProps {
  onNavigate: (view: ViewType) => void;
}

const LandingView: React.FC<LandingViewProps> = ({ onNavigate }) => {
  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark overflow-y-auto no-scrollbar">
      {/* Top Header for Mobile only */}
      <div className="md:hidden flex items-center justify-between p-6 pb-2 fade-up">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-[20px]">public</span>
          </div>
          <span className="text-sm font-bold tracking-wide text-slate-700 dark:text-slate-200 uppercase">Địa AI</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row items-center justify-center px-6 md:px-20 gap-12 py-10">
        
        {/* Left: Headline & CTA */}
        <div className="flex-1 space-y-8 fade-up text-center md:text-left max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-widest">
            Học liệu số thông minh
          </div>
          
          <h1 className="text-slate-900 dark:text-white tracking-tighter text-4xl md:text-6xl lg:text-7xl font-black leading-[1.1]">
            Địa AI
          </h1>
          
          <p className="text-slate-500 dark:text-slate-400 text-lg md:text-xl font-medium leading-relaxed max-wxl mx-auto md:mx-0">
            Học Địa lí thông minh hơn.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button 
              onClick={() => onNavigate(ViewType.UPLOAD)}
              className="w-full sm:w-auto px-10 bg-primary hover:bg-primary-dark text-white h-16 rounded-2xl font-black text-lg shadow-xl shadow-blue-500/30 flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95"
            >
              <span>Bắt đầu với AI</span>
              <span className="material-symbols-outlined text-[24px]">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Right: Visual Hero */}
        <div className="flex-1 w-full max-w-xl fade-up" style={{ animationDelay: '200ms' }}>
          <div className="relative aspect-square rounded-[2.5rem] overflow-hidden shadow-2xl group border-8 border-white dark:border-slate-800">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 to-transparent mix-blend-overlay z-10"></div>
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBP39HqPfILuh9ttLEheavZ95Y8wmbzOOAVcFoh_i-Pg3MzUJbqOIWW95LCitExpN5ULdPGie2YYY4Mo5OXcepBNf9OTTT8qylzk0jz6_0fKSicSrrKLpJ4vXS2jsojPjOF8Y6Ob0j9fA5SKGN76Y9vWxwiH4pHLyaI5IZUwbQanOj9XEeESDyGNJkiAl0fJgMSxbJdYIhSlRxzDJzH4RPCYjfK75Kq-kukoOzp5tknmk0esKZZE0Trh4ZEYoOPLL-TAoigfw8Hx6Zw"
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
              alt="Địa AI Illustration"
            />
            
            <div className="absolute top-8 left-8 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-white/20">
              <div className="size-10 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center">
                <span className="material-symbols-outlined">verified</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</span>
                <span className="text-xs font-bold text-green-600">Sẵn sàng học</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="w-full px-6 md:px-20 py-12 bg-white/50 dark:bg-slate-900/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard icon="cloud_upload" title="Thêm học liệu" desc="Tải tài liệu để bắt đầu" onClick={() => onNavigate(ViewType.UPLOAD)} />
            <FeatureCard icon="palette" title="Minh họa số" desc="Vẽ sơ đồ trực quan" onClick={() => onNavigate(ViewType.CHAT)} />
            <FeatureCard icon="smart_toy" title="Hỏi AI" desc="Tra cứu học liệu nhanh" onClick={() => onNavigate(ViewType.CHAT)} />
            <FeatureCard icon="verified_user" title="Bảo mật" desc="Dữ liệu an toàn tuyệt đối" onClick={() => onNavigate(ViewType.VAULT)} />
          </div>
        </div>
      </div>
    </div>
  );
};

const FeatureCard: React.FC<{ icon: string, title: string, desc: string, onClick: () => void }> = ({ icon, title, desc, onClick }) => (
  <div 
    onClick={onClick}
    className="group bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-soft hover:shadow-glow hover:border-primary/50 transition-all cursor-pointer overflow-hidden"
  >
    <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all">
      <span className="material-symbols-outlined text-3xl">{icon}</span>
    </div>
    <h3 className="text-base md:text-lg font-black mb-2 whitespace-nowrap truncate">{title}</h3>
    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed line-clamp-2">{desc}</p>
  </div>
);

export default LandingView;
