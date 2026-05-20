import React, { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { Lock, Eye, EyeOff, Check, RefreshCw } from 'lucide-react';

export default function SecuritySettings() {
  const { currentUser, updateUserProfile } = useAppContext();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPass, setShowPass] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Por favor, preencha todos os campos da senha.');
      return;
    }

    if (currentPassword !== currentUser?.password) {
      setError('A senha atual digitada está incorreta.');
      return;
    }

    if (newPassword.length < 3) {
      setError('A nova senha deve possuir ao menos 3 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('A confirmação da senha não corresponde com a nova senha digitada.');
      return;
    }

    setUpdating(true);
    setTimeout(() => {
      updateUserProfile({
        password: newPassword
      });
      setUpdating(false);
      setSuccess('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }, 600);
  };

  return (
    <div className="bg-card border border-border rounded-3xl p-6 md:p-8 space-y-6">
      <div>
        <h2 className="text-xl font-bold font-display text-foreground">Alterar Senha de Segurança</h2>
        <p className="text-xs text-muted-foreground mt-1">Mapeie uma nova combinação para restringir o acesso à sua carteira individual</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4 max-w-xl">
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase tracking-wider">Senha Atual</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPass ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Ex primeirapassword"
                className="w-full bg-muted/30 border border-border rounded-xl pl-10 pr-4 py-3 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase tracking-wider">Nova Senha</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPass ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Nova combinação (Mínimo 3 caracteres)"
                className="w-full bg-muted/30 border border-border rounded-xl pl-10 pr-4 py-3 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase tracking-wider">Confirmar Nova Senha</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repetir nova combinação"
                className="w-full bg-muted/30 border border-border rounded-xl pl-10 pr-4 py-3 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer font-bold uppercase tracking-wider block"
          >
            {showPass ? 'Ocultar Senhas' : 'Exibir Senhas'}
          </button>
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
              Mudando...
            </>
          ) : (
            'Alterar Senha'
          )}
        </button>
      </form>
    </div>
  );
}
