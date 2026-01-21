'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  Calendar,
  Users,
  FileText,
  Shield,
  Smartphone,
  Clock,
  TrendingUp,
  Star,
  ChevronDown,
} from 'lucide-react';

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const features = [
    {
      icon: Calendar,
      title: 'Smart Scheduling',
      description: 'Plan your jobs with an intuitive calendar. Set recurring appointments and never miss a booking.',
    },
    {
      icon: Users,
      title: 'Customer Management',
      description: 'Keep all customer details, job history, and communication in one organised place.',
    },
    {
      icon: FileText,
      title: 'Professional Invoicing',
      description: 'Create and send invoices in seconds. Track payments and get paid faster.',
    },
    {
      icon: Smartphone,
      title: 'Mobile Ready',
      description: 'Access everything from your phone. Update jobs on-site and sync instantly.',
    },
    {
      icon: Clock,
      title: 'Time Tracking',
      description: 'Log hours automatically. Know exactly how long each job takes.',
    },
    {
      icon: TrendingUp,
      title: 'Business Insights',
      description: 'See your revenue, busiest periods, and growth trends at a glance.',
    },
  ];

  const testimonials = [
    {
      quote: 'Wyndo transformed how I run my window cleaning business. I have saved hours every week on admin.',
      author: 'James Mitchell',
      role: 'Window Cleaning Professional',
      rating: 5,
    },
    {
      quote: 'The invoicing feature alone paid for itself in the first month. My customers love the professional look.',
      author: 'Sarah Thompson',
      role: 'Cleaning Services Owner',
      rating: 5,
    },
    {
      quote: 'Finally, software that understands what tradespeople actually need. Simple, fast, and reliable.',
      author: 'David Chen',
      role: 'Property Maintenance',
      rating: 5,
    },
  ];

  const pricing = [
    {
      name: 'Free',
      price: '0',
      description: 'Perfect for getting started',
      features: [
        'Up to 20 customers',
        '50 jobs per month',
        'Basic invoicing',
        'Mobile app access',
      ],
      cta: 'Start Free',
      highlighted: false,
    },
    {
      name: 'Professional',
      price: '19',
      description: 'For growing businesses',
      features: [
        'Unlimited customers',
        'Unlimited jobs',
        'Advanced invoicing',
        'Recurring jobs',
        'Payment tracking',
        'Priority support',
      ],
      cta: 'Start Free Trial',
      highlighted: true,
    },
    {
      name: 'Business',
      price: '49',
      description: 'For teams and agencies',
      features: [
        'Everything in Professional',
        'Up to 10 team members',
        'Team scheduling',
        'Advanced reports',
        'API access',
        'Dedicated support',
      ],
      cta: 'Contact Sales',
      highlighted: false,
    },
  ];

  const faqs = [
    {
      question: 'How long is the free trial?',
      answer: 'You get 14 days to try all Professional features completely free. No credit card required to start.',
    },
    {
      question: 'Can I switch plans later?',
      answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect on your next billing cycle.',
    },
    {
      question: 'Is my data secure?',
      answer: 'Absolutely. We use bank-level encryption and your data is stored securely in UK data centres.',
    },
    {
      question: 'Do you offer refunds?',
      answer: 'Yes, we offer a 30-day money-back guarantee. If you are not satisfied, we will refund your payment.',
    },
    {
      question: 'Can I import my existing customers?',
      answer: 'Yes, you can import customers from a CSV file or we can help migrate your data from other systems.',
    },
  ];

  return (
    <div className="min-h-screen bg-beige-200">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-beige-200/80 backdrop-blur-md border-b border-beige-300">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-display font-medium text-ink-900">
              Wyndo
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-ink-600 hover:text-ink-900 transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-ink-600 hover:text-ink-900 transition-colors">
                Pricing
              </a>
              <a href="#testimonials" className="text-ink-600 hover:text-ink-900 transition-colors">
                Reviews
              </a>
              <a href="#faq" className="text-ink-600 hover:text-ink-900 transition-colors">
                FAQ
              </a>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/auth/login"
                className="text-ink-600 hover:text-ink-900 transition-colors font-medium"
              >
                Sign in
              </Link>
              <Link
                href="/auth/register"
                className="px-5 py-2.5 bg-ink-900 text-beige-100 rounded-xl hover:bg-ink-700 transition-colors font-medium"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-beige-300 rounded-full text-sm text-ink-700 mb-6">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Now available on iOS and Android
              </div>
              <h1 className="text-5xl lg:text-6xl font-display font-medium text-ink-900 leading-tight mb-6">
                Run your trade business with confidence
              </h1>
              <p className="text-xl text-ink-600 mb-8 leading-relaxed">
                The all-in-one platform for scheduling jobs, managing customers, and getting paid. 
                Built for window cleaners, cleaners, and trade professionals.
              </p>
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Link
                  href="/auth/register"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-ink-900 text-beige-100 rounded-xl hover:bg-ink-700 transition-all duration-200 font-medium text-lg group"
                >
                  Start your free trial
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-beige-100 text-ink-900 rounded-xl hover:bg-beige-300 transition-all duration-200 font-medium text-lg border border-beige-400"
                >
                  See how it works
                </a>
              </div>
              <div className="flex items-center gap-6 mt-8 pt-8 border-t border-beige-400">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full bg-ink-900 border-2 border-beige-200 flex items-center justify-center text-beige-100 text-sm font-medium"
                    >
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} size={16} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-ink-500">Trusted by 10,000+ professionals</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="bg-ink-900 rounded-3xl p-8 shadow-2xl">
                <div className="bg-beige-100 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-ink-500 text-sm">Today's Schedule</p>
                      <p className="text-2xl font-medium text-ink-900">5 Jobs</p>
                    </div>
                    <div className="w-12 h-12 bg-ink-900 rounded-xl flex items-center justify-center">
                      <Calendar size={24} className="text-beige-100" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    {['Mrs. Johnson - 9:00 AM', 'The Smith Family - 11:30 AM', 'Oak Street Office - 2:00 PM'].map(
                      (job, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-3 bg-beige-200 rounded-xl"
                        >
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span className="text-ink-700">{job}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 bg-beige-100 rounded-2xl p-4 shadow-xl border border-beige-300">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Check size={20} className="text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-ink-900">Payment received</p>
                    <p className="text-sm text-ink-500">Invoice #1234</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-beige-100">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-display font-medium text-ink-900 mb-4">
              Everything you need to run your business
            </h2>
            <p className="text-xl text-ink-600 max-w-2xl mx-auto">
              Powerful tools designed specifically for trade professionals. Simple to use, powerful when you need it.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-beige-200 rounded-2xl p-8 hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="w-14 h-14 bg-ink-900 rounded-xl flex items-center justify-center mb-6">
                    <Icon size={28} className="text-beige-100" />
                  </div>
                  <h3 className="text-xl font-medium text-ink-900 mb-3">{feature.title}</h3>
                  <p className="text-ink-600 leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-6 bg-ink-900">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-display font-medium text-beige-100 mb-4">
              Loved by professionals
            </h2>
            <p className="text-xl text-beige-400">
              See what our customers have to say about Wyndo
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-ink-800 rounded-2xl p-8"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} size={18} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-beige-200 text-lg mb-6 leading-relaxed">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-beige-100 rounded-full flex items-center justify-center text-ink-900 font-medium">
                    {testimonial.author.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-beige-100">{testimonial.author}</p>
                    <p className="text-sm text-beige-500">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 bg-beige-200">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-display font-medium text-ink-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-ink-600">
              Start free, upgrade when you are ready. No hidden fees.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricing.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`rounded-2xl p-8 ${
                  plan.highlighted
                    ? 'bg-ink-900 text-beige-100 scale-105 shadow-2xl'
                    : 'bg-beige-100 border border-beige-300'
                }`}
              >
                {plan.highlighted && (
                  <div className="text-sm font-medium text-beige-400 mb-2">Most Popular</div>
                )}
                <h3 className={`text-2xl font-medium mb-2 ${plan.highlighted ? 'text-beige-100' : 'text-ink-900'}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm mb-4 ${plan.highlighted ? 'text-beige-400' : 'text-ink-500'}`}>
                  {plan.description}
                </p>
                <div className="mb-6">
                  <span className={`text-4xl font-medium ${plan.highlighted ? 'text-beige-100' : 'text-ink-900'}`}>
                    {plan.price === '0' ? 'Free' : `£${plan.price}`}
                  </span>
                  {plan.price !== '0' && (
                    <span className={plan.highlighted ? 'text-beige-400' : 'text-ink-500'}>/month</span>
                  )}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <Check size={18} className={plan.highlighted ? 'text-beige-400' : 'text-ink-600'} />
                      <span className={plan.highlighted ? 'text-beige-200' : 'text-ink-600'}>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/register"
                  className={`block text-center py-3 rounded-xl font-medium transition-colors ${
                    plan.highlighted
                      ? 'bg-beige-100 text-ink-900 hover:bg-beige-200'
                      : 'bg-ink-900 text-beige-100 hover:bg-ink-700'
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-6 bg-beige-100">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-display font-medium text-ink-900 mb-4">
              Frequently asked questions
            </h2>
            <p className="text-xl text-ink-600">
              Everything you need to know about Wyndo
            </p>
          </motion.div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="bg-beige-200 rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className="font-medium text-ink-900">{faq.question}</span>
                  <ChevronDown
                    size={20}
                    className={`text-ink-600 transition-transform ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-6">
                    <p className="text-ink-600 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-ink-900">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-display font-medium text-beige-100 mb-4">
              Ready to grow your business?
            </h2>
            <p className="text-xl text-beige-400 mb-8">
              Join thousands of professionals who trust Wyndo to run their business.
            </p>
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-beige-100 text-ink-900 rounded-xl hover:bg-beige-200 transition-all duration-200 font-medium text-lg group"
            >
              Start your free trial
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <p className="text-beige-500 text-sm mt-4">
              No credit card required. 14-day free trial.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-beige-200 border-t border-beige-300">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-display font-medium text-ink-900 mb-4">Wyndo</h3>
              <p className="text-ink-600 text-sm">
                Job management software for trade professionals.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-ink-900 mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-ink-600">
                <li><a href="#features" className="hover:text-ink-900">Features</a></li>
                <li><a href="#pricing" className="hover:text-ink-900">Pricing</a></li>
                <li><a href="#" className="hover:text-ink-900">Mobile Apps</a></li>
                <li><a href="#" className="hover:text-ink-900">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-ink-900 mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-ink-600">
                <li><a href="#" className="hover:text-ink-900">About</a></li>
                <li><a href="#" className="hover:text-ink-900">Blog</a></li>
                <li><a href="#" className="hover:text-ink-900">Careers</a></li>
                <li><a href="#" className="hover:text-ink-900">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-ink-900 mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-ink-600">
                <li><a href="#" className="hover:text-ink-900">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-ink-900">Terms of Service</a></li>
                <li><a href="#" className="hover:text-ink-900">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-beige-300 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-ink-500">
              2026 Wyndo. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-ink-500 hover:text-ink-900">
                <Shield size={20} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
