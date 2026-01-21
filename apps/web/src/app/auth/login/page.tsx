'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError, isAuthenticated } = useAuth();
  
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
    
    const success = await login(email, password);
    if (success) {
      router.push('/dashboard');
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-beige-200 flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-ink-900 text-beige-100 p-12 flex-col justify-between relative overflow-hidden">
        {/* Decorative elements */}
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
              Manage your jobs.<br />
              Grow your business.
            </h2>
            <p className="text-beige-400 mt-4 text-lg max-w-md">
              The professional way to handle customers, schedule jobs, 
              and get paid on time.
            </p>
          </div>

          <div className="flex items-center gap-8">
            <div>
              <p className="text-3xl font-medium">10k+</p>
              <p className="text-beige-400 text-sm">Active users</p>
            </div>
            <div className="w-px h-12 bg-ink-700" />
            <div>
              <p className="text-3xl font-medium">99.9%</p>
              <p className="text-beige-400 text-sm">Uptime</p>
            </div>
            <div className="w-px h-12 bg-ink-700" />
            <div>
              <p className="text-3xl font-medium">4.9</p>
              <p className="text-beige-400 text-sm">User rating</p>
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
            Trusted by professionals across the UK
          </p>
        </motion.div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-3xl font-display font-medium text-ink-900">Wyndo</h1>
            <p className="text-ink-500 mt-1">Job Management</p>
          </div>

          <div className="bg-beige-100 rounded-3xl p-8 shadow-sm border border-beige-300">
            <div className="mb-8">
              <h2 className="text-2xl font-medium text-ink-900">Welcome back</h2>
              <p className="text-ink-500 mt-2">Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-beige-400 text-ink-900 focus:ring-ink-900"
                  />
                  <span className="text-sm text-ink-600">Remember me</span>
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-ink-600 hover:text-ink-900 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn btn-primary flex items-center justify-center gap-2 py-4"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    Sign in
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-beige-300 text-center">
              <p className="text-ink-500">
                Don't have an account?{' '}
                <Link
                  href="/auth/register"
                  className="text-ink-900 font-medium hover:underline"
                >
                  Create one
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-ink-400 text-sm mt-6">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </motion.div>
      </div>
    </div>
  );
}
