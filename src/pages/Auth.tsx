import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DramatonLogo } from '@/components/DramatonLogo';
import { CyberInput } from '@/components/CyberInput';
import { Gear, Rivet, ArtDecoDivider, IndustrialPanel, VacuumTube } from '@/components/DieselpunkDecorations';
import { LogIn, UserPlus, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate input
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setError('Invalid email or password');
          } else {
            setError(error.message);
          }
        } else {
          toast.success('Welcome back!');
          navigate('/');
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes('User already registered')) {
            setError('This email is already registered. Try logging in instead.');
          } else {
            setError(error.message);
          }
        } else {
          toast.success('Account created! You are now logged in.');
          navigate('/');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-diesel-black">
        <Loader2 className="w-8 h-8 text-diesel-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-diesel-black overflow-hidden relative">
      {/* Background decorations */}
      <Gear 
        size={300} 
        teeth={16} 
        className="absolute -top-20 -left-20 text-diesel-border opacity-20 animate-[spin_60s_linear_infinite]" 
      />
      <Gear 
        size={250} 
        teeth={14} 
        className="absolute -bottom-20 -right-20 text-diesel-border opacity-20 animate-[spin_50s_linear_infinite]" 
      />
      
      {/* Vacuum tubes */}
      <div className="absolute left-8 top-1/4">
        <VacuumTube size={50} glowColor="orange" pulseSpeed={2.5} />
      </div>
      <div className="absolute right-8 top-1/4">
        <VacuumTube size={50} glowColor="green" pulseSpeed={2} />
      </div>
      
      {/* Corner rivets */}
      <div className="absolute top-4 left-4 flex gap-8">
        <Rivet size={16} />
        <Rivet size={16} />
      </div>
      <div className="absolute top-4 right-4 flex gap-8">
        <Rivet size={16} />
        <Rivet size={16} />
      </div>
      
      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 opacity-10"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.4) 2px, rgba(0,0,0,0.4) 4px)',
        }}
      />
      
      {/* Main content */}
      <div className="relative z-20 flex flex-col items-center">
        {/* Logo */}
        <div className="relative">
          <div className="absolute inset-0 blur-xl bg-diesel-rust/30 rounded-full" />
          <DramatonLogo className="relative w-12 h-12 text-diesel-rust mb-1 animate-pulse drop-shadow-[0_0_30px_hsl(15,70%,45%,0.5)]" />
        </div>
        
        <ArtDecoDivider width={200} className="text-diesel-gold mb-1" />
        
        <h1 className="text-xl font-bold text-diesel-rust tracking-widest mb-4">
          DRAMATON
        </h1>
        
        <IndustrialPanel className="w-[340px] max-w-[90vw]" glowing>
          <h2 className="text-center text-diesel-gold text-sm font-bold uppercase tracking-widest mb-4">
            {mode === 'login' ? 'Authentication' : 'Create Account'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-3">
            <CyberInput
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="architect@dramaton.io"
              disabled={isSubmitting}
            />
            
            <CyberInput
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isSubmitting}
            />
            
            {error && (
              <div className="p-2 bg-diesel-rust/20 border border-diesel-rust text-diesel-rust text-xs text-center">
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold text-sm font-bold uppercase hover:bg-diesel-gold/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : mode === 'login' ? (
                <LogIn size={16} />
              ) : (
                <UserPlus size={16} />
              )}
              {isSubmitting ? 'Processing...' : mode === 'login' ? 'Log In' : 'Create Account'}
            </button>
          </form>
          
          <div className="mt-4 pt-3 border-t border-diesel-border">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError('');
              }}
              className="w-full text-center text-diesel-steel text-xs hover:text-diesel-paper transition-colors"
            >
              {mode === 'login' 
                ? "Don't have an account? Create one" 
                : 'Already have an account? Log in'}
            </button>
          </div>
        </IndustrialPanel>
        
        <button
          onClick={() => navigate('/')}
          className="mt-4 flex items-center gap-1 text-diesel-steel text-xs hover:text-diesel-paper transition-colors"
        >
          <ArrowLeft size={12} />
          Back to Editor
        </button>
      </div>
    </div>
  );
}
