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
    <div className="min-h-screen flex items-center justify-center gradient-login animate-gradient relative overflow-hidden">
      {/* Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-10"
            style={{
              width: `${60 + i * 40}px`,
              height: `${60 + i * 40}px`,
              background: 'hsl(217 91% 60%)',
              top: `${15 + i * 15}%`,
              left: `${10 + i * 14}%`,
              animation: `fadeIn ${2 + i * 0.5}s ease-out infinite alternate`,
            }}
          />
        ))}
      </div>

      <div className="glass-card rounded-2xl p-8 w-full max-w-md mx-4 animate-fade-up shadow-glass relative z-10">
        <div className="text-center mb-8">
          <div className="w-20 h-14 rounded-xl gradient-accent flex items-center justify-center mx-auto mb-4 p-2">
            <img src="/logo.svg" alt="Oliver Soft Tech" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Oliver Soft Tech</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLogin ? 'Acesse sua conta' : 'Crie sua conta'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-1.5 animate-slide-up">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome Completo</Label>
              <Input
                value={form.nome}
                onChange={e => setForm({ ...form, nome: e.target.value })}
                placeholder="Seu nome"
                required={!isLogin}
                className="h-11 input-glow"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">E-mail</Label>
            <Input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="seu@email.com"
              required
              className="h-11 input-glow"
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
                className="h-11 pr-10 input-glow"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full h-11 gradient-accent text-primary-foreground font-semibold" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isLogin ? 'Entrar' : 'Criar Conta'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
