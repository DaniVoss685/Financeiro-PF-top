import React, { useState, useEffect } from 'react';
import { 
  getEvolutionSettings, 
  saveEvolutionSettings, 
  checkEvolutionConnection, 
  sendWhatsAppMessage, 
  EvolutionSettings 
} from '../lib/EvolutionService';
import { PremiumCard } from '../components/ui/PremiumComponents';
import { 
  Bell, 
  MessageSquare, 
  KeyRound, 
  Server, 
  CheckCircle2, 
  XCircle, 
  Send, 
  Eye, 
  EyeOff, 
  Activity, 
  AlertCircle 
} from 'lucide-react';

export default function NotificationsSettings() {
  const [settings, setSettings] = useState<EvolutionSettings>({
    host: '',
    instanceName: '',
    apiKey: '',
    enabled: true
  });

  const [testPhone, setTestPhone] = useState(localStorage.getItem('evolution_test_phone') || '');
  const [testMessage, setTestMessage] = useState('Olá! Este é um teste da integração do WhatsApp através da Evolution API com o Contaju Pessoal. Seus lembretes estão funcionando perfeitamente! 🚀');
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Connection states
  const [connectionState, setConnectionState] = useState<'idle' | 'checking' | 'connected' | 'disconnected'>('idle');
  const [connectionDetails, setConnectionDetails] = useState<string>('');
  
  // Send statuses
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'success' | 'failed'>('idle');
  const [sendResult, setSendResult] = useState<string>('');

  useEffect(() => {
    const active = getEvolutionSettings();
    setSettings(active);
  }, []);

  const handleSaveSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    saveEvolutionSettings(settings);
    
    // Auto check after saving
    handleCheckConnection();
  };

  const handleCheckConnection = async () => {
    setConnectionState('checking');
    setConnectionDetails('');
    const res = await checkEvolutionConnection(settings);
    
    if (res.success) {
      setConnectionState('connected');
      setConnectionDetails(JSON.stringify(res.data, null, 2));
    } else {
      setConnectionState('disconnected');
      setConnectionDetails(res.error || 'Erro desconhecido');
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone) return;
    
    // Cache the phone number
    localStorage.setItem('evolution_test_phone', testPhone);
    
    setSendStatus('sending');
    setSendResult('');
    
    const res = await sendWhatsAppMessage(testPhone, testMessage, settings);
    
    if (res.success) {
      setSendStatus('success');
      setSendResult(JSON.stringify(res.data, null, 2));
    } else {
      setSendStatus('failed');
      setSendResult(res.error || 'Erro desconhecido no envio');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-foreground">Configuração de Notificações</h2>
        <p className="text-sm text-muted-foreground mt-1">Conecte sua conta com a Evolution API para enviar lembretes automáticos diretamente para seu WhatsApp.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form column: 7 cols */}
        <form onSubmit={(e) => { e.preventDefault(); handleSaveSettings(); }} className="lg:col-span-7 space-y-6">
          <PremiumCard className="p-6 border-border bg-card space-y-6">
            <div className="flex items-center gap-3 border-b border-border/50 pb-4">
              <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">Credenciais da Evolution API</h3>
                <p className="text-xs text-muted-foreground">Insira as configurações da sua API de comunicação</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 block pl-1">URL da API (Host)</label>
                <div className="relative">
                  <input 
                    required 
                    type="url" 
                    value={settings.host} 
                    onChange={e => setSettings({...settings, host: e.target.value})} 
                    placeholder="https://sua-api.evolution.host" 
                    className="w-full bg-background border border-border/80 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground" 
                  />
                  <Server className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5" />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 pl-1">Utilize a URL base da API sem a rota do manager.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 block pl-1">Nome da Instância</label>
                  <div className="relative">
                    <input 
                      required 
                      type="text" 
                      value={settings.instanceName} 
                      onChange={e => setSettings({...settings, instanceName: e.target.value})} 
                      placeholder="Ex: CTJ aplicativo" 
                      className="w-full bg-background border border-border/80 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground" 
                    />
                    <MessageSquare className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 block pl-1">Status da Integração</label>
                  <div className="flex items-center gap-3 h-[46px] bg-background border border-border/80 rounded-xl px-4">
                    <input 
                      type="checkbox" 
                      id="integration_enabled"
                      checked={settings.enabled}
                      onChange={e => setSettings({...settings, enabled: e.target.checked})}
                      className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary"
                    />
                    <label htmlFor="integration_enabled" className="text-sm text-foreground select-none cursor-pointer">
                      Notificações Ativas
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 block pl-1">Chave Global da API (Global API KEY)</label>
                <div className="relative">
                  <input 
                    required 
                    type={showApiKey ? 'text' : 'password'} 
                    value={settings.apiKey} 
                    onChange={e => setSettings({...settings, apiKey: e.target.value})} 
                    placeholder="Chave secreta obtida na Evolution API" 
                    className="w-full bg-background border border-border/80 rounded-xl pl-10 pr-12 py-3 text-sm focus:ring-1 focus:ring-primary outline-none font-mono text-foreground" 
                  />
                  <KeyRound className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5" />
                  <button 
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border/50 flex flex-col sm:flex-row gap-3">
              <button 
                type="submit"
                className="flex-1 bg-primary hover:bg-primary/95 text-primary-foreground py-3 rounded-xl font-bold text-sm shadow-md shadow-primary/10 transition-all"
              >
                Salvar Configurações
              </button>
              <button 
                type="button"
                onClick={handleCheckConnection}
                className="bg-muted hover:bg-muted/80 text-foreground py-3 px-6 rounded-xl font-medium text-sm border border-border/40 transition-all flex items-center justify-center gap-2"
              >
                <Activity className="w-4 h-4" />
                Testar Conexão
              </button>
            </div>
          </PremiumCard>

          {/* Connection diagnostics */}
          {connectionState !== 'idle' && (
            <PremiumCard className={`p-5 border-l-4 ${
              connectionState === 'checking' ? 'border-l-blue-500/80 border-border bg-card' :
              connectionState === 'connected' ? 'border-l-emerald-500 border-border bg-card' :
              'border-l-rose-500 border-border bg-card'
            }`}>
              <div className="flex items-start gap-3">
                {connectionState === 'checking' && (
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mt-0.5 shrink-0" />
                )}
                {connectionState === 'connected' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                )}
                {connectionState === 'disconnected' && (
                  <XCircle className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
                )}
                <div className="space-y-2 flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-foreground">
                    {connectionState === 'checking' && 'Verificando conexão com a API...'}
                    {connectionState === 'connected' && 'Instância Conectada com Sucesso!'}
                    {connectionState === 'disconnected' && 'Falha na Conexão'}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {connectionState === 'checking' && 'Enviando ping para o servidor da Evolution API.'}
                    {connectionState === 'connected' && 'Seu WhatsApp está emparelhado e pronto para receber notificações corporativas.'}
                    {connectionState === 'disconnected' && 'Verifique se a URL da API está correta, se o token é válido e se a instância está aberta.'}
                  </p>
                  {connectionDetails && (
                    <pre className="text-[10px] font-mono p-3 bg-background border border-border/80 rounded-xl overflow-x-auto text-muted-foreground max-h-32">
                      {connectionDetails}
                    </pre>
                  )}
                </div>
              </div>
            </PremiumCard>
          )}
        </form>

        {/* Right Test Message Delivery: 5 cols */}
        <div className="lg:col-span-5 space-y-6">
          <PremiumCard className="p-6 border-border bg-card space-y-5">
            <div className="flex items-center gap-3 border-b border-border/50 pb-4">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">Teste de Envio de Lembrete</h3>
                <p className="text-xs text-muted-foreground">Envie uma mensagem real agora mesmo</p>
              </div>
            </div>

            <form onSubmit={handleSendTestMessage} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 block pl-1">Número de Telefone (WhatsApp)</label>
                <input 
                  required 
                  type="text" 
                  value={testPhone} 
                  onChange={e => setTestPhone(e.target.value)} 
                  placeholder="Ex: 5511999998888" 
                  className="w-full bg-background border border-border/80 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground" 
                />
                <p className="text-[10px] text-muted-foreground mt-1 pl-1">Inclua DDI (55 para Brasil) + DDD + número. Apenas dígitos.</p>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 block pl-1">Mensagem de Teste</label>
                <textarea 
                  required 
                  rows={4}
                  value={testMessage} 
                  onChange={e => setTestMessage(e.target.value)} 
                  className="w-full bg-background border border-border/80 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground resize-none leading-relaxed" 
                />
              </div>

              <button 
                type="submit"
                disabled={sendStatus === 'sending'}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm shadow-md shadow-emerald-500/10 transition-all flex items-center justify-center gap-2"
              >
                {sendStatus === 'sending' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enviando Teste...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Enviar Mensagem de Teste
                  </>
                )}
              </button>
            </form>

            {/* Results feedback */}
            {sendStatus !== 'idle' && sendStatus !== 'sending' && (
              <div className={`p-4 rounded-xl border ${
                sendStatus === 'success' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/5 border-rose-500/20 text-rose-400'
              } space-y-2`}>
                <div className="flex items-center gap-2">
                  {sendStatus === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                  )}
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {sendStatus === 'success' ? 'Envio Concluído' : 'Falha no Envio'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {sendStatus === 'success' ? 'A mensagem foi despachada pela Evolution API para o número especificado!' : 'Ocorreu um erro ao despachar a mensagem.'}
                </p>
                {sendResult && (
                  <pre className="text-[9px] font-mono p-2 bg-background/50 rounded-lg overflow-x-auto max-h-24 text-muted-foreground border border-border/40">
                    {sendResult}
                  </pre>
                )}
              </div>
            )}
          </PremiumCard>
        </div>
      </div>
    </div>
  );
}
