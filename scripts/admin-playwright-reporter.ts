import fs from 'node:fs';
import path from 'node:path';
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

type AdminRunEvent = {
  type: 'begin' | 'end';
  title: string;
  titlePath: string[];
  status?: string;
  duration?: number;
  error?: string;
  timestamp: string;
};

function writeEvent(event: AdminRunEvent): void {
  const filePath = process.env.ADMIN_RUN_EVENTS_FILE;
  if (!filePath) return;

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(event)}\n`, 'utf8');
}

export default class AdminPlaywrightReporter implements Reporter {
  onTestBegin(test: TestCase): void {
    writeEvent({
      type: 'begin',
      title: test.title,
      titlePath: test.titlePath(),
      timestamp: new Date().toISOString(),
    });
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    writeEvent({
      type: 'end',
      title: test.title,
      titlePath: test.titlePath(),
      status: result.status,
      duration: result.duration,
      error: result.error?.message,
      timestamp: new Date().toISOString(),
    });
  }
}
