import { useCallback, useEffect, useState } from 'react';
import type { Language } from '@/types/book';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms?: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface Window {
    __iarInstallPrompt?: BeforeInstallPromptEvent | null;
    __iarPWAReady?: ((event: BeforeInstallPromptEvent) => void) | null;
  }
}

export type PWAInstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

export interface PWAInstallAttemptResult {
  prompted: boolean;
  outcome: PWAInstallOutcome;
  manualInstructions: string | null;
}

export interface UsePWAInstallOptions {
  lang?: Language;
}

export interface UsePWAInstallReturn {
  /**
   * True when the app is running in standalone display mode (`display-mode: standalone`
   * or `navigator.standalone === true`).
   */
  isStandalone: boolean;
  /**
   * True when `isStandalone` is true or the `appinstalled` event has fired.
   */
  isInstalled: boolean;
  /**
   * Strictly true ONLY when the browser has provided a deferred `beforeinstallprompt`
   * event and the app is not yet installed. Never claims native install is available
   * when no prompt event exists.
   */
  isInstallPromptAvailable: boolean;
  canPromptInstall: boolean;
  lastOutcome: PWAInstallOutcome | null;
  manualInstructions: string;
  manualInstructionsShown: boolean;
  promptInstall: () => Promise<PWAInstallAttemptResult>;
  dismissManualInstructions: () => void;
}

/**
 * Checks whether the current browser window is running in standalone PWA mode.
 * Equivalent to `isStandalone()` in `js/pwa.js`.
 */
export function checkIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const mediaStandalone =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches;
    const iosStandalone =
      typeof window.navigator !== 'undefined' &&
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    return Boolean(mediaStandalone || iosStandalone);
  } catch {
    return false;
  }
}

/**
 * Returns the localized manual installation guide for browsers that do not support
 * `beforeinstallprompt` (such as iOS Safari or Firefox), matching `js/pwa.js` lines 48-55.
 */
export function getManualInstallInstructions(lang: Language = 'ar'): string {
  return lang === 'ar'
    ? 'لتثبيت التطبيق:\n' +
        '• Android/Chrome: افتح قائمة المتصفح (⋮) واختر "تثبيت التطبيق".\n' +
        '• iPhone/Safari: اضغط زر المشاركة ثم "إضافة إلى الشاشة الرئيسية".'
    : 'To install:\n' +
        '• Android/Chrome: open browser menu (⋮) → "Install app".\n' +
        '• iPhone/Safari: tap Share → "Add to Home Screen".';
}

/**
 * React hook for managing PWA installation state (`beforeinstallprompt`, `appinstalled`,
 * and standalone mode detection) without registering or modifying any Service Worker.
 */
export function usePWAInstall(options: UsePWAInstallOptions = {}): UsePWAInstallReturn {
  const { lang = 'ar' } = options;

  const [isStandalone, setIsStandalone] = useState<boolean>(() => checkIsStandalone());
  const [hasInstalledEventFired, setHasInstalledEventFired] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => {
      if (typeof window === 'undefined' || checkIsStandalone()) return null;
      return window.__iarInstallPrompt ?? null;
    }
  );
  const [lastOutcome, setLastOutcome] = useState<PWAInstallOutcome | null>(null);
  const [manualInstructionsShown, setManualInstructionsShown] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (checkIsStandalone()) return;
      const promptEvent = event as BeforeInstallPromptEvent;
      window.__iarInstallPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
      setManualInstructionsShown(false);
    };

    const handleAppInstalled = () => {
      window.__iarInstallPrompt = null;
      setDeferredPrompt(null);
      setHasInstalledEventFired(true);
      setIsStandalone(checkIsStandalone());
      setManualInstructionsShown(false);
    };

    window.__iarPWAReady = (promptEvent: BeforeInstallPromptEvent) => {
      if (checkIsStandalone()) return;
      setDeferredPrompt(promptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    let mediaQuery: MediaQueryList | null = null;
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches || checkIsStandalone());
    };

    if (typeof window.matchMedia === 'function') {
      try {
        mediaQuery = window.matchMedia('(display-mode: standalone)');
        if (typeof mediaQuery.addEventListener === 'function') {
          mediaQuery.addEventListener('change', handleDisplayModeChange);
        }
      } catch {
        // Ignore matchMedia errors
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (window.__iarPWAReady) {
        window.__iarPWAReady = null;
      }
      if (mediaQuery && typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleDisplayModeChange);
      }
    };
  }, []);

  const isInstalled = isStandalone || hasInstalledEventFired;
  const isInstallPromptAvailable = !isInstalled && deferredPrompt !== null;
  const manualInstructions = getManualInstallInstructions(lang);

  const dismissManualInstructions = useCallback(() => {
    setManualInstructionsShown(false);
  }, []);

  const promptInstall = useCallback(async (): Promise<PWAInstallAttemptResult> => {
    const activePrompt =
      deferredPrompt ??
      (typeof window !== 'undefined' ? (window.__iarInstallPrompt ?? null) : null);

    if (!activePrompt || isInstalled) {
      setLastOutcome('unavailable');
      setManualInstructionsShown(!isInstalled);
      return {
        prompted: false,
        outcome: 'unavailable',
        manualInstructions: isInstalled ? null : manualInstructions
      };
    }

    let outcome: PWAInstallOutcome = 'dismissed';
    try {
      await activePrompt.prompt();
      const choiceResult = await activePrompt.userChoice;
      outcome = choiceResult?.outcome === 'accepted' ? 'accepted' : 'dismissed';
      if (outcome === 'accepted') {
        setHasInstalledEventFired(true);
      }
    } catch {
      outcome = 'dismissed';
    } finally {
      if (typeof window !== 'undefined') {
        window.__iarInstallPrompt = null;
      }
      setDeferredPrompt(null);
      setLastOutcome(outcome);
    }

    return {
      prompted: true,
      outcome,
      manualInstructions: null
    };
  }, [deferredPrompt, isInstalled, manualInstructions]);

  return {
    isStandalone,
    isInstalled,
    isInstallPromptAvailable,
    canPromptInstall: isInstallPromptAvailable,
    lastOutcome,
    manualInstructions,
    manualInstructionsShown,
    promptInstall,
    dismissManualInstructions
  };
}
