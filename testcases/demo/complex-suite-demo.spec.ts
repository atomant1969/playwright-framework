import { expect, test } from '@playwright/test';
import logger from '../../lib/utils/logger';

const wait = async (milliseconds: number) => {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
};

function registerDemoTest(label: string, milliseconds: number): void {
  test(label, async ({ browserName: _browserName }, testInfo) => {
    logger.info(`BEGIN ${label} worker=${testInfo.workerIndex}`);
    await wait(milliseconds);
    expect(label).toBeTruthy();
    logger.info(`END ${label} worker=${testInfo.workerIndex}`);
  });
}

export const runDemoSerialAlpha = () => {
  registerDemoTest('alpha serial test 1', 700);
  registerDemoTest('alpha serial test 2', 700);
  registerDemoTest('alpha serial test 3', 700);
};

export const runDemoParallelBeta = () => {
  registerDemoTest('beta parallel test 1', 700);
  registerDemoTest('beta parallel test 2', 700);
  registerDemoTest('beta parallel test 3', 700);
};

export const runDemoSerialGamma = () => {
  registerDemoTest('gamma serial test 1', 700);
  registerDemoTest('gamma serial test 2', 700);
  registerDemoTest('gamma serial test 3', 700);
};
