import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Eye, ShoppingCart, MessageCircle, FileText, X, AlertTriangle, Barcode } from 'lucide-react';
import { formatBRL, formatDate } from '@/lib/format';
import { gerarRelatorioFiadoPDF } from '@/lib/gerarRelatorioPDF';
import { gerarCupomFiado, imprimirCupom } from '@/lib/cupomNaoFiscal';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface ItemForm {
  produto: string;
  codigo_barras: string;
  quantidade: number;
  valor_unitario: number;
  produto_id?: string;
}

const emptyItem = (): ItemForm => ({ produto: '', codigo_barras: '', quantidade: 1, valor_unitario: 0 });

const Fiados = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [fiados, setFiados] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    cliente_id: '',
    descricao: '',
    data_compra: new Date().toISOString().slice(0, 10),
    data_vencimento: '',
  });
  const [itensForm, setItensForm] = useState<ItemForm[]>([]);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const perPage = 10;

  // Barcode scanning
  const barcodeRef = useRef<HTMLInputElement>(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    const [fRes, cRes] = await Promise.all([
      supabase.from('fiados').select('*, clientes(nome, telefone)').order('created_at', { ascending: false }),
      supabase.from('clientes').select('id, nome'),
    ]);
    if (fRes.error) { setError(true); setLoading(false); return; }
    setFiados(fRes.data || []);
    setClientes(cRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const hoje = new Date().toISOString().slice(0, 10);

  const filtered = fiados.filter(f => {
    const clienteNome = (f.clientes as any)?.nome || '';
    const matchSearch = clienteNome.toLowerCase().includes(search.toLowerCase()) || f.descricao.toLowerCase().includes(search.toLowerCase());
    if (statusFilter === 'vencido') {
      return matchSearch && f.data_vencimento && f.data_vencimento < hoje && f.status !== 'pago';
    }
    const matchStatus = statusFilter === 'all' || f.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const paginated = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const valorTotalItens = itensForm.reduce((acc, i) => acc + i.quantidade * i.valor_unitario, 0);

  // ── Barcode / Product Search ──
  const searchProducts = useCallback(async (query: string) => {
    if (query.length < 1) { setSuggestions([]); setShowSuggestions(false); return; }
    
    const isNumeric = /^\d+$/.test(query);
    
    let result;
    if (isNumeric) {
      // Search by barcode
      result = await supabase.from('produtos').select('*').or(`codigo_barras.ilike.%${query}%,codigo_interno.ilike.%${query}%`).eq('ativo', true).limit(10);
    } else {
      // Search by description
      result = await supabase.from('produtos').select('*').or(`descricao.ilike.%${query}%,marca.ilike.%${query}%`).eq('ativo', true).limit(10);
    }

    if (result.data && result.data.length > 0) {
      setSuggestions(result.data);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);

  const handleBarcodeChange = (value: string) => {
    setBarcodeInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchProducts(value), 250);
  };

  const handleBarcodeKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && barcodeInput.trim()) {
      e.preventDefault();
      // Try exact barcode match
      const { data } = await supabase.from('produtos').select('*').eq('codigo_barras', barcodeInput.trim()).eq('ativo', true).single();
      if (data) {
        addProductToList(data);
      } else if (suggestions.length === 1) {
        addProductToList(suggestions[0]);
      } else {
        toast({ title: 'Produto não encontrado', variant: 'destructive' });
      }
    }
  };

  const addProductToList = (produto: any) => {
    // Check if already in list
    const existingIdx = itensForm.findIndex(i => i.produto_id === produto.id);
    if (existingIdx >= 0) {
      const copy = [...itensForm];
      copy[existingIdx].quantidade += 1;
      setItensForm(copy);
    } else {
      setItensForm(prev => [...prev, {
        produto: produto.descricao,
        codigo_barras: produto.codigo_barras,
        quantidade: 1,
        valor_unitario: Number(produto.preco_venda),
        produto_id: produto.id,
      }]);
    }
    setBarcodeInput('');
    setSuggestions([]);
    setShowSuggestions(false);
    // Focus back on barcode input
    setTimeout(() => barcodeRef.current?.focus(), 100);
  };

  const removeItem = (idx: number) => setItensForm(itensForm.filter((_, i) => i !== idx));
  const updateItemQty = (idx: number, qty: number) => {
    const copy = [...itensForm];
    copy[idx].quantidade = Math.max(1, qty);
    setItensForm(copy);
  };

  const handleSave = async () => {
    if (itensForm.length === 0) {
      toast({ title: 'Adicione pelo menos um produto', variant: 'destructive' });
      return;
    }
    if (!form.cliente_id) {
      toast({ title: 'Selecione um cliente', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const totalVal = itensForm.reduce((a, i) => a + i.quantidade * i.valor_unitario, 0);
      const { data: inserted, error: err } = await supabase.from('fiados').insert({
        cliente_id: form.cliente_id,
        descricao: form.descricao || 'Compra fiado',
        created_by: user?.id,
        status: 'pendente',
        valor_pago: 0,
        valor_total: totalVal,
      }).select('id').single();

      if (err || !inserted) throw err;

      const itensData = itensForm.map(i => ({
        fiado_id: inserted.id,
        produto: i.produto,
        quantidade: i.quantidade,
        valor_unitario: i.valor_unitario,
        valor_total: i.quantidade * i.valor_unitario,
      }));
      await supabase.from('fiado_itens').insert(itensData);

      // Get client name for cupom
      const cliente = clientes.find(c => c.id === form.cliente_id);
      
      // Print cupom
      const cupom = gerarCupomFiado({
        id: inserted.id,
        data: new Date(),
        cliente_nome: cliente?.nome || 'AO CONSUMIDOR',
        operador_nome: profile?.nome || 'OPERADOR',
        itens: itensForm.map(i => ({
          codigo_barras: i.codigo_barras,
          descricao: i.produto,
          quantidade: i.quantidade,
          unidade: 'UN',
          valor_unitario: i.valor_unitario,
          valor_total: i.quantidade * i.valor_unitario,
        })),
        subtotal: totalVal,
        total: totalVal,
      });
      imprimirCupom(cupom);

      toast({ title: 'Fiado registrado com sucesso!' });
      setShowForm(false);
      setForm({ cliente_id: '', descricao: '', data_compra: new Date().toISOString().slice(0, 10), data_vencimento: '' });
      setItensForm([]);
      fetchData();
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handlePDF = async (f: any) => {
    const [iRes, pRes] = await Promise.all([
      supabase.from('fiado_itens').select('*').eq('fiado_id', f.id).order('created_at'),
      supabase.from('pagamentos').select('*').eq('fiado_id', f.id).order('created_at', { ascending: false }),
    ]);
    const cliente = f.clientes as any;
    gerarRelatorioFiadoPDF(f, iRes.data || [], pRes.data || [], cliente);
  };

  const handleWhatsApp = (f: any) => {
    const tel = (f.clientes as any)?.telefone?.replace(/\D/g, '');
    if (!tel) { toast({ title: 'Telefone não cadastrado', variant: 'destructive' }); return; }
    const nome = (f.clientes as any)?.nome || '';
    const saldo = Number(f.valor_total) - Number(f.valor_pago);
    const msg = encodeURIComponent(
      `Olá ${nome}.\n\nVocê possui um saldo pendente na Oliver Soft Tech.\n\nValor total: ${formatBRL(Number(f.valor_total))}\nValor pago: ${formatBRL(Number(f.valor_pago))}\nValor pendente: ${formatBRL(saldo)}\n\nFavor regularizar o quanto antes.`
    );
    window.open(`https://wa.me/55${tel}?text=${msg}`, '_blank');
    supabase.from('cobrancas').insert({ cliente_id: f.cliente_id, fiado_id: f.id, valor_cobrado: saldo, enviado_por: user?.id });
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={fetchData} />;

  return (
    <div>
      <PageHeader title="Fiados" description="Controle de vendas fiadas" />

      <div className="bg-card rounded-xl shadow-card border border-border/50 animate-fade-up">
        <div className="p-4 border-b border-border flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por cliente ou descrição..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9 h-9 text-sm" />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-40 h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="parcial">Parcial</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="vencido">Vencidos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="Nenhum fiado" description="Registre o primeiro fiado." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">DATA</TableHead>
                  <TableHead className="text-xs">CLIENTE</TableHead>
                  <TableHead className="text-xs">DESCRIÇÃO</TableHead>
                  <TableHead className="text-xs">VALOR</TableHead>
                  <TableHead className="text-xs">PAGO</TableHead>
                  <TableHead className="text-xs">STATUS</TableHead>
                  <TableHead className="text-xs text-right">AÇÕES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(f => (
                  <TableRow key={f.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="text-sm text-muted-foreground">{formatDate(f.created_at)}</TableCell>
                    <TableCell className="text-sm font-medium">{(f.clientes as any)?.nome || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">{f.descricao}</TableCell>
                    <TableCell className="text-sm font-medium">{formatBRL(Number(f.valor_total))}</TableCell>
                    <TableCell className="text-sm text-success">{formatBRL(Number(f.valor_pago))}</TableCell>
                    <TableCell><StatusBadge status={f.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link to={`/fiados/${f.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Eye className="w-3.5 h-3.5" /></Button>
                        </Link>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-primary" onClick={() => handlePDF(f)} title="Gerar PDF">
                          <FileText className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-success" onClick={() => handleWhatsApp(f)}>
                          <MessageCircle className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="flex justify-between items-center p-4 border-t border-border text-sm text-muted-foreground">
                <span>{filtered.length} fiado(s)</span>
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

      {/* ── Formulário Novo Fiado (estilo PDV) ── */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Barcode className="w-5 h-5" /> Novo Fiado</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Cliente */}
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Cliente</Label>
              <Select value={form.cliente_id} onValueChange={v => setForm({ ...form, cliente_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Descrição */}
            <div><Label className="text-xs uppercase text-muted-foreground">Descrição</Label><Input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Compra da semana" /></div>

            {/* Barcode input */}
            <div className="relative" ref={suggestionsRef}>
              <Label className="text-xs uppercase text-muted-foreground flex items-center gap-1 mb-1">
                <Barcode className="w-3 h-3" /> Código de Barras / Nome do Produto
              </Label>
              <Input
                ref={barcodeRef}
                value={barcodeInput}
                onChange={e => handleBarcodeChange(e.target.value)}
                onKeyDown={handleBarcodeKeyDown}
                placeholder="Leia o código de barras ou digite o nome do produto..."
                className="h-10 text-sm font-mono"
                autoFocus
              />
              <p className="text-[10px] text-muted-foreground mt-1">Leia o código ou digite para buscar. Enter para adicionar.</p>

              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map(p => (
                    <button
                      key={p.id}
                      onClick={() => addProductToList(p)}
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">{p.descricao}</p>
                        <p className="text-[10px] text-muted-foreground">{p.codigo_barras} • {p.marca || ''}</p>
                      </div>
                      <span className="text-sm font-bold text-primary">{formatBRL(Number(p.preco_venda))}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Lista de itens */}
            {itensForm.length > 0 && (
              <div>
                <Label className="text-xs uppercase text-muted-foreground mb-2 block">Produtos Adicionados ({itensForm.length})</Label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {itensForm.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.produto}</p>
                        <p className="text-[10px] text-muted-foreground">{item.codigo_barras}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => updateItemQty(idx, item.quantidade - 1)}>-</Button>
                        <span className="text-sm font-medium w-8 text-center">{item.quantidade}</span>
                        <Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => updateItemQty(idx, item.quantidade + 1)}>+</Button>
                      </div>
                      <span className="text-sm font-medium w-20 text-right">{formatBRL(item.valor_unitario)}</span>
                      <span className="text-sm font-bold w-24 text-right">{formatBRL(item.quantidade * item.valor_unitario)}</span>
                      <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive shrink-0" onClick={() => removeItem(idx)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-3">
                  <div className="bg-primary/10 rounded-lg px-4 py-2">
                    <span className="text-xs text-muted-foreground uppercase mr-2">Total:</span>
                    <span className="text-lg font-bold text-primary">{formatBRL(valorTotalItens)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.cliente_id || itensForm.length === 0} className="gradient-accent text-primary-foreground">
              {saving ? 'Salvando...' : 'Registrar Fiado'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Fiados;
