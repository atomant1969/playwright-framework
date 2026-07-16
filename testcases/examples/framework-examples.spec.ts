import { expect, test } from '@playwright/test';
import logger from '../../lib/utils/logger';

const wait = async (milliseconds: number) => {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
};

function registerExampleCheck(label: string, milliseconds = 150): void {
  test(label, async ({ browserName: _browserName }, testInfo) => {
    logger.info(`example check="${label}" worker=${testInfo.workerIndex}`);
    await wait(milliseconds);
    expect(label).toBeTruthy();
  });
}

export const runExampleBasicFirstCheck = () => {
  test('basic example: first registered check', async () => {
    expect('basic suite').toContain('basic');
  });
};

export const runExampleBasicSecondCheck = () => {
  test('basic example: second registered check', async () => {
    expect(2 + 2).toBe(4);
  });
};

export const runExampleComplicatedSetupCreateData = () => {
  registerExampleCheck('complicated setup: create isolated test data');
};

export const runExampleComplicatedSetupVerifyData = () => {
  registerExampleCheck('complicated setup: verify prerequisites');
};

export const runExampleComplicatedParallelCheckA = () => {
  registerExampleCheck('complicated parallel check A', 300);
};

export const runExampleComplicatedParallelCheckB = () => {
  registerExampleCheck('complicated parallel check B', 300);
};

export const runExampleComplicatedParallelCheckC = () => {
  registerExampleCheck('complicated parallel check C', 300);
};

export const runExampleComplicatedCleanupArchive = () => {
  registerExampleCheck('complicated cleanup: archive generated data');
};

export const runExampleComplicatedCleanupVerify = () => {
  registerExampleCheck('complicated cleanup: verify no residue remains');
};
