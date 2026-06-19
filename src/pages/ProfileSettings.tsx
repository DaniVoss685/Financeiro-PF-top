import React, { useState, useRef } from 'react';
import { useAppContext } from '../store/AppContext';
import { Camera, User, Phone, Check, RefreshCw, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const PRESET_AVATARS = ['👑', '🦁', '🦉', '💎', '💼', '🚀', '🧠', '🌟', '🦄', '🐆'];

export default function ProfileSettings() {
  const { currentUser, updateUserProfile, resetOnboarding } = useAppContext();
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '👑');
  const [customAvatar, setCustomAvatar] = useState<string | null>(currentUser?.avatar?.startsWith('data:image') ? currentUser.avatar : null);
  
  const [updating, setUpdating] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resizeAndOptimizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 400; // 400x400 standard high quality avatar
          
          const width = img.width;
          const height = img.height;
          
          // Crop centered square to avoid stretching or distorting
          const size = Math.min(width, height);
          const xOffset = (width - size) / 2;
          const yOffset = (height - size) / 2;
          
          canvas.width = maxSize;
          canvas.height = maxSize;
          
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, xOffset, yOffset, size, size, 0, 0, maxSize, maxSize);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            resolve(dataUrl);
          } else {
            resolve(event.target?.result as string);
          }
        };
        img.onerror = () => reject(new Error('Falha ao processar a imagem.'));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Falha ao ler o arquivo.'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Increase maximum photo file size limit to 15MB
      if (file.size > 15 * 1024 * 1024) {
        setError('A imagem deve ter no máximo 15MB.');
        return;
      }
      
      setUpdating(true);
      try {
        const optimizedUrl = await resizeAndOptimizeImage(file);
        setCustomAvatar(optimizedUrl);
        setAvatar('');
        setError('');
        setSuccess('');
      } catch (err: any) {
        setError(err.message || 'Erro ao processar imagem.');
      } finally {
        setUpdating(false);
      }
    }
  };

  const handleSelectPresetAvatar = (emoji: string) => {
    setAvatar(emoji);
    setCustomAvatar(null);
    setError('');
    setSuccess('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Por favor, digite seu nome completo.');
      return;
    }
    if (!phone.trim()) {
      setError('Por favor, informe seu celular/WhatsApp para os avisos.');
      return;
    }

    setUpdating(true);
    setTimeout(() => {
      updateUserProfile({
        name: name.trim(),
        phone: phone.replace(/\D/g, ''),
        avatar: customAvatar || avatar
      });
      setUpdating(false);
      setSuccess('Seu perfil foi atualizado com sucesso!');
    }, 600);
  };

  return (
    <div className="bg-card border border-border rounded-3xl p-6 md:p-8 space-y-6">
      <div>
        <h2 className="text-xl font-bold font-display text-foreground">Perfil de Usuário</h2>
        <p className="text-xs text-muted-foreground mt-1">Configure sua foto, nome e telefone para recebimento individual dos disparos</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-xl">
        {/* Profile Avatar customizer */}
        <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-muted/10 border border-border/40">
          <div className="relative group">
            <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-4xl overflow-hidden shadow-inner font-black">
              {customAvatar ? (
                <img src={customAvatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span>{avatar}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 bg-primary hover:bg-primary/95 text-primary-foreground rounded-full shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-all"
              title="Mudar Foto de Perfil"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          <div className="flex-1 space-y-2 text-center sm:text-left">
            <p className="text-xs text-muted-foreground font-semibold">Escolha um ícone rápido ou envie sua própria foto:</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
              {PRESET_AVATARS.map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleSelectPresetAvatar(item)}
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center hover:scale-115 active:scale-90 transition-all text-sm cursor-pointer ${
                    avatar === item && !customAvatar
                      ? 'bg-primary/20 border-primary text-foreground'
                      : 'bg-muted/10 border-border max-w-xs'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Form Inputs and Info */}
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase tracking-wider">Seu Nome Completo</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Carlos Eduardo de Oliveira"
                className="w-full bg-muted/30 border border-border rounded-xl pl-10 pr-4 py-3 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase tracking-wider">Celular / WhatsApp para Disparos</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Ex: 5511999999999 (Código do país + DDD + Número)"
                className="w-full bg-muted/30 border border-border rounded-xl pl-10 pr-4 py-3 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>
            <p className="text-[9px] text-muted-foreground mt-1.5 block leading-normal italic">
              🚨 Quando as lembranças automáticas da Evolution API dispararem, elas serão encaminhadas exclusivamente eletronicamente para este dispositivo ({phone || 'não configurado'}).
            </p>
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase tracking-wider">Identificador de Usuário (Username)</label>
            <input
              type="text"
              readOnly
              disabled
              value={currentUser?.username}
              className="w-full bg-muted/20 border border-border rounded-xl px-4 py-3 text-xs text-muted-foreground outline-none cursor-not-allowed uppercase"
            />
            <span className="text-[8px] text-muted-foreground mt-1 block">O identificador de login é fixo para evitar incompatibilidade relacional.</span>
          </div>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/10 text-xs text-red-400 rounded-xl">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/10 text-xs text-emerald-400 rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4" /> {success}
          </div>
        )}

        <button
          type="submit"
          disabled={updating}
          className="px-6 py-3.5 bg-primary hover:bg-primary/95 text-primary-foreground font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md hover:scale-[1.01] flex items-center gap-2 cursor-pointer"
        >
          {updating ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Alterações'
          )}
        </button>
      </form>

      <div className="pt-6 border-t border-border/40 mt-8 space-y-4">
        <h3 className="text-sm font-bold text-foreground">Central de Ajuda</h3>
        <div className="p-5 rounded-2xl bg-muted/10 border border-border/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-foreground">Guia de Boas-Vindas (Onboarding)</h4>
            <p className="text-xs text-muted-foreground">Deseja rever o passo a passo guiado sobre o funcionamento de bancos, cartões, categorias e lançamentos no sistema?</p>
          </div>
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="px-4 py-2.5 bg-muted/50 hover:bg-muted text-foreground border border-border rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer self-start sm:self-auto"
          >
            Iniciar Onboarding
          </button>
        </div>
      </div>

      {/* Modal de Confirmação do Reinício do Tour */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setShowResetConfirm(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-card border border-border/80 rounded-[2rem] shadow-2xl p-6 z-10 space-y-6 text-center"
            >
              <div className="w-12 h-12 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Play className="w-6 h-6 fill-primary" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-foreground">Reiniciar o Tour Guiado?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                  Isso irá redefinir o seu progresso de boas-vindas para o primeiro passo, guiando você pelas principais telas do sistema.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="py-3 border border-border rounded-xl text-xs font-black text-muted-foreground hover:bg-muted/50 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    setShowResetConfirm(false);
                    await resetOnboarding();
                  }}
                  className="py-3 bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl text-xs font-black transition-all cursor-pointer shadow-md"
                >
                  Sim, Reiniciar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
