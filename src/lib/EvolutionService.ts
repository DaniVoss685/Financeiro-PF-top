export interface EvolutionSettings {
  host: string;
  instanceName: string;
  apiKey: string;
  enabled: boolean;
}

const DEFAULT_SETTINGS: EvolutionSettings = {
  host: 'https://aplicativos-evolution-api.m4aywz.easypanel.host',
  instanceName: 'CTJ aplicativo',
  apiKey: 's2Y1ts5PAVZ8WpLpddVOVWcoly3bQiqjrDhwBRxZT3PjEpR6oCW3TFyjA28LrmqyizcAlY7wcaqWp0ryhSkgbr9r6UvLutf9RVwCPNCuXEdrfYZSNmqatFIAnKdkjIe1',
  enabled: true
};

export function cleanEvolutionUrl(url: string): string {
  let cleaned = url.trim();
  if (cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  if (cleaned.endsWith('/manager')) {
    cleaned = cleaned.slice(0, -8);
  }
  if (cleaned.endsWith('/manager/')) {
    cleaned = cleaned.slice(0, -9);
  }
  return cleaned;
}

export function formatWhatsAppNumber(phone: string): string {
  // Remove all non-digits
  let numeric = phone.replace(/\D/g, '');
  
  // If it doesn't start with 55 (Brazil country code) and the user entered 10 or 11 digits
  if (!numeric.startsWith('55') && (numeric.length === 10 || numeric.length === 11)) {
    numeric = '55' + numeric;
  }
  
  return numeric;
}

export function getEvolutionSettings(): EvolutionSettings {
  const stored = localStorage.getItem('evolution_api_settings');
  if (!stored) {
    // Seed and return default settings
    localStorage.setItem('evolution_api_settings', JSON.stringify(DEFAULT_SETTINGS));
    return DEFAULT_SETTINGS;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export function saveEvolutionSettings(settings: EvolutionSettings) {
  localStorage.setItem('evolution_api_settings', JSON.stringify(settings));
}

export async function checkEvolutionConnection(settings?: EvolutionSettings): Promise<{ success: boolean; data?: any; error?: string }> {
  const active = settings || getEvolutionSettings();
  const host = cleanEvolutionUrl(active.host);
  const url = `${host}/instance/connectionState/${encodeURIComponent(active.instanceName)}`;
  
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': active.apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `Erro HTTP ${res.status}: ${text || res.statusText}` };
    }
    
    const data = await res.json();
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro de rede ou CORS' };
  }
}

export async function sendWhatsAppMessage(
  phone: string, 
  text: string, 
  settings?: EvolutionSettings
): Promise<{ success: boolean; data?: any; error?: string }> {
  const active = settings || getEvolutionSettings();
  const host = cleanEvolutionUrl(active.host);
  const targetNumber = formatWhatsAppNumber(phone);
  
  const url = `${host}/message/sendText/${encodeURIComponent(active.instanceName)}`;
  
  // We send both text message payload formats to support different Evolution API versions perfectly
  const body = {
    number: targetNumber,
    options: {
      delay: 1200,
      presence: "composing",
      linkPreview: true
    },
    textMessage: {
      text: text
    },
    text: text // fallback for versions that expect direct string key
  };
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': active.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${errText || res.statusText}` };
    }
    
    const data = await res.json();
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro de rede ou CORS ao enviar' };
  }
}
