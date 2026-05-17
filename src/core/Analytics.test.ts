import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { AnalyticsService } from './Analytics.ts';

describe('AnalyticsService', () => {
  let analytics: AnalyticsService;
  let mockDocument: any;
  let mockWindow: any;
  let appendedElements: any[] = [];

  beforeEach(() => {
    // Reset singleton state if possible, but since it's a private static,
    // we'll just work around it or use a fresh instance if we could.
    // However, AnalyticsService.getInstance() always returns the same instance.
    // For testing purposes, we can try to clear it using reflection-like access if needed,
    // but better to just mock the environment carefully.

    appendedElements = [];

    mockDocument = {
      createElement: (tagName: string) => {
        const element: any = { tagName: tagName.toUpperCase(), dataset: {} };
        return element;
      },
      head: {
        appendChild: (el: any) => {
          appendedElements.push(el);
        }
      },
      title: 'Test Title'
    };

    mockWindow = {
      location: {
        pathname: '/test',
        hash: '#hash'
      },
      goatcounter: {
        count: null as any
      }
    };

    (globalThis as any).document = mockDocument;
    (globalThis as any).window = mockWindow;
  });

  test('getInstance should return a singleton instance', () => {
    const instance1 = AnalyticsService.getInstance();
    const instance2 = AnalyticsService.getInstance();
    assert.strictEqual(instance1, instance2);
  });

  test('init should create and append a script element', () => {
    const analytics = AnalyticsService.getInstance();
    // We need to bypass the "initialized" check if it was already set by another test
    // or just assume it's the first time for now.
    // Given it's a singleton, this is tricky.

    // Let's check if we can reset it.
    (analytics as any).initialized = false;

    analytics.init('test-endpoint');

    assert.strictEqual(appendedElements.length, 1);
    const script = appendedElements[0];
    assert.strictEqual(script.tagName, 'SCRIPT');
    assert.strictEqual(script.async, true);
    assert.strictEqual(script.src, '//gc.zgo.at/count.js');
    assert.strictEqual(script.dataset.goatcounter, 'https://test-endpoint.goatcounter.com/count');
  });

  test('init should not append script if already initialized', () => {
    const analytics = AnalyticsService.getInstance();
    (analytics as any).initialized = true;

    analytics.init('another-endpoint');
    assert.strictEqual(appendedElements.length, 0);
  });

  test('trackPageView should call window.goatcounter.count if initialized', () => {
    const analytics = AnalyticsService.getInstance();
    (analytics as any).initialized = true;

    let countCalled = false;
    let callArgs: any = null;

    mockWindow.goatcounter = {
      count: (args: any) => {
        countCalled = true;
        callArgs = args;
      }
    };

    analytics.trackPageView('/custom-path', 'Custom Title');

    assert.strictEqual(countCalled, true);
    assert.deepStrictEqual(callArgs, {
      path: '/custom-path',
      title: 'Custom Title'
    });
  });

  test('trackPageView should use defaults if no arguments provided', () => {
    const analytics = AnalyticsService.getInstance();
    (analytics as any).initialized = true;

    let callArgs: any = null;
    mockWindow.goatcounter = {
      count: (args: any) => {
        callArgs = args;
      }
    };

    analytics.trackPageView();

    assert.deepStrictEqual(callArgs, {
      path: '/test#hash',
      title: 'Test Title'
    });
  });

  test('trackPageView should do nothing if not initialized', () => {
    const analytics = AnalyticsService.getInstance();
    (analytics as any).initialized = false;

    let countCalled = false;
    mockWindow.goatcounter = {
      count: () => {
        countCalled = true;
      }
    };

    analytics.trackPageView();
    assert.strictEqual(countCalled, false);
  });
});
