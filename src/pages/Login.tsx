import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ nome: '', email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(form.email, form.password);
        toast({ title: 'Bem-vindo!', description: 'Login realizado com sucesso.' });
      } else {
        await signUp(form.email, form.password, form.nome);
        toast({ title: 'Conta criada!', description: 'Sua conta foi criada com sucesso.' });
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#0f1729' }}>
      {/* LADO ESQUERDO - Branding */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center relative overflow-hidden px-12">
        {/* Gradiente decorativo */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 30% 50%, rgba(59,130,246,0.15) 0%, transparent 60%)' }} />

        {/* Logo grande */}
        <div className="relative z-10 mb-8">
          <img src="/logo_branca.png" alt="NEXOR" className="w-[700px] object-contain" />
        </div>

        <h2 className="relative z-10 text-3xl font-bold text-white text-center">
          Olá, Bem-Vindo(a) de volta
        </h2>
        <p className="relative z-10 text-blue-300/60 text-sm mt-3 text-center max-w-sm">
          Sistema de gestão e ponto de venda inteligente
        </p>
      </div>

      {/* LADO DIREITO - Formulário */}
      <div className="w-full lg:w-[420px] min-h-screen flex flex-col justify-center bg-card px-8 py-12 lg:rounded-l-3xl shadow-2xl">
        {/* Logo mobile */}
        <div className="lg:hidden flex justify-center mb-8">
          <img src="/logo_preta.png" alt="NEXOR" className="w-40 object-contain" />
        </div>

        <div className="mb-8">
          <h1 className="text-xl font-bold text-foreground">
            {isLogin ? 'Gerenciamento NEXOR' : 'Criar Conta'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div className="space-y-1.5 animate-slide-up">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome do usuário</Label>
              <Input
                value={form.nome}
                onChange={e => setForm({ ...form, nome: e.target.value })}
                placeholder="Seu nome"
                required={!isLogin}
                className="h-11"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome do usuário</Label>
            <Input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="seu@email.com"
              required
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Senha</Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                required
                minLength={6}
                className="h-11 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {isLogin && (
              <p className="text-xs text-muted-foreground text-right mt-1 cursor-pointer hover:text-foreground transition-colors">
                Esqueceu sua senha?
              </p>
            )}
          </div>
          <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
