import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatBRL, formatDate } from '@/lib/format';
import { DollarSign } from 'lucide-react';
import qrCodePix from '@/assets/qrcode-pix.png';

const Assinatura = () => {
  const [assinatura, setAssinatura] = useState<any>(null);
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: sub } = await supabase.from('assinatura').select('*').limit(1).single();
      setAssinatura(sub);
      if (sub) {
        const { data: pags } = await supabase.from('assinatura_pagamentos').select('*').eq('assinatura_id', sub.id).order('created_at', { ascending: false });
        setPagamentos(pags || []);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div className="max-w-4xl">
      <PageHeader title="Assinatura" description="Gerencie seu plano" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-6 animate-fade-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{assinatura?.nome_plano || 'Plano Mensal'}</h3>
              <p className="text-2xl font-bold">{formatBRL(Number(assinatura?.valor || 200))}<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Status:</span><StatusBadge status={assinatura?.status || 'ativa'} /></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Início:</span><span className="font-medium">{assinatura ? formatDate(assinatura.inicio) : '-'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Vencimento:</span><span className="font-medium">{assinatura ? formatDate(assinatura.vencimento) : '-'}</span></div>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-card border border-border/50 p-6 animate-fade-up text-center" style={{ animationDelay: '100ms' }}>
          <h3 className="font-bold mb-1">Pague via PIX</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Escaneie o QR Code para efetuar o pagamento de <span className="font-semibold text-foreground">{formatBRL(Number(assinatura?.valor || 200))}</span>
          </p>
          <img src={qrCodePix} alt="QR Code PIX" className="w-48 h-48 mx-auto rounded-lg border border-border" />
          <p className="text-xs text-muted-foreground mt-3">Chave PIX: {assinatura?.pix_chave || '09915712154'}</p>
          <p className="text-xs text-muted-foreground mt-1">Após o pagamento, clique em "Confirmar Pagamento" acima.</p>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-card border border-border/50 animate-fade-up" style={{ animationDelay: '200ms' }}>
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold">Histórico de Pagamentos</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">DATA</TableHead>
              <TableHead className="text-xs">VALOR</TableHead>
              <TableHead className="text-xs">MÉTODO</TableHead>
              <TableHead className="text-xs">STATUS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagamentos.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">Nenhum pagamento registrado</TableCell></TableRow>
            ) : pagamentos.map(p => (
              <TableRow key={p.id}>
                <TableCell className="text-sm">{formatDate(p.created_at)}</TableCell>
                <TableCell className="text-sm font-medium text-success">{formatBRL(Number(p.valor))}</TableCell>
                <TableCell className="text-sm capitalize">{p.metodo}</TableCell>
                <TableCell><StatusBadge status={p.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Assinatura;
