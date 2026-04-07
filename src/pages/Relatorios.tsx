import { useEffect, useState, useMemo } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, Users, FileText,
  CreditCard, Banknote, QrCode, Calendar, Download, ChevronDown, ChevronUp,
  ShoppingCart, User, Monitor, Package, BarChart3, BookOpen
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { fetchAll } from '@/lib/supabaseHelper';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatBRL, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, Area, AreaChart
} from 'recharts';

// ── helpers ────────────────────────────────────────────────────────────────────
type Periodo = 'hoje' | 'mes_atual' | 'mes_passado' | 'ultimos_3' | 'ultimos_6' | 'ano_atual' | 'custom';

function periodoRange(periodo: Periodo, customStart?: string, customEnd?: string): { start: Date; end: Date } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  switch (periodo) {
    case 'hoje':
      return { start: new Date(y, m, now.getDate()), end: new Date(y, m, now.getDate(), 23, 59, 59) };
    case 'mes_atual':
      return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0, 23, 59, 59) };
    case 'mes_passado':
      return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0, 23, 59, 59) };
    case 'ultimos_3':
      return { start: new Date(y, m - 2, 1), end: new Date(y, m + 1, 0, 23, 59, 59) };
    case 'ultimos_6':
      return { start: new Date(y, m - 5, 1), end: new Date(y, m + 1, 0, 23, 59, 59) };
    case 'ano_atual':
      return { start: new Date(y, 0, 1), end: new Date(y, 11, 31, 23, 59, 59) };
    case 'custom':
      return {
        start: customStart ? new Date(customStart) : new Date(y, m, 1),
        end: customEnd ? new Date(customEnd + 'T23:59:59') : new Date(y, m + 1, 0, 23, 59, 59),
      };
  }
}

function monthLabel(d: Date) {
  const lbl = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
  return lbl.charAt(0).toUpperCase() + lbl.slice(1);
}

const CORES = ['hsl(224,76%,48%)', 'hsl(38,92%,50%)', 'hsl(142,76%,36%)', 'hsl(0,72%,51%)', 'hsl(262,83%,58%)', 'hsl(199,89%,48%)'];

const tooltipStyle = { borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '12px', background: 'hsl(var(--card))' };

// ── Collapsible Section ────────────────────────────────────────────────────────
const ReportSection = ({ title, icon: Icon, children, defaultOpen = false }: {
  title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card rounded-xl shadow-card border border-border/50 mb-4 animate-fade-up overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
        {open ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
};

// ── component ──────────────────────────────────────────────────────────────────
const Relatorios = () => {
  const [periodo, setPeriodo] = useState<Periodo>('mes_atual');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [fiados, setFiados] = useState<any[]>([]);
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [vendas, setVendas] = useState<any[]>([]);
  const [vendaItens, setVendaItens] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    try {
      const [fiados, pagamentos, clientes, vendas, vendaItens, profiles] = await Promise.all([
        fetchAll('fiados', { select: '*, clientes(nome, limite_credito, status)', order: ['created_at', { ascending: false }] }),
        fetchAll('pagamentos', { eq: ['estornado', false], order: ['created_at', { ascending: false }] }),
        fetchAll('clientes', { select: 'id, nome, status, limite_credito' }),
        fetchAll('vendas', { order: ['created_at', { ascending: false }] }),
        fetchAll('venda_itens', { order: ['created_at', { ascending: false }] }),
        fetchAll('profiles', { select: 'user_id, nome' }),
      ]);
      setFiados(fiados);
      setPagamentos(pagamentos);
      setClientes(clientes);
      setVendas(vendas);
      setVendaItens(vendaItens);
      setProfiles(profiles);
    } catch (e) {
      setError(true);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const range = useMemo(() => periodoRange(periodo, customStart, customEnd), [periodo, customStart, customEnd]);

  const profileMap = useMemo(() => {
    const m = new Map<string, string>();
    profiles.forEach(p => m.set(p.user_id, p.nome));
    return m;
  }, [profiles]);

  // Filter by period
  const inRange = (dateStr: string) => {
    const d = new Date(dateStr);
    return d >= range.start && d <= range.end;
  };

  const vendasPeriodo = useMemo(() => vendas.filter(v => inRange(v.created_at) && v.status === 'finalizada'), [vendas, range]);
  const fiadosPeriodo = useMemo(() => fiados.filter(f => inRange(f.created_at)), [fiados, range]);
  const pagPeriodo = useMemo(() => pagamentos.filter(p => inRange(p.created_at)), [pagamentos, range]);

  // ── VENDAS PDV stats ──
  const totalVendasPDV = vendasPeriodo.reduce((a, v) => a + Number(v.total), 0);
  const totalFiados = fiadosPeriodo.reduce((a, f) => a + Number(f.valor_total), 0);
  const totalRecebido = pagPeriodo.reduce((a, p) => a + Number(p.valor), 0);
  const totalAberto = fiados.filter(f => f.status !== 'pago').reduce((a, f) => a + (Number(f.valor_total) - Number(f.valor_pago)), 0);

  // ── Vendas por Funcionário ──
  const vendasPorFuncionario = useMemo(() => {
    const map = new Map<string, { nome: string; total: number; qtd: number }>();
    vendasPeriodo.forEach(v => {
      const id = v.operador_id || 'desconhecido';
      const nome = profileMap.get(id) || 'Desconhecido';
      const ex = map.get(id);
      if (ex) { ex.total += Number(v.total); ex.qtd += 1; }
      else map.set(id, { nome, total: Number(v.total), qtd: 1 });
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [vendasPeriodo, profileMap]);

  // ── Vendas por Método de Pagamento ──
  const vendasPorMetodo = useMemo(() => {
    const map = new Map<string, number>();
    vendasPeriodo.forEach(v => {
      const m = v.metodo_pagamento || 'dinheiro';
      map.set(m, (map.get(m) || 0) + Number(v.total));
    });
    return Array.from(map.entries()).map(([metodo, total]) => ({ metodo: metodo.toUpperCase(), total })).sort((a, b) => b.total - a.total);
  }, [vendasPeriodo]);

  // ── Vendas por Período (diário) ──
  const vendasPorDia = useMemo(() => {
    const map = new Map<string, { vendas: number; fiados: number }>();
    vendasPeriodo.forEach(v => {
      const key = new Date(v.created_at).toLocaleDateString('pt-BR');
      const ex = map.get(key) || { vendas: 0, fiados: 0 };
      ex.vendas += Number(v.total);
      map.set(key, ex);
    });
    fiadosPeriodo.forEach(f => {
      const key = new Date(f.created_at).toLocaleDateString('pt-BR');
      const ex = map.get(key) || { vendas: 0, fiados: 0 };
      ex.fiados += Number(f.valor_total);
      map.set(key, ex);
    });
    return Array.from(map.entries()).map(([dia, data]) => ({ dia, ...data })).sort((a, b) => {
      const [da, ma, ya] = a.dia.split('/').map(Number);
      const [db, mb, yb] = b.dia.split('/').map(Number);
      return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
    });
  }, [vendasPeriodo, fiadosPeriodo]);

  // ── Top Produtos Vendidos ──
  const topProdutos = useMemo(() => {
    const vendaIds = new Set(vendasPeriodo.map(v => v.id));
    const filtered = vendaItens.filter(vi => vendaIds.has(vi.venda_id));
    const map = new Map<string, { descricao: string; qtd: number; total: number }>();
    filtered.forEach(vi => {
      const key = vi.descricao;
      const ex = map.get(key);
      if (ex) { ex.qtd += Number(vi.quantidade); ex.total += Number(vi.valor_total); }
      else map.set(key, { descricao: key, qtd: Number(vi.quantidade), total: Number(vi.valor_total) });
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 15);
  }, [vendasPeriodo, vendaItens]);

  // ── Evolução mensal ──
  const chartMensal = useMemo(() => {
    const now = new Date();
    const months: { month: string; vendas: number; fiados: number; recebido: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mV = vendas.filter(v => { const fd = new Date(v.created_at); return fd.getMonth() === d.getMonth() && fd.getFullYear() === d.getFullYear() && v.status === 'finalizada'; });
      const mF = fiados.filter(f => { const fd = new Date(f.created_at); return fd.getMonth() === d.getMonth() && fd.getFullYear() === d.getFullYear(); });
      const mP = pagamentos.filter(p => { const pd = new Date(p.created_at); return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear(); });
      months.push({
        month: monthLabel(d),
        vendas: mV.reduce((a, v) => a + Number(v.total), 0),
        fiados: mF.reduce((a, f) => a + Number(f.valor_total), 0),
        recebido: mP.reduce((a, p) => a + Number(p.valor), 0),
      });
    }
    return months;
  }, [vendas, fiados, pagamentos]);

  // ── Fiados Status Pizza ──
  const statusPizza = useMemo(() => {
    const counts: Record<string, number> = { pendente: 0, parcial: 0, pago: 0 };
    fiadosPeriodo.forEach(f => { counts[f.status] = (counts[f.status] || 0) + 1; });
    return [
      { name: 'Pendente', value: counts.pendente },
      { name: 'Parcial', value: counts.parcial },
      { name: 'Pago', value: counts.pago },
    ].filter(x => x.value > 0);
  }, [fiadosPeriodo]);

  // ── Ranking clientes devedores ──
  const rankingClientes = useMemo(() => {
    const map = new Map<string, { nome: string; divida: number; limite: number; fiados: number }>();
    fiados.filter(f => f.status !== 'pago').forEach(f => {
      const nome = (f.clientes as any)?.nome || 'Desconhecido';
      const saldo = Number(f.valor_total) - Number(f.valor_pago);
      const limite = Number((f.clientes as any)?.limite_credito || 0);
      const ex = map.get(nome);
      if (ex) { ex.divida += saldo; ex.fiados += 1; }
      else map.set(nome, { nome, divida: saldo, limite, fiados: 1 });
    });
    return Array.from(map.values()).sort((a, b) => b.divida - a.divida).slice(0, 10);
  }, [fiados]);

  // ── Métodos pagamento fiados ──
  const metodosPagFiado = useMemo(() => {
    const map = new Map<string, number>();
    pagPeriodo.forEach(p => { const m = p.metodo || 'dinheiro'; map.set(m, (map.get(m) || 0) + Number(p.valor)); });
    return Array.from(map.entries()).map(([metodo, total]) => ({ metodo: metodo.toUpperCase(), total })).sort((a, b) => b.total - a.total);
  }, [pagPeriodo]);

  // ── render ────────────────────────────────────────────────────────────────────
  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={fetchData} />;

  return (
    <div>
      <PageHeader title="Relatórios" description="Análise completa de vendas, fiados, produtos e funcionários">
        <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => window.print()}>
          <Download className="w-3.5 h-3.5" /> Imprimir
        </Button>
      </PageHeader>

      {/* ── Filtros ── */}
      <div className="bg-card rounded-xl p-4 shadow-card border border-border/50 mb-5 animate-fade-up">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <Label className="text-xs uppercase text-muted-foreground mb-1 block">Período</Label>
            <Select value={periodo} onValueChange={v => setPeriodo(v as Periodo)}>
              <SelectTrigger className="w-48 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="mes_atual">Este Mês</SelectItem>
                <SelectItem value="mes_passado">Mês Passado</SelectItem>
                <SelectItem value="ultimos_3">Últimos 3 Meses</SelectItem>
                <SelectItem value="ultimos_6">Últimos 6 Meses</SelectItem>
                <SelectItem value="ano_atual">Este Ano</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {periodo === 'custom' && (
            <>
              <div>
                <Label className="text-xs uppercase text-muted-foreground mb-1 block">De</Label>
                <Input type="date" className="h-9 text-sm w-40" value={customStart} onChange={e => setCustomStart(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground mb-1 block">Até</Label>
                <Input type="date" className="h-9 text-sm w-40" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
              </div>
            </>
          )}
          <div className="ml-auto text-xs text-muted-foreground flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDate(range.start.toISOString())} – {formatDate(range.end.toISOString())}</span>
          </div>
        </div>
      </div>

      {/* ── Cards de Resumo ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
        <StatCard title="Vendas PDV" value={formatBRL(totalVendasPDV)} icon={Monitor} delay={0} />
        <StatCard title="Vendas Fiado" value={formatBRL(totalFiados)} icon={BookOpen} delay={100} />
        <StatCard title="Recebido (Fiados)" value={formatBRL(totalRecebido)} icon={DollarSign} delay={200} />
        <StatCard title="Saldo em Aberto" value={formatBRL(totalAberto)} icon={TrendingDown} delay={300} />
        <StatCard title="Total Vendas" value={`${vendasPeriodo.length}`} icon={ShoppingCart} delay={400} />
      </div>

      {/* ── Tabs para categorias ── */}
      <Tabs defaultValue="vendas" className="w-full">
        <TabsList className="mb-5 h-10 w-full justify-start gap-1 bg-muted/50 p-1 rounded-lg flex-wrap">
          <TabsTrigger value="vendas" className="gap-1.5 text-xs"><Monitor className="w-3.5 h-3.5" />Vendas</TabsTrigger>
          <TabsTrigger value="produtos" className="gap-1.5 text-xs"><Package className="w-3.5 h-3.5" />Produtos</TabsTrigger>
          <TabsTrigger value="fiados" className="gap-1.5 text-xs"><BookOpen className="w-3.5 h-3.5" />Fiados</TabsTrigger>
          <TabsTrigger value="clientes" className="gap-1.5 text-xs"><Users className="w-3.5 h-3.5" />Clientes</TabsTrigger>
        </TabsList>

        {/* ════════════ TAB VENDAS ════════════ */}
        <TabsContent value="vendas">
          {/* Evolução Mensal */}
          <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 mb-4 animate-fade-up">
            <h3 className="text-base font-semibold mb-0.5">Evolução Mensal</h3>
            <p className="text-xs text-muted-foreground mb-4">Vendas PDV vs. Fiados vs. Recebimentos – últimos 6 meses</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartMensal} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `R$${v}`} width={70} />
                  <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="vendas" fill={CORES[0]} radius={[4, 4, 0, 0]} name="Vendas PDV" />
                  <Bar dataKey="fiados" fill={CORES[1]} radius={[4, 4, 0, 0]} name="Fiados" />
                  <Bar dataKey="recebido" fill={CORES[2]} radius={[4, 4, 0, 0]} name="Recebido" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Vendas por Funcionário */}
            <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 animate-fade-up">
              <h3 className="text-base font-semibold mb-0.5 flex items-center gap-2">
                <User className="w-4 h-4 text-primary" /> Vendas por Funcionário
              </h3>
              <p className="text-xs text-muted-foreground mb-4">Ranking de vendas no período</p>
              {vendasPorFuncionario.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma venda no período</p>
              ) : (
                <>
                  <div className="h-48 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={vendasPorFuncionario} layout="vertical" barSize={16}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `R$${v}`} />
                        <YAxis type="category" dataKey="nome" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={100} />
                        <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={tooltipStyle} />
                        <Bar dataKey="total" fill={CORES[0]} radius={[0, 4, 4, 0]} name="Total Vendido" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {vendasPorFuncionario.map((f, i) => (
                      <div key={f.nome} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</span>
                          <span className="font-medium">{f.nome}</span>
                          <span className="text-xs text-muted-foreground">({f.qtd} vendas)</span>
                        </div>
                        <span className="font-bold">{formatBRL(f.total)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Vendas por Método de Pagamento */}
            <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 animate-fade-up">
              <h3 className="text-base font-semibold mb-0.5 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" /> Vendas por Pagamento
              </h3>
              <p className="text-xs text-muted-foreground mb-4">Distribuição por forma de pagamento</p>
              {vendasPorMetodo.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma venda no período</p>
              ) : (
                <>
                  <div className="h-48 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={vendasPorMetodo} dataKey="total" nameKey="metodo" cx="50%" cy="50%" outerRadius={80} label={({ metodo, percent }) => `${metodo} ${Math.round(percent * 100)}%`} labelLine={false} fontSize={10}>
                          {vendasPorMetodo.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {vendasPorMetodo.map((mp, i) => {
                      const pct = totalVendasPDV > 0 ? Math.round((mp.total / totalVendasPDV) * 100) : 0;
                      return (
                        <div key={mp.metodo}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ background: CORES[i % CORES.length] }} />
                              <span className="text-sm font-medium">{mp.metodo}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold">{formatBRL(mp.total)}</span>
                              <span className="text-[10px] text-muted-foreground ml-1.5">{pct}%</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: CORES[i % CORES.length] }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Vendas por Período */}
          {vendasPorDia.length > 1 && (
            <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 mb-4 animate-fade-up">
              <h3 className="text-base font-semibold mb-0.5">Vendas por Período</h3>
              <p className="text-xs text-muted-foreground mb-4">Vendas PDV e Fiados por dia</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={vendasPorDia}>
                    <defs>
                      <linearGradient id="gradVendas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CORES[0]} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CORES[0]} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradFiados" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CORES[1]} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CORES[1]} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="dia" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `R$${v}`} width={70} />
                    <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Area type="monotone" dataKey="vendas" stroke={CORES[0]} fill="url(#gradVendas)" strokeWidth={2} name="Vendas PDV" />
                    <Area type="monotone" dataKey="fiados" stroke={CORES[1]} fill="url(#gradFiados)" strokeWidth={2} name="Fiados" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Resumo financeiro */}
          <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 animate-fade-up">
            <h3 className="text-base font-semibold mb-4">Resumo Financeiro do Período</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-xs uppercase text-muted-foreground tracking-wide mb-1">Total Vendas PDV</p>
                <p className="text-xl font-bold">{vendasPeriodo.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ticket médio: {vendasPeriodo.length > 0 ? formatBRL(totalVendasPDV / vendasPeriodo.length) : 'R$ 0,00'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs uppercase text-muted-foreground tracking-wide mb-1">Total Fiados</p>
                <p className="text-xl font-bold">{fiadosPeriodo.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ticket médio: {fiadosPeriodo.length > 0 ? formatBRL(totalFiados / fiadosPeriodo.length) : 'R$ 0,00'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs uppercase text-muted-foreground tracking-wide mb-1">Faturamento Total</p>
                <p className="text-xl font-bold text-primary">{formatBRL(totalVendasPDV + totalFiados)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs uppercase text-muted-foreground tracking-wide mb-1">Taxa Recebimento (Fiados)</p>
                <p className="text-xl font-bold">
                  {totalFiados > 0 ? Math.round((totalRecebido / totalFiados) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ════════════ TAB PRODUTOS ════════════ */}
        <TabsContent value="produtos">
          <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 mb-4 animate-fade-up">
            <h3 className="text-base font-semibold mb-0.5 flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" /> Top 15 Produtos Mais Vendidos
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Produtos com maior volume de vendas no período</p>
            {topProdutos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma venda no período</p>
            ) : (
              <>
                <div className="h-72 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProdutos} layout="vertical" barSize={14}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `R$${v}`} />
                      <YAxis type="category" dataKey="descricao" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} width={150} />
                      <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={tooltipStyle} />
                      <Bar dataKey="total" fill={CORES[4]} radius={[0, 4, 4, 0]} name="Total" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {topProdutos.map((p, i) => (
                    <div key={p.descricao} className="flex items-center justify-between text-sm border-b border-border/30 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-accent-foreground">{i + 1}</span>
                        <span className="font-medium truncate max-w-[250px]">{p.descricao}</span>
                        <span className="text-xs text-muted-foreground">({p.qtd} un)</span>
                      </div>
                      <span className="font-bold">{formatBRL(p.total)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* ════════════ TAB FIADOS ════════════ */}
        <TabsContent value="fiados">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Fiados por Status */}
            <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 animate-fade-up">
              <h3 className="text-base font-semibold mb-0.5">Fiados por Status</h3>
              <p className="text-xs text-muted-foreground mb-4">{fiadosPeriodo.length} fiado(s) no período</p>
              {statusPizza.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8 flex items-center justify-center gap-2"><FileText className="w-4 h-4" /> Sem dados</p>
              ) : (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusPizza} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`} labelLine={false} fontSize={10}>
                        {statusPizza.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="flex flex-wrap gap-3 mt-2">
                {statusPizza.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: CORES[i % CORES.length] }} />
                    {s.name}: <span className="font-semibold text-foreground">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagamentos de Fiados por Método */}
            <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 animate-fade-up">
              <h3 className="text-base font-semibold mb-0.5">Recebimentos de Fiados</h3>
              <p className="text-xs text-muted-foreground mb-4">Por forma de pagamento no período</p>
              {metodosPagFiado.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum pagamento no período</p>
              ) : (
                <div className="space-y-3">
                  {metodosPagFiado.map((mp, i) => {
                    const pct = totalRecebido > 0 ? Math.round((mp.total / totalRecebido) * 100) : 0;
                    return (
                      <div key={mp.metodo}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{mp.metodo}</span>
                          <div className="text-right">
                            <span className="text-sm font-bold">{formatBRL(mp.total)}</span>
                            <span className="text-[10px] text-muted-foreground ml-1.5">{pct}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: CORES[i % CORES.length] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Ranking clientes devedores */}
          <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 animate-fade-up">
            <h3 className="text-base font-semibold mb-0.5">Top 10 – Maior Dívida Ativa</h3>
            <p className="text-xs text-muted-foreground mb-4">Clientes com saldo em aberto</p>
            {rankingClientes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum devedor 🎉</p>
            ) : (
              <div className="space-y-3">
                {rankingClientes.map((c, i) => {
                  const pct = c.limite > 0 ? Math.min(Math.round((c.divida / c.limite) * 100), 100) : 0;
                  const color = pct >= 90 ? 'bg-destructive' : pct >= 60 ? 'bg-warning' : 'bg-primary';
                  return (
                    <div key={c.nome}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center text-xs font-bold text-destructive">{i + 1}</span>
                          <span className="text-sm font-medium">{c.nome}</span>
                          <span className="text-[10px] text-muted-foreground">({c.fiados} fiado{c.fiados > 1 ? 's' : ''})</span>
                        </div>
                        <span className="text-sm font-bold text-destructive">{formatBRL(c.divida)}</span>
                      </div>
                      {c.limite > 0 && (
                        <div className="ml-8 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground w-12 text-right">{pct}% limite</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ════════════ TAB CLIENTES ════════════ */}
        <TabsContent value="clientes">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 text-center animate-fade-up">
              <p className="text-xs uppercase text-muted-foreground">Total de Clientes</p>
              <p className="text-3xl font-bold mt-2">{clientes.length}</p>
            </div>
            <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 text-center animate-fade-up">
              <p className="text-xs uppercase text-muted-foreground">Clientes Ativos</p>
              <p className="text-3xl font-bold text-primary mt-2">{clientes.filter(c => c.status === 'ativo').length}</p>
            </div>
            <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 text-center animate-fade-up">
              <p className="text-xs uppercase text-muted-foreground">Inadimplentes</p>
              <p className="text-3xl font-bold text-destructive mt-2">{clientes.filter(c => c.status === 'inadimplente').length}</p>
            </div>
          </div>

          {/* Clientes com mais fiados */}
          <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 animate-fade-up">
            <h3 className="text-base font-semibold mb-4">Clientes por Volume de Compra (Fiados)</h3>
            {rankingClientes.length > 0 && (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rankingClientes.slice(0, 8)} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="nome" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `R$${v}`} width={70} />
                    <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={tooltipStyle} />
                    <Bar dataKey="divida" fill={CORES[3]} radius={[4, 4, 0, 0]} name="Dívida" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Relatorios;
