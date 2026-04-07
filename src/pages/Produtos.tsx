import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { formatBRL } from '@/lib/format';
import { Plus, Search, Package, Edit2, Trash2, Barcode, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Produto {
  id: string;
  codigo_barras: string;
  codigo_interno: string;
  descricao: string;
  preco_custo: number;
  preco_venda: number;
  preco_atacado: number;
  qtd_minima_atacado: number;
  unidade: string;
  ativo: boolean;
  categoria: string;
  marca: string;
  estoque_minimo: number;
  estoque_atual: number;
  movimenta_estoque: boolean;
}

const ITEMS_PER_PAGE = 20;

const Produtos = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState<string>('todos');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const [form, setForm] = useState({
    codigo_barras: '',
    codigo_interno: '',
    descricao: '',
    preco_custo: '',
    preco_venda: '',
    preco_atacado: '',
    qtd_minima_atacado: '0',
    unidade: 'UN',
    ativo: true,
    categoria: '',
    marca: '',
    estoque_minimo: '0',
    estoque_atual: '0',
    movimenta_estoque: true,
  });

  const fetchProdutos = async () => {
    setLoading(true);
    setError('');
    try {
      let query = supabase
        .from('produtos')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

      if (search) {
        query = query.or(`descricao.ilike.%${search}%,codigo_barras.ilike.%${search}%,marca.ilike.%${search}%`);
      }
      if (filtroAtivo === 'ativo') query = query.eq('ativo', true);
      if (filtroAtivo === 'inativo') query = query.eq('ativo', false);

      const { data, error: err, count } = await query;
      if (err) throw err;
      setProdutos((data as any) || []);
      setTotal(count || 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProdutos(); }, [page, search, filtroAtivo]);

  const openNew = () => {
    setEditingProduto(null);
    ultimoCodigoBuscado.current = '';
    setForm({
      codigo_barras: '', codigo_interno: '', descricao: '', preco_custo: '', preco_venda: '',
      preco_atacado: '', qtd_minima_atacado: '0', unidade: 'UN', ativo: true,
      categoria: '', marca: '', estoque_minimo: '0', estoque_atual: '0', movimenta_estoque: true,
    });
    setModalOpen(true);
  };

  const openEdit = (p: Produto) => {
    setEditingProduto(p);
    setForm({
      codigo_barras: p.codigo_barras || '',
      codigo_interno: p.codigo_interno || '',
      descricao: p.descricao,
      preco_custo: String(p.preco_custo),
      preco_venda: String(p.preco_venda),
      preco_atacado: String(p.preco_atacado || 0),
      qtd_minima_atacado: String(p.qtd_minima_atacado || 0),
      unidade: p.unidade,
      ativo: p.ativo,
      categoria: p.categoria || '',
      marca: p.marca || '',
      estoque_minimo: String(p.estoque_minimo || 0),
      estoque_atual: String(p.estoque_atual || 0),
      movimenta_estoque: p.movimenta_estoque,
    });
    setModalOpen(true);
  };

  const buscaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimoCodigoBuscado = useRef('');

  const buscarPorCodigoBarras = useCallback((codigo: string) => {
    if (buscaTimerRef.current) clearTimeout(buscaTimerRef.current);
    const cod = codigo.trim();
    if (!cod || cod.length < 3 || cod === ultimoCodigoBuscado.current) return;
    buscaTimerRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('produtos')
        .select('*')
        .eq('codigo_barras', cod)
        .limit(1)
        .maybeSingle();
      if (data) {
        ultimoCodigoBuscado.current = cod;
        setForm(f => ({
          ...f,
          codigo_barras: f.codigo_barras,
          codigo_interno: data.codigo_interno || '',
          descricao: data.descricao,
          preco_custo: String(data.preco_custo),
          preco_venda: String(data.preco_venda),
          preco_atacado: String(data.preco_atacado || 0),
          qtd_minima_atacado: String(data.qtd_minima_atacado || 0),
          unidade: data.unidade,
          ativo: data.ativo,
          categoria: data.categoria || '',
          marca: data.marca || '',
          estoque_minimo: String(data.estoque_minimo || 0),
          estoque_atual: String(data.estoque_atual || 0),
          movimenta_estoque: data.movimenta_estoque,
        }));
        toast({ title: 'Dados preenchidos!', description: `Baseado em: ${data.descricao}. Altere o que precisar.` });
      }
    }, 400);
  }, []);

  const handleSave = async () => {
    if (!form.descricao.trim()) {
      toast({ title: 'Erro', description: 'Nome do Produto é obrigatório', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        codigo_barras: form.codigo_barras.trim(),
        codigo_interno: form.codigo_interno.trim(),
        descricao: form.descricao.trim().toUpperCase(),
        preco_custo: parseFloat(form.preco_custo) || 0,
        preco_venda: parseFloat(form.preco_venda) || 0,
        preco_atacado: parseFloat(form.preco_atacado) || 0,
        qtd_minima_atacado: parseInt(form.qtd_minima_atacado) || 0,
        unidade: form.unidade,
        ativo: form.ativo,
        categoria: form.categoria.trim(),
        marca: form.marca.trim().toUpperCase(),
        estoque_minimo: parseInt(form.estoque_minimo) || 0,
        estoque_atual: parseFloat(form.estoque_atual) || 0,
        movimenta_estoque: form.movimenta_estoque,
      };

      if (editingProduto) {
        const { error } = await supabase.from('produtos').update(payload).eq('id', editingProduto.id);
        if (error) throw error;
        toast({ title: 'Produto atualizado com sucesso!' });
      } else {
        const { error } = await supabase.from('produtos').insert(payload);
        if (error) throw error;
        toast({ title: 'Produto cadastrado com sucesso!' });
      }
      setModalOpen(false);
      fetchProdutos();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from('produtos').delete().eq('id', deleteId);
      if (error) throw error;
      toast({ title: 'Produto excluído!' });
      setDeleteId(null);
      fetchProdutos();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      const normalizeUnidade = (u: string): string => {
        const upper = (u || '').trim().toUpperCase();
        if (['UNIDADE', 'UND', 'UNI'].includes(upper)) return 'UN';
        if (['QUILOGRAMA'].includes(upper)) return 'KG';
        if (['CAIXA'].includes(upper)) return 'CX';
        const valid = ['UN', 'KG', 'CX', 'PT', 'FD', 'LT', 'DS', 'DP', 'CJ'];
        return valid.includes(upper) ? upper : 'UN';
      };

      const produtos = rows.slice(1).filter(r => r[2] && String(r[2]).trim().length > 0).map(r => ({
        codigo_barras: String(r[0] || '').trim(),
        descricao: String(r[2] || '').trim().toUpperCase(),
        preco_custo: parseFloat(r[3]) || 0,
        preco_venda: parseFloat(r[4]) || 0,
        preco_atacado: parseFloat(r[5]) || 0,
        qtd_minima_atacado: parseInt(r[6]) || 0,
        unidade: normalizeUnidade(String(r[7] || 'UN')),
        ativo: String(r[8] || '').trim().toLowerCase() === 'sim',
        categoria: String(r[9] || '').trim(),
        movimenta_estoque: String(r[11] || '').trim().toLowerCase() === 'sim',
        estoque_minimo: parseInt(r[12]) || 0,
        estoque_atual: parseFloat(r[13]) || 0,
        marca: String(r[14] || '').trim().toUpperCase(),
        codigo_interno: String(r[17] || '').trim(),
      }));

      // Buscar produtos existentes para comparar
      const { data: existentes } = await supabase.from('produtos').select('id, codigo_barras, descricao');
      const existentesList = existentes || [];

      // Mapear existentes por codigo_barras e descricao para busca rápida
      const porBarras = new Map<string, string>();
      const porDescricao = new Map<string, string>();
      for (const p of existentesList) {
        if (p.codigo_barras && p.codigo_barras.trim() !== '') {
          porBarras.set(p.codigo_barras.trim().toUpperCase(), p.id);
        }
        if (p.descricao && p.descricao.trim() !== '') {
          porDescricao.set(p.descricao.trim().toUpperCase(), p.id);
        }
      }

      // Separar em produtos para atualizar e para inserir
      const paraAtualizar: { id: string; dados: any }[] = [];
      const paraInserir: any[] = [];

      for (const prod of produtos) {
        // Primeiro tenta achar pelo codigo_barras, depois pela descricao
        const barrasKey = prod.codigo_barras.toUpperCase();
        const descKey = prod.descricao.toUpperCase();
        const idExistente = (barrasKey !== '' && porBarras.get(barrasKey)) || porDescricao.get(descKey);

        if (idExistente) {
          paraAtualizar.push({ id: idExistente, dados: prod });
        } else {
          paraInserir.push(prod);
        }
      }

      // Atualizar produtos existentes
      let atualizados = 0;
      for (const item of paraAtualizar) {
        const { error } = await supabase.from('produtos').update(item.dados).eq('id', item.id);
        if (error) {
          console.error(`Erro ao atualizar ${item.id}:`, error);
        } else {
          atualizados++;
        }
      }

      // Inserir novos em lotes de 100
      let inseridos = 0;
      const batchSize = 100;
      for (let i = 0; i < paraInserir.length; i += batchSize) {
        const batch = paraInserir.slice(i, i + batchSize);
        const { error } = await supabase.from('produtos').insert(batch as any);
        if (error) {
          console.error(`Batch ${i} error:`, error);
        } else {
          inseridos += batch.length;
        }
      }

      toast({ title: `Importação concluída! ${inseridos} novos, ${atualizados} atualizados.` });
      fetchProdutos();
    } catch (err: any) {
      toast({ title: 'Erro na importação', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  if (error) return <ErrorState message={error} onRetry={fetchProdutos} />;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Produtos" description={`${total} produtos cadastrados`}>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 relative" disabled={importing}>
            <Upload className="w-4 h-4" /> {importing ? 'Importando...' : 'Importar'}
            <input type="file" accept=".xlsx,.xls" onChange={handleImport} className="absolute inset-0 opacity-0 cursor-pointer" disabled={importing} />
          </Button>
          <Button onClick={openNew} className="gap-2">
            <Plus className="w-4 h-4" /> Novo Produto
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por descrição, código ou marca..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="pl-9 input-glow"
          />
        </div>
        <Select value={filtroAtivo} onValueChange={v => { setFiltroAtivo(v); setPage(0); }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="inativo">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? <LoadingState /> : produtos.length === 0 ? (
        <EmptyState icon={Package} title="Nenhum produto encontrado" description="Cadastre um novo produto para começar." />
      ) : (
        <>
          <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[120px]">Código</TableHead>
                  <TableHead>Nome do Produto</TableHead>
                  <TableHead className="w-[60px]">UN</TableHead>
                  <TableHead className="text-right w-[100px]">Custo</TableHead>
                  <TableHead className="text-right w-[100px]">Venda</TableHead>
                  <TableHead className="text-right w-[80px]">Estoque</TableHead>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead className="w-[100px] text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtos.map(p => (
                  <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.codigo_barras?.slice(-8) || '—'}</TableCell>
                    <TableCell className="font-medium text-sm">{p.descricao}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{p.unidade}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{formatBRL(Number(p.preco_custo))}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">{formatBRL(Number(p.preco_venda))}</TableCell>
                    <TableCell className={`text-right text-sm font-medium ${Number(p.estoque_atual) <= Number(p.estoque_minimo) ? 'text-destructive' : ''}`}>
                      {Number(p.estoque_atual)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.ativo ? 'default' : 'secondary'} className="text-[10px]">
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex gap-1 justify-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(p.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Página {page + 1} de {totalPages} ({total} produtos)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próxima</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Cadastro/Edição */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Barcode className="w-5 h-5 text-primary" />
              {editingProduto ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* DESTAQUE: Código de Barras, Nome e Preços */}
            <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-4 space-y-3">
              <div>
                <Label className="text-sm font-bold text-primary">Código de Barras</Label>
                <Input
                  value={form.codigo_barras}
                  onChange={e => {
                    const val = e.target.value;
                    setForm(f => ({ ...f, codigo_barras: val }));
                    buscarPorCodigoBarras(val);
                  }}
                  className="mt-1 text-base font-semibold border-primary/30 focus:border-primary"
                  placeholder="Escaneie ou digite o código"
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-sm font-bold text-primary">Nome do Produto *</Label>
                <Input
                  value={form.descricao}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  className="mt-1 text-base font-semibold border-primary/30 focus:border-primary"
                  placeholder="Ex: ARROZ TIPO 1 5KG"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-bold text-primary">Preço Custo (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.preco_custo}
                    onChange={e => setForm(f => ({ ...f, preco_custo: e.target.value }))}
                    className="mt-1 text-lg font-bold border-primary/30 focus:border-primary"
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label className="text-sm font-bold text-primary">Preço Venda (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.preco_venda}
                    onChange={e => setForm(f => ({ ...f, preco_venda: e.target.value }))}
                    className="mt-1 text-lg font-bold border-primary/30 focus:border-primary"
                    placeholder="0,00"
                  />
                </div>
              </div>
              {/* Cálculo de Lucro */}
              {(() => {
                const custo = parseFloat(form.preco_custo) || 0;
                const venda = parseFloat(form.preco_venda) || 0;
                if (custo > 0 && venda > 0) {
                  const lucroR$ = venda - custo;
                  const lucroPct = ((lucroR$ / custo) * 100);
                  const positivo = lucroR$ >= 0;
                  return (
                    <div className={`flex items-center justify-between rounded-md px-3 py-2 text-sm font-bold ${
                      positivo ? 'bg-green-500/15 border border-green-500/30' : 'bg-red-500/15 border border-red-500/30'
                    } text-black dark:text-white`}>
                      <span>Lucro: R$ {lucroR$.toFixed(2).replace('.', ',')}</span>
                      <span className={`px-2 py-0.5 rounded text-xs text-black dark:text-white ${
                        positivo ? 'bg-green-500/20' : 'bg-red-500/20'
                      }`}>
                        {positivo ? '+' : ''}{lucroPct.toFixed(1).replace('.', ',')}%
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div>
              <Label>NCM</Label>
              <Input value={form.codigo_interno} onChange={e => setForm(f => ({ ...f, codigo_interno: e.target.value }))} className="input-glow" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Unidade</Label>
                <Select value={form.unidade} onValueChange={v => setForm(f => ({ ...f, unidade: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UN">UN</SelectItem>
                    <SelectItem value="KG">KG</SelectItem>
                    <SelectItem value="CX">CX</SelectItem>
                    <SelectItem value="PT">PT</SelectItem>
                    <SelectItem value="FD">FD</SelectItem>
                    <SelectItem value="LT">LT</SelectItem>
                    <SelectItem value="DS">DS</SelectItem>
                    <SelectItem value="DP">DP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoria</Label>
                <Input value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className="input-glow" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Marca</Label>
                <Input value={form.marca} onChange={e => setForm(f => ({ ...f, marca: e.target.value }))} className="input-glow" />
              </div>
              <div>
                <Label>Estoque Atual</Label>
                <Input type="number" value={form.estoque_atual} onChange={e => setForm(f => ({ ...f, estoque_atual: e.target.value }))} className="input-glow" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Estoque Mínimo</Label>
                <Input type="number" value={form.estoque_minimo} onChange={e => setForm(f => ({ ...f, estoque_minimo: e.target.value }))} className="input-glow" />
              </div>
              <div className="flex items-end gap-4 pb-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} className="rounded" />
                  Ativo
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.movimenta_estoque} onChange={e => setForm(f => ({ ...f, movimenta_estoque: e.target.checked }))} className="rounded" />
                  Mov. Estoque
                </label>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : editingProduto ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Excluir */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.</p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete}>Excluir</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Produtos;
