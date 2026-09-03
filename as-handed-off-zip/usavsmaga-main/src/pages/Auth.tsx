import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DramatonLogo } from '@/components/DramatonLogo';
import { CyberInput } from '@/components/CyberInput';
import { Gear, Rivet, ArtDecoDivider, IndustrialPanel, VacuumTube } from '@/components/DieselpunkDecorations';
import { LogIn, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string()
    .min(2, 'Username must be at least 2 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_\-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading, signIn, signUp } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
    const validation = loginSchema.safeParse({ username, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);

    try {
      // First try to look up existing user by username
      const { data: email } = await supabase
        .rpc('get_email_by_username', { lookup_username: username.trim() });
      
      if (email) {
        // Existing user - sign in with their stored email
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setError('Invalid password for this username');
          } else {
            setError(error.message);
          }
        } else {
          toast.success('Welcome back!');
          navigate('/');
        }
      } else {
        // New username - create account with synthetic email
        const syntheticEmail = `${username.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}@dramaton.local`;
        
        // Try to sign up
        const { error: signUpError } = await signUp(syntheticEmail, password);
        if (signUpError) {
          if (signUpError.message.includes('User already registered')) {
            // Email exists but username doesn't match - try signing in
            const { error: signInError } = await signIn(syntheticEmail, password);
            if (signInError) {
              setError('Invalid password');
            } else {
              // Update profile with the new username
              const { data: { user: currentUser } } = await supabase.auth.getUser();
              if (currentUser) {
                await supabase
                  .from('profiles')
                  .upsert({ 
                    user_id: currentUser.id, 
                    username: username.trim(),
                    email: syntheticEmail 
                  }, { onConflict: 'user_id' });
              }
              toast.success(`Welcome, ${username.trim()}!`);
              navigate('/');
            }
          } else {
            setError(signUpError.message);
          }
        } else {
          // New account created - add profile
          const { data: { user: newUser } } = await supabase.auth.getUser();
          if (newUser) {
            await supabase
              .from('profiles')
              .insert({ 
                user_id: newUser.id, 
                username: username.trim(),
                email: syntheticEmail 
              });
          }
          toast.success(`Welcome, ${username.trim()}! Account created.`);
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
            Sign In
          </h2>
          
          <p className="text-center text-diesel-steel text-xs mb-4">
            Enter a username and password. New usernames create an account automatically.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-3">
            <CyberInput
              label="Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              disabled={isSubmitting}
            />
            
            <div className="relative">
              <CyberInput
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-7 text-diesel-steel hover:text-diesel-gold transition-colors p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            
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
              ) : (
                <LogIn size={16} />
              )}
              {isSubmitting ? 'Processing...' : 'Sign In'}
            </button>
          </form>
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
