import React, { useState, useRef } from 'react';
import { useAppContext } from '../store/AppContext';
import { Loader2, Camera, User, Phone, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const PRESET_AVATARS = ['👑', '🦁', '🦉', '💎', '💼', '🚀', '🧠', '🌟', '🦄', '🐆'];

export default function LoginPage() {
  const { loginUser, registerUser, theme } = useAppContext();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState('👑');
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status/Error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleTabChange = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    resetMessages();
  };

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
      
      setLoading(true);
      try {
        const optimizedUrl = await resizeAndOptimizeImage(file);
        setCustomAvatar(optimizedUrl);
        setAvatar(''); // Clear emoji preset since we use custom uploaded base64
        resetMessages();
      } catch (err: any) {
        setError(err.message || 'Erro ao processar imagem.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSelectPresetAvatar = (emoji: string) => {
    setAvatar(emoji);
    setCustomAvatar(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!username.trim() || !password) {
      setError('Por favor, preencha o usuário e a senha.');
      return;
    }

    if (activeTab === 'register') {
      if (!name.trim()) {
        setError('Por favor, informe o seu nome completo.');
        return;
      }
      if (!phone.trim()) {
        setError('Por favor, cadastre seu número de celular/WhatsApp.');
        return;
      }

      setLoading(true);
      try {
        const finalAvatar = customAvatar || avatar;
        const finalPhone = phone.replace(/\D/g, ''); // standard digits
        
        const successReg = await registerUser({
          username: username.trim(),
          password: password,
          name: name.trim(),
          phone: finalPhone,
          avatar: finalAvatar
        });

        if (successReg) {
          setSuccess('Conta criada com sucesso! Faça login abaixo para navegar.');
          setActiveTab('login');
          setPassword('');
        } else {
          setError('Este nome de usuário já existe no sistema ou ocorreu um erro no cadastro.');
        }
      } catch (err: any) {
        setError(err.message || 'Erro ao processar o cadastro.');
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        const successLog = await loginUser(username.trim(), password);
        if (!successLog) {
          setError('Usuário ou senha inválidos.');
        }
      } catch (err: any) {
        setError(err.message || 'Erro ao processar o login.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden font-sans">
      {/* Dynamic ambient background blur circles */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl opacity-30 animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/15 rounded-full blur-3xl opacity-20 pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-lg bg-card border border-border/80 rounded-3xl p-6 md:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.5)] z-10 relative overflow-hidden"
      >
        <div className="text-center mb-8">
          <span className="text-foreground font-black font-display text-3xl tracking-tighter flex items-center justify-center gap-1.5 uppercase italic">
            Noble <span className="text-primary">Finance</span>
          </span>
          <p className="text-xs text-muted-foreground mt-2 tracking-wide font-medium">
            Gestão inteligente de despesas com alertas integrados via WhatsApp
          </p>
        </div>

        {/* Tab Header Selector */}
        <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-muted/30 rounded-2xl border border-border/40 mb-6">
          <button
            onClick={() => handleTabChange('login')}
            className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              activeTab === 'login'
                ? 'bg-card text-foreground shadow-sm border border-border/30'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => handleTabChange('register')}
            className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              activeTab === 'register'
                ? 'bg-card text-foreground shadow-sm border border-border/30'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Cadastrar Conta
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: activeTab === 'login' ? -15 : 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: activeTab === 'login' ? 15 : -15 }}
            transition={{ duration: 0.2 }}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Profile Config section for registration */}
              {activeTab === 'register' && (
                <div className="bg-muted/10 p-4 border border-border/40 rounded-2xl space-y-4 mb-4">
                  <h3 className="text-[11px] font-black uppercase text-gradient-gold tracking-widest block text-center">
                    🖼️ Personalizar Seu Perfil
                  </h3>
                  
                  {/* Photo Customizer / selection interface */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative group">
                      <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-3xl overflow-hidden shadow-inner group-hover:border-primary/50 transition-colors">
                        {customAvatar ? (
                          <img src={customAvatar} alt="Profile Custom" className="w-full h-full object-cover" />
                        ) : (
                          <span>{avatar}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 p-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-all"
                        title="Upload Foto de Perfil"
                      >
                        <Camera className="w-3 h-3" />
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">Arraste uma foto de perfil ou escolha um ícone rápido:</span>
                    
                    {/* Emojis Preset selectors */}
                    <div className="flex flex-wrap items-center justify-center gap-2 max-w-sm">
                      {PRESET_AVATARS.map(item => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => handleSelectPresetAvatar(item)}
                          className={`w-8 h-8 rounded-lg border flex items-center justify-center hover:scale-110 active:scale-90 transition-all text-sm cursor-pointer ${
                            avatar === item && !customAvatar
                              ? 'bg-primary/20 border-primary text-foreground'
                              : 'bg-muted/20 border-border max-w-xs'
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Complete Name field */}
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase tracking-wider">Como quer ser chamado? (Nome Completo)</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Ex: Carlos Eduardo de Oliveira"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full bg-muted/40 border border-border rounded-xl pl-10 pr-4 py-3 text-xs focus:ring-1 focus:ring-primary outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Individual phone number field */}
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase tracking-wider">Seu Celular / WhatsApp para Avisos</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Ex: 5511999999999 (Código do país + DDD + Número)"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="w-full bg-muted/40 border border-border rounded-xl pl-10 pr-4 py-3 text-xs focus:ring-1 focus:ring-primary outline-none transition-all"
                      />
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-1 ml-0.5 font-medium leading-relaxed italic">
                      ℹ️ O sistema enviará alertas de vencimento individuais para este WhatsApp quando configurado.
                    </p>
                  </div>
                </div>
              )}

              {/* Login Info Credentials */}
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase tracking-wider">Nome de Usuário</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Identificador (Ex: joaosilva)"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className="w-full bg-muted/30 border border-border rounded-xl pl-10 pr-4 py-3 text-xs focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase tracking-wider">Senha de Acesso</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full bg-muted/30 border border-border rounded-xl pl-10 pr-10 py-3 text-xs focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Status responses rendering area */}
              {error && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-[11px] text-rose-400 font-medium leading-relaxed">
                  ⚠️ {error}
                </div>
              )}

              {success && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-[11px] text-emerald-400 font-medium flex gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  <span>{success}</span>
                </div>
              )}

              {/* Submit Buttons */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4.5 bg-primary hover:bg-primary/95 text-primary-foreground font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg hover:shadow-primary/15 shadow-primary/5 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  activeTab === 'login' ? 'Acessar Carteira' : 'Criar e Ativar Carteira'
                )}
              </button>

              {/* Guest testing advice block */}
              {activeTab === 'login' && (
                <div className="text-center p-3 bg-muted/20 border border-border/30 rounded-xl mt-6">
                  <p className="text-[10px] text-muted-foreground">
                    💡 Carteira Demonstrativa Padrão: Usuário: <code className="text-primary font-bold">noble</code> / Senha: <code className="text-primary font-bold">123</code>
                  </p>
                </div>
              )}
            </form>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
