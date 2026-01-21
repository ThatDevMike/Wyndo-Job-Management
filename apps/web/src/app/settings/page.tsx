'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Shield, CreditCard, HelpCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useGuide } from '@/lib/guide';

export default function SettingsPage() {
  const { user } = useAuth();
  const { resetGuides } = useGuide();
  const [activeSection, setActiveSection] = useState('profile');

  const sections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'help', label: 'Help', icon: HelpCircle },
  ];

  const handleResetGuides = () => {
    resetGuides();
    window.location.reload();
  };

  return (
    <div className="p-8">
      {/* Header */}
      <header className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-display font-medium text-ink-900">Settings</h1>
          <p className="text-ink-500 mt-1">Manage your account preferences</p>
        </motion.div>
      </header>

      <div className="grid grid-cols-12 gap-8">
        {/* Navigation */}
        <div className="col-span-3">
          <nav className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                    activeSection === section.id
                      ? 'bg-ink-900 text-beige-100'
                      : 'text-ink-600 hover:bg-beige-100'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{section.label}</span>
                  {activeSection === section.id && (
                    <ChevronRight size={16} className="ml-auto" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="col-span-9">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-beige-100 rounded-2xl p-8 border border-beige-300"
          >
            {activeSection === 'profile' && (
              <div>
                <h2 className="text-xl font-medium text-ink-900 mb-6">Profile Settings</h2>
                
                <div className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-ink-900 rounded-full flex items-center justify-center text-beige-100 text-2xl font-medium">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <button className="btn btn-secondary">Change Photo</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="input-label">Full Name</label>
                      <input
                        type="text"
                        defaultValue={user?.name || ''}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="input-label">Email</label>
                      <input
                        type="email"
                        defaultValue={user?.email || ''}
                        className="input"
                        disabled
                      />
                    </div>
                  </div>

                  <div>
                    <label className="input-label">Business Name</label>
                    <input type="text" className="input" placeholder="Your business name" />
                  </div>

                  <button className="btn btn-primary">Save Changes</button>
                </div>
              </div>
            )}

            {activeSection === 'notifications' && (
              <div>
                <h2 className="text-xl font-medium text-ink-900 mb-6">Notification Settings</h2>
                
                <div className="space-y-4">
                  {[
                    { label: 'Email notifications', description: 'Receive updates via email' },
                    { label: 'Push notifications', description: 'Get alerts on your device' },
                    { label: 'Job reminders', description: 'Remind me about upcoming jobs' },
                    { label: 'Invoice alerts', description: 'Notify when invoices are viewed or paid' },
                  ].map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-beige-200 rounded-xl"
                    >
                      <div>
                        <p className="font-medium text-ink-900">{item.label}</p>
                        <p className="text-sm text-ink-500">{item.description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-beige-400 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ink-900"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'security' && (
              <div>
                <h2 className="text-xl font-medium text-ink-900 mb-6">Security Settings</h2>
                
                <div className="space-y-6">
                  <div className="p-4 bg-beige-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-ink-900">Two-Factor Authentication</p>
                        <p className="text-sm text-ink-500">Add an extra layer of security</p>
                      </div>
                      <button className="btn btn-secondary">Enable</button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-ink-900 mb-4">Change Password</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="input-label">Current Password</label>
                        <input type="password" className="input" />
                      </div>
                      <div>
                        <label className="input-label">New Password</label>
                        <input type="password" className="input" />
                      </div>
                      <div>
                        <label className="input-label">Confirm New Password</label>
                        <input type="password" className="input" />
                      </div>
                      <button className="btn btn-primary">Update Password</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'billing' && (
              <div>
                <h2 className="text-xl font-medium text-ink-900 mb-6">Billing</h2>
                
                <div className="p-6 bg-beige-200 rounded-xl mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-ink-500">Current Plan</p>
                      <p className="text-2xl font-medium text-ink-900">
                        {user?.subscriptionTier || 'Free'}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      {user?.subscriptionStatus || 'Trial'}
                    </span>
                  </div>
                  <button className="btn btn-primary">Upgrade Plan</button>
                </div>
              </div>
            )}

            {activeSection === 'help' && (
              <div>
                <h2 className="text-xl font-medium text-ink-900 mb-6">Help and Support</h2>
                
                <div className="space-y-4">
                  <button
                    onClick={handleResetGuides}
                    className="w-full p-4 bg-beige-200 rounded-xl text-left hover:bg-beige-300 transition-colors"
                  >
                    <p className="font-medium text-ink-900">Restart Tutorial</p>
                    <p className="text-sm text-ink-500">View the interactive guides again</p>
                  </button>
                  
                  <a
                    href="#"
                    className="block p-4 bg-beige-200 rounded-xl hover:bg-beige-300 transition-colors"
                  >
                    <p className="font-medium text-ink-900">Documentation</p>
                    <p className="text-sm text-ink-500">Read our help articles</p>
                  </a>
                  
                  <a
                    href="#"
                    className="block p-4 bg-beige-200 rounded-xl hover:bg-beige-300 transition-colors"
                  >
                    <p className="font-medium text-ink-900">Contact Support</p>
                    <p className="text-sm text-ink-500">Get help from our team</p>
                  </a>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
