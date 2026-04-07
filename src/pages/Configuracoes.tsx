import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Settings, User, Store, Bell, ShieldCheck, Loader2,
  Lock, Phone, Mail, Building2, CreditCard, AlertTriangle, Users, Plus, Trash2, Upload, Image
} from 'lucide-react';
import { getLojaConfig, saveLojaConfig, type LojaConfig } from '@/lib/lojaConfig';

const Section = ({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) => (
  <div className="bg-card rounded-xl shadow-card border border-border/50 p-5 mb-4 animate-fade-up">
    <div className="mb-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
    </div>
    {children}
  </div>
);

const Toggle = ({ label, description, checked, onChecked, id }: {
  label: string; description?: string; checked: boolean; onChecked: (v: boolean) => void; id: string;
}) => (
  <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
    <div>
      <p className="text-sm font-medium">{label}</p>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
    </div>
    <Switch id={id} checked={checked} onCheckedChange={onChecked} />
  </div>
);

const Configuracoes = () => {
  const { profile, role, refreshProfile } = useAuth();
  const { toast } = useToast();

  // aba perfil
  const [perfil, setPerfil] = useState({
    nome: profile?.nome || '',
    email: profile?.email || '',
    telefone: profile?.telefone || '',
    pin: '',
    pinConfirm: '',
  });
  const [showPin, setShowPin] = useState(false);
  const [savingPerfil, setSavingPerfil] = useState(false);

  // aba loja - carrega do localStorage
  const [loja, setLoja] = useState<LojaConfig>(() => getLojaConfig());
  const [savingLoja, setSavingLoja] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // aba notificações
  const [notifPrefs, setNotifPrefs] = useState({
    comprasRecentes: true,
    inadimplentes: true,
    pagamentosRecebidos: true,
    fiadosAtrasados: true,
    alertaLimite: true,
  });

  // aba segurança
  const [senha, setSenha] = useState({ atual: '', nova: '', confirmar: '' });
  const [savingSenha, setSavingSenha] = useState(false);

  // aba funcionários
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [loadingFunc, setLoadingFunc] = useState(false);
  const [showAddFunc, setShowAddFunc] = useState(false);
  const [funcForm, setFuncForm] = useState({ nome: '', email: '', senha: '', cargo: 'funcionario' });
  const [savingFunc, setSavingFunc] = useState(false);

  const fetchFuncionarios = async () => {
    setLoadingFunc(true);
    const { data } = await supabase.from('profiles').select('*, user_roles(role)');
    setFuncionarios(data || []);
    setLoadingFunc(false);
  };

  useEffect(() => { fetchFuncionarios(); }, []);

  const initials = perfil.nome
    ? perfil.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  // ── save perfil
  const savePerfil = async () => {
    setSavingPerfil(true);
    try {
      const updates: any = { nome: perfil.nome, email: perfil.email, telefone: perfil.telefone };
      if (perfil.pin) {
        if (perfil.pin !== perfil.pinConfirm) { toast({ title: 'PINs não conferem', variant: 'destructive' }); return; }
        if (perfil.pin.length < 4) { toast({ title: 'PIN mínimo de 4 dígitos', variant: 'destructive' }); return; }
        updates.pin = perfil.pin;
      }
      await supabase.from('profiles').update(updates).eq('user_id', profile?.user_id);
      await refreshProfile();
      toast({ title: 'Perfil atualizado com sucesso' });
      setPerfil(p => ({ ...p, pin: '', pinConfirm: '' }));
      setShowPin(false);
    } catch {
      toast({ title: 'Erro ao salvar perfil', variant: 'destructive' });
    } finally { setSavingPerfil(false); }
  };

  // ── save senha
  const saveSenha = async () => {
    if (senha.nova !== senha.confirmar) { toast({ title: 'Senhas não conferem', variant: 'destructive' }); return; }
    if (senha.nova.length < 6) { toast({ title: 'Mínimo 6 caracteres', variant: 'destructive' }); return; }
    setSavingSenha(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: senha.nova });
      if (error) throw error;
      toast({ title: 'Senha alterada com sucesso!' });
      setSenha({ atual: '', nova: '', confirmar: '' });
    } catch {
      toast({ title: 'Erro ao alterar senha', variant: 'destructive' });
    } finally { setSavingSenha(false); }
  };

  // ── save loja
  const saveLoja = async () => {
    setSavingLoja(true);
    saveLojaConfig(loja);
    await new Promise(r => setTimeout(r, 300));
    toast({ title: 'Configurações da loja salvas! Os cupons já usarão os novos dados.' });
    setSavingLoja(false);
  };

  // ── upload logo
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Imagem muito grande. Máximo 2MB.', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLoja(prev => ({ ...prev, logoUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLoja(prev => ({ ...prev, logoUrl: '' }));
  };

  // ── cadastrar funcionário (sem confirmação de email)
  const handleAddFuncionario = async () => {
    if (!funcForm.email || !funcForm.senha || !funcForm.nome) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    if (funcForm.senha.length < 6) {
      toast({ title: 'Senha mínima de 6 caracteres', variant: 'destructive' });
      return;
    }
    setSavingFunc(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: funcForm.email,
        password: funcForm.senha,
        options: {
          data: { nome: funcForm.nome, cargo: funcForm.cargo },
        },
      });
      if (error) throw error;
      toast({ title: `Funcionário ${funcForm.nome} cadastrado com sucesso!` });
      setFuncForm({ nome: '', email: '', senha: '', cargo: 'funcionario' });
      setShowAddFunc(false);
      setTimeout(() => fetchFuncionarios(), 1500);
    } catch (err: any) {
      toast({ title: err.message || 'Erro ao cadastrar', variant: 'destructive' });
    } finally { setSavingFunc(false); }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="Configurações" description="Gerencie as preferências do sistema" />

      <Tabs defaultValue="perfil" className="w-full">
        <TabsList className="mb-5 h-10 w-full justify-start gap-1 bg-muted/50 p-1 rounded-lg flex-wrap">
          <TabsTrigger value="perfil" className="gap-1.5 text-xs"><User className="w-3.5 h-3.5" />Perfil</TabsTrigger>
<TabsTrigger value="loja" className="gap-1.5 text-xs"><Store className="w-3.5 h-3.5" />Loja</TabsTrigger>
          <TabsTrigger value="notificacoes" className="gap-1.5 text-xs"><Bell className="w-3.5 h-3.5" />Notificações</TabsTrigger>
          <TabsTrigger value="seguranca" className="gap-1.5 text-xs"><ShieldCheck className="w-3.5 h-3.5" />Segurança</TabsTrigger>
        </TabsList>

        {/* ── ABA PERFIL ── */}
        <TabsContent value="perfil">
          <Section title="Informações Pessoais" description="Dados do seu perfil de usuário">
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{profile?.nome || 'Usuário'}</p>
                <p className="text-xs text-muted-foreground capitalize">{role || 'admin'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase text-muted-foreground flex items-center gap-1 mb-1.5">
                  <User className="w-3 h-3" /> Nome Completo
                </Label>
                <Input value={perfil.nome} onChange={e => setPerfil({ ...perfil, nome: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground flex items-center gap-1 mb-1.5">
                  <Mail className="w-3 h-3" /> E-mail
                </Label>
                <Input type="email" value={perfil.email} onChange={e => setPerfil({ ...perfil, email: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground flex items-center gap-1 mb-1.5">
                  <Phone className="w-3 h-3" /> Telefone
                </Label>
                <Input value={perfil.telefone} onChange={e => setPerfil({ ...perfil, telefone: e.target.value })} />
              </div>
            </div>

            <div className="border-t border-border mt-5 pt-4">
              <button
                onClick={() => setShowPin(!showPin)}
                className="text-sm text-primary font-medium hover:underline flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                {showPin ? 'Ocultar PIN' : 'Alterar PIN de Segurança'}
              </button>
              {showPin && (
                <div className="grid grid-cols-2 gap-3 mt-3 animate-slide-up">
                  <div>
                    <Label className="text-xs uppercase text-muted-foreground mb-1.5 block">Novo PIN (4-6 dígitos)</Label>
                    <Input type="password" maxLength={6} value={perfil.pin} onChange={e => setPerfil({ ...perfil, pin: e.target.value })} placeholder="••••••" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase text-muted-foreground mb-1.5 block">Confirmar PIN</Label>
                    <Input type="password" maxLength={6} value={perfil.pinConfirm} onChange={e => setPerfil({ ...perfil, pinConfirm: e.target.value })} placeholder="••••••" />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <Button onClick={savePerfil} disabled={savingPerfil} className="gradient-accent text-primary-foreground gap-2">
                {savingPerfil && <Loader2 className="w-4 h-4 animate-spin" />} Salvar Perfil
              </Button>
            </div>
          </Section>
        </TabsContent>

        {/* ── ABA LOJA ── */}
        <TabsContent value="loja">
          <Section title="Informações da Loja" description="Esses dados aparecerão nos cupons e no sistema">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label className="text-xs uppercase text-muted-foreground flex items-center gap-1 mb-1.5">
                  <Building2 className="w-3 h-3" /> Nome Fantasia
                </Label>
                <Input value={loja.nomeFantasia} onChange={e => setLoja({ ...loja, nomeFantasia: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground mb-1.5 block">CNPJ</Label>
                <Input value={loja.cnpj} onChange={e => setLoja({ ...loja, cnpj: e.target.value })} placeholder="00.000.000/0001-00" />
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground mb-1.5 block">Inscrição Estadual</Label>
                <Input value={loja.ie} onChange={e => setLoja({ ...loja, ie: e.target.value })} placeholder="Isento" />
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground mb-1.5 block">Endereço</Label>
                <Input value={loja.endereco} onChange={e => setLoja({ ...loja, endereco: e.target.value })} placeholder="Rua, número, bairro" />
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground mb-1.5 block">Cidade / UF</Label>
                <Input value={loja.cidade} onChange={e => setLoja({ ...loja, cidade: e.target.value })} placeholder="Cidade - UF" />
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground flex items-center gap-1 mb-1.5">
                  <Phone className="w-3 h-3" /> Telefone
                </Label>
                <Input value={loja.telefone} onChange={e => setLoja({ ...loja, telefone: e.target.value })} placeholder="(00) 00000-0000" />
              </div>
            </div>
          </Section>

          <Section title="Logo / Imagem da Loja" description="Esta imagem será usada como fundo do PDV e marca d'água nos cupons">
            <div className="flex items-start gap-4">
              <div className="w-32 h-32 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden shrink-0">
                {loja.logoUrl ? (
                  <img src={loja.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <Image className="w-8 h-8 text-muted-foreground/40" />
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Envie a logo ou imagem da sua loja. Formatos aceitos: PNG, JPG. Tamanho máximo: 2MB.</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => logoInputRef.current?.click()}>
                    <Upload className="w-3.5 h-3.5" /> Enviar imagem
                  </Button>
                  {loja.logoUrl && (
                    <Button variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={removeLogo}>
                      <Trash2 className="w-3.5 h-3.5" /> Remover
                    </Button>
                  )}
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>
            </div>
          </Section>

          <Section title="Políticas de Fiado" description="Limites e prazos padrão para novos clientes">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase text-muted-foreground flex items-center gap-1 mb-1.5">
                  <CreditCard className="w-3 h-3" /> Limite de Crédito Padrão (R$)
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={loja.limiteCredito}
                  onChange={e => setLoja({ ...loja, limiteCredito: e.target.value })}
                />
                <p className="text-[11px] text-muted-foreground mt-1">Aplicado ao cadastrar novos clientes</p>
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground flex items-center gap-1 mb-1.5">
                  <AlertTriangle className="w-3 h-3" /> Prazo de Vencimento (dias)
                </Label>
                <Select value={loja.prazoFiado} onValueChange={v => setLoja({ ...loja, prazoFiado: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="45">45 dias</SelectItem>
                    <SelectItem value="60">60 dias</SelectItem>
                    <SelectItem value="90">90 dias</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">Após este prazo o fiado é marcado como atrasado</p>
              </div>
            </div>
          </Section>

          <div className="flex justify-end mb-4">
            <Button onClick={saveLoja} disabled={savingLoja} className="gradient-accent text-primary-foreground gap-2">
              {savingLoja && <Loader2 className="w-4 h-4 animate-spin" />} Salvar Configurações da Loja
            </Button>
          </div>
        </TabsContent>

        {/* ── ABA NOTIFICAÇÕES ── */}
        <TabsContent value="notificacoes">
          <Section title="Alertas do Sistema" description="Escolha quais notificações deseja receber no sino">
            <Toggle
              id="compras"
              label="Novas compras fiadas"
              description="Receber alerta quando um novo fiado for registrado (últimas 48h)"
              checked={notifPrefs.comprasRecentes}
              onChecked={v => setNotifPrefs({ ...notifPrefs, comprasRecentes: v })}
            />
            <Toggle
              id="inad"
              label="Clientes inadimplentes"
              description="Exibir clientes com status marcado como inadimplente"
              checked={notifPrefs.inadimplentes}
              onChecked={v => setNotifPrefs({ ...notifPrefs, inadimplentes: v })}
            />
            <Toggle
              id="pags"
              label="Pagamentos recebidos"
              description="Alertas de pagamentos confirmados nas últimas 24h"
              checked={notifPrefs.pagamentosRecebidos}
              onChecked={v => setNotifPrefs({ ...notifPrefs, pagamentosRecebidos: v })}
            />
            <Toggle
              id="atrasos"
              label="Fiados em atraso"
              description="Fiados pendentes há mais de 30 dias sem pagamento"
              checked={notifPrefs.fiadosAtrasados}
              onChecked={v => setNotifPrefs({ ...notifPrefs, fiadosAtrasados: v })}
            />
            <Toggle
              id="limite"
              label="Alerta de limite de crédito"
              description="Avisar quando o cliente atingir 80% do limite de crédito"
              checked={notifPrefs.alertaLimite}
              onChecked={v => setNotifPrefs({ ...notifPrefs, alertaLimite: v })}
            />
            <div className="mt-4 flex justify-end">
              <Button
                className="gradient-accent text-primary-foreground"
                onClick={() => toast({ title: 'Preferências de notificação salvas!' })}
              >
                Salvar Preferências
              </Button>
            </div>
          </Section>
        </TabsContent>

        {/* ── ABA SEGURANÇA ── */}
        <TabsContent value="seguranca">
          <Section title="Alterar Senha" description="Atualize a senha da sua conta">
            <div className="space-y-4 max-w-sm">
              <div>
                <Label className="text-xs uppercase text-muted-foreground mb-1.5 block">Senha Atual</Label>
                <Input
                  type="password"
                  value={senha.atual}
                  onChange={e => setSenha({ ...senha, atual: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground mb-1.5 block">Nova Senha</Label>
                <Input
                  type="password"
                  value={senha.nova}
                  onChange={e => setSenha({ ...senha, nova: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground mb-1.5 block">Confirmar Nova Senha</Label>
                <Input
                  type="password"
                  value={senha.confirmar}
                  onChange={e => setSenha({ ...senha, confirmar: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <Button
                onClick={saveSenha}
                disabled={savingSenha || !senha.nova || !senha.confirmar}
                className="gradient-accent text-primary-foreground gap-2"
              >
                {savingSenha && <Loader2 className="w-4 h-4 animate-spin" />}
                Alterar Senha
              </Button>
            </div>
          </Section>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuracoes;
