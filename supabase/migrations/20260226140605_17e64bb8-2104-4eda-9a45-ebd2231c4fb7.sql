
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'funcionario');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  telefone TEXT DEFAULT '',
  cargo TEXT DEFAULT 'funcionario',
  pin TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'funcionario',
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Clients table
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_interno TEXT NOT NULL DEFAULT '',
  nome TEXT NOT NULL,
  cpf TEXT DEFAULT '',
  telefone TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ativo',
  limite_credito DECIMAL(10,2) DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view clients" ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert clients" ON public.clientes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update clients" ON public.clientes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete clients" ON public.clientes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Fiados table
CREATE TABLE public.fiados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL DEFAULT '',
  valor_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  valor_pago DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fiados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view fiados" ON public.fiados FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert fiados" ON public.fiados FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update fiados" ON public.fiados FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete fiados" ON public.fiados FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Fiado items
CREATE TABLE public.fiado_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiado_id UUID NOT NULL REFERENCES public.fiados(id) ON DELETE CASCADE,
  produto TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  valor_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
  valor_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fiado_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view fiado items" ON public.fiado_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert fiado items" ON public.fiado_itens FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update fiado items" ON public.fiado_itens FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete fiado items" ON public.fiado_itens FOR DELETE TO authenticated USING (true);

-- Payments table
CREATE TABLE public.pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiado_id UUID NOT NULL REFERENCES public.fiados(id) ON DELETE CASCADE,
  valor DECIMAL(10,2) NOT NULL,
  metodo TEXT NOT NULL DEFAULT 'dinheiro',
  observacao TEXT DEFAULT '',
  registrado_por UUID REFERENCES auth.users(id),
  estornado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view payments" ON public.pagamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert payments" ON public.pagamentos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update payments" ON public.pagamentos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete payments" ON public.pagamentos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Billing history (cobranças WhatsApp)
CREATE TABLE public.cobrancas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  fiado_id UUID REFERENCES public.fiados(id) ON DELETE SET NULL,
  valor_cobrado DECIMAL(10,2) NOT NULL,
  enviado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cobrancas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view cobrancas" ON public.cobrancas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert cobrancas" ON public.cobrancas FOR INSERT TO authenticated WITH CHECK (true);

-- Subscription table
CREATE TABLE public.assinatura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_plano TEXT NOT NULL DEFAULT 'Plano Mensal',
  valor DECIMAL(10,2) NOT NULL DEFAULT 200,
  status TEXT NOT NULL DEFAULT 'ativa',
  inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  vencimento TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  pix_chave TEXT DEFAULT '09915712154',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assinatura ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view subscription" ON public.assinatura FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert subscription" ON public.assinatura FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update subscription" ON public.assinatura FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Subscription payments
CREATE TABLE public.assinatura_pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assinatura_id UUID NOT NULL REFERENCES public.assinatura(id) ON DELETE CASCADE,
  valor DECIMAL(10,2) NOT NULL,
  metodo TEXT NOT NULL DEFAULT 'pix',
  status TEXT NOT NULL DEFAULT 'confirmado',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assinatura_pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view sub payments" ON public.assinatura_pagamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert sub payments" ON public.assinatura_pagamentos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email), NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fiados_updated_at BEFORE UPDATE ON public.fiados FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assinatura_updated_at BEFORE UPDATE ON public.assinatura FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
