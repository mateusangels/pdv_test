import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { formatBRL, formatDateTime } from '@/lib/format';
import { gerarCupomVenda, imprimirCupom, DadosCupomVenda } from '@/lib/cupomNaoFiscal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Search, Printer, Eye, ChevronLeft, ChevronRight, Calendar,
  Banknote, CreditCard, Smartphone, ShoppingCart, Receipt, Trash2
} from 'lucide-react';

const PAGE_SIZE = 20;

const metodoLabel: Record<string, string> = {
  dinheiro: 'Dinheiro',
  debito: 'Débito',
  credito: 'Crédito',
  pix: 'PIX',
  fiado: 'Fiado',
};

const metodoColor: Record<string, string> = {
  dinheiro: 'bg-green-100 text-green-700 border-green-200',
  debito: 'bg-blue-100 text-blue-700 border-blue-200',
  credito: 'bg-purple-100 text-purple-700 border-purple-200',
  pix: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  fiado: 'bg-orange-100 text-orange-700 border-orange-200',
};

export default function Vendas() {
  const { toast } = useToast();
  const [vendas, setVendas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingDups, setRemovingDups] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [metodoFiltro, setMetodoFiltro] = useState('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedVenda, setSelectedVenda] = useState<any>(null);
  const [vendaItens, setVendaItens] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchVendas = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('vendas')
        .select('*, clientes(nome, cpf)', { count: 'exact' })
        .eq('status', 'finalizada')
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (metodoFiltro !== 'todos') {
        query = query.eq('metodo_pagamento', metodoFiltro);
      }
      if (dataInicio) {
        query = query.gte('created_at', dataInicio + 'T00:00:00');
      }
      if (dataFim) {
        query = query.lte('created_at', dataFim + 'T23:59:59');
      }

      const { data, count, error } = await query;
      if (error) throw error;

      let filtered = data || [];
      if (search.trim()) {
        const s = search.trim().toLowerCase();
        filtered = filtered.filter(v =>
          String(v.numero_venda).includes(s) ||
          (v.clientes?.nome || '').toLowerCase().includes(s) ||
          v.id.toLowerCase().includes(s)
        );
      }

      setVendas(filtered);
      setTotal(count || 0);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchVendas(); }, [page, metodoFiltro, dataInicio, dataFim]);

  const openDetail = async (venda: any) => {
    setSelectedVenda(venda);
    setDetailOpen(true);
    setLoadingDetail(true);
    const { data } = await supabase
      .from('venda_itens')
      .select('*')
      .eq('venda_id', venda.id)
      .order('created_at');
    setVendaItens(data || []);
    setLoadingDetail(false);
  };

  const reimprimirCupom = async (venda: any) => {
    const { data: itens } = await supabase
      .from('venda_itens')
      .select('*')
      .eq('venda_id', venda.id);

    const cupomData: DadosCupomVenda = {
      id: venda.id,
      data: new Date(venda.created_at),
      itens: (itens || []).map((i: any) => ({
        codigo_barras: i.codigo_barras || '',
        descricao: i.descricao,
        quantidade: Number(i.quantidade),
        unidade: i.unidade,
        valor_unitario: Number(i.valor_unitario),
        valor_total: Number(i.valor_total),
      })),
      subtotal: Number(venda.subtotal),
      desconto: Number(venda.desconto_total),
      total: Number(venda.total),
      metodo_pagamento: venda.metodo_pagamento,
      valor_pago: Number(venda.valor_pago),
      troco: Number(venda.troco),
      cliente_nome: venda.clientes?.nome,
      cliente_cpf: venda.clientes?.cpf,
      operador_nome: 'OPERADOR',
    };

    imprimirCupom(gerarCupomVenda(cupomData));
  };

  const removerDuplicatas = async () => {
    if (!confirm('Tem certeza que deseja remover vendas duplicadas? Essa acao nao pode ser desfeita.')) return;
    setRemovingDups(true);
    try {
      // Buscar todas as vendas ordenadas por numero_venda
      const PAGE = 1000;
      let allVendas: any[] = [];
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data } = await supabase
          .from('vendas')
          .select('id, numero_venda, total, metodo_pagamento, cliente_id, created_at')
          .eq('status', 'finalizada')
          .order('numero_venda', { ascending: true })
          .range(from, from + PAGE - 1);
        allVendas = allVendas.concat(data || []);
        hasMore = (data?.length || 0) === PAGE;
        from += PAGE;
      }

      // Agrupar: vendas com mesmo total, metodo, cliente e created_at dentro de 2 min
      const idsParaDeletar: string[] = [];
      const usados = new Set<string>();

      for (let i = 0; i < allVendas.length; i++) {
        if (usados.has(allVendas[i].id)) continue;
        for (let j = i + 1; j < allVendas.length; j++) {
          if (usados.has(allVendas[j].id)) continue;
          const a = allVendas[i];
          const b = allVendas[j];
          const diffMs = Math.abs(new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          if (
            Number(a.total) === Number(b.total) &&
            a.metodo_pagamento === b.metodo_pagamento &&
            (a.cliente_id || null) === (b.cliente_id || null) &&
            diffMs <= 120000 // 2 minutos
          ) {
            // Manter o de menor numero_venda, deletar o outro
            idsParaDeletar.push(b.id);
            usados.add(b.id);
          }
        }
      }

      if (idsParaDeletar.length === 0) {
        toast({ title: 'Nenhuma duplicata encontrada', description: 'Todas as vendas parecem unicas.' });
        setRemovingDups(false);
        return;
      }

      // Deletar em lotes de 50
      for (let i = 0; i < idsParaDeletar.length; i += 50) {
        const batch = idsParaDeletar.slice(i, i + 50);
        await supabase.from('venda_itens').delete().in('venda_id', batch);
        await supabase.from('vendas').delete().in('id', batch);
      }

      toast({ title: `${idsParaDeletar.length} vendas duplicadas removidas`, description: 'O historico foi limpo.' });
      fetchVendas();
    } catch (e: any) {
      toast({ title: 'Erro ao remover duplicatas', description: e.message, variant: 'destructive' });
    }
    setRemovingDups(false);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-3 md:p-6 space-y-6 animate-fade-up">
      <PageHeader title="Historico de Vendas" description="Consulte todas as vendas realizadas">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Receipt className="w-4 h-4" />
          <span>{total} vendas encontradas</span>
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 md:gap-3 items-end">
        <div className="flex-1 min-w-0 w-full md:min-w-[200px] max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por numero, cliente ou ID..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              onKeyDown={e => { if (e.key === 'Enter') fetchVendas(); }}
              className="pl-9"
            />
          </div>
        </div>

        <Select value={metodoFiltro} onValueChange={v => { setMetodoFiltro(v); setPage(0); }}>
          <SelectTrigger className="w-full md:w-[160px]">
            <SelectValue placeholder="Pagamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="dinheiro">Dinheiro</SelectItem>
            <SelectItem value="debito">Debito</SelectItem>
            <SelectItem value="credito">Credito</SelectItem>
            <SelectItem value="pix">PIX</SelectItem>
            <SelectItem value="fiado">Fiado</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Input type="date" value={dataInicio} onChange={e => { setDataInicio(e.target.value); setPage(0); }} className="w-full md:w-[150px]" />
          </div>
          <span className="text-muted-foreground text-sm">ate</span>
          <Input type="date" value={dataFim} onChange={e => { setDataFim(e.target.value); setPage(0); }} className="w-full md:w-[150px]" />
        </div>

        <Button variant="outline" size="sm" onClick={() => { setSearch(''); setMetodoFiltro('todos'); setDataInicio(''); setDataFim(''); setPage(0); }}>
          Limpar
        </Button>

        <Button variant="destructive" size="sm" className="gap-1" onClick={removerDuplicatas} disabled={removingDups}>
          <Trash2 className="w-3.5 h-3.5" /> {removingDups ? 'Removendo...' : 'Remover Duplicatas'}
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingState />
      ) : vendas.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">Nenhuma venda encontrada</p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[80px]">#</TableHead>
                <TableHead>Data / Hora</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-center">Pagamento</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right">Desconto</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center w-[100px]">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendas.map(v => (
                <TableRow key={v.id} className="hover:bg-accent/50">
                  <TableCell className="font-mono font-bold text-primary">
                    {String(v.numero_venda).padStart(5, '0')}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDateTime(v.created_at)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {v.clientes?.nome || <span className="text-muted-foreground italic">Consumidor</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={`text-[10px] font-semibold ${metodoColor[v.metodo_pagamento] || ''}`}>
                      {metodoLabel[v.metodo_pagamento] || v.metodo_pagamento}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm">{formatBRL(Number(v.subtotal))}</TableCell>
                  <TableCell className={`text-right text-sm ${Number(v.desconto_total) > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {Number(v.desconto_total) > 0 ? `- ${formatBRL(Number(v.desconto_total))}` : '-'}
                  </TableCell>
                  <TableCell className="text-right font-bold text-sm">{formatBRL(Number(v.total))}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openDetail(v)}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-primary transition-colors"
                        title="Ver detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => reimprimirCupom(v)}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-primary transition-colors"
                        title="Imprimir cupom"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, total)} de {total}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
            </Button>
            <span className="text-sm font-medium text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              Proximo <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Venda #{selectedVenda && String(selectedVenda.numero_venda).padStart(5, '0')}
            </DialogTitle>
          </DialogHeader>
          {selectedVenda && (
            <div className="flex flex-col flex-1 min-h-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 text-sm flex-shrink-0">
                <div>
                  <p className="text-muted-foreground text-xs">Data</p>
                  <p className="font-medium">{formatDateTime(selectedVenda.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Cliente</p>
                  <p className="font-medium">{selectedVenda.clientes?.nome || 'Consumidor'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Pagamento</p>
                  <Badge variant="outline" className={`text-[10px] font-semibold ${metodoColor[selectedVenda.metodo_pagamento] || ''}`}>
                    {metodoLabel[selectedVenda.metodo_pagamento] || selectedVenda.metodo_pagamento}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Valor Pago</p>
                  <p className="font-medium">{formatBRL(Number(selectedVenda.valor_pago))}</p>
                </div>
                {Number(selectedVenda.troco) > 0 && (
                  <div>
                    <p className="text-muted-foreground text-xs">Troco</p>
                    <p className="font-medium text-green-600">{formatBRL(Number(selectedVenda.troco))}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-3 flex flex-col min-h-0 flex-1">
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex-shrink-0">ITENS DA VENDA</p>
                {loadingDetail ? (
                  <p className="text-center text-muted-foreground py-4 text-sm">Carregando...</p>
                ) : (
                  <div className="flex-1 overflow-auto space-y-1 min-h-0">
                    {vendaItens.map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-accent/50 text-sm">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{item.descricao}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {item.codigo_barras || 'S/C'} · {Number(item.quantidade)} {item.unidade} x {formatBRL(Number(item.valor_unitario))}
                          </p>
                        </div>
                        <span className="font-bold ml-2 whitespace-nowrap">{formatBRL(Number(item.valor_total))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-3 space-y-1 flex-shrink-0">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatBRL(Number(selectedVenda.subtotal))}</span>
                </div>
                {Number(selectedVenda.desconto_total) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-destructive">Desconto</span>
                    <span className="text-destructive">- {formatBRL(Number(selectedVenda.desconto_total))}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatBRL(Number(selectedVenda.total))}</span>
                </div>
              </div>

              <Button className="w-full gap-2 flex-shrink-0" onClick={() => reimprimirCupom(selectedVenda)}>
                <Printer className="w-4 h-4" /> Imprimir Cupom
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
