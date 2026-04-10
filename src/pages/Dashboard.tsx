import { useEffect, useState, useMemo } from 'react';
import { DollarSign, TrendingUp, ShoppingCart, AlertTriangle, CreditCard, User, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { fetchAll } from '@/lib/supabaseHelper';
import { StatCard } from '@/components/shared/StatCard';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { formatBRL } from '@/lib/format';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const CORES = ['#1a237e', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];
const tooltipStyle = { borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '12px' };

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

const periodoLabels: Record<Periodo, string> = {
  hoje: 'Hoje',
  mes_atual: 'Mês Atual',
  mes_passado: 'Mês Passado',
  ultimos_3: 'Últimos 3 Meses',
  ultimos_6: 'Últimos 6 Meses',
  ano_atual: 'Ano Atual',
  custom: 'Personalizado',
};

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<Periodo>('mes_atual');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showVendas, setShowVendas] = useState(true);
  const [showFiados, setShowFiados] = useState(true);
  const [showRecebido, setShowRecebido] = useState(true);

  // Raw data
  const [fiados, setFiados] = useState<any[]>([]);
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [vendas, setVendas] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [inadimplentes, setInadimplentes] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fiados, pagamentos, vendas, profiles, cRes] = await Promise.all([
          fetchAll('fiados', { select: '*, clientes(nome, limite_credito)' }),
          fetchAll('pagamentos', { eq: ['estornado', false] }),
          fetchAll('vendas', { eq: ['status', 'finalizada'] }),
          fetchAll('profiles', { select: 'user_id, nome' }),
          supabase.from('clientes').select('*').eq('status', 'inadimplente'),
        ]);
        setFiados(fiados);
        setPagamentos(pagamentos);
        setVendas(vendas);
        setProfiles(profiles);
        setInadimplentes(cRes.data?.length || 0);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const range = useMemo(() => periodoRange(periodo, customStart, customEnd), [periodo, customStart, customEnd]);
  const inRange = (dateStr: string) => {
    const d = new Date(dateStr);
    return d >= range.start && d <= range.end;
  };

  const profileMap = useMemo(() => {
    const m = new Map<string, string>();
    profiles.forEach(p => m.set(p.user_id, p.nome));
    return m;
  }, [profiles]);

  // Filtered data
  const vendasPeriodo = useMemo(() => vendas.filter(v => inRange(v.created_at)), [vendas, range]);
  const fiadosPeriodo = useMemo(() => fiados.filter(f => inRange(f.created_at)), [fiados, range]);
  const pagPeriodo = useMemo(() => pagamentos.filter(p => inRange(p.created_at)), [pagamentos, range]);

  const totalVendasPDV = useMemo(() => vendasPeriodo.reduce((a, v) => a + Number(v.total), 0), [vendasPeriodo]);
  const totalAberto = useMemo(() => fiados.filter(f => f.status !== 'pago').reduce((a, f) => a + (Number(f.valor_total) - Number(f.valor_pago)), 0), [fiados]);
  const totalRecebido = useMemo(() => pagPeriodo.reduce((a, p) => a + Number(p.valor), 0), [pagPeriodo]);
  const totalVendidoFiado = useMemo(() => fiadosPeriodo.reduce((a, f) => a + Number(f.valor_total), 0), [fiadosPeriodo]);

  // Top devedores
  const topDevedores = useMemo(() => {
    const map = new Map<string, { nome: string; divida: number; limite: number }>();
    fiados.filter(f => f.status !== 'pago').forEach(f => {
      const nome = (f.clientes as any)?.nome || 'Desconhecido';
      const saldo = Number(f.valor_total) - Number(f.valor_pago);
      const ex = map.get(nome);
      if (ex) ex.divida += saldo;
      else map.set(nome, { nome, divida: saldo, limite: Number((f.clientes as any)?.limite_credito || 0) });
    });
    return Array.from(map.values()).sort((a, b) => b.divida - a.divida).slice(0, 5);
  }, [fiados]);

  // Chart mensal (last 6 months)
  const chartData = useMemo(() => {
    const now = new Date();
    const data: { month: string; vendas: number; fiados: number; recebido: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const lbl = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      const match = (dateStr: string) => {
        const dd = new Date(dateStr);
        return dd.getMonth() === d.getMonth() && dd.getFullYear() === d.getFullYear();
      };
      data.push({
        month: lbl.charAt(0).toUpperCase() + lbl.slice(1),
        vendas: vendas.filter(v => match(v.created_at)).reduce((a, v) => a + Number(v.total), 0),
        fiados: fiados.filter(f => match(f.created_at)).reduce((a, f) => a + Number(f.valor_total), 0),
        recebido: pagamentos.filter(p => match(p.created_at)).reduce((a, p) => a + Number(p.valor), 0),
      });
    }
    return data;
  }, [vendas, fiados, pagamentos]);

  // Vendas por Funcionário (filtrado)
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

  // Vendas por Método (filtrado)
  const vendasPorMetodo = useMemo(() => {
    const map = new Map<string, number>();
    vendasPeriodo.forEach(v => {
      const m = v.metodo_pagamento || 'dinheiro';
      map.set(m, (map.get(m) || 0) + Number(v.total));
    });
    return Array.from(map.entries()).map(([metodo, total]) => ({ metodo: metodo.toUpperCase(), total })).sort((a, b) => b.total - a.total);
  }, [vendasPeriodo]);

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader title="Dashboard" description="Visão geral do sistema" />

      {/* FILTRO DE PERÍODO */}
      <div className="bg-card rounded-xl p-4 shadow-card border border-border/50 mb-6 animate-fade-up flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-2 text-primary">
          <Calendar className="w-4 h-4" />
          <span className="text-sm font-semibold">Período</span>
        </div>
        <div className="min-w-[180px]">
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(periodoLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {periodo === 'custom' && (
          <>
            <div>
              <Label className="text-xs text-muted-foreground">De</Label>
              <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="h-9 w-40" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Até</Label>
              <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="h-9 w-40" />
            </div>
          </>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {range.start.toLocaleDateString('pt-BR')} – {range.end.toLocaleDateString('pt-BR')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard title="Vendas PDV" value={formatBRL(totalVendasPDV)} icon={ShoppingCart} delay={0} />
        <StatCard title="Total em Aberto" value={formatBRL(totalAberto)} icon={DollarSign} delay={100} />
        <StatCard title="Recebido" value={formatBRL(totalRecebido)} icon={TrendingUp} delay={200} />
        <StatCard title="Vendido Fiado" value={formatBRL(totalVendidoFiado)} icon={ShoppingCart} delay={300} />
        <StatCard title="Inadimplentes" value={String(inadimplentes)} icon={AlertTriangle} delay={400} />
      </div>

      {/* Evolução Mensal */}
      <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 mb-4 animate-fade-up" style={{ animationDelay: '500ms' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold mb-0.5">Evolução Mensal</h3>
            <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowVendas(v => !v)}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
              style={showVendas
                ? { backgroundColor: '#1a237e', color: '#fff' }
                : { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', textDecoration: 'line-through' }
              }
            >
              Vendas PDV
            </button>
            <button
              onClick={() => setShowFiados(v => !v)}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
              style={showFiados
                ? { backgroundColor: '#f59e0b', color: '#fff' }
                : { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', textDecoration: 'line-through' }
              }
            >
              Fiados
            </button>
            <button
              onClick={() => setShowRecebido(v => !v)}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
              style={showRecebido
                ? { backgroundColor: '#10b981', color: '#fff' }
                : { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', textDecoration: 'line-through' }
              }
            >
              Recebido
            </button>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `R$${v}`} width={70} />
              <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={tooltipStyle} />
              {showVendas && <Bar dataKey="vendas" fill="#1a237e" stroke="#1a237e" radius={[4, 4, 0, 0]} name="Vendas PDV" />}
              {showFiados && <Bar dataKey="fiados" fill="#f59e0b" stroke="#f59e0b" radius={[4, 4, 0, 0]} name="Fiados" />}
              {showRecebido && <Bar dataKey="recebido" fill="#10b981" stroke="#10b981" radius={[4, 4, 0, 0]} name="Recebido" />}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Vendas por Funcionário */}
        <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 animate-fade-up" style={{ animationDelay: '600ms' }}>
          <h3 className="text-base font-semibold mb-0.5 flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Vendas por Funcionário
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Ranking – {periodoLabels[periodo]}</p>
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
        <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 animate-fade-up" style={{ animationDelay: '700ms' }}>
          <h3 className="text-base font-semibold mb-0.5 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" /> Vendas por Pagamento
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Distribuição – {periodoLabels[periodo]}</p>
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

        {/* Top 5 Devedores */}
        <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 animate-fade-up" style={{ animationDelay: '800ms' }}>
          <h3 className="text-base font-semibold mb-4">Top 5 – Maior Dívida</h3>
          <div className="space-y-3">
            {topDevedores.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum devedor</p>
            ) : (
              topDevedores.map((d, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{d.nome}</p>
                    <p className="text-[11px] text-muted-foreground">Limite: {formatBRL(d.limite)}</p>
                  </div>
                  <span className="text-sm font-semibold text-destructive">{formatBRL(d.divida)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
