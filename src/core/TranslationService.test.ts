import { test } from 'node:test';
import assert from 'node:assert';
import { translationService } from './TranslationService.ts';

// Mock CivisStorage for testing
import { CivisStorage } from './Storage.ts';
(CivisStorage as any).get = async () => null;
(CivisStorage as any).set = async () => {};

// Mock document for testing
(globalThis as any).document = {
  documentElement: {
    lang: '',
    dir: ''
  }
};

test('TranslationService', async (t) => {
  await t.test('initializes with default language', async () => {
    await translationService.init();
    assert.strictEqual(translationService.getLanguage(), 'en');
    assert.strictEqual(translationService.t('app.title'), 'CivisOS');
  });

  await t.test('changes language and updates translations', async () => {
    await translationService.setLanguage('ar');
    assert.strictEqual(translationService.getLanguage(), 'ar');
    assert.strictEqual(translationService.t('app.tagline'), 'قارب نجاة رقمي');
    assert.strictEqual(document.documentElement.dir, 'rtl');
  });

  await t.test('supports runtime translation addition', async () => {
    translationService.addTranslation('es', { 'test.key': 'Hola' });
    await translationService.setLanguage('es');
    assert.strictEqual(translationService.t('test.key'), 'Hola');
  });
});
