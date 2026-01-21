'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Calendar,
  FileText,
  TrendingUp,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { fetchWithAuth } from '@/lib/auth';

interface DashboardStats {
  totalCustomers: number;
  totalJobs: number;
  pendingInvoices: number;
  revenue: number;
  revenueChange: number;
}

const defaultStats: DashboardStats = {
  totalCustomers: 0,
  totalJobs: 0,
  pendingInvoices: 0,
  revenue: 0,
  revenueChange: 0,
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Fetch customers count
        const customersRes = await fetchWithAuth('/api/customers?limit=1');
        const customersData = await customersRes.json();
        
        // Fetch jobs
        const jobsRes = await fetchWithAuth('/api/jobs?limit=5');
        const jobsData = await jobsRes.json();
        
        // Fetch invoices
        const invoicesRes = await fetchWithAuth('/api/invoices?status=SENT&limit=1');
        const invoicesData = await invoicesRes.json();

        setStats({
          totalCustomers: customersData.pagination?.total || 0,
          totalJobs: jobsData.pagination?.total || 0,
          pendingInvoices: invoicesData.pagination?.total || 0,
          revenue: 0,
          revenueChange: 12.5,
        });

        setRecentJobs(jobsData.jobs || []);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const statCards = [
    {
      title: 'Total Customers',
      value: stats.totalCustomers,
      icon: Users,
      href: '/customers',
      color: 'bg-ink-900',
    },
    {
      title: 'Active Jobs',
      value: stats.totalJobs,
      icon: Calendar,
      href: '/jobs',
      color: 'bg-ink-800',
    },
    {
      title: 'Pending Invoices',
      value: stats.pendingInvoices,
      icon: FileText,
      href: '/invoices',
      color: 'bg-ink-700',
    },
    {
      title: 'This Month',
      value: `£${stats.revenue.toLocaleString()}`,
      change: stats.revenueChange,
      icon: TrendingUp,
      href: '/invoices',
      color: 'bg-beige-400',
      textColor: 'text-ink-900',
    },
  ];

  const quickActions = [
    { label: 'New Customer', href: '/customers/new', icon: Users },
    { label: 'New Job', href: '/jobs/new', icon: Calendar },
    { label: 'New Invoice', href: '/invoices/new', icon: FileText },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <header data-guide="dashboard-header" className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-ink-500 mb-1">Welcome back,</p>
          <h1 className="text-3xl font-display font-medium text-ink-900">
            {user?.name || 'User'}
          </h1>
        </motion.div>
      </header>

      {/* Quick Actions */}
      <section data-guide="quick-actions" className="mb-8">
        <div className="flex items-center gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Link
                  href={action.href}
                  className="flex items-center gap-2 px-5 py-3 bg-ink-900 text-beige-100 rounded-xl hover:bg-ink-700 transition-all duration-200 group"
                >
                  <Plus size={18} />
                  <span className="font-medium">{action.label}</span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Stats Grid */}
      <section data-guide="dashboard-stats" className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
              >
                <Link href={stat.href}>
                  <div
                    className={`${stat.color} ${
                      stat.textColor || 'text-beige-100'
                    } rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-200`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <Icon size={24} className="opacity-80" />
                      {stat.change !== undefined && (
                        <div
                          className={`flex items-center gap-1 text-sm ${
                            stat.change >= 0 ? 'text-green-600' : 'text-red-500'
                          }`}
                        >
                          {stat.change >= 0 ? (
                            <ArrowUpRight size={16} />
                          ) : (
                            <ArrowDownRight size={16} />
                          )}
                          {Math.abs(stat.change)}%
                        </div>
                      )}
                    </div>
                    <p
                      className={`text-3xl font-medium ${
                        stat.textColor || 'text-beige-100'
                      }`}
                    >
                      {isLoading ? (
                        <span className="inline-block w-16 h-8 shimmer rounded" />
                      ) : (
                        stat.value
                      )}
                    </p>
                    <p
                      className={`text-sm mt-1 ${
                        stat.textColor ? 'text-ink-600' : 'text-beige-300'
                      }`}
                    >
                      {stat.title}
                    </p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Recent Jobs */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="bg-beige-100 rounded-2xl p-6 border border-beige-300"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-ink-900">Recent Jobs</h2>
            <Link
              href="/jobs"
              className="text-sm text-ink-500 hover:text-ink-900 transition-colors"
            >
              View all
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-beige-200 rounded-xl">
                  <div className="w-10 h-10 shimmer rounded-lg" />
                  <div className="flex-1">
                    <div className="w-32 h-4 shimmer rounded mb-2" />
                    <div className="w-24 h-3 shimmer rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentJobs.length === 0 ? (
            <div className="text-center py-8">
              <Calendar size={40} className="mx-auto text-ink-300 mb-3" />
              <p className="text-ink-500">No jobs yet</p>
              <Link
                href="/jobs/new"
                className="inline-flex items-center gap-2 mt-3 text-ink-900 font-medium hover:underline"
              >
                <Plus size={16} />
                Create your first job
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="flex items-center gap-4 p-4 bg-beige-200 rounded-xl hover:bg-beige-300 transition-colors"
                >
                  <div className="w-10 h-10 bg-ink-900 rounded-lg flex items-center justify-center">
                    <Calendar size={18} className="text-beige-100" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink-900 truncate">{job.title}</p>
                    <p className="text-sm text-ink-500 truncate">
                      {job.customer?.name || 'No customer'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        job.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-800'
                          : job.status === 'IN_PROGRESS'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-beige-300 text-ink-600'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </motion.div>

        {/* Upcoming Schedule */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="bg-beige-100 rounded-2xl p-6 border border-beige-300"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-ink-900">Today's Schedule</h2>
            <Link
              href="/jobs"
              className="text-sm text-ink-500 hover:text-ink-900 transition-colors"
            >
              View calendar
            </Link>
          </div>

          <div className="text-center py-8">
            <Clock size={40} className="mx-auto text-ink-300 mb-3" />
            <p className="text-ink-500">No jobs scheduled for today</p>
            <Link
              href="/jobs/new"
              className="inline-flex items-center gap-2 mt-3 text-ink-900 font-medium hover:underline"
            >
              <Plus size={16} />
              Schedule a job
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
