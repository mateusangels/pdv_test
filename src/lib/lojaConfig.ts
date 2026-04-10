// Configuração da loja persistida em localStorage
const LOJA_STORAGE_KEY = 'loja_config';

export interface LojaConfig {
  nomeFantasia: string;
  cnpj: string;
  endereco: string;
  cidade: string;
  telefone: string;
  ie: string;
  limiteCredito: string;
  prazoFiado: string;
  logoUrl: string; // base64 data URL da logo
}

const defaultConfig: LojaConfig = {
  nomeFantasia: 'NEXOR',
  cnpj: '',
  endereco: '',
  cidade: '',
  telefone: '',
  ie: '',
  limiteCredito: '500',
  prazoFiado: '30',
  logoUrl: '',
};

export function getLojaConfig(): LojaConfig {
  try {
    const saved = localStorage.getItem(LOJA_STORAGE_KEY);
    if (saved) return { ...defaultConfig, ...JSON.parse(saved) };
  } catch {}
  return { ...defaultConfig };
}

export function saveLojaConfig(config: Partial<LojaConfig>): LojaConfig {
  const current = getLojaConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(LOJA_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
