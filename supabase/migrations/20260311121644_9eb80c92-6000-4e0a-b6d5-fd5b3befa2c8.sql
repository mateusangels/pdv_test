
-- Create produtos table
CREATE TABLE public.produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_barras text NOT NULL DEFAULT '',
  codigo_interno text DEFAULT '',
  descricao text NOT NULL,
  preco_custo numeric NOT NULL DEFAULT 0,
  preco_venda numeric NOT NULL DEFAULT 0,
  preco_atacado numeric DEFAULT 0,
  qtd_minima_atacado integer DEFAULT 0,
  unidade text NOT NULL DEFAULT 'UN',
  ativo boolean NOT NULL DEFAULT true,
  categoria text DEFAULT '',
  marca text DEFAULT '',
  estoque_minimo integer DEFAULT 0,
  estoque_atual numeric DEFAULT 0,
  movimenta_estoque boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create vendas table for PDV
CREATE TABLE public.vendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_venda serial,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  operador_id uuid,
  subtotal numeric NOT NULL DEFAULT 0,
  desconto_total numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  valor_pago numeric NOT NULL DEFAULT 0,
  troco numeric NOT NULL DEFAULT 0,
  metodo_pagamento text NOT NULL DEFAULT 'dinheiro',
  status text NOT NULL DEFAULT 'finalizada',
  tipo text NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create venda_itens table
CREATE TABLE public.venda_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id uuid NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  produto_id uuid REFERENCES public.produtos(id),
  codigo_barras text DEFAULT '',
  descricao text NOT NULL,
  quantidade numeric NOT NULL DEFAULT 1,
  unidade text NOT NULL DEFAULT 'UN',
  valor_unitario numeric NOT NULL DEFAULT 0,
  desconto numeric NOT NULL DEFAULT 0,
  valor_total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venda_itens ENABLE ROW LEVEL SECURITY;

-- RLS policies for produtos
CREATE POLICY "Authenticated can view products" ON public.produtos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert products" ON public.produtos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update products" ON public.produtos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete products" ON public.produtos FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for vendas
CREATE POLICY "Authenticated can view vendas" ON public.vendas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert vendas" ON public.vendas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update vendas" ON public.vendas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete vendas" ON public.vendas FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for venda_itens
CREATE POLICY "Authenticated can view venda_itens" ON public.venda_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert venda_itens" ON public.venda_itens FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update venda_itens" ON public.venda_itens FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete venda_itens" ON public.venda_itens FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at on produtos
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
