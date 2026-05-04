import { useState, useEffect } from 'preact/hooks';
import { CivisStorage } from './Storage.ts';

export type LanguageCode = string;

export interface TranslationResource {
  [key: string]: string;
}

export interface LanguageInfo {
  code: LanguageCode;
  name: string;
  isRTL?: boolean;
}

const DEFAULT_LANG: LanguageCode = 'en';

const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'العربية', isRTL: true },
  { code: 'es', name: 'Español' },
  { code: 'bn', name: 'বাংলা' },
  { code: 'hi', name: 'हिन्दी' },
];

const BUNDLED_TRANSLATIONS: Record<LanguageCode, TranslationResource> = {
  en: {
    'app.title': 'CivisOS',
    'app.tagline': 'Your Digital Lifeboat',
    'app.subtitle': 'The Resilience Operating System',
    'landing.mission': 'CivisOS is a decentralized "Digital Lifeboat" designed to function when traditional infrastructure fails.',
    'landing.boot': 'Boot CivisOS Desktop',
    'pillar.neutrality.title': 'Neutrality',
    'pillar.neutrality.desc': 'Politically neutral and independent of nation-state or corporate control.',
    'pillar.offline.title': 'Offline-First',
    'pillar.offline.desc': 'Built to function fully offline, syncing via local mesh networks.',
    'pillar.agnostic.title': 'Agnostic',
    'pillar.agnostic.desc': 'Runs on smartphones, old laptops, Raspberry Pis, and IoT devices.',
    'pillar.verifiable.title': 'Verifiable',
    'pillar.verifiable.desc': 'Fully open-source and transparent to ensure complete global trust.',
    'status.ready': 'Offline Core Cached & Ready',
    'status.pending': 'Caching Offline Core...',
    'sys.mesh_status': 'Mesh Status',
    'sys.battery': 'Battery',
    'sys.storage': 'Encrypted Storage Mounted',
    'sys.perm_request': 'Permission Request',
    'sys.allow': 'Allow',
    'sys.deny': 'Deny',
    'sys.mesh_market': 'Mesh Market',
    'sys.hello_world': 'Hello World',
    'sys.chat': 'CivisChat',
    'sys.vault': 'CivisVault',
    'sys.bulletin': 'CivisBulletin',
    'sys.sense': 'CivisSense',
  },
  ar: {
    'app.title': 'CivisOS',
    'app.tagline': 'قارب نجاة رقمي',
    'app.subtitle': 'نظام تشغيل الصمود',
    'landing.mission': 'CivisOS هو "قارب نجاة رقمي" لامركزي مصمم للعمل عندما تفشل البنية التحتية التقليدية.',
    'landing.boot': 'بدء تشغيل سطح مكتب CivisOS',
    'pillar.neutrality.title': 'الحياد',
    'pillar.neutrality.desc': 'محايد سياسياً ومستقل عن سيطرة الدولة أو الشركات.',
    'pillar.offline.title': 'أوفلاين أولاً',
    'pillar.offline.desc': 'مصمم للعمل بشكل كامل دون اتصال بالإنترنت، والمزامنة عبر الشبكات المحلية.',
    'pillar.agnostic.title': 'مرن',
    'pillar.agnostic.desc': 'يعمل على الهواتف الذكية، الحواسيب المحمولة القديمة، وأجهزة IoT.',
    'pillar.verifiable.title': 'قابل للتحقق',
    'pillar.verifiable.desc': 'مفتوح المصدر بالكامل وشفاف لضمان الثقة العالمية الكاملة.',
    'status.ready': 'تم تخزين النواة وجاهزة للعمل دون اتصال',
    'status.pending': 'جاري تخزين النواة...',
    'sys.mesh_status': 'حالة الشبكة',
    'sys.battery': 'البطارية',
    'sys.storage': 'تم تثبيت التخزين المشفر',
    'sys.perm_request': 'طلب إذن',
    'sys.allow': 'سماح',
    'sys.deny': 'رفض',
    'sys.mesh_market': 'سوق الشبكة',
    'sys.hello_world': 'مرحباً بالعالم',
    'sys.chat': 'سيفيس تشات',
    'sys.vault': 'خزنة سيفيس',
    'sys.bulletin': 'نشرة سيفيس',
    'sys.sense': 'سيفيس سينس',
  }
};

export class TranslationService {
  private static instance: TranslationService;
  private currentLang: LanguageCode = DEFAULT_LANG;
  private translations: Map<LanguageCode, TranslationResource> = new Map();
  private listeners: Set<(lang: LanguageCode) => void> = new Set();

  private constructor() {
    // Load bundled translations
    Object.entries(BUNDLED_TRANSLATIONS).forEach(([code, res]) => {
      this.translations.set(code, res);
    });
  }

  public static getInstance(): TranslationService {
    if (!TranslationService.instance) {
      TranslationService.instance = new TranslationService();
    }
    return TranslationService.instance;
  }

  public async init() {
    const savedLang = await CivisStorage.get<LanguageCode>('preferred_language');
    if (savedLang && this.translations.has(savedLang)) {
      this.setLanguage(savedLang);
    } else {
      this.applyLanguageMetadata(this.currentLang);
    }
  }

  public getLanguage(): LanguageCode {
    return this.currentLang;
  }

  public getLanguageInfo(): LanguageInfo {
    return SUPPORTED_LANGUAGES.find(l => l.code === this.currentLang) || SUPPORTED_LANGUAGES[0];
  }

  public getSupportedLanguages(): LanguageInfo[] {
    return SUPPORTED_LANGUAGES;
  }

  public async setLanguage(code: LanguageCode) {
    if (this.translations.has(code)) {
      this.currentLang = code;
      await CivisStorage.set('preferred_language', code);
      this.applyLanguageMetadata(code);
      this.listeners.forEach(l => l(code));
    }
  }

  private applyLanguageMetadata(code: LanguageCode) {
    const info = SUPPORTED_LANGUAGES.find(l => l.code === code);
    if (info) {
      document.documentElement.lang = code;
      document.documentElement.dir = info.isRTL ? 'rtl' : 'ltr';
    }
  }

  public t(key: string, fallback?: string): string {
    const langRes = this.translations.get(this.currentLang) || this.translations.get(DEFAULT_LANG);
    return langRes?.[key] || fallback || key;
  }

  public subscribe(listener: (lang: LanguageCode) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Allows adding or updating translations at runtime (Community suggestions)
   */
  public addTranslation(code: LanguageCode, resource: TranslationResource) {
    const existing = this.translations.get(code) || {};
    this.translations.set(code, { ...existing, ...resource });
    if (this.currentLang === code) {
      this.listeners.forEach(l => l(code));
    }
  }
}

export const translationService = TranslationService.getInstance();

export function useTranslation() {
  const [lang, setLang] = useState(translationService.getLanguage());

  useEffect(() => {
    return translationService.subscribe((newLang) => {
      setLang(newLang);
    });
  }, []);

  return {
    t: (key: string, fallback?: string) => translationService.t(key, fallback),
    currentLang: lang,
    setLanguage: (code: LanguageCode) => translationService.setLanguage(code),
    supportedLanguages: translationService.getSupportedLanguages()
  };
}
