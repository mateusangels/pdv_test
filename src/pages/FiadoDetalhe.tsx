import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, CreditCard, MessageCircle, Plus, Undo2, FileText, Trash2, AlertTriangle, Calendar } from 'lucide-react';
import { formatBRL, formatDate, formatDateTime } from '@/lib/format';
import { gerarRelatorioFiadoPDF } from '@/lib/gerarRelatorioPDF';
import { useToast } from '@/hooks/use-toast';

const FiadoDetalhe = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [fiado, setFiado] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showItem, setShowItem] = useState(false);
  const [payForm, setPayForm] = useState({ valor: 0, metodo: 'pix' });
  const [itemForm, setItemForm] = useState({ produto: '', quantidade: 1, valor_unitario: 0 });
  const [saving, setSaving] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [deleteItemValor, setDeleteItemValor] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    const [fRes, iRes, pRes] = await Promise.all([
      supabase.from('fiados').select('*, clientes(*)').eq('id', id!).single(),
      supabase.from('fiado_itens').select('*').eq('fiado_id', id!).order('created_at'),
      supabase.from('pagamentos').select('*').eq('fiado_id', id!).order('created_at', { ascending: false }),
    ]);
    if (fRes.error) { setError(true); setLoading(false); return; }
    setFiado(fRes.data);
    setItens(iRes.data || []);
    setPagamentos(pRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [id]);

  const saldoPendente = fiado ? Number(fiado.valor_total) - Number(fiado.valor_pago) : 0;
  const hoje = new Date().toISOString().slice(0, 10);
  const vencido = fiado?.data_vencimento && fiado.data_vencimento < hoje && fiado?.status !== 'pago';

  const handlePayment = async () => {
    if (payForm.valor <= 0 || payForm.valor > saldoPendente) {
      toast({ title: 'Valor inválido', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await supabase.from('pagamentos').insert({ fiado_id: id, valor: payForm.valor, metodo: payForm.metodo, registrado_por: user?.id });
      const newPago = Number(fiado.valor_pago) + payForm.valor;
      const newStatus = newPago >= Number(fiado.valor_total) ? 'pago' : 'parcial';
      await supabase.from('fiados').update({ valor_pago: newPago, status: newStatus }).eq('id', id!);
      toast({ title: 'Pagamento registrado!' });
      setShowPayment(false);
      setPayForm({ valor: 0, metodo: 'pix' });
      fetchData();
    } catch {
      toast({ title: 'Erro', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleEstorno = async (pagId: string, valor: number) => {
    await supabase.from('pagamentos').update({ estornado: true }).eq('id', pagId);
    const newPago = Math.max(0, Number(fiado.valor_pago) - valor);
    const newStatus = newPago === 0 ? 'pendente' : 'parcial';
    await supabase.from('fiados').update({ valor_pago: newPago, status: newStatus }).eq('id', id!);
    toast({ title: 'Pagamento estornado!' });
    fetchData();
  };

  const handleAddItem = async () => {
    setSaving(true);
    const valorTotal = itemForm.quantidade * itemForm.valor_unitario;
    await supabase.from('fiado_itens').insert({ fiado_id: id, ...itemForm, valor_total: valorTotal });
    const newTotal = Number(fiado.valor_total) + valorTotal;
    await supabase.from('fiados').update({ valor_total: newTotal, status: newTotal > Number(fiado.valor_pago) ? (Number(fiado.valor_pago) > 0 ? 'parcial' : 'pendente') : 'pago' }).eq('id', id!);
    setShowItem(false);
    setItemForm({ produto: '', quantidade: 1, valor_unitario: 0 });
    setSaving(false);
    fetchData();
  };

  const handleDeleteItem = async () => {
    if (!deleteItemId) return;
    await supabase.from('fiado_itens').delete().eq('id', deleteItemId);
    const newTotal = Math.max(0, Number(fiado.valor_total) - deleteItemValor);
    const newStatus = newTotal <= Number(fiado.valor_pago) ? 'pago' : (Number(fiado.valor_pago) > 0 ? 'parcial' : 'pendente');
    await supabase.from('fiados').update({ valor_total: newTotal, status: newStatus }).eq('id', id!);
    setDeleteItemId(null);
    setDeleteItemValor(0);
    toast({ title: 'Item removido!' });
    fetchData();
  };

  const handlePDF = () => {
    const cliente = fiado?.clientes as any;
    gerarRelatorioFiadoPDF(fiado, itens, pagamentos, cliente);
  };

  const handleWhatsApp = () => {
    const cliente = fiado?.clientes as any;
    const tel = cliente?.telefone?.replace(/\D/g, '');
    if (!tel) { toast({ title: 'Telefone não cadastrado', variant: 'destructive' }); return; }
    const msg = encodeURIComponent(
      `Olá ${cliente?.nome}.\n\nVocê possui um saldo pendente na Oliver Soft Tech.\n\nValor total: ${formatBRL(Number(fiado.valor_total))}\nValor pago: ${formatBRL(Number(fiado.valor_pago))}\nValor pendente: ${formatBRL(saldoPendente)}\n\nFavor regularizar o quanto antes.`
    );
    window.open(`https://wa.me/55${tel}?text=${msg}`, '_blank');
    supabase.from('cobrancas').insert({ cliente_id: fiado.cliente_id, fiado_id: id, valor_cobrado: saldoPendente, enviado_por: user?.id });
  };

  if (loading) return <LoadingState />;
  if (error || !fiado) return <ErrorState onRetry={fetchData} />;

  const cliente = fiado.clientes as any;

  return (
    <div>
      <div className="mb-4">
        <Link to="/fiados" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
      </div>

      <PageHeader title={`Fiado #${fiado.id.slice(0, 8)}`} description={cliente?.nome || ''}>
        <Button variant="outline" className="gap-2" onClick={handlePDF}>
          <FileText className="w-4 h-4" /> Gerar PDF
        </Button>
        <Button variant="outline" className="gap-2" onClick={handleWhatsApp}>
          <MessageCircle className="w-4 h-4" /> Cobrar WhatsApp
        </Button>
        <Button className="gap-2 gradient-accent text-primary-foreground" onClick={() => { setPayForm({ valor: saldoPendente, metodo: 'pix' }); setShowPayment(true); }}>
          <CreditCard className="w-4 h-4" /> Registrar Pagamento
        </Button>
      </PageHeader>

      {/* Aviso de vencido */}
      {vencido && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-4 flex items-center gap-3 animate-fade-up">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
          <div>
            <p className="text-sm font-semibold text-destructive">Fiado Vencido!</p>
            <p className="text-xs text-destructive/80">Vencimento era {formatDate(fiado.data_vencimento)}. Favor cobrar o cliente.</p>
          </div>
        </div>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="stat-card animate-fade-up">
          <p className="text-xs text-muted-foreground uppercase">Valor Total</p>
          <p className="text-2xl font-bold mt-1">{formatBRL(Number(fiado.valor_total))}</p>
        </div>
        <div className="stat-card animate-fade-up" style={{ animationDelay: '100ms' }}>
          <p className="text-xs text-muted-foreground uppercase">Valor Pago</p>
          <p className="text-2xl font-bold text-success mt-1">{formatBRL(Number(fiado.valor_pago))}</p>
        </div>
        <div className="stat-card animate-fade-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground uppercase">Saldo Pendente</p>
            <StatusBadge status={fiado.status} />
          </div>
          <p className="text-2xl font-bold text-destructive mt-1">{formatBRL(saldoPendente)}</p>
        </div>
        <div className="stat-card animate-fade-up" style={{ animationDelay: '300ms' }}>
          <p className="text-xs text-muted-foreground uppercase flex items-center gap-1"><Calendar className="w-3 h-3" /> Data Compra</p>
          <p className="text-lg font-semibold mt-1">{fiado.data_compra ? formatDate(fiado.data_compra) : formatDate(fiado.created_at)}</p>
        </div>
        <div className="stat-card animate-fade-up" style={{ animationDelay: '400ms' }}>
          <p className="text-xs text-muted-foreground uppercase flex items-center gap-1"><Calendar className="w-3 h-3" /> Vencimento</p>
          <p className={`text-lg font-semibold mt-1 ${vencido ? 'text-destructive' : ''}`}>
            {fiado.data_vencimento ? formatDate(fiado.data_vencimento) : '—'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Itens */}
        <div className="bg-card rounded-xl shadow-card border border-border/50 animate-fade-up" style={{ animationDelay: '500ms' }}>
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-sm font-semibold">Itens</h3>
            <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setShowItem(true)}>
              <Plus className="w-3 h-3" /> Adicionar
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">PRODUTO</TableHead>
                <TableHead className="text-xs">QTD</TableHead>
                <TableHead className="text-xs">UNIT.</TableHead>
                <TableHead className="text-xs text-right">TOTAL</TableHead>
                <TableHead className="text-xs text-right w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="text-sm">{item.produto}</TableCell>
                  <TableCell className="text-sm">{item.quantidade}</TableCell>
                  <TableCell className="text-sm">{formatBRL(Number(item.valor_unitario))}</TableCell>
                  <TableCell className="text-sm text-right font-medium">{formatBRL(Number(item.valor_total))}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive"
                      onClick={() => { setDeleteItemId(item.id); setDeleteItemValor(Number(item.valor_total)); }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {itens.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Nenhum item</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagamentos */}
        <div className="bg-card rounded-xl shadow-card border border-border/50 animate-fade-up" style={{ animationDelay: '600ms' }}>
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold">Pagamentos</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">DATA</TableHead>
                <TableHead className="text-xs">VALOR</TableHead>
                <TableHead className="text-xs">MÉTODO</TableHead>
                <TableHead className="text-xs text-right">AÇÃO</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagamentos.map(p => (
                <TableRow key={p.id} className={p.estornado ? 'opacity-40 line-through' : ''}>
                  <TableCell className="text-sm">{formatDateTime(p.created_at)}</TableCell>
                  <TableCell className="text-sm font-medium text-success">{formatBRL(Number(p.valor))}</TableCell>
                  <TableCell className="text-sm uppercase">{p.metodo}</TableCell>
                  <TableCell className="text-right">
                    {!p.estornado && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => handleEstorno(p.id, Number(p.valor))}>
                        <Undo2 className="w-3 h-3 mr-1" /> Estornar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {pagamentos.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">Nenhum pagamento</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialog Pagamento */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Registrar Pagamento</DialogTitle></DialogHeader>
          <div className="bg-muted/50 rounded-lg p-3 mb-2">
            <p className="text-xs text-muted-foreground uppercase">Saldo Restante</p>
            <p className="text-xl font-bold">{formatBRL(saldoPendente)}</p>
          </div>
          <div className="space-y-4">
            <div><Label className="text-xs uppercase text-muted-foreground">Valor do Pagamento</Label><Input type="number" step="0.01" value={payForm.valor} onChange={e => setPayForm({ ...payForm, valor: Number(e.target.value) })} /></div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Método</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {['pix', 'dinheiro', 'cartao'].map(m => (
                  <button
                    key={m}
                    onClick={() => setPayForm({ ...payForm, metodo: m })}
                    className={`py-3 rounded-lg border text-sm font-medium transition-all ${payForm.metodo === m ? 'border-primary bg-accent text-accent-foreground' : 'border-border hover:border-primary/50'
                      }`}
                  >
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>Cancelar</Button>
            <Button onClick={handlePayment} disabled={saving} className="gradient-accent text-primary-foreground">
              {saving ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Adicionar Item */}
      <Dialog open={showItem} onOpenChange={setShowItem}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Adicionar Item</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-xs uppercase text-muted-foreground">Produto</Label><Input value={itemForm.produto} onChange={e => setItemForm({ ...itemForm, produto: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs uppercase text-muted-foreground">Quantidade</Label><Input type="number" value={itemForm.quantidade} onChange={e => setItemForm({ ...itemForm, quantidade: Number(e.target.value) })} /></div>
              <div><Label className="text-xs uppercase text-muted-foreground">Valor Unitário</Label><Input type="number" step="0.01" value={itemForm.valor_unitario} onChange={e => setItemForm({ ...itemForm, valor_unitario: Number(e.target.value) })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItem(false)}>Cancelar</Button>
            <Button onClick={handleAddItem} disabled={saving || !itemForm.produto} className="gradient-accent text-primary-foreground">Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog Remover Item */}
      <AlertDialog open={!!deleteItemId} onOpenChange={() => setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Item</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza? O valor de {formatBRL(deleteItemValor)} será subtraído do total do fiado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem} className="bg-destructive text-destructive-foreground">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FiadoDetalhe;
