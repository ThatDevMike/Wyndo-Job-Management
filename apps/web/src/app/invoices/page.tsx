'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, FileText, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/auth';
import { format } from 'date-fns';

interface Invoice {
  id: string;
  invoiceNumber: string;
  title: string;
  status: string;
  total: number;
  amountPaid: number;
  amountDue: number;
  dueDate: string;
  customer: {
    id: string;
    name: string;
  };
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function fetchInvoices() {
      try {
        const params = new URLSearchParams({ limit: '50' });
        if (filter !== 'all') params.set('status', filter);
        
        const res = await fetchWithAuth(`/api/invoices?${params}`);
        const data = await res.json();
        setInvoices(data.invoices || []);
      } catch (error) {
        console.error('Failed to fetch invoices:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchInvoices();
  }, [filter]);

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-beige-300 text-ink-600',
    SENT: 'bg-blue-100 text-blue-800',
    VIEWED: 'bg-purple-100 text-purple-800',
    PARTIAL: 'bg-amber-100 text-amber-800',
    PAID: 'bg-green-100 text-green-800',
    OVERDUE: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-ink-200 text-ink-500',
  };

  const filters = [
    { value: 'all', label: 'All' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'SENT', label: 'Sent' },
    { value: 'PAID', label: 'Paid' },
    { value: 'OVERDUE', label: 'Overdue' },
  ];

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
            <h1 className="text-3xl font-display font-medium text-ink-900">Invoices</h1>
            <p className="text-ink-500 mt-1">Track payments and manage billing</p>
          </div>
          <Link
            href="/invoices/new"
            className="flex items-center gap-2 px-5 py-3 bg-ink-900 text-beige-100 rounded-xl hover:bg-ink-700 transition-all duration-200"
          >
            <Plus size={18} />
            <span className="font-medium">New Invoice</span>
          </Link>
        </motion.div>
      </header>

      {/* Filters */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                filter === f.value
                  ? 'bg-ink-900 text-beige-100'
                  : 'bg-beige-100 text-ink-600 hover:bg-beige-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice List */}
      <div>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-beige-100 rounded-2xl p-6 border border-beige-300"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 shimmer rounded-xl" />
                  <div className="flex-1">
                    <div className="w-32 h-5 shimmer rounded mb-2" />
                    <div className="w-24 h-4 shimmer rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 bg-beige-100 rounded-2xl border border-beige-300"
          >
            <FileText size={48} className="mx-auto text-ink-300 mb-4" />
            <h2 className="text-xl font-medium text-ink-900 mb-2">No invoices yet</h2>
            <p className="text-ink-500 mb-6">Create your first invoice to start billing</p>
            <Link
              href="/invoices/new"
              className="inline-flex items-center gap-2 px-5 py-3 bg-ink-900 text-beige-100 rounded-xl hover:bg-ink-700 transition-all duration-200"
            >
              <Plus size={18} />
              Create Invoice
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice, index) => (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={`/invoices/${invoice.id}`}
                  className="block bg-beige-100 rounded-2xl p-6 border border-beige-300 hover:border-ink-300 hover:shadow-sm transition-all duration-200 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-ink-900 rounded-xl flex items-center justify-center text-beige-100">
                      <FileText size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-medium text-ink-900">{invoice.invoiceNumber}</h3>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            statusColors[invoice.status] || statusColors.DRAFT
                          }`}
                        >
                          {invoice.status}
                        </span>
                      </div>
                      <p className="text-sm text-ink-500">{invoice.customer?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-medium text-ink-900">
                        {'\u00A3'}{invoice.total.toFixed(2)}
                      </p>
                      <p className="text-sm text-ink-400">
                        Due {format(new Date(invoice.dueDate), 'dd MMM')}
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
