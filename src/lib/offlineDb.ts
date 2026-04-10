const DB_NAME = 'pdv_offline';
const DB_VERSION = 1;
const STORE_PRODUTOS = 'produtos_cache';
const STORE_VENDAS = 'vendas_pendentes';

export interface VendaPendente {
  id: string;
  timestamp: number;
  vendaPayload: any;
  itensPayload: any[];
  fiadoPayload?: any;
  estoqueUpdates: { produto_id: string; quantidade: number }[];
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PRODUTOS)) {
        db.createObjectStore(STORE_PRODUTOS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_VENDAS)) {
        db.createObjectStore(STORE_VENDAS, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheProdutos(produtos: any[]): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_PRODUTOS, 'readwrite');
  const store = tx.objectStore(STORE_PRODUTOS);
  store.clear();
  for (const p of produtos) {
    store.put(p);
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function buscarProdutosOffline(termo: string): Promise<any[]> {
  const db = await openDb();
  const tx = db.transaction(STORE_PRODUTOS, 'readonly');
  const store = tx.objectStore(STORE_PRODUTOS);
  const all: any[] = await new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  const lower = termo.toLowerCase();
  return all.filter(
    (p) =>
      p.ativo &&
      (p.descricao?.toLowerCase().includes(lower) ||
        p.codigo_barras?.toLowerCase().includes(lower) ||
        p.codigo_interno?.toLowerCase().includes(lower) ||
        p.marca?.toLowerCase().includes(lower))
  ).slice(0, 10);
}

export async function buscarProdutoOfflineExato(code: string): Promise<any | null> {
  const db = await openDb();
  const tx = db.transaction(STORE_PRODUTOS, 'readonly');
  const store = tx.objectStore(STORE_PRODUTOS);
  const all: any[] = await new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return (
    all.find(
      (p) =>
        p.ativo &&
        (p.codigo_barras === code || p.codigo_interno === code)
    ) || null
  );
}

export async function getProdutosCacheCount(): Promise<number> {
  const db = await openDb();
  const tx = db.transaction(STORE_PRODUTOS, 'readonly');
  const store = tx.objectStore(STORE_PRODUTOS);
  return new Promise((resolve, reject) => {
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function salvarVendaPendente(venda: VendaPendente): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_VENDAS, 'readwrite');
  tx.objectStore(STORE_VENDAS).put(venda);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getVendasPendentes(): Promise<VendaPendente[]> {
  const db = await openDb();
  const tx = db.transaction(STORE_VENDAS, 'readonly');
  const store = tx.objectStore(STORE_VENDAS);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function removerVendaPendente(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_VENDAS, 'readwrite');
  tx.objectStore(STORE_VENDAS).delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function countVendasPendentes(): Promise<number> {
  const db = await openDb();
  const tx = db.transaction(STORE_VENDAS, 'readonly');
  const store = tx.objectStore(STORE_VENDAS);
  return new Promise((resolve, reject) => {
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
