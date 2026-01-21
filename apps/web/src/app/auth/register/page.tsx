'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, Loader2, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error, clearError, isAuthenticated } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    const success = await register(email, password, name);
    if (success) {
      router.push('/dashboard');
    }
  };

  const passwordRequirements = [
    { met: password.length >= 8, text: 'At least 8 characters' },
    { met: /[A-Z]/.test(password), text: 'One uppercase letter' },
    { met: /[a-z]/.test(password), text: 'One lowercase letter' },
    { met: /[0-9]/.test(password), text: 'One number' },
  ];

  const allRequirementsMet = passwordRequirements.every((req) => req.met);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-beige-200 flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-ink-900 text-beige-100 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-ink-700 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-ink-800 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl font-display font-medium tracking-tight">Wyndo</h1>
            <p className="text-beige-400 mt-2 text-lg">Job Management</p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative z-10 space-y-8"
        >
          <div>
            <h2 className="text-3xl font-display font-medium leading-tight">
              Start your free trial.<br />
              No card required.
            </h2>
            <p className="text-beige-400 mt-4 text-lg max-w-md">
              Get full access to all features for 14 days. 
              See how Wyndo can transform your business.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-beige-100 flex items-center justify-center">
                <Check size={14} className="text-ink-900" />
              </div>
              <span>Unlimited customers and jobs</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-beige-100 flex items-center justify-center">
                <Check size={14} className="text-ink-900" />
              </div>
              <span>Professional invoicing</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-beige-100 flex items-center justify-center">
                <Check size={14} className="text-ink-900" />
              </div>
              <span>Real-time scheduling</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-beige-100 flex items-center justify-center">
                <Check size={14} className="text-ink-900" />
              </div>
              <span>Mobile app access</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="relative z-10"
        >
          <p className="text-beige-500 text-sm">
            Join thousands of professionals already using Wyndo
          </p>
        </motion.div>
      </div>

      {/* Right Panel - Register Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-3xl font-display font-medium text-ink-900">Wyndo</h1>
            <p className="text-ink-500 mt-1">Job Management</p>
          </div>

          <div className="bg-beige-100 rounded-3xl p-8 shadow-sm border border-beige-300">
            <div className="mb-8">
              <h2 className="text-2xl font-medium text-ink-900">Create your account</h2>
              <p className="text-ink-500 mt-2">Start your 14-day free trial</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm"
                >
                  {error}
                </motion.div>
              )}

              <div>
                <label htmlFor="name" className="input-label">
                  Full name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  placeholder="John Smith"
                  required
                  autoComplete="name"
                />
              </div>

              <div>
                <label htmlFor="email" className="input-label">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="password" className="input-label">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pr-12"
                    placeholder="Create a strong password"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                
                {password && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 space-y-2"
                  >
                    {passwordRequirements.map((req, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-2 text-sm ${
                          req.met ? 'text-green-700' : 'text-ink-400'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center ${
                            req.met ? 'bg-green-100' : 'bg-beige-200'
                          }`}
                        >
                          {req.met && <Check size={12} />}
                        </div>
                        {req.text}
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || !allRequirementsMet}
                className="w-full btn btn-primary flex items-center justify-center gap-2 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    Create account
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-beige-300 text-center">
              <p className="text-ink-500">
                Already have an account?{' '}
                <Link
                  href="/auth/login"
                  className="text-ink-900 font-medium hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-ink-400 text-sm mt-6">
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </p>
        </motion.div>
      </div>
    </div>
  );
}
