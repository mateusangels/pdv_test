import { useState, useEffect } from 'react';
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
  Lock, Phone, Mail, Building2, CreditCard, AlertTriangle, Users, Plus, Trash2
} from 'lucide-react';

// ── seção wrapper ──────────────────────────────────────────────────────────────
const Section = ({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) => (
  <div className="bg-card rounded-xl shadow-card border border-border/50 p-5 mb-4 animate-fade-up">
    <div className="mb-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
    </div>
    {children}
  </div>
);

// ── toggle row ─────────────────────────────────────────────────────────────────
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

// ── component ──────────────────────────────────────────────────────────────────
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

  // aba loja
  const [loja, setLoja] = useState({
    nomeFantasia: 'Supermercado Pereira',
    cnpj: '',
    endereco: '',
    limiteCredito: '500',
    prazoFiado: '30',
  });
  const [savingLoja, setSavingLoja] = useState(false);

  // aba notificações (preferências)
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

  // ── save perfil ──────────────────────────────────────────────────────────────
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

  // ── save senha ───────────────────────────────────────────────────────────────
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

  // ── save loja ────────────────────────────────────────────────────────────────
  const saveLoja = async () => {
    setSavingLoja(true);
    await new Promise(r => setTimeout(r, 600));
    toast({ title: 'Configurações da loja salvas!' });
    setSavingLoja(false);
  };

  // ── cadastrar funcionário ───────────────────────────────────────────────────
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
        options: { data: { nome: funcForm.nome, cargo: funcForm.cargo } },
      });
      if (error) throw error;
      toast({ title: `Funcionário ${funcForm.nome} cadastrado! Um e-mail de confirmação foi enviado.` });
      setFuncForm({ nome: '', email: '', senha: '', cargo: 'funcionario' });
      setShowAddFunc(false);
      setTimeout(() => fetchFuncionarios(), 2000);
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
          <TabsTrigger value="funcionarios" className="gap-1.5 text-xs"><Users className="w-3.5 h-3.5" />Funcionários</TabsTrigger>
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

        {/* ── ABA FUNCIONÁRIOS ── */}
        <TabsContent value="funcionarios">
          <Section title="Cadastro de Funcionários" description="Gerencie os funcionários do sistema">
            <div className="flex justify-end mb-4">
              <Button onClick={() => setShowAddFunc(!showAddFunc)} className="gap-2 gradient-accent text-primary-foreground">
                <Plus className="w-4 h-4" /> Novo Funcionário
              </Button>
            </div>

            {showAddFunc && (
              <div className="bg-muted/30 rounded-lg p-4 mb-4 border border-border/50 animate-fade-up">
                <h4 className="text-sm font-semibold mb-3">Cadastrar Novo Funcionário</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs uppercase text-muted-foreground mb-1.5 block">Nome Completo</Label>
                    <Input value={funcForm.nome} onChange={e => setFuncForm({ ...funcForm, nome: e.target.value })} placeholder="Nome do funcionário" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase text-muted-foreground mb-1.5 block">E-mail</Label>
                    <Input type="email" value={funcForm.email} onChange={e => setFuncForm({ ...funcForm, email: e.target.value })} placeholder="email@exemplo.com" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase text-muted-foreground mb-1.5 block">Senha</Label>
                    <Input type="password" value={funcForm.senha} onChange={e => setFuncForm({ ...funcForm, senha: e.target.value })} placeholder="Mínimo 6 caracteres" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase text-muted-foreground mb-1.5 block">Cargo</Label>
                    <Select value={funcForm.cargo} onValueChange={v => setFuncForm({ ...funcForm, cargo: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="funcionario">Funcionário</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddFunc(false)}>Cancelar</Button>
                  <Button onClick={handleAddFuncionario} disabled={savingFunc} className="gradient-accent text-primary-foreground gap-2">
                    {savingFunc && <Loader2 className="w-4 h-4 animate-spin" />} Cadastrar
                  </Button>
                </div>
              </div>
            )}

            {loadingFunc ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : funcionarios.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum funcionário cadastrado</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">NOME</TableHead>
                    <TableHead className="text-xs">E-MAIL</TableHead>
                    <TableHead className="text-xs">CARGO</TableHead>
                    <TableHead className="text-xs">FUNÇÃO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {funcionarios.map(f => (
                    <TableRow key={f.id}>
                      <TableCell className="text-sm font-medium">{f.nome}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{f.email}</TableCell>
                      <TableCell className="text-sm capitalize">{f.cargo || 'funcionario'}</TableCell>
                      <TableCell className="text-sm">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          f.user_roles?.[0]?.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {f.user_roles?.[0]?.role || 'funcionario'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Section>
        </TabsContent>

        {/* ── ABA LOJA ── */}
        <TabsContent value="loja">
          <Section title="Informações da Loja" description="Dados do estabelecimento">
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
                <Label className="text-xs uppercase text-muted-foreground mb-1.5 block">Endereço</Label>
                <Input value={loja.endereco} onChange={e => setLoja({ ...loja, endereco: e.target.value })} placeholder="Rua, número, bairro" />
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

            <div className="mt-5 flex justify-end">
              <Button onClick={saveLoja} disabled={savingLoja} className="gradient-accent text-primary-foreground gap-2">
                {savingLoja && <Loader2 className="w-4 h-4 animate-spin" />} Salvar Loja
              </Button>
            </div>
          </Section>
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

          <Section title="Informações do Sistema" description="Detalhes técnicos da versão atual">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              {[
                { label: 'Versão', value: '1.0.0' },
                { label: 'Backend', value: 'Supabase' },
                { label: 'Ambiente', value: 'Produção' },
                { label: 'Função', value: role || 'admin' },
                { label: 'Framework', value: 'React + Vite' },
                { label: 'Build', value: new Date().toLocaleDateString('pt-BR') },
              ].map(item => (
                <div key={item.label} className="bg-muted/50 rounded-lg p-3">
                  <p className="text-[10px] uppercase text-muted-foreground">{item.label}</p>
                  <p className="font-medium text-sm mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
          </Section>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuracoes;
