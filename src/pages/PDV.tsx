import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { formatBRL, formatDateTime } from '@/lib/format';
import {
  gerarCupomVenda, gerarCupomAbertura, gerarCupomFechamento, imprimirCupom,
  type DadosCupomVenda, type DadosCupomAbertura, type DadosCupomFechamento
} from '@/lib/cupomNaoFiscal';
import {
  ShoppingCart, Search, User, Banknote, CreditCard, Smartphone, HandCoins, BookOpen,
  Plus, Minus, Trash2, X, Check, ArrowLeft, DoorOpen, DoorClosed, Printer, Pencil, FileText, Receipt, Eye, Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import cpfImg from '@/assets/cpf.png';

interface ItemVenda {
  id: string;
  produto_id?: string;
  codigo_barras: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
  desconto: number;
  valor_total: number;
}

interface ClientePDV {
  id: string;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  limite_credito: number | null;
}

const PDV = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const tableEndRef = useRef<HTMLDivElement>(null);

  // Terminal number based on user email
  const numeroCaixa = user?.email === 'mercadoelcione2@gmail.com' ? 2 : 1;
  const caixaStorageKey = `caixa_estado_${numeroCaixa}`;

  // Caixa state - persist in localStorage (per terminal)
  const [caixaAberto, setCaixaAberto] = useState(() => {
    const saved = localStorage.getItem(caixaStorageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Check if still valid (same day)
      const savedDate = new Date(parsed.abertura);
      const now = new Date();
      if (savedDate.toDateString() === now.toDateString() && parsed.aberto) {
        return true;
      }
      // Expired, clear
      localStorage.removeItem(caixaStorageKey);
    }
    return false;
  });
  const [caixaModalOpen, setCaixaModalOpen] = useState(false);
  const [fecharCaixaModalOpen, setFecharCaixaModalOpen] = useState(false);
  const [valorAbertura, setValorAbertura] = useState('0');
  const [caixaOperacaoId, setCaixaOperacaoId] = useState(() => {
    const saved = localStorage.getItem(caixaStorageKey);
    return saved ? JSON.parse(saved).operacaoId || '' : '';
  });
  const [caixaAberturaTime, setCaixaAberturaTime] = useState<Date | null>(() => {
    const saved = localStorage.getItem(caixaStorageKey);
    return saved ? new Date(JSON.parse(saved).abertura) : null;
  });

  // Barcode suggestions
  const [barcodeSuggestions, setBarcodeSuggestions] = useState<any[]>([]);
  const [showBarcodeSuggestions, setShowBarcodeSuggestions] = useState(false);
  const barcodeSuggestionsRef = useRef<HTMLDivElement>(null);

  const [itens, setItens] = useState<ItemVenda[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [clock, setClock] = useState(new Date());
  const [vendaNumero, setVendaNumero] = useState('00001');
  const [cliente, setCliente] = useState<ClientePDV | null>(null);
  const [dividaCliente, setDividaCliente] = useState(0);
  const [valorPago, setValorPago] = useState('');
  const [metodoPagamento, setMetodoPagamento] = useState('dinheiro');
  const [status, setStatus] = useState<'aberto' | 'processando' | 'finalizado'>('aberto');
  const [isAddingByBarcode, setIsAddingByBarcode] = useState(false);
  const itensRef = useRef<ItemVenda[]>([]);
  useEffect(() => { itensRef.current = itens; }, [itens]);

  // Modals
  const [qtdModalOpen, setQtdModalOpen] = useState(false);
  const [selectedItemIdx, setSelectedItemIdx] = useState<number>(-1);
  const [newQtd, setNewQtd] = useState('');
  const [descModalOpen, setDescModalOpen] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [clienteModalOpen, setClienteModalOpen] = useState(false);
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteResults, setClienteResults] = useState<ClientePDV[]>([]);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [finalizarModalOpen, setFinalizarModalOpen] = useState(false);
  const [editProdutoModalOpen, setEditProdutoModalOpen] = useState(false);
  const [editProduto, setEditProduto] = useState<{ idx: number; descricao: string; valor_unitario: string; quantidade: string; unidade: string } | null>(null);
  const [cupomPendente, setCupomPendente] = useState<string | null>(null);
  const [cupomTipo, setCupomTipo] = useState<'abertura' | 'fechamento' | 'venda'>('venda');
  const [cupomConfirmOpen, setCupomConfirmOpen] = useState(false);

  // Historico vendas
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [historicoVendas, setHistoricoVendas] = useState<any[]>([]);
  const [historicoLoading, setHistoricoLoading] = useState(false);
  const [historicoDetalhe, setHistoricoDetalhe] = useState<any>(null);
  const [historicoItens, setHistoricoItens] = useState<any[]>([]);

  // CPF na nota
  const [cpfNotaModalOpen, setCpfNotaModalOpen] = useState(false);
  const [cpfNota, setCpfNota] = useState('');

  // Finalizando (anti duplo clique)
  const [finalizando, setFinalizando] = useState(false);

  // Help overlay
  const [helpOpen, setHelpOpen] = useState(false);

  // Fechamento data
  const [dadosFechamento, setDadosFechamento] = useState<DadosCupomFechamento | null>(null);

  // Title
  useEffect(() => {
    const prevTitle = document.title;
    document.title = `PDV ${numeroCaixa} - SUPERMERCADO ELCIONE`;
    return () => { document.title = prevTitle; };
  }, []);

  // Clock
  useEffect(() => {
    const i = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  // Show abertura modal on mount if caixa not open
  useEffect(() => {
    if (!caixaAberto) {
      setCaixaModalOpen(true);
    } else {
      // Restore valorAbertura from localStorage
      const saved = localStorage.getItem(caixaStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setValorAbertura(String(parsed.valorAbertura || '0'));
      }
    }
  }, []);

  // Get next venda number
  useEffect(() => {
    supabase.from('vendas').select('numero_venda').order('numero_venda', { ascending: false }).limit(1)
      .then(({ data }) => {
        const next = data?.[0] ? (data[0] as any).numero_venda + 1 : 1;
        setVendaNumero(String(next).padStart(5, '0'));
      });
  }, []);

  // Auto-scroll to last product added
  useEffect(() => {
    if (itens.length > 0) {
      tableEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [itens.length]);

  // Focus barcode input
  useEffect(() => {
    if (caixaAberto && !qtdModalOpen && !descModalOpen && !clienteModalOpen && !cancelModalOpen && !finalizarModalOpen && !caixaModalOpen && !fecharCaixaModalOpen && !cpfNotaModalOpen) {
      barcodeInputRef.current?.focus();
    }
  }, [itens, caixaAberto, qtdModalOpen, descModalOpen, clienteModalOpen, cancelModalOpen, finalizarModalOpen, caixaModalOpen, fecharCaixaModalOpen, cpfNotaModalOpen]);

  // Keyboard shortcuts - ALL function keys
  const metodosPagamento = ['dinheiro', 'debito', 'credito', 'pix'] as const;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // F1 help works ALWAYS (even with caixa fechado or modals open)
      if (e.key === 'F1') {
        e.preventDefault();
        setHelpOpen(prev => !prev);
        return;
      }

      if (!caixaAberto) return;

      // If help overlay is open, any key closes it
      if (helpOpen) {
        setHelpOpen(false);
        return;
      }

      // If any modal is open, don't process shortcuts (modals handle their own keys)
      const anyModalOpen = qtdModalOpen || descModalOpen || clienteModalOpen || cancelModalOpen || finalizarModalOpen || caixaModalOpen || fecharCaixaModalOpen || cpfNotaModalOpen || editProdutoModalOpen || historicoOpen;
      if (anyModalOpen) return;

      if (e.key === 'F2') {
        e.preventDefault();
        setClienteModalOpen(true);
      } else if (e.key === 'F3') {
        e.preventDefault();
        if (itens.length > 0) {
          setSelectedItemIdx(itens.length - 1);
          setNewQtd(String(itens[itens.length - 1].quantidade));
          setQtdModalOpen(true);
        } else {
          toast({ title: '⚠️ Sem itens', description: 'Adicione um produto primeiro (escaneie ou digite)' });
        }
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (itens.length > 0) {
          setSelectedItemIdx(itens.length - 1);
          setNewDesc('0');
          setDescModalOpen(true);
        } else {
          toast({ title: '⚠️ Sem itens', description: 'Adicione um produto primeiro para aplicar desconto' });
        }
      } else if (e.key === 'F5') {
        e.preventDefault();
        setCpfNotaModalOpen(true);
      } else if (e.key === 'F6') {
        e.preventDefault();
        if (itens.length > 0) {
          const lastIdx = itens.length - 1;
          const item = itens[lastIdx];
          setEditProduto({ idx: lastIdx, descricao: item.descricao, valor_unitario: String(item.valor_unitario), quantidade: String(item.quantidade), unidade: item.unidade });
          setEditProdutoModalOpen(true);
        } else {
          toast({ title: '⚠️ Sem itens', description: 'Adicione um produto primeiro para editar' });
        }
      } else if (e.key === 'F7') {
        e.preventDefault();
        // Cycle through payment methods
        const currentIdx = metodosPagamento.indexOf(metodoPagamento as any);
        const nextIdx = (currentIdx + 1) % metodosPagamento.length;
        const next = metodosPagamento[nextIdx];
        setMetodoPagamento(next);
        const nomes: Record<string, string> = { dinheiro: '💵 DINHEIRO', debito: '💳 DÉBITO', credito: '💳 CRÉDITO', pix: '📱 PIX' };
        toast({ title: 'Forma de pagamento', description: nomes[next] });
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (itens.length > 0) {
          setFinalizarModalOpen(true);
        } else {
          toast({ title: '⚠️ Sem itens', description: 'Adicione produtos antes de finalizar' });
        }
      } else if (e.key === 'F9') {
        e.preventDefault();
        abrirHistorico();
      } else if (e.key === 'F10') {
        e.preventDefault();
        prepararFechamento();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (itens.length > 0) setCancelModalOpen(true);
      } else if (e.key === 'Delete') {
        e.preventDefault();
        if (itens.length > 0) {
          removeItem(itens.length - 1);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [itens, caixaAberto, metodoPagamento, helpOpen, qtdModalOpen, descModalOpen, clienteModalOpen, cancelModalOpen, finalizarModalOpen, caixaModalOpen, fecharCaixaModalOpen, cpfNotaModalOpen, editProdutoModalOpen, historicoOpen]);

  const subtotal = itens.reduce((s, i) => s + i.valor_total, 0);
  const descontoTotal = itens.reduce((s, i) => s + i.desconto, 0);
  const total = subtotal - descontoTotal;
  const troco = Math.max(0, (parseFloat(valorPago) || 0) - total);

  // === ABERTURA DE CAIXA ===
  const abrirCaixa = () => {
    const opId = crypto.randomUUID();
    const agora = new Date();
    const valor = parseFloat(valorAbertura) || 0;

    setCaixaAberto(true);
    setCaixaOperacaoId(opId);
    setCaixaAberturaTime(agora);
    setCaixaModalOpen(false);

    // Persist to localStorage
    localStorage.setItem(caixaStorageKey, JSON.stringify({
      aberto: true,
      abertura: agora.toISOString(),
      operacaoId: opId,
      valorAbertura: valor,
    }));

    const cupomData: DadosCupomAbertura = {
      data: agora,
      operador_nome: profile?.nome?.toUpperCase() || 'OPERADOR',
      pdv: `PDV ${numeroCaixa}`,
      operacao_id: opId,
      valor_dinheiro: valor,
      total: valor,
    };

    const cupom = gerarCupomAbertura(cupomData);
    setCupomPendente(cupom);
    setCupomTipo('abertura');
    setCupomConfirmOpen(true);

    toast({ title: '✅ Caixa aberto!', description: `Operação: ${opId.substring(0, 8).toUpperCase()}` });
  };

  // === FECHAMENTO DE CAIXA ===
  const prepararFechamento = async () => {
    if (itens.length > 0) {
      toast({ title: 'Atenção', description: 'Finalize ou cancele a venda atual antes de fechar o caixa.', variant: 'destructive' });
      return;
    }

    // Buscar vendas desde a abertura do caixa (filtrando pelo operador do terminal)
    const desde = caixaAberturaTime?.toISOString() || new Date().toISOString();
    const query = supabase
      .from('vendas')
      .select('total, metodo_pagamento')
      .eq('status', 'finalizada')
      .gte('created_at', desde);
    if (user?.id) query.eq('operador_id', user.id);
    const { data: vendas } = await query;

    const totais = {
      dinheiro: 0, debito: 0, credito: 0, pix: 0, fiado: 0,
    };
    let totalGeral = 0;

    (vendas || []).forEach(v => {
      const val = Number(v.total);
      totalGeral += val;
      const m = v.metodo_pagamento as keyof typeof totais;
      if (m in totais) totais[m] += val;
    });

    const dados: DadosCupomFechamento = {
      data: new Date(),
      operador_nome: profile?.nome?.toUpperCase() || 'OPERADOR',
      pdv: `PDV ${numeroCaixa}`,
      operacao_id: caixaOperacaoId || crypto.randomUUID(),
      total_vendas: totalGeral,
      total_dinheiro: totais.dinheiro + (parseFloat(valorAbertura) || 0),
      total_debito: totais.debito,
      total_credito: totais.credito,
      total_pix: totais.pix,
      total_fiado: totais.fiado,
      total_geral: totalGeral + (parseFloat(valorAbertura) || 0),
      qtd_vendas: (vendas || []).length,
    };

    setDadosFechamento(dados);
    setFecharCaixaModalOpen(true);
  };

  const confirmarFechamento = () => {
    if (!dadosFechamento) return;

    const cupom = gerarCupomFechamento(dadosFechamento);

    setFecharCaixaModalOpen(false);
    setDadosFechamento(null);
    setValorAbertura('0');
    setCaixaAberto(false);

    // Clear localStorage
    localStorage.removeItem(caixaStorageKey);

    toast({ title: '🔒 Caixa fechado!', description: `Total: ${formatBRL(dadosFechamento.total_geral)}` });

    // Mostra confirmação de impressão, ao fechar redireciona pro dashboard
    setCupomPendente(cupom);
    setCupomTipo('fechamento');
    setCupomConfirmOpen(true);
  };

  const addItemByBarcode = useCallback(async (code: string) => {
    if (!code.trim() || isAddingByBarcode) return;
    setIsAddingByBarcode(true);
    setStatus('processando');

    const trimmed = code.trim();

    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .or(`codigo_barras.eq.${trimmed},codigo_interno.eq.${trimmed}`)
      .eq('ativo', true)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      toast({ title: 'Produto não encontrado', description: `Código: ${code}`, variant: 'destructive' });
      setBarcodeInput('');
      setStatus('aberto');
      setIsAddingByBarcode(false);
      barcodeInputRef.current?.focus();
      return;
    }

    setItens(prev => [...prev, {
      id: crypto.randomUUID(),
      produto_id: data.id,
      codigo_barras: data.codigo_barras,
      descricao: data.descricao,
      quantidade: 1,
      unidade: data.unidade,
      valor_unitario: Number(data.preco_venda),
      desconto: 0,
      valor_total: Number(data.preco_venda),
    }]);
    setBarcodeInput('');
    setStatus('processando');
    setIsAddingByBarcode(false);
    setTimeout(() => barcodeInputRef.current?.focus(), 50);
  }, [isAddingByBarcode]);

  const barcodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleBarcodeChange = (value: string) => {
    setBarcodeInput(value);
    if (barcodeTimeoutRef.current) clearTimeout(barcodeTimeoutRef.current);

    const trimmed = value.trim();
    if (trimmed.length < 1) {
      setShowBarcodeSuggestions(false);
      setBarcodeSuggestions([]);
      return;
    }

    const isNumeric = /^\d+$/.test(trimmed);

    if (isNumeric && trimmed.length >= 3) {
      // Barcode scanner input - check exact match, if found auto-add
      setShowBarcodeSuggestions(false);
      setBarcodeSuggestions([]);
      barcodeTimeoutRef.current = setTimeout(async () => {
        const { data } = await supabase
          .from('produtos')
          .select('*')
          .or(`codigo_barras.eq.${trimmed},codigo_interno.eq.${trimmed}`)
          .eq('ativo', true)
          .limit(1)
          .maybeSingle();
        if (data) {
          // Exact barcode match - auto add
          addItemByBarcode(trimmed);
        } else {
          // No exact match - show suggestions
          const { data: suggestions } = await supabase
            .from('produtos')
            .select('*')
            .eq('ativo', true)
            .or(`codigo_barras.ilike.%${trimmed}%,descricao.ilike.%${trimmed}%,marca.ilike.%${trimmed}%`)
            .order('descricao')
            .limit(10);
          setBarcodeSuggestions(suggestions || []);
          setShowBarcodeSuggestions((suggestions || []).length > 0);
        }
      }, 400);
    } else {
      // Text input - show suggestions only
      barcodeTimeoutRef.current = setTimeout(async () => {
        const { data } = await supabase
          .from('produtos')
          .select('*')
          .eq('ativo', true)
          .or(`descricao.ilike.%${trimmed}%,codigo_barras.ilike.%${trimmed}%,marca.ilike.%${trimmed}%`)
          .order('descricao')
          .limit(10);
        setBarcodeSuggestions(data || []);
        setShowBarcodeSuggestions((data || []).length > 0);
      }, 250);
    }
  };

  const selectBarcodeSuggestion = (produto: any) => {
    setShowBarcodeSuggestions(false);
    setBarcodeSuggestions([]);
    setBarcodeInput('');
    addFromSearch(produto);
    setTimeout(() => barcodeInputRef.current?.focus(), 50);
  };

  const addFromSearch = (produto: any) => {
    setItens(prev => [...prev, {
      id: crypto.randomUUID(),
      produto_id: produto.id,
      codigo_barras: produto.codigo_barras,
      descricao: produto.descricao,
      quantidade: 1,
      unidade: produto.unidade,
      valor_unitario: Number(produto.preco_venda),
      desconto: 0,
      valor_total: Number(produto.preco_venda),
    }]);
    setStatus('processando');
  };

  const removeItem = (idx: number) => {
    setItens(prev => prev.filter((_, i) => i !== idx));
  };

  const incrementItem = (idx: number) => {
    setItens(prev => prev.map((item, i) => i === idx ? {
      ...item,
      quantidade: item.quantidade + 1,
      valor_total: (item.quantidade + 1) * item.valor_unitario - item.desconto,
    } : item));
  };

  const decrementItem = (idx: number) => {
    setItens(prev => {
      const item = prev[idx];
      if (item.quantidade <= 1) return prev.filter((_, i) => i !== idx);
      return prev.map((it, i) => i === idx ? {
        ...it,
        quantidade: it.quantidade - 1,
        valor_total: (it.quantidade - 1) * it.valor_unitario - it.desconto,
      } : it);
    });
  };

  const updateQuantidade = () => {
    const qty = parseFloat(newQtd);
    if (!qty || qty <= 0 || selectedItemIdx < 0) return;
    setItens(prev => prev.map((item, idx) => idx === selectedItemIdx ? {
      ...item,
      quantidade: qty,
      valor_total: qty * item.valor_unitario - item.desconto,
    } : item));
    setQtdModalOpen(false);
  };

  const applyDesconto = () => {
    const desc = parseFloat(newDesc);
    if (isNaN(desc) || desc < 0 || selectedItemIdx < 0) return;
    setItens(prev => prev.map((item, idx) => idx === selectedItemIdx ? {
      ...item,
      desconto: desc,
      valor_total: item.quantidade * item.valor_unitario - desc,
    } : item));
    setDescModalOpen(false);
  };


  const searchClientes = async () => {
    if (!clienteSearch.trim()) return;
    const { data } = await supabase
      .from('clientes')
      .select('id, nome, cpf, telefone, limite_credito')
      .eq('status', 'ativo')
      .or(`nome.ilike.%${clienteSearch}%,cpf.ilike.%${clienteSearch}%`)
      .limit(10);
    setClienteResults((data as ClientePDV[]) || []);
  };

  const selectCliente = async (c: ClientePDV) => {
    setCliente(c);
    const { data: fiados } = await supabase
      .from('fiados')
      .select('valor_total, valor_pago')
      .eq('cliente_id', c.id)
      .neq('status', 'pago');
    const divida = (fiados || []).reduce((s, f) => s + (Number(f.valor_total) - Number(f.valor_pago)), 0);
    setDividaCliente(divida);
    setClienteModalOpen(false);
  };

  const cancelarVenda = () => {
    setItens([]);
    setCliente(null);
    setDividaCliente(0);
    setValorPago('');
    setMetodoPagamento('dinheiro');
    setStatus('aberto');
    setCancelModalOpen(false);
    setCpfNota('');
  };

  const abrirHistorico = async () => {
    setHistoricoOpen(true);
    setHistoricoLoading(true);
    setHistoricoDetalhe(null);
    const { data } = await supabase
      .from('vendas')
      .select('*, clientes(nome)')
      .eq('status', 'finalizada')
      .order('created_at', { ascending: false })
      .limit(30);
    setHistoricoVendas(data || []);
    setHistoricoLoading(false);
  };

  const verDetalheHistorico = async (venda: any) => {
    setHistoricoDetalhe(venda);
    const { data } = await supabase
      .from('venda_itens')
      .select('*')
      .eq('venda_id', venda.id)
      .order('created_at');
    setHistoricoItens(data || []);
  };

  const reimprimirCupomHistorico = async (venda: any) => {
    const { data: itensData } = await supabase
      .from('venda_itens')
      .select('*')
      .eq('venda_id', venda.id);
    const cupomData: DadosCupomVenda = {
      id: venda.id,
      data: new Date(venda.created_at),
      itens: (itensData || []).map((i: any) => ({
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
      operador_nome: profile?.nome?.toUpperCase() || 'OPERADOR',
    };
    imprimirCupom(gerarCupomVenda(cupomData));
  };

  const finalizarVenda = async () => {
    if (itens.length === 0 || finalizando) return;
    setFinalizando(true);

    try {
      if (metodoPagamento === 'fiado' && !cliente) {
        toast({ title: 'Erro', description: 'Selecione um cliente para venda fiado', variant: 'destructive' });
        return;
      }

      const vendaPayload = {
        cliente_id: cliente?.id || null,
        operador_id: user?.id || null,
        subtotal,
        desconto_total: descontoTotal,
        total,
        valor_pago: parseFloat(valorPago) || total,
        troco,
        metodo_pagamento: metodoPagamento,
        status: 'finalizada',
        tipo: metodoPagamento === 'fiado' ? 'fiado' : 'normal',
      };

      const { data: venda, error: vendaErr } = await supabase
        .from('vendas')
        .insert(vendaPayload)
        .select()
        .single();

      if (vendaErr) throw vendaErr;

      const itensPayload = itens.map(i => ({
        venda_id: venda.id,
        produto_id: i.produto_id || null,
        codigo_barras: i.codigo_barras,
        descricao: i.descricao,
        quantidade: i.quantidade,
        unidade: i.unidade,
        valor_unitario: i.valor_unitario,
        desconto: i.desconto,
        valor_total: i.valor_total,
      }));

      const { error: itensErr } = await supabase.from('venda_itens').insert(itensPayload);
      if (itensErr) throw itensErr;

      if (metodoPagamento === 'fiado' && cliente) {
        const { error: fiadoErr } = await supabase.from('fiados').insert({
          cliente_id: cliente.id,
          created_by: user?.id || null,
          descricao: `Venda PDV #${vendaNumero}`,
          valor_total: total,
          valor_pago: 0,
          status: 'pendente',
        });
        if (fiadoErr) throw fiadoErr;
      }

      for (const item of itens) {
        if (item.produto_id) {
          const { data: prod } = await supabase.from('produtos')
            .select('estoque_atual, movimenta_estoque')
            .eq('id', item.produto_id)
            .single();
          if (prod && prod.movimenta_estoque) {
            await supabase.from('produtos')
              .update({ estoque_atual: Number(prod.estoque_atual) - item.quantidade })
              .eq('id', item.produto_id);
          }
        }
      }

      // === GERAR CUPOM NÃO FISCAL ===
      const cupomData: DadosCupomVenda = {
        id: venda.id,
        data: new Date(),
        itens: itens.map(i => ({
          codigo_barras: i.codigo_barras,
          descricao: i.descricao,
          quantidade: i.quantidade,
          unidade: i.unidade,
          valor_unitario: i.valor_unitario,
          valor_total: i.valor_total,
        })),
        subtotal,
        desconto: descontoTotal,
        total,
        metodo_pagamento: metodoPagamento,
        valor_pago: parseFloat(valorPago) || total,
        troco,
        cliente_nome: cliente?.nome,
        cliente_cpf: cpfNota || cliente?.cpf || undefined,
        operador_nome: profile?.nome?.toUpperCase() || 'OPERADOR',
      };

      const cupom = gerarCupomVenda(cupomData);
      setCupomPendente(cupom);
      setCupomTipo('venda');
      setCupomConfirmOpen(true);

      toast({ title: '✅ Venda finalizada!', description: `Venda #${vendaNumero} - ${formatBRL(total)}` });

      setItens([]);
      setCliente(null);
      setDividaCliente(0);
      setValorPago('');
      setMetodoPagamento('dinheiro');
      setStatus('aberto');
      setFinalizarModalOpen(false);
      setCpfNota('');
      setVendaNumero(v => String(parseInt(v) + 1).padStart(5, '0'));

    } catch (e: any) {
      toast({ title: 'Erro ao finalizar', description: e.message, variant: 'destructive' });
    } finally {
      setFinalizando(false);
    }
  };

  const dateStr = clock.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = clock.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="h-screen flex flex-col text-foreground overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 30%, #1976d2 60%, #1e88e5 100%)' }}>
      {/* TOP BAR */}
      <header className="relative z-20 flex items-center justify-between px-4 py-2 bg-[#0a3d91] border-b border-[#0d47a1] shadow-lg">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
            <img src="/logo.svg" alt="Logo" className="w-8 h-8 object-contain" />
          </button>
          <div>
            <h1 className="text-sm font-bold tracking-wide text-white">OLIVER SOFT TECH PDV</h1>
            <p className="text-[10px] text-blue-200">Terminal {String(numeroCaixa).padStart(2, '0')} - Caixa {numeroCaixa}</p>
          </div>
        </div>

        <div className="flex-1 max-w-xl mx-6">
          <div className="relative">
            <BarCodeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-200 z-10" />
            <Input
              ref={barcodeInputRef}
              value={barcodeInput}
              onChange={e => handleBarcodeChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (barcodeTimeoutRef.current) clearTimeout(barcodeTimeoutRef.current);
                  if (showBarcodeSuggestions && barcodeSuggestions.length > 0) {
                    selectBarcodeSuggestion(barcodeSuggestions[0]);
                  } else {
                    addItemByBarcode(barcodeInput);
                  }
                } else if (e.key === 'Escape') {
                  setShowBarcodeSuggestions(false);
                  setBarcodeSuggestions([]);
                }
              }}
              onBlur={() => setTimeout(() => setShowBarcodeSuggestions(false), 200)}
              placeholder="Escaneie o código ou digite o nome do produto..."
              className="pl-10 h-9 bg-white/10 border-white/20 text-white placeholder:text-blue-200 focus:ring-blue-300 input-glow"
              disabled={!caixaAberto}
            />
            {/* Seta sutil apontando para o input quando vazio */}
            {caixaAberto && itens.length === 0 && !barcodeInput && (
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 text-yellow-300 animate-bounce pointer-events-none">
                <span className="text-lg">^</span>
                <span className="text-[10px] font-medium whitespace-nowrap">Escaneie ou digite aqui</span>
              </div>
            )}
            {/* Suggestions dropdown */}
            {showBarcodeSuggestions && barcodeSuggestions.length > 0 && (
              <div
                ref={barcodeSuggestionsRef}
                className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-[100] max-h-64 overflow-auto"
              >
                {barcodeSuggestions.map((p, idx) => (
                  <button
                    key={p.id}
                    onMouseDown={(e) => { e.preventDefault(); selectBarcodeSuggestion(p); }}
                    className={`w-full flex items-center justify-between px-3 py-2 hover:bg-accent transition-colors text-left ${idx === 0 ? 'bg-accent/50' : ''}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{p.descricao}</p>
                      <p className="text-[10px] text-muted-foreground">{p.codigo_barras} · {p.marca || 'Sem marca'}</p>
                    </div>
                    <span className="text-primary font-bold text-sm ml-2 whitespace-nowrap">{formatBRL(Number(p.preco_venda))}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-white">{dateStr}, {timeStr}</p>
            <div className="flex items-center gap-1 justify-end">
              <span className={`w-2 h-2 rounded-full ${caixaAberto ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className={`text-[10px] font-medium ${caixaAberto ? 'text-green-300' : 'text-red-300'}`}>
                {caixaAberto ? 'CAIXA ABERTO' : 'CAIXA FECHADO'}
              </span>
            </div>
          </div>

          {caixaAberto && (
            <Button
              variant="outline"
              size="sm"
              onClick={prepararFechamento}
              className="gap-1 text-red-300 border-red-400/40 hover:bg-red-500/20 hover:text-red-200"
            >
              <DoorClosed className="w-4 h-4" />
              F10 - Fechar Caixa
            </Button>
          )}
        </div>
      </header>

      {/* MAIN CONTENT */}
      {!caixaAberto ? (
        <div className="relative z-10 flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <DoorClosed className="w-16 h-16 mx-auto text-blue-200" />
            <h2 className="text-xl font-bold text-white">Caixa Fechado</h2>
            <p className="text-blue-200">Clique no botão abaixo ou pressione <span className="font-bold text-yellow-300">ENTER</span> para abrir o caixa.</p>
            <Button onClick={() => setCaixaModalOpen(true)} className="gap-2 bg-white text-[#0d47a1] hover:bg-blue-50 font-bold text-lg px-8 py-6">
              <DoorOpen className="w-6 h-6" /> ABRIR CAIXA
            </Button>
            <p className="text-blue-300 text-xs mt-2">Pressione <span className="font-bold text-yellow-300">F1</span> a qualquer momento para ver a ajuda</p>
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex flex-1 overflow-hidden">
          {/* LEFT: Product list */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 p-3 overflow-hidden flex flex-col">
              <div className="flex-1 bg-card rounded-lg border border-border overflow-auto shadow-sm relative">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                  <img src="/fundo-oliver.svg" alt="" className="w-[1100px] h-auto opacity-[0.35]" />
                </div>
                <Table className="relative z-[1]">
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground text-xs w-[90px]">CÓD</TableHead>
                      <TableHead className="text-muted-foreground text-xs">PRODUTO</TableHead>
                      <TableHead className="text-muted-foreground text-xs text-right w-[70px]">QTD</TableHead>
                      <TableHead className="text-muted-foreground text-xs text-center w-[50px]">UN</TableHead>
                      <TableHead className="text-muted-foreground text-xs text-right w-[80px]">UNITÁRIO</TableHead>
                      <TableHead className="text-muted-foreground text-xs text-right w-[60px]">DESC.</TableHead>
                      <TableHead className="text-muted-foreground text-xs text-right w-[80px]">TOTAL</TableHead>
                      <TableHead className="text-muted-foreground text-xs text-center w-[120px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((item, idx) => (
                      <TableRow
                        key={item.id}
                        className={`border-border/50 hover:bg-accent/50 transition-colors ${idx === itens.length - 1 ? 'bg-accent/30' : ''}`}
                      >
                        <TableCell className="text-muted-foreground font-mono text-xs">{item.codigo_barras || ''}</TableCell>
                        <TableCell className="font-semibold text-sm text-foreground">{item.descricao}</TableCell>
                        <TableCell className="text-right text-sm text-foreground">{item.quantidade.toFixed(3).replace('.', ',')}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="text-[10px]">{item.unidade}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-foreground">{item.valor_unitario.toFixed(2).replace('.', ',')}</TableCell>
                        <TableCell className={`text-right text-sm ${item.desconto > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {item.desconto.toFixed(2).replace('.', ',')}
                        </TableCell>
                        <TableCell className="text-right font-bold text-sm text-foreground">{item.valor_total.toFixed(2).replace('.', ',')}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => decrementItem(idx)}
                              className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-destructive transition-colors"
                              title="Diminuir quantidade"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => incrementItem(idx)}
                              className="p-1 rounded hover:bg-green-100 text-muted-foreground hover:text-green-600 transition-colors"
                              title="Aumentar quantidade"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setEditProduto({ idx, descricao: item.descricao, valor_unitario: String(item.valor_unitario), quantidade: String(item.quantidade), unidade: item.unidade });
                                setEditProdutoModalOpen(true);
                              }}
                              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-primary transition-colors"
                              title="Editar produto"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => removeItem(idx)}
                              className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-destructive transition-colors"
                              title="Excluir item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {itens.length === 0 && (
                      <TableRow className="border-border/50">
                        <TableCell colSpan={8} className="text-center py-16">
                          <p className="text-muted-foreground italic text-sm">Aguardando produto...</p>
                          <p className="text-muted-foreground/60 text-xs mt-2">Escaneie o codigo de barras ou digite o nome na barra acima</p>
                          <p className="text-muted-foreground/40 text-[10px] mt-4">F1 = Ver todos os atalhos</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <div ref={tableEndRef} />
              </div>
            </div>

            <div className="flex gap-2 px-3 pb-2">
              {[
                { key: 'F3', label: 'Qtd', onClick: () => { if (itens.length > 0) { setSelectedItemIdx(itens.length - 1); setNewQtd(String(itens[itens.length - 1].quantidade)); setQtdModalOpen(true); } } },
                { key: 'F4', label: 'Desconto', onClick: () => { if (itens.length > 0) { setSelectedItemIdx(itens.length - 1); setNewDesc('0'); setDescModalOpen(true); } } },
                { key: 'DEL', label: 'Remover', color: 'text-red-400', onClick: () => { if (itens.length > 0) removeItem(itens.length - 1); } },
                { key: 'ESC', label: 'Cancelar', color: 'text-red-400', onClick: () => { if (itens.length > 0) setCancelModalOpen(true); } },
              ].map(btn => (
                <button
                  key={btn.key}
                  onClick={btn.onClick}
                  className="flex-1 py-2 rounded-lg border border-border bg-card text-center transition-all hover:bg-accent/50"
                >
                  <span className="text-[9px] text-muted-foreground block font-mono">{btn.key}</span>
                  <span className={`text-[10px] font-medium ${btn.color || 'text-foreground'}`}>{btn.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT: Summary panel */}
          <div className="w-[320px] flex flex-col border-l border-border bg-card">
            <div className="p-3 border-b border-border">
              {cliente ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                      <User className="w-3.5 h-3.5" />
                      Cliente (Identificado)
                    </div>
                    <button className="text-[10px] text-primary hover:underline" onClick={() => { setCliente(null); setDividaCliente(0); }}>Trocar</button>
                  </div>
                  <p className="font-bold text-sm text-foreground">{cliente.nome}</p>
                  {cliente.cpf && <p className="text-[11px] text-muted-foreground">CPF: {cliente.cpf}</p>}
                  {cliente.telefone && <p className="text-[11px] text-muted-foreground">Tel: {cliente.telefone}</p>}
                  <div className="flex justify-between mt-2 text-xs">
                    <span className="text-muted-foreground">Limite 'Fiado':</span>
                    <span className="text-success font-semibold">{formatBRL(Number(cliente.limite_credito) || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Dívida Atual:</span>
                    <span className={`font-semibold ${dividaCliente > 0 ? 'text-destructive' : 'text-success'}`}>{formatBRL(dividaCliente)}</span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setClienteModalOpen(true)}
                  className="w-full py-3 border border-dashed border-border rounded-lg text-center hover:bg-accent/50 transition-colors"
                >
                  <User className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground"><span className="font-bold text-primary">F2</span> — Identificar cliente</p>
                </button>
              )}
            </div>

            {/* CPF na Nota indicator */}
            <div className="relative mx-3 mt-2">
              {/* Seta sutil quando tem itens mas sem CPF */}
              {itens.length > 0 && !cpfNota && (
                <span className="absolute -left-4 top-1/2 -translate-y-1/2 text-red-400 animate-pulse text-xs pointer-events-none">&#9654;</span>
              )}
            <button
              onClick={() => setCpfNotaModalOpen(true)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${
                cpfNota
                  ? 'border-green-500 bg-green-500/15 text-green-400 hover:bg-green-500/25'
                  : 'border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20'
              }`}
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {cpfNota ? `CPF: ${cpfNota}` : 'SEM CPF NA NOTA'}
              </span>
              <span className={`text-[11px] px-2 py-0.5 rounded font-bold ${
                cpfNota
                  ? 'bg-green-500/20 text-green-300'
                  : 'bg-red-500/20 text-red-300'
              }`}>{cpfNota ? 'F5 ALTERAR' : 'F5 ADICIONAR'}</span>
            </button>
            </div>

            <div className="flex-1 p-3 space-y-3">
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">SUBTOTAL</span>
                  <span className="font-medium text-foreground">{subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                {descontoTotal > 0 && (
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-destructive font-medium">DESCONTO TOTAL</span>
                    <span className="text-destructive font-medium">- {descontoTotal.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                <div className="border-t border-border pt-2 mt-2">
                  <p className="text-xs text-muted-foreground font-bold mb-1">TOTAL A PAGAR</p>
                  <p className="text-3xl font-extrabold text-primary">
                    <span className="text-base text-muted-foreground mr-1">R$</span>
                    {total.toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </div>

              <div className="flex-1" />

              {metodoPagamento === 'dinheiro' && (
                <div className="space-y-2 bg-muted/30 rounded-lg p-2.5 border border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">RECEBIDO (R$)</span>
                    <Input
                      value={valorPago}
                      onChange={e => setValorPago(e.target.value)}
                      placeholder={total.toFixed(2)}
                      className="w-28 h-9 text-right bg-background border-border text-foreground text-base font-bold"
                      type="number"
                      step="0.01"
                    />
                  </div>
                  {troco > 0 && (
                    <div className="flex items-center justify-between bg-green-500/15 rounded-md px-2 py-1.5 border border-green-500/30">
                      <span className="text-sm text-green-400 font-bold">TROCO</span>
                      <span className="text-xl text-green-400 font-extrabold">R$ {troco.toFixed(2).replace('.', ',')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-border space-y-2">
              <p className="text-[9px] text-muted-foreground font-semibold text-center">PAGAMENTO — pressione F7 para trocar</p>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { key: 'dinheiro', label: 'Dinheiro', icon: Banknote },
                  { key: 'debito', label: 'Débito', icon: CreditCard },
                  { key: 'credito', label: 'Crédito', icon: CreditCard },
                  { key: 'pix', label: 'PIX', icon: Smartphone },
                ].map(m => (
                  <button
                    key={m.key}
                    onClick={() => setMetodoPagamento(m.key)}
                    className={`p-1.5 rounded-lg border text-center transition-all ${
                      metodoPagamento === m.key
                        ? 'border-primary bg-accent text-primary ring-2 ring-primary/30'
                        : 'border-border text-muted-foreground hover:bg-accent/50'
                    }`}
                  >
                    <m.icon className="w-4 h-4 mx-auto mb-0.5" />
                    <span className="text-[9px] font-medium">{m.label}</span>
                  </button>
                ))}
              </div>

              <div className="relative">
                <Button
                  onClick={() => { if (itens.length > 0) setFinalizarModalOpen(true); }}
                  disabled={itens.length === 0}
                  className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-base gap-2 rounded-lg"
                >
                  <Check className="w-5 h-5" /> F8 - FINALIZAR VENDA
                </Button>
                {/* Seta sutil quando tem itens e pode finalizar */}
                {itens.length > 0 && cpfNota && (
                  <span className="absolute -left-5 top-1/2 -translate-y-1/2 text-green-400 animate-pulse text-sm pointer-events-none">&#9654;</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="relative z-10 flex items-center justify-between px-4 py-1.5 bg-[#0a3d91] border-t border-[#0d47a1] text-[11px]">
        <div className="flex items-center gap-6">
          <span className="text-blue-200">VENDA: <span className="text-white font-mono">#{vendaNumero}</span></span>
          <span className="text-blue-200">OPERADOR: <span className="text-white">{profile?.nome?.toUpperCase() || 'OPERADOR'}</span></span>
          <span className="text-blue-200">
            <span className={`ml-1 ${!caixaAberto ? 'text-red-300' : 'text-green-300'}`}>
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle bg-current" />
              {!caixaAberto ? 'FECHADO' : 'ABERTO'}
            </span>
          </span>
        </div>
        <div className="flex gap-4 text-blue-300 items-center">
          <span className="text-yellow-300 font-bold">[F1] AJUDA</span>
          <span className="text-green-300">[F8] PAGAR</span>
          <span>[F7] PAGTO</span>
          <span className="text-red-300">[ESC] CANCELAR</span>
        </div>
      </footer>

      {/* ABERTURA DE CAIXA MODAL */}
      <Dialog open={caixaModalOpen} onOpenChange={(open) => { if (!open && !caixaAberto) { setCaixaModalOpen(false); navigate('/dashboard'); } else if (!open) { setCaixaModalOpen(false); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DoorOpen className="w-5 h-5 text-primary" /> Abertura de Caixa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-xs">Operador</Label>
              <p className="font-bold text-foreground">{profile?.nome?.toUpperCase() || 'OPERADOR'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">PDV</Label>
              <p className="font-bold text-foreground">PDV 1 - Terminal 01</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Valor em Dinheiro no Caixa (R$)</Label>
              <Input
                value={valorAbertura}
                onChange={e => setValorAbertura(e.target.value)}
                type="number"
                step="0.01"
                className="mt-1 text-lg"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') abrirCaixa(); }}
              />
            </div>
            <Button onClick={abrirCaixa} className="w-full gap-2">
              <DoorOpen className="w-4 h-4" /> Abrir Caixa e Imprimir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* FECHAMENTO DE CAIXA MODAL */}
      <Dialog open={fecharCaixaModalOpen} onOpenChange={setFecharCaixaModalOpen}>
        <DialogContent className="sm:max-w-md" onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); confirmarFechamento(); }
        }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DoorClosed className="w-5 h-5 text-destructive" /> Fechamento de Caixa
            </DialogTitle>
          </DialogHeader>
          {dadosFechamento && (
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-lg p-3 border border-border space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Operador:</span><span className="font-medium">{dadosFechamento.operador_nome}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">PDV:</span><span className="font-medium">{dadosFechamento.pdv}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Qtd Vendas:</span><span className="font-bold">{dadosFechamento.qtd_vendas}</span></div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 border border-border space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Dinheiro:</span><span>{formatBRL(dadosFechamento.total_dinheiro)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Débito:</span><span>{formatBRL(dadosFechamento.total_debito)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Crédito:</span><span>{formatBRL(dadosFechamento.total_credito)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">PIX:</span><span>{formatBRL(dadosFechamento.total_pix)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Fiado:</span><span>{formatBRL(dadosFechamento.total_fiado)}</span></div>
                <div className="border-t border-border pt-2 mt-2 flex justify-between text-lg font-bold">
                  <span>TOTAL GERAL:</span>
                  <span className="text-primary">{formatBRL(dadosFechamento.total_geral)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setFecharCaixaModalOpen(false)}>ESC - Cancelar</Button>
                <Button variant="destructive" className="flex-1 gap-1" onClick={confirmarFechamento}>
                  <Printer className="w-4 h-4" /> ENTER - Fechar
                </Button>
              </div>
              <p className="text-center text-[10px] text-muted-foreground"><span className="font-bold">ENTER</span> confirma, <span className="font-bold">ESC</span> cancela</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* QTD MODAL */}
      <Dialog open={qtdModalOpen} onOpenChange={setQtdModalOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Alterar Quantidade</DialogTitle></DialogHeader>
          {selectedItemIdx >= 0 && itens[selectedItemIdx] && (
            <p className="text-sm text-muted-foreground">{itens[selectedItemIdx].descricao}</p>
          )}
          <Input
            value={newQtd}
            onChange={e => setNewQtd(e.target.value)}
            type="number"
            step="0.001"
            className="text-center text-lg"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') updateQuantidade(); }}
          />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setQtdModalOpen(false)}>ESC - Cancelar</Button>
            <Button className="flex-1" onClick={updateQuantidade}>ENTER - Confirmar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DESCONTO MODAL */}
      <Dialog open={descModalOpen} onOpenChange={setDescModalOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Aplicar Desconto</DialogTitle></DialogHeader>
          {selectedItemIdx >= 0 && itens[selectedItemIdx] && (
            <p className="text-sm text-muted-foreground">{itens[selectedItemIdx].descricao}</p>
          )}
          <div>
            <Label className="text-muted-foreground text-xs">Valor do desconto (R$)</Label>
            <Input
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              type="number"
              step="0.01"
              className="text-center text-lg mt-1"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') applyDesconto(); }}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setDescModalOpen(false)}>ESC - Cancelar</Button>
            <Button className="flex-1" onClick={applyDesconto}>ENTER - Aplicar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* EDITAR PRODUTO MODAL */}
      <Dialog open={editProdutoModalOpen} onOpenChange={setEditProdutoModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Editar Produto</DialogTitle></DialogHeader>
          {editProduto && (
            <div className="space-y-3">
              <div>
                <Label className="text-muted-foreground text-xs">Descrição</Label>
                <Input
                  value={editProduto.descricao}
                  onChange={e => setEditProduto({ ...editProduto, descricao: e.target.value })}
                  className="mt-1"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-muted-foreground text-xs">Preço Unitário (R$)</Label>
                  <Input
                    value={editProduto.valor_unitario}
                    onChange={e => setEditProduto({ ...editProduto, valor_unitario: e.target.value })}
                    type="number"
                    step="0.01"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Quantidade</Label>
                  <Input
                    value={editProduto.quantidade}
                    onChange={e => setEditProduto({ ...editProduto, quantidade: e.target.value })}
                    type="number"
                    step="0.001"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Unidade</Label>
                <Input
                  value={editProduto.unidade}
                  onChange={e => setEditProduto({ ...editProduto, unidade: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditProdutoModalOpen(false)}>ESC - Cancelar</Button>
                <Button className="flex-1" onClick={() => {
                  if (!editProduto) return;
                  const qty = parseFloat(editProduto.quantidade) || 0;
                  const price = parseFloat(editProduto.valor_unitario) || 0;
                  setItens(prev => prev.map((item, i) => i === editProduto.idx ? {
                    ...item,
                    descricao: editProduto.descricao,
                    valor_unitario: price,
                    quantidade: qty,
                    unidade: editProduto.unidade,
                    valor_total: qty * price - item.desconto,
                  } : item));
                  setEditProdutoModalOpen(false);
                  toast({ title: 'Produto atualizado', description: editProduto.descricao });
                }}>Salvar</Button>
              </div>
              <p className="text-center text-[10px] text-muted-foreground"><span className="font-bold">ESC</span> cancela</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CLIENTE MODAL */}
      <Dialog open={clienteModalOpen} onOpenChange={setClienteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Identificar Cliente</DialogTitle></DialogHeader>
          <div className="flex gap-2">
            <Input
              value={clienteSearch}
              onChange={e => setClienteSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') searchClientes(); }}
              placeholder="Nome ou CPF..."
              autoFocus
            />
            <Button onClick={searchClientes}>Buscar</Button>
          </div>
          <div className="max-h-48 overflow-auto mt-2">
            {clienteResults.map(c => (
              <button
                key={c.id}
                onClick={() => selectCliente(c)}
                className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-accent transition-colors text-left"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{c.nome}</p>
                  <p className="text-[10px] text-muted-foreground">{c.cpf || 'Sem CPF'} · {c.telefone || 'Sem tel'}</p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* CONFIRMAR IMPRESSÃO MODAL */}
      <Dialog open={cupomConfirmOpen} onOpenChange={(open) => { if (!open) { const fechou = !caixaAberto; const tipo = cupomTipo; setCupomPendente(null); setCupomConfirmOpen(false); if (fechou) navigate('/dashboard'); else if (tipo === 'abertura' || tipo === 'venda') { setCpfNota(''); setCpfNotaModalOpen(true); } } }}>
        <DialogContent className="sm:max-w-xs" onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key.toLowerCase() === 's') {
            e.preventDefault();
            if (cupomPendente) imprimirCupom(cupomPendente);
            const fechou = !caixaAberto; const tipo = cupomTipo;
            setCupomPendente(null); setCupomConfirmOpen(false);
            if (fechou) navigate('/dashboard'); else if (tipo === 'abertura' || tipo === 'venda') { setCpfNota(''); setCpfNotaModalOpen(true); }
          } else if (e.key === 'Escape' || e.key.toLowerCase() === 'n') {
            e.preventDefault();
            const fechou = !caixaAberto; const tipo = cupomTipo;
            setCupomPendente(null); setCupomConfirmOpen(false);
            if (fechou) navigate('/dashboard'); else if (tipo === 'abertura' || tipo === 'venda') { setCpfNota(''); setCpfNotaModalOpen(true); }
          }
        }}>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Printer className="w-5 h-5 text-primary" /> Imprimir Cupom</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            {cupomTipo === 'abertura' && 'Deseja imprimir o cupom de abertura de caixa?'}
            {cupomTipo === 'fechamento' && 'Deseja imprimir o cupom de fechamento de caixa?'}
            {cupomTipo === 'venda' && 'Deseja imprimir o cupom de venda?'}
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => { const fechou = !caixaAberto; const tipo = cupomTipo; setCupomPendente(null); setCupomConfirmOpen(false); if (fechou) navigate('/dashboard'); else if (tipo === 'abertura' || tipo === 'venda') { setCpfNota(''); setCpfNotaModalOpen(true); } }}>
              N - Não
            </Button>
            <Button className="flex-1 gap-2" onClick={() => { if (cupomPendente) imprimirCupom(cupomPendente); const fechou = !caixaAberto; const tipo = cupomTipo; setCupomPendente(null); setCupomConfirmOpen(false); if (fechou) navigate('/dashboard'); else if (tipo === 'abertura' || tipo === 'venda') { setCpfNota(''); setCpfNotaModalOpen(true); } }}>
              <Printer className="w-4 h-4" /> S - Imprimir
            </Button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground">Pressione <span className="font-bold">S</span> ou <span className="font-bold">ENTER</span> para imprimir, <span className="font-bold">N</span> ou <span className="font-bold">ESC</span> para pular</p>
        </DialogContent>
      </Dialog>

      {/* CANCELAR MODAL */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="sm:max-w-sm" onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); cancelarVenda(); }
        }}>
          <DialogHeader><DialogTitle>Cancelar Venda?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Todos os itens serão removidos. Esta ação não pode ser desfeita.</p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setCancelModalOpen(false)}>ESC - Voltar</Button>
            <Button variant="destructive" className="flex-1" onClick={cancelarVenda}>ENTER - Cancelar Venda</Button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground"><span className="font-bold">ENTER</span> confirma, <span className="font-bold">ESC</span> volta</p>
        </DialogContent>
      </Dialog>

      {/* CPF NA NOTA MODAL */}
      <Dialog open={cpfNotaModalOpen} onOpenChange={setCpfNotaModalOpen}>
        <DialogContent className="sm:max-w-xs" onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            setCpfNota('');
            setCpfNotaModalOpen(false);
          }
        }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="w-5 h-5 text-primary" /> CPF na Nota?
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3">
            <img src={cpfImg} alt="CPF" className="w-36 rounded-lg shadow-md opacity-90" />
            <Input
              value={cpfNota}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 11);
                const formatted = v.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, d) =>
                  d ? `${a}.${b}.${c}-${d}` : c ? `${a}.${b}.${c}` : b ? `${a}.${b}` : a
                );
                setCpfNota(formatted);
              }}
              placeholder="000.000.000-00"
              className="text-center text-lg tracking-wider font-mono"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (cpfNota.replace(/\D/g, '').length === 11) {
                    setCpfNotaModalOpen(false);
                  } else if (cpfNota.length === 0) {
                    // ENTER sem digitar nada = sem CPF
                    setCpfNota('');
                    setCpfNotaModalOpen(false);
                  }
                }
              }}
            />
            <p className="text-[10px] text-muted-foreground text-center">
              Digite o CPF e pressione <span className="font-bold">ENTER</span> para confirmar, ou <span className="font-bold">ESC</span> para pular sem CPF
            </p>
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setCpfNota(''); setCpfNotaModalOpen(false); }}
              >
                ESC - Sem CPF
              </Button>
              <Button
                className="flex-1 gap-1"
                disabled={cpfNota.replace(/\D/g, '').length !== 11}
                onClick={() => setCpfNotaModalOpen(false)}
              >
                <Check className="w-4 h-4" /> ENTER - OK
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* HISTORICO VENDAS MODAL */}
      <Dialog open={historicoOpen} onOpenChange={setHistoricoOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" /> Historico de Vendas
            </DialogTitle>
          </DialogHeader>

          {historicoDetalhe ? (
            <div className="flex-1 overflow-auto space-y-3">
              <button
                onClick={() => setHistoricoDetalhe(null)}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar
              </button>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Venda</p>
                  <p className="font-bold text-primary">#{String(historicoDetalhe.numero_venda).padStart(5, '0')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Data</p>
                  <p className="font-medium">{formatDateTime(historicoDetalhe.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Cliente</p>
                  <p className="font-medium">{historicoDetalhe.clientes?.nome || 'Consumidor'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Pagamento</p>
                  <p className="font-medium capitalize">{historicoDetalhe.metodo_pagamento}</p>
                </div>
              </div>

              <div className="border-t border-border pt-2">
                <p className="text-xs font-semibold text-muted-foreground mb-2">ITENS</p>
                <div className="space-y-1 max-h-48 overflow-auto">
                  {historicoItens.map(item => (
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
              </div>

              <div className="border-t border-border pt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatBRL(Number(historicoDetalhe.subtotal))}</span>
                </div>
                {Number(historicoDetalhe.desconto_total) > 0 && (
                  <div className="flex justify-between text-sm text-destructive">
                    <span>Desconto</span>
                    <span>- {formatBRL(Number(historicoDetalhe.desconto_total))}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span className="text-primary">{formatBRL(Number(historicoDetalhe.total))}</span>
                </div>
                {Number(historicoDetalhe.troco) > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Troco</span>
                    <span>{formatBRL(Number(historicoDetalhe.troco))}</span>
                  </div>
                )}
              </div>

              <Button className="w-full gap-2" onClick={() => reimprimirCupomHistorico(historicoDetalhe)}>
                <Printer className="w-4 h-4" /> Imprimir Cupom
              </Button>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              {historicoLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : historicoVendas.length === 0 ? (
                <p className="text-center text-muted-foreground py-12 text-sm">Nenhuma venda encontrada</p>
              ) : (
                <div className="space-y-1">
                  {historicoVendas.map(v => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between p-2.5 rounded-lg hover:bg-accent/50 transition-colors border border-transparent hover:border-border"
                    >
                      <button onClick={() => verDetalheHistorico(v)} className="flex-1 text-left">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-primary text-sm">
                            #{String(v.numero_venda).padStart(5, '0')}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{v.clientes?.nome || 'Consumidor'}</p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {formatDateTime(v.created_at)}
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 capitalize">{v.metodo_pagamento}</Badge>
                            </div>
                          </div>
                          <span className="font-bold text-sm">{formatBRL(Number(v.total))}</span>
                        </div>
                      </button>
                      <button
                        onClick={() => reimprimirCupomHistorico(v)}
                        className="ml-2 p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-primary transition-colors"
                        title="Imprimir cupom"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* FINALIZAR MODAL */}
      <Dialog open={finalizarModalOpen} onOpenChange={setFinalizarModalOpen}>
        <DialogContent className="sm:max-w-sm" onKeyDown={(e) => {
          // Keyboard navigation inside finalize modal
          if (e.key === 'Enter' && !finalizando) {
            e.preventDefault();
            finalizarVenda();
          } else if (e.key === '1') { setMetodoPagamento('dinheiro'); }
          else if (e.key === '2') { setMetodoPagamento('debito'); }
          else if (e.key === '3') { setMetodoPagamento('credito'); }
          else if (e.key === '4') { setMetodoPagamento('pix'); }
        }}>
          <DialogHeader><DialogTitle>Finalizar Venda</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-3 border border-border">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Itens:</span><span>{itens.length}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal:</span><span>{formatBRL(subtotal)}</span></div>
              {descontoTotal > 0 && <div className="flex justify-between text-sm"><span className="text-destructive">Desconto:</span><span className="text-destructive">-{formatBRL(descontoTotal)}</span></div>}
              <div className="flex justify-between text-lg font-bold mt-1 pt-1 border-t border-border"><span>Total:</span><span className="text-primary">{formatBRL(total)}</span></div>
            </div>

            {/* Payment method selector with number keys */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-semibold">FORMA DE PAGAMENTO (pressione 1-4):</p>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { key: '1', value: 'dinheiro', label: 'Dinheiro', icon: Banknote },
                  { key: '2', value: 'debito', label: 'Débito', icon: CreditCard },
                  { key: '3', value: 'credito', label: 'Crédito', icon: CreditCard },
                  { key: '4', value: 'pix', label: 'PIX', icon: Smartphone },
                ].map(m => (
                  <button
                    key={m.value}
                    onClick={() => setMetodoPagamento(m.value)}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      metodoPagamento === m.value
                        ? 'border-primary bg-accent text-primary ring-2 ring-primary/30'
                        : 'border-border text-muted-foreground hover:bg-accent/50'
                    }`}
                  >
                    <span className="text-[9px] font-bold text-primary block">[{m.key}]</span>
                    <m.icon className="w-4 h-4 mx-auto mb-0.5" />
                    <span className="text-[9px] font-medium block">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {metodoPagamento === 'dinheiro' && (
              <div className="space-y-2 bg-muted/30 rounded-lg p-2.5 border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">RECEBIDO (R$)</span>
                  <Input
                    value={valorPago}
                    onChange={e => setValorPago(e.target.value)}
                    placeholder={total.toFixed(2)}
                    className="w-28 h-9 text-right bg-background border-border text-foreground text-base font-bold"
                    type="number"
                    step="0.01"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter' && !finalizando) { e.preventDefault(); e.stopPropagation(); finalizarVenda(); } }}
                  />
                </div>
                {troco > 0 && (
                  <div className="flex items-center justify-between bg-green-500/15 rounded-md px-2 py-1.5 border border-green-500/30">
                    <span className="text-sm text-green-400 font-bold">TROCO</span>
                    <span className="text-xl text-green-400 font-extrabold">R$ {troco.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
              </div>
            )}

            {cliente && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Cliente:</span><span>{cliente.nome}</span></div>}
            {cpfNota && <div className="flex justify-between text-sm"><span className="text-muted-foreground">CPF na Nota:</span><span className="font-mono">{cpfNota}</span></div>}

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 text-center">
              <p className="text-xs text-blue-300">Pressione <span className="font-bold text-white">ENTER</span> para confirmar a venda</p>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setFinalizarModalOpen(false)}>ESC - Voltar</Button>
            <Button className="flex-1 gap-1 bg-green-600 hover:bg-green-700 text-white" onClick={finalizarVenda} disabled={finalizando}>
              <Check className="w-4 h-4" /> {finalizando ? 'PROCESSANDO...' : 'ENTER - CONFIRMAR'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* F1 HELP OVERLAY */}
      {helpOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setHelpOpen(false)}
          onKeyDown={() => setHelpOpen(false)}
        >
          <div className="bg-card border-2 border-primary rounded-2xl shadow-2xl p-6 max-w-2xl w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-5">
              <h2 className="text-2xl font-extrabold text-primary">GUIA RÁPIDO DO PDV</h2>
              <p className="text-sm text-muted-foreground mt-1">Use as teclas abaixo para operar o caixa. Pressione qualquer tecla para fechar.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'F1', desc: 'Abrir/Fechar esta ajuda', color: 'bg-blue-500/20 border-blue-500/40 text-blue-300' },
                { key: 'F2', desc: 'Identificar cliente', color: 'bg-purple-500/20 border-purple-500/40 text-purple-300' },
                { key: 'F3', desc: 'Alterar quantidade do último item', color: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300' },
                { key: 'F4', desc: 'Dar desconto no último item', color: 'bg-orange-500/20 border-orange-500/40 text-orange-300' },
                { key: 'F5', desc: 'Colocar CPF na nota', color: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' },
                { key: 'F6', desc: 'Editar último produto (nome, preço, qtd)', color: 'bg-teal-500/20 border-teal-500/40 text-teal-300' },
                { key: 'F7', desc: 'Trocar forma de pagamento', color: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' },
                { key: 'F8', desc: 'FINALIZAR / PAGAR a venda', color: 'bg-green-500/20 border-green-500/40 text-green-300' },
                { key: 'F9', desc: 'Ver histórico de vendas', color: 'bg-gray-500/20 border-gray-500/40 text-gray-300' },
                { key: 'F10', desc: 'Fechar o caixa', color: 'bg-red-500/20 border-red-500/40 text-red-300' },
                { key: 'DEL', desc: 'Remover último item da lista', color: 'bg-red-500/20 border-red-500/40 text-red-300' },
                { key: 'ESC', desc: 'Cancelar venda inteira', color: 'bg-red-500/20 border-red-500/40 text-red-300' },
              ].map(s => (
                <div key={s.key} className={`flex items-center gap-3 p-3 rounded-lg border ${s.color}`}>
                  <span className="font-mono font-extrabold text-lg min-w-[50px] text-center">{s.key}</span>
                  <span className="text-sm font-medium text-foreground">{s.desc}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-sm font-bold text-foreground mb-2">📋 PASSO A PASSO DA VENDA:</p>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                <p><span className="text-primary font-bold">1.</span> Escaneie ou digite o nome do produto na barra de cima</p>
                <p><span className="text-primary font-bold">2.</span> Se precisar, use <span className="font-bold text-foreground">F3</span> para mudar quantidade ou <span className="font-bold text-foreground">F4</span> para desconto</p>
                <p><span className="text-primary font-bold">3.</span> Pergunte o CPF e pressione <span className="font-bold text-foreground">F5</span></p>
                <p><span className="text-primary font-bold">4.</span> Use <span className="font-bold text-foreground">F7</span> para escolher: Dinheiro, Débito, Crédito ou PIX</p>
                <p><span className="text-primary font-bold">5.</span> Pressione <span className="font-bold text-foreground">F8</span> para finalizar e <span className="font-bold text-foreground">ENTER</span> para confirmar</p>
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-4">Pressione <span className="font-bold text-foreground">F1</span> ou clique fora para fechar</p>
          </div>
        </div>
      )}

    </div>
  );
};

// Simple barcode icon component
const BarCodeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 5v14" /><path d="M8 5v14" /><path d="M12 5v14" /><path d="M17 5v14" /><path d="M21 5v14" />
  </svg>
);

export default PDV;
