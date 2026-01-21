'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Calendar, Clock, MapPin, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/auth';
import { format } from 'date-fns';

interface Job {
  id: string;
  title: string;
  status: string;
  priority: string;
  scheduledStart: string;
  customer: {
    id: string;
    name: string;
  };
  site?: {
    addressLine1: string;
    postcode: string;
  };
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function fetchJobs() {
      try {
        const params = new URLSearchParams({ limit: '50' });
        if (filter !== 'all') params.set('status', filter);
        
        const res = await fetchWithAuth(`/api/jobs?${params}`);
        const data = await res.json();
        setJobs(data.jobs || []);
      } catch (error) {
        console.error('Failed to fetch jobs:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchJobs();
  }, [filter]);

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-beige-300 text-ink-600',
    SCHEDULED: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-amber-100 text-amber-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };

  const filters = [
    { value: 'all', label: 'All Jobs' },
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
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
            <h1 className="text-3xl font-display font-medium text-ink-900">Jobs</h1>
            <p className="text-ink-500 mt-1">Schedule and manage your work</p>
          </div>
          <Link
            href="/jobs/new"
            data-guide="create-job"
            className="flex items-center gap-2 px-5 py-3 bg-ink-900 text-beige-100 rounded-xl hover:bg-ink-700 transition-all duration-200"
          >
            <Plus size={18} />
            <span className="font-medium">New Job</span>
          </Link>
        </motion.div>
      </header>

      {/* Filters */}
      <div data-guide="job-status" className="mb-6">
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

      {/* Job List */}
      <div data-guide="job-list">
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
                    <div className="w-48 h-5 shimmer rounded mb-2" />
                    <div className="w-32 h-4 shimmer rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 bg-beige-100 rounded-2xl border border-beige-300"
          >
            <Calendar size={48} className="mx-auto text-ink-300 mb-4" />
            <h2 className="text-xl font-medium text-ink-900 mb-2">No jobs yet</h2>
            <p className="text-ink-500 mb-6">Create your first job to start scheduling</p>
            <Link
              href="/jobs/new"
              className="inline-flex items-center gap-2 px-5 py-3 bg-ink-900 text-beige-100 rounded-xl hover:bg-ink-700 transition-all duration-200"
            >
              <Plus size={18} />
              Create Job
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job, index) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={`/jobs/${job.id}`}
                  className="block bg-beige-100 rounded-2xl p-6 border border-beige-300 hover:border-ink-300 hover:shadow-sm transition-all duration-200 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-ink-900 rounded-xl flex items-center justify-center text-beige-100">
                      <Calendar size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-medium text-ink-900 text-lg">{job.title}</h3>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            statusColors[job.status] || statusColors.DRAFT
                          }`}
                        >
                          {job.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-ink-500">
                        <span>{job.customer?.name}</span>
                        {job.site && (
                          <span className="flex items-center gap-1">
                            <MapPin size={14} />
                            {job.site.postcode}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-ink-600">
                        <Clock size={14} />
                        <span className="text-sm">
                          {format(new Date(job.scheduledStart), 'dd MMM yyyy')}
                        </span>
                      </div>
                      <p className="text-sm text-ink-400 mt-1">
                        {format(new Date(job.scheduledStart), 'HH:mm')}
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
