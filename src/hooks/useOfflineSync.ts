import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchAll } from '@/lib/supabaseHelper';
import {
  cacheProdutos,
  getProdutosCacheCount,
  getVendasPendentes,
  removerVendaPendente,
  countVendasPendentes,
} from '@/lib/offlineDb';
import { toast } from '@/hooks/use-toast';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [produtosCached, setProdutosCached] = useState(0);
  const syncingRef = useRef(false);

  // Detect online/offline
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Cache products on mount and every 5 minutes
  useEffect(() => {
    const cacheProducts = async () => {
      if (!navigator.onLine) return;
      try {
        const produtos = await fetchAll('produtos', { eq: ['ativo', true] });
        await cacheProdutos(produtos);
        const count = await getProdutosCacheCount();
        setProdutosCached(count);
      } catch (e) {
        console.error('Erro ao cachear produtos:', e);
      }
    };

    cacheProducts();
    const interval = setInterval(cacheProducts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Update pending count
  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await countVendasPendentes();
      setPendingCount(count);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshPendingCount();
    const interval = setInterval(refreshPendingCount, 10_000);
    return () => clearInterval(interval);
  }, [refreshPendingCount]);

  // Sync pending sales
  const syncNow = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setIsSyncing(true);

    try {
      const pendentes = await getVendasPendentes();
      if (pendentes.length === 0) return;

      let synced = 0;

      for (const vp of pendentes) {
        try {
          // Insert venda
          const { data: venda, error: vendaErr } = await supabase
            .from('vendas')
            .insert(vp.vendaPayload)
            .select()
            .single();

          if (vendaErr) throw vendaErr;

          // Insert itens with the real venda_id
          const itensWithId = vp.itensPayload.map((i: any) => ({
            ...i,
            venda_id: venda.id,
          }));
          const { error: itensErr } = await supabase.from('venda_itens').insert(itensWithId);
          if (itensErr) throw itensErr;

          // Insert fiado if applicable
          if (vp.fiadoPayload) {
            await supabase.from('fiados').insert(vp.fiadoPayload);
          }

          // Update stock
          for (const upd of vp.estoqueUpdates) {
            const { data: prod } = await supabase
              .from('produtos')
              .select('estoque_atual, movimenta_estoque')
              .eq('id', upd.produto_id)
              .single();
            if (prod && prod.movimenta_estoque) {
              await supabase
                .from('produtos')
                .update({ estoque_atual: Number(prod.estoque_atual) - upd.quantidade })
                .eq('id', upd.produto_id);
            }
          }

          await removerVendaPendente(vp.id);
          synced++;
        } catch (e) {
          console.error('Erro ao sincronizar venda pendente:', vp.id, e);
        }
      }

      if (synced > 0) {
        toast({
          title: '☁️ Sincronização concluída',
          description: `${synced} venda(s) sincronizada(s) com sucesso!`,
        });
      }
    } catch (e) {
      console.error('Erro na sincronização:', e);
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
      await refreshPendingCount();
    }
  }, [refreshPendingCount]);

  // Auto sync when coming back online
  useEffect(() => {
    if (isOnline) {
      syncNow();
    }
  }, [isOnline, syncNow]);

  // Retry sync every 30s if there are pending sales
  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine && pendingCount > 0) {
        syncNow();
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [pendingCount, syncNow]);

  return { isOnline, isSyncing, pendingCount, produtosCached, syncNow };
}
