import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, RotateCcw, Wifi, Battery, Signal, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MobilePreviewWrapperProps {
  children: React.ReactNode;
}

export function MobilePreviewWrapper({ children }: MobilePreviewWrapperProps) {
  const [isPreviewEnabled, setIsPreviewEnabled] = useState(false);
  const [isIframe, setIsIframe] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  const [time, setTime] = useState('');
  const [iframeKey, setIframeKey] = useState(0);

  // Detecta se estamos rodando dentro do próprio iframe do preview
  useEffect(() => {
    const isFrame = window.self !== window.top || window.location.search.includes('is_preview_frame=true');
    setIsIframe(isFrame);

    const savedPreview = localStorage.getItem('mobile_preview_enabled') === 'true';
    setIsPreviewEnabled(savedPreview);

    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Relógio simulado do celular
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setTime(`${hours}:${minutes}`);
    };

    updateClock();
    const interval = setInterval(updateClock, 60000);
    return () => clearInterval(interval);
  }, []);

  const enablePreview = () => {
    localStorage.setItem('mobile_preview_enabled', 'true');
    setIsPreviewEnabled(true);
    // Forçar recarga da página para aplicar as alterações de roteador e recriar o ciclo de vida
    window.location.reload();
  };

  const disablePreview = () => {
    localStorage.setItem('mobile_preview_enabled', 'false');
    setIsPreviewEnabled(false);
    window.location.reload();
  };

  const reloadIframe = () => {
    setIframeKey(prev => prev + 1);
  };

  // Se estiver dentro do iframe, ou a tela for fisicamente de celular (<= 1024px),
  // ou o preview não estiver ativado, renderiza o app normalmente em tela cheia.
  if (isIframe || viewportWidth <= 1024 || !isPreviewEnabled) {
    return (
      <>
        {children}
        
        {/* Botão flutuante para ativar o simulador (apenas no desktop, fora do iframe, e se desativado) */}
        {!isIframe && viewportWidth > 1024 && !isPreviewEnabled && (
          <button
            onClick={enablePreview}
            className="fixed bottom-6 right-6 z-[9999] bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs uppercase tracking-widest px-5 py-3.5 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 flex items-center gap-2 cursor-pointer border border-primary/20 animate-bounce"
            title="Simular visualização em smartphone"
          >
            <Smartphone size={16} className="animate-pulse" />
            <span>Simular Celular</span>
          </button>
        )}
      </>
    );
  }

  // Gera a URL do iframe preservando a rota atual e adicionando a query de iframe
  const currentUrl = new URL(window.location.href);
  currentUrl.searchParams.set('is_preview_frame', 'true');
  const iframeUrl = currentUrl.toString();

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#090a0f] text-slate-100 flex flex-col z-[9999] overflow-hidden font-sans select-none">
      
      {/* Background decorativo premium */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#E7B63F]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header superior do Simulador (Desktop) */}
      <header className="w-full bg-[#11131c]/80 backdrop-blur-md border-b border-slate-800 px-8 py-4 flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#E7B63F] to-[#BD8715] flex items-center justify-center shadow-lg shadow-[#E7B63F]/10">
            <Smartphone className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wider uppercase text-white flex items-center gap-1.5">
              Contaju Pessoal <span className="text-[9px] bg-slate-800 text-[#E7B63F] font-bold px-2 py-0.5 rounded-full uppercase tracking-normal">Preview</span>
            </h1>
            <p className="text-[10px] text-slate-400">Simulador Móvel em Tempo Real (Localhost)</p>
          </div>
        </div>

        {/* Controles do Simulador */}
        <div className="flex items-center gap-3">
          <button
            onClick={reloadIframe}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 rounded-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer border border-slate-700/50"
            title="Recarregar tela do celular"
          >
            <RotateCcw size={16} />
          </button>

          <button
            onClick={disablePreview}
            className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl shadow-lg shadow-red-500/10 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 cursor-pointer"
          >
            <Monitor size={16} />
            <span>Voltar para Desktop</span>
          </button>
        </div>
      </header>

      {/* Área central com o frame de celular */}
      <main className="flex-1 w-full flex items-center justify-center p-6 relative overflow-y-auto no-scrollbar">
        <div className="flex flex-col items-center gap-4">
          
          {/* Mockup do Smartphone */}
          <div 
            className="relative bg-black rounded-[48px] p-3 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] border-[4px] border-[#1f2330] flex flex-col transition-all duration-300"
            style={{ width: '400px', height: '840px' }}
          >
            {/* Notch / Dynamic Island simulado no topo */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-6.5 bg-black rounded-full z-[100] flex items-center justify-center pointer-events-none">
              {/* Lente da câmera */}
              <div className="w-2.5 h-2.5 rounded-full bg-[#0d0d12] absolute right-4 border border-slate-900/30 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-[#1a253c]/80" />
              </div>
            </div>

            {/* Barra de Status superior do celular (sobreposta ao iframe) */}
            <div className="absolute top-3 left-3 right-3 h-8 px-6 flex items-center justify-between text-white text-[11px] font-semibold z-[90] pointer-events-none rounded-t-[36px] bg-gradient-to-b from-black/40 to-transparent">
              {/* Relógio do celular */}
              <span className="text-white font-medium pl-1 tracking-tight">{time}</span>
              
              {/* Ícones de status (Wi-Fi, Rede, Bateria) */}
              <div className="flex items-center gap-1.5 pr-1 text-slate-200">
                <Signal size={12} className="opacity-90" />
                <Wifi size={12} className="opacity-90" />
                <div className="flex items-center gap-0.5 ml-0.5">
                  <Battery size={14} className="opacity-90 rotate-0" />
                </div>
              </div>
            </div>

            {/* Corpo interno com o IFrame */}
            <div className="w-full h-full bg-[#080808] rounded-[38px] overflow-hidden border border-slate-900 relative">
              <iframe
                key={iframeKey}
                src={iframeUrl}
                className="w-full h-full border-none bg-background overflow-hidden"
                title="Mobile Application Viewport"
                style={{
                  // Forçar padding superior para a status bar e notch não cobrirem elementos de clique importantes
                  paddingTop: '28px',
                }}
              />
            </div>

            {/* Indicador de home swipe bar no rodapé do celular */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-36 h-1 bg-white/30 rounded-full z-[100] pointer-events-none" />
          </div>

          {/* Dica útil no rodapé */}
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 animate-pulse bg-slate-900/40 px-3 py-1.5 rounded-full border border-slate-800/40">
            <Sparkles size={11} className="text-[#E7B63F]" />
            <span>Qualquer alteração de código atualizará esta tela em tempo real!</span>
          </div>
        </div>
      </main>
    </div>
  );
}
