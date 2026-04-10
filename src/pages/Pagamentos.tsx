import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, CreditCard } from 'lucide-react';
import { formatBRL, formatDateTime } from '@/lib/format';

const Pagamentos = () => {
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const perPage = 15;

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase
      .from('pagamentos')
      .select('*, fiados(descricao, clientes(nome))')
      .order('created_at', { ascending: false });
    if (err) { setError(true); setLoading(false); return; }
    setPagamentos(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = pagamentos.filter(p => {
    const clienteNome = (p.fiados as any)?.clientes?.nome || '';
    return clienteNome.toLowerCase().includes(search.toLowerCase());
  });

  const paginated = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={fetchData} />;

  return (
    <div>
      <PageHeader title="Pagamentos" description="Histórico completo de pagamentos" />

      <div className="bg-card rounded-xl shadow-card border border-border/50 animate-fade-up">
        <div className="p-3 md:p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por cliente..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9 h-9 text-sm" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={CreditCard} title="Nenhum pagamento" description="Os pagamentos aparecerão aqui." />
        ) : (
          <>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">DATA</TableHead>
                  <TableHead className="text-xs">CLIENTE</TableHead>
                  <TableHead className="text-xs">DESCRIÇÃO</TableHead>
                  <TableHead className="text-xs">VALOR</TableHead>
                  <TableHead className="text-xs">MÉTODO</TableHead>
                  <TableHead className="text-xs">STATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(p => (
                  <TableRow key={p.id} className={`hover:bg-muted/50 transition-colors ${p.estornado ? 'opacity-40' : ''}`}>
                    <TableCell className="text-sm">{formatDateTime(p.created_at)}</TableCell>
                    <TableCell className="text-sm font-medium">{(p.fiados as any)?.clientes?.nome || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{(p.fiados as any)?.descricao || '-'}</TableCell>
                    <TableCell className="text-sm font-medium text-success">{formatBRL(Number(p.valor))}</TableCell>
                    <TableCell className="text-sm uppercase">{p.metodo}</TableCell>
                    <TableCell className="text-xs">{p.estornado ? <span className="text-destructive font-medium">Estornado</span> : <span className="text-success font-medium">Confirmado</span>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex justify-between items-center p-4 border-t border-border text-sm text-muted-foreground">
                <span>{filtered.length} pagamento(s)</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                  <span className="flex items-center px-2">{page + 1} / {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próximo</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Pagamentos;
