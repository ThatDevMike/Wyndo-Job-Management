import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GuideStep {
  id: string;
  target: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface GuideState {
  isActive: boolean;
  currentGuide: string | null;
  currentStep: number;
  completedGuides: string[];
  
  startGuide: (guideId: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipGuide: () => void;
  completeGuide: () => void;
  resetGuides: () => void;
  hasCompletedGuide: (guideId: string) => boolean;
}

// Define all guides
export const guides: Record<string, GuideStep[]> = {
  dashboard: [
    {
      id: 'welcome',
      target: '[data-guide="dashboard-header"]',
      title: 'Welcome to Wyndo',
      content: 'This is your command center. Here you can see an overview of your business at a glance.',
      position: 'bottom',
    },
    {
      id: 'stats',
      target: '[data-guide="dashboard-stats"]',
      title: 'Key Metrics',
      content: 'Track your revenue, jobs completed, and outstanding invoices in real-time.',
      position: 'bottom',
    },
    {
      id: 'navigation',
      target: '[data-guide="sidebar-nav"]',
      title: 'Navigation',
      content: 'Use the sidebar to access Customers, Jobs, Invoices, and Settings.',
      position: 'right',
    },
    {
      id: 'quick-actions',
      target: '[data-guide="quick-actions"]',
      title: 'Quick Actions',
      content: 'Create new jobs, customers, or invoices with a single click.',
      position: 'bottom',
    },
  ],
  customers: [
    {
      id: 'customer-list',
      target: '[data-guide="customer-list"]',
      title: 'Your Customers',
      content: 'View and manage all your customers. Click on any customer to see their details.',
      position: 'bottom',
    },
    {
      id: 'add-customer',
      target: '[data-guide="add-customer"]',
      title: 'Add New Customer',
      content: 'Click here to add a new customer to your database.',
      position: 'left',
    },
    {
      id: 'search',
      target: '[data-guide="customer-search"]',
      title: 'Search and Filter',
      content: 'Quickly find customers by name, email, or phone number.',
      position: 'bottom',
    },
  ],
  jobs: [
    {
      id: 'job-list',
      target: '[data-guide="job-list"]',
      title: 'Job Management',
      content: 'All your scheduled and completed jobs appear here.',
      position: 'bottom',
    },
    {
      id: 'create-job',
      target: '[data-guide="create-job"]',
      title: 'Schedule a Job',
      content: 'Create new jobs and assign them to customers.',
      position: 'left',
    },
    {
      id: 'job-status',
      target: '[data-guide="job-status"]',
      title: 'Track Progress',
      content: 'Update job status as you work through your schedule.',
      position: 'bottom',
    },
  ],
};

export const useGuide = create<GuideState>()(
  persist(
    (set, get) => ({
      isActive: false,
      currentGuide: null,
      currentStep: 0,
      completedGuides: [],

      startGuide: (guideId: string) => {
        if (guides[guideId]) {
          set({
            isActive: true,
            currentGuide: guideId,
            currentStep: 0,
          });
        }
      },

      nextStep: () => {
        const { currentGuide, currentStep } = get();
        if (!currentGuide) return;

        const guideSteps = guides[currentGuide];
        if (currentStep < guideSteps.length - 1) {
          set({ currentStep: currentStep + 1 });
        } else {
          get().completeGuide();
        }
      },

      prevStep: () => {
        const { currentStep } = get();
        if (currentStep > 0) {
          set({ currentStep: currentStep - 1 });
        }
      },

      skipGuide: () => {
        set({
          isActive: false,
          currentGuide: null,
          currentStep: 0,
        });
      },

      completeGuide: () => {
        const { currentGuide, completedGuides } = get();
        if (currentGuide && !completedGuides.includes(currentGuide)) {
          set({
            completedGuides: [...completedGuides, currentGuide],
            isActive: false,
            currentGuide: null,
            currentStep: 0,
          });
        } else {
          set({
            isActive: false,
            currentGuide: null,
            currentStep: 0,
          });
        }
      },

      resetGuides: () => {
        set({
          completedGuides: [],
          isActive: false,
          currentGuide: null,
          currentStep: 0,
        });
      },

      hasCompletedGuide: (guideId: string) => {
        return get().completedGuides.includes(guideId);
      },
    }),
    {
      name: 'wyndo-guides',
    }
  )
);
