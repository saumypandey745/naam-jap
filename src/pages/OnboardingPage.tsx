/**
 * OnboardingPage.tsx
 *
 * 3-screen onboarding for new users.
 * Shown only once — stored in localStorage.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Mic, BarChart2, Award } from 'lucide-react';

const SLIDES = [
  {
    icon: '🕉️',
    title: 'Naam Jap mein Swagat Hai',
    subtitle: 'Apna mantra chuno, chanting shuru karo,\napp aapka jap sunegi aur count karegi.',
    color: 'from-gold-900/30 to-bg-base',
  },
  {
    icon: '🎙️',
    title: 'Voice se Count',
    subtitle: 'Bas bol do — "राम राम राम" — app detect karegi.\nBackground awaaz reject hogi, sirf aapka jap count hoga.',
    color: 'from-indigo-900/20 to-bg-base',
  },
  {
    icon: '📿',
    title: 'Sadhna Track Karo',
    subtitle: 'Mala ring, calendar heatmap, streak, anushthaan —\nsaari sadhna ek jagah.',
    color: 'from-amber-900/20 to-bg-base',
  },
];

const ONBOARDING_KEY = 'naam-jap:v1:onboarded';

export function hasCompletedOnboarding(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}

export function markOnboardingComplete(): void {
  localStorage.setItem(ONBOARDING_KEY, 'true');
}

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);

  const isLast = slide === SLIDES.length - 1;
  const current = SLIDES[slide];

  const handleNext = () => {
    if (isLast) {
      markOnboardingComplete();
      navigate('/select');
    } else {
      setSlide((s) => s + 1);
    }
  };

  const handleSkip = () => {
    markOnboardingComplete();
    navigate('/');
  };

  return (
    <div className={`min-h-dvh flex flex-col items-center justify-center bg-gradient-to-b ${current.color} relative`}>
      {/* Skip button */}
      {!isLast && (
        <button
          onClick={handleSkip}
          className="absolute top-6 right-6 text-text-muted text-sm hover:text-text-primary transition-colors"
        >
          Skip
        </button>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-6">
        <div
          key={slide}
          className="text-8xl animate-scale-in"
          style={{ filter: 'drop-shadow(0 0 30px rgba(201,132,42,0.4))' }}
        >
          {current.icon}
        </div>
        <div className="animate-fade-in" key={`text-${slide}`}>
          <h1 className="text-2xl font-bold text-text-primary mb-3">
            {current.title}
          </h1>
          <p className="text-text-secondary leading-relaxed whitespace-pre-line">
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* Feature icons for slide 3 */}
      {slide === 2 && (
        <div className="flex gap-8 mb-8 animate-fade-in">
          <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-xl bg-bg-elevated flex items-center justify-center">
              <Mic size={20} className="text-gold-400" />
            </div>
            <span className="text-xs text-text-muted">Voice</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-xl bg-bg-elevated flex items-center justify-center">
              <BarChart2 size={20} className="text-gold-400" />
            </div>
            <span className="text-xs text-text-muted">Stats</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-xl bg-bg-elevated flex items-center justify-center">
              <Award size={20} className="text-gold-400" />
            </div>
            <span className="text-xs text-text-muted">Anushthaan</span>
          </div>
        </div>
      )}

      {/* Dots */}
      <div className="flex items-center gap-2 mb-6">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setSlide(i)}
            className={`rounded-full transition-all ${
              i === slide
                ? 'w-6 h-2 bg-gold-400'
                : 'w-2 h-2 bg-bg-elevated'
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>

      {/* CTA */}
      <div className="w-full max-w-xs px-8 pb-12">
        <button onClick={handleNext} className="btn-primary w-full">
          {isLast ? (
            <>Shuru Karein 🙏</>
          ) : (
            <>Aage <ChevronRight size={18} /></>
          )}
        </button>
      </div>
    </div>
  );
};
