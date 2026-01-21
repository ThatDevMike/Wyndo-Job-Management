'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';
import { useGuide, guides, GuideStep } from '@/lib/guide';

export function GuideOverlay() {
  const {
    isActive,
    currentGuide,
    currentStep,
    nextStep,
    prevStep,
    skipGuide,
  } = useGuide();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [currentStepData, setCurrentStepData] = useState<GuideStep | null>(null);

  const updateTargetPosition = useCallback(() => {
    if (!currentGuide || !guides[currentGuide]) return;

    const step = guides[currentGuide][currentStep];
    if (!step) return;

    setCurrentStepData(step);

    const target = document.querySelector(step.target);
    if (target) {
      const rect = target.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [currentGuide, currentStep]);

  useEffect(() => {
    if (isActive) {
      updateTargetPosition();
      window.addEventListener('resize', updateTargetPosition);
      window.addEventListener('scroll', updateTargetPosition, true);

      return () => {
        window.removeEventListener('resize', updateTargetPosition);
        window.removeEventListener('scroll', updateTargetPosition, true);
      };
    }
  }, [isActive, updateTargetPosition]);

  if (!isActive || !currentGuide || !currentStepData) return null;

  const totalSteps = guides[currentGuide]?.length || 0;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  const getTooltipPosition = () => {
    if (!targetRect) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    const padding = 16;
    const tooltipWidth = 320;
    const tooltipHeight = 160;

    switch (currentStepData.position) {
      case 'bottom':
        return {
          top: targetRect.bottom + padding,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        };
      case 'top':
        return {
          top: targetRect.top - tooltipHeight - padding,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        };
      case 'left':
        return {
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          left: targetRect.left - tooltipWidth - padding,
        };
      case 'right':
        return {
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          left: targetRect.right + padding,
        };
      default:
        return {
          top: targetRect.bottom + padding,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        };
    }
  };

  const tooltipPosition = getTooltipPosition();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100]">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-ink-900/60 backdrop-blur-sm"
          onClick={skipGuide}
        />

        {/* Highlight box */}
        {targetRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute border-2 border-beige-100 rounded-xl pointer-events-none"
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
            }}
          />
        )}

        {/* Tooltip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="guide-tooltip"
          data-position={currentStepData.position}
          style={{
            position: 'fixed',
            ...tooltipPosition,
            width: 320,
          }}
        >
          {/* Close button */}
          <button
            onClick={skipGuide}
            className="absolute top-3 right-3 text-beige-400 hover:text-beige-100 transition-colors"
          >
            <X size={18} />
          </button>

          {/* Content */}
          <div className="pr-8">
            <p className="text-beige-400 text-xs uppercase tracking-wider mb-1">
              Step {currentStep + 1} of {totalSteps}
            </p>
            <h3 className="text-lg font-medium text-beige-100 mb-2">
              {currentStepData.title}
            </h3>
            <p className="text-beige-300 text-sm leading-relaxed">
              {currentStepData.content}
            </p>
          </div>

          {/* Progress bar */}
          <div className="mt-4 mb-4">
            <div className="h-1 bg-ink-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-beige-100"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={skipGuide}
              className="text-sm text-beige-400 hover:text-beige-100 transition-colors"
            >
              Skip tour
            </button>

            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <button
                  onClick={prevStep}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-beige-300 hover:text-beige-100 transition-colors"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
              )}

              <button
                onClick={nextStep}
                className="flex items-center gap-1 px-4 py-1.5 bg-beige-100 text-ink-900 rounded-lg text-sm font-medium hover:bg-beige-200 transition-colors"
              >
                {isLastStep ? 'Finish' : 'Next'}
                {!isLastStep && <ArrowRight size={16} />}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
