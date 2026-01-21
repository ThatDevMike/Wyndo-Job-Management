'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Users, Mail, Phone, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/auth';
import { useGuide } from '@/lib/guide';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  _count: {
    jobs: number;
    invoices: number;
  };
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { startGuide, hasCompletedGuide } = useGuide();

  useEffect(() => {
    if (!hasCompletedGuide('customers')) {
      const timer = setTimeout(() => startGuide('customers'), 500);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedGuide, startGuide]);

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const params = new URLSearchParams({ limit: '50' });
        if (searchQuery) params.set('search', searchQuery);
        
        const res = await fetchWithAuth(`/api/customers?${params}`);
        const data = await res.json();
        setCustomers(data.customers || []);
      } catch (error) {
        console.error('Failed to fetch customers:', error);
      } finally {
        setIsLoading(false);
      }
    }

    const debounce = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  return (
    <div className="p-8">
      {/* Header */}
      <header className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-display font-medium text-ink-900">Customers</h1>
            <p className="text-ink-500 mt-1">Manage your customer database</p>
          </div>
          <Link
            href="/customers/new"
            data-guide="add-customer"
            className="flex items-center gap-2 px-5 py-3 bg-ink-900 text-beige-100 rounded-xl hover:bg-ink-700 transition-all duration-200"
          >
            <Plus size={18} />
            <span className="font-medium">Add Customer</span>
          </Link>
        </motion.div>
      </header>

      {/* Search */}
      <div data-guide="customer-search" className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" size={20} />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-12"
          />
        </div>
      </div>

      {/* Customer List */}
      <div data-guide="customer-list">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-beige-100 rounded-2xl p-6 border border-beige-300"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 shimmer rounded-full" />
                  <div className="flex-1">
                    <div className="w-40 h-5 shimmer rounded mb-2" />
                    <div className="w-32 h-4 shimmer rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : customers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 bg-beige-100 rounded-2xl border border-beige-300"
          >
            <Users size={48} className="mx-auto text-ink-300 mb-4" />
            <h2 className="text-xl font-medium text-ink-900 mb-2">No customers yet</h2>
            <p className="text-ink-500 mb-6">Add your first customer to get started</p>
            <Link
              href="/customers/new"
              className="inline-flex items-center gap-2 px-5 py-3 bg-ink-900 text-beige-100 rounded-xl hover:bg-ink-700 transition-all duration-200"
            >
              <Plus size={18} />
              Add Customer
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {customers.map((customer, index) => (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={`/customers/${customer.id}`}
                  className="block bg-beige-100 rounded-2xl p-6 border border-beige-300 hover:border-ink-300 hover:shadow-sm transition-all duration-200 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-ink-900 rounded-full flex items-center justify-center text-beige-100 font-medium text-lg">
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-ink-900 text-lg">{customer.name}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-ink-500">
                        {customer.email && (
                          <span className="flex items-center gap-1">
                            <Mail size={14} />
                            {customer.email}
                          </span>
                        )}
                        {customer.phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={14} />
                            {customer.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-ink-500">
                        {customer._count?.jobs || 0} jobs
                      </p>
                      <p className="text-sm text-ink-400">
                        {customer._count?.invoices || 0} invoices
                      </p>
                    </div>
                    <ChevronRight
                      size={20}
                      className="text-ink-300 group-hover:text-ink-900 transition-colors"
                    />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
