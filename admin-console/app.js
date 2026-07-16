const form = document.querySelector('#configForm');
const suiteSelect = document.querySelector('#suiteSelect');
const suiteFilter = document.querySelector('#suiteFilter');
const parallelSuiteKeysField = document.querySelector('#parallelSuiteKeysField');
const suiteTabs = Array.from(document.querySelectorAll('.suite-tab'));
const targetTabs = Array.from(document.querySelectorAll('.target-tab'));
const safetyTabs = Array.from(document.querySelectorAll('.safety-tab'));
const suiteList = document.querySelector('#suiteList');
const secretList = document.querySelector('#secretList');
const overrideList = document.querySelector('#overrideList');
const validationPanel = document.querySelector('#validationPanel');
const validationList = document.querySelector('#validationList');
const output = document.querySelector('#output');
const activeSummary = document.querySelector('#activeSummary');
const runModal = document.querySelector('#runModal');
const runModalTitle = document.querySelector('#runModalTitle');
const runModalSubtitle = document.querySelector('#runModalSubtitle');
const runStatus = document.querySelector('#runStatus');
const runSuite = document.querySelector('#runSuite');
const runWorkers = document.querySelector('#runWorkers');
const runRetries = document.querySelector('#runRetries');
const runBrowserMode = document.querySelector('#runBrowserMode');
const runElapsed = document.querySelector('#runElapsed');
const runResult = document.querySelector('#runResult');
const toggleRunLogButton = document.querySelector('#toggleRunLogButton');
const runOutput = document.querySelector('#runOutput');
const floatingTooltip = document.createElement('div');
floatingTooltip.className = 'floating-tooltip';
document.body.appendChild(floatingTooltip);

const buttons = {
  save: document.querySelector('#saveButton'),
  doctor: document.querySelector('#doctorButton'),
  validate: document.querySelector('#validateButton'),
  matrix: document.querySelector('#matrixButton'),
  run: document.querySelector('#runButton'),
  clear: document.querySelector('#clearButton'),
  closeRunModal: document.querySelector('#closeRunModalButton'),
  toggleRunLog: document.querySelector('#toggleRunLogButton'),
  recommendedParallel: document.querySelector('#recommendedParallelButton'),
};

let state = {
  config: {},
  effective: {},
  suites: [],
  secrets: [],
  overrides: [],
  recommendedParallelSuiteKeys: '',
  validation: { errors: [], warnings: [] },
};
let selectedSuiteKind = 'all';
let selectedTargetType = 'all';
let selectedParallelSafety = 'all';
let suiteClickTarget = 'testSuite';
let activeRunPollId;
let isRunLogVisible = true;

const numberFields = ['workers', 'retries', 'actionTimeoutMs', 'testTimeoutMs', 'globalTimeoutMs'];
const actionLabels = {
  save: 'Save Configuration',
  doctor: 'Framework Doctor',
  validate: 'Suite Validation',
  matrix: 'Suite Matrix',
  run: 'Playwright Run',
};

function appendOutput(text) {
  output.textContent += text;
  output.scrollTop = output.scrollHeight;
}

function setBusy(isBusy) {
  for (const button of Object.values(buttons)) {
    if (button !== buttons.clear && button !== buttons.closeRunModal && button !== buttons.toggleRunLog) button.disabled = isBusy;
  }
}

function field(name) {
  return form.elements[name];
}

function setFieldValue(name, value) {
  const input = field(name);
  if (!input) return;
  if (input.type === 'checkbox') {
    input.checked = Boolean(value);
  } else {
    input.value = value ?? '';
  }
}

function normalizeOriginUrl(value) {
  try {
    const url = new URL(value);
    return `${url.origin}/`;
  } catch {
    return value || '';
  }
}

function apiEndpointFromBaseUrl(value) {
  const origin = normalizeOriginUrl(value);
  return origin ? new URL('api/', origin).toString() : '';
}

function parseSuiteKeys(value) {
  return String(value || '')
    .split(/[,\s]+/)
    .map((key) => key.trim())
    .filter(Boolean);
}

function addParallelSuiteKey(key) {
  const input = field('parallelSuiteKeys');
  const keys = parseSuiteKeys(input.value);
  if (!keys.includes(key)) {
    keys.push(key);
    input.value = keys.join(',');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

function readFormConfig() {
  const formData = new FormData(form);
  const config = Object.fromEntries(formData.entries());
  for (const name of numberFields) {
    config[name] = Number(config[name] || 0);
  }
  config.headless = field('headless').checked;
  config.apiBaseUrl = apiEndpointFromBaseUrl(config.baseUrl);
  config.suiteExecutionMode = config.testSuite === 'parallel' ? 'parallel' : 'serial';
  delete config.apiEndpoint;
  return config;
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || `Request failed with ${response.status}`);
  return body;
}

function formatDuration(startedAt, finishedAt) {
  const start = startedAt ? new Date(startedAt).getTime() : Date.now();
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now();
  const totalSeconds = Math.max(0, Math.floor((end - start) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function setRunModalVisible(isVisible) {
  runModal.hidden = !isVisible;
}

function hideFloatingTooltip() {
  floatingTooltip.classList.remove('visible');
  floatingTooltip.textContent = '';
}

function showFloatingTooltip(target) {
  const text = target?.dataset?.tooltip;
  if (!text) {
    hideFloatingTooltip();
    return;
  }

  floatingTooltip.textContent = text;
  floatingTooltip.classList.add('visible');

  const targetRect = target.getBoundingClientRect();
  const tooltipRect = floatingTooltip.getBoundingClientRect();
  const gap = 10;
  let left = targetRect.left - tooltipRect.width - gap;
  if (left < 12 && targetRect.right + tooltipRect.width + gap < window.innerWidth - 12) {
    left = targetRect.right + gap;
  }
  left = Math.min(Math.max(12, left), window.innerWidth - tooltipRect.width - 12);

  const preferredTop = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
  const top = Math.min(Math.max(12, preferredTop), window.innerHeight - tooltipRect.height - 12);
  floatingTooltip.style.left = `${left}px`;
  floatingTooltip.style.top = `${top}px`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function parseMarkdownTable(outputText) {
  const rows = String(outputText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && line.endsWith('|'))
    .map((line) =>
      line
        .slice(1, -1)
        .split('|')
        .map((cell) => cell.trim()),
    )
    .filter((cells) => cells.some(Boolean));

  if (rows.length < 3) return null;
  const [headers, separator, ...bodyRows] = rows;
  if (!separator.every((cell) => /^:?-{3,}:?$/.test(cell))) return null;

  return {
    headers,
    rows: bodyRows.filter((cells) => cells.length === headers.length),
  };
}

function formatMatrixValue(value) {
  return String(value ?? '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .trim();
}

function parseMatrixStats(outputText) {
  const stats = {};
  for (const line of String(outputText || '').split(/\r?\n/)) {
    const match = line.match(/^-\s+\*\*(.+?):\*\*\s*(.+)$/);
    if (match) stats[formatMatrixValue(match[1])] = formatMatrixValue(match[2]);
  }
  return stats;
}

function parseMatrixJson(outputText) {
  const match = String(outputText || '').match(/Matrix JSON:\s*(\{.*\})/s);
  if (!match) return null;

  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function renderMatrixTestItems(testItems) {
  if (!Array.isArray(testItems) || testItems.length === 0) return '';

  return `<ol>${testItems
    .map((testItem) => {
      const type = testItem.type === 'suite' ? 'suite' : 'case';
      const suiteLabel = testItem.suite ? `<strong>${escapeHtml(formatMatrixValue(testItem.suite))}</strong> ` : '';
      const countLabel =
        type === 'suite'
          ? ` <span>${Number(testItem.testCount || 0)} case${Number(testItem.testCount || 0) === 1 ? '' : 's'} · ${escapeHtml(testItem.mode || 'serial')} · ${escapeHtml(testItem.workers || 1)} worker${Number(testItem.workers || 1) === 1 ? '' : 's'}</span>`
          : '';
      const tooltip = describeTestItemTooltip(testItem, type);
      const children = renderMatrixTestItems(testItem.tests);
      return `<li>
        <div class="matrix-case-line" data-tooltip="${escapeHtml(tooltip)}">
          <span class="matrix-case-type ${type}">${type}</span>
          ${suiteLabel}${escapeHtml(formatMatrixValue(testItem.description))}${countLabel}
        </div>
        ${children}
      </li>`;
    })
    .join('')}</ol>`;
}

function countMatrixLeaves(testItems) {
  if (!Array.isArray(testItems) || testItems.length === 0) return 0;
  return testItems.reduce(
    (total, item) => total + (Array.isArray(item.tests) && item.tests.length > 0 ? countMatrixLeaves(item.tests) : 1),
    0,
  );
}

function countDirectMatrixItems(testItems) {
  if (!Array.isArray(testItems) || testItems.length === 0) return { suites: 0, cases: 0 };
  return testItems.reduce(
    (total, item) => {
      if (item.type === 'suite') total.suites += 1;
      else total.cases += 1;
      return total;
    },
    { suites: 0, cases: 0 },
  );
}

function formatContentsLabel(suites, cases) {
  const parts = [];
  if (suites > 0) parts.push(`${suites} suite${suites === 1 ? '' : 's'}`);
  if (cases > 0) parts.push(`${cases} case${cases === 1 ? '' : 's'}`);
  return parts.join(', ') || '0 cases';
}

function describeTargetTooltip(suite, actionText) {
  return [
    `${actionText}: ${suite.key}`,
    `Description: ${suite.description || 'No description available.'}`,
    `Type: ${targetTypeLabel(suite.targetType)}`,
    `Kind: ${suite.kind}`,
    `Mode: ${suite.mode}`,
    `Workers: ${suite.workers}`,
    `Parallel safety: ${safetyLabel(suite.parallelSafety)}`,
    suite.dataNamespace ? `Data namespace: ${suite.dataNamespace}` : '',
    `Registered cases: ${suite.tests}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function describeTestItemTooltip(testItem, type) {
  return [
    testItem.suite ? `Target: ${testItem.suite}` : '',
    `Description: ${testItem.description || 'No description available.'}`,
    `Type: ${type}`,
    type === 'suite' ? `Mode: ${testItem.mode || 'serial'}` : '',
    type === 'suite' ? `Workers: ${testItem.workers || 1}` : '',
    type === 'suite' ? `Cases: ${testItem.testCount || 0}` : 'Single case',
  ]
    .filter(Boolean)
    .join('\n');
}

function maskSecretValue(value) {
  const text = String(value || '');
  if (!text) return '(empty)';
  if (text.length <= 4) return '*'.repeat(text.length);
  return `${text.slice(0, 2)}${'*'.repeat(Math.min(text.length - 4, 12))}${text.slice(-2)} (${text.length} chars)`;
}

function renderRunStatusIcon(status) {
  const label = ['passed', 'failed', 'running', 'skipped'].includes(status) ? status : 'pending';
  return `<span class="run-case-status ${label}" aria-label="${label}"></span>`;
}

function eventText(event) {
  return [...(event.titlePath || []), event.title || ''].join(' ').toLowerCase();
}

function normalizeStatusText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function eventMatchesTestItem(event, testItem) {
  const text = eventText(event);
  const suite = normalizeStatusText(testItem.suite);
  const description = normalizeStatusText(testItem.description);

  return Boolean((suite && text.includes(suite)) || (description && text.includes(description)));
}

function eventStatusToUiStatus(status) {
  if (status === 'passed') return 'passed';
  if (status === 'skipped') return 'skipped';
  if (status) return 'failed';
  return 'pending';
}

function buildRunStatusResolver(job) {
  const events = Array.isArray(job.events) ? job.events : [];
  const beginEvents = events.filter((event) => event.type === 'begin');
  const endEvents = events.filter((event) => event.type === 'end');
  const cache = new WeakMap();

  return (testItem) => {
    if (cache.has(testItem)) return cache.get(testItem);
    let status = 'pending';

    const matchingEnds = endEvents.filter((event) => eventMatchesTestItem(event, testItem));
    const matchingBegins = beginEvents.filter((event) => eventMatchesTestItem(event, testItem));
    const endedStatuses = matchingEnds.map((event) => eventStatusToUiStatus(event.status));
    const runningCount = Math.max(0, matchingBegins.length - matchingEnds.length);

    if (endedStatuses.some((endedStatus) => endedStatus === 'failed')) status = 'failed';
    else if (runningCount > 0) status = 'running';
    else if (endedStatuses.some((endedStatus) => endedStatus === 'passed')) status = 'passed';
    else if (endedStatuses.some((endedStatus) => endedStatus === 'skipped')) status = 'skipped';
    else if (job.status === 'passed') status = 'passed';
    else if (job.status === 'failed' && events.length === 0) status = 'failed';

    cache.set(testItem, status);
    return status;
  };
}

function combineChildStatuses(statuses, jobStatus) {
  if (statuses.length === 0) return jobStatus === 'running' ? 'pending' : jobStatus;
  if (statuses.some((status) => status === 'failed')) return 'failed';
  if (statuses.some((status) => status === 'running')) return 'running';
  if (statuses.some((status) => status === 'pending')) return 'pending';
  if (statuses.every((status) => status === 'passed')) return 'passed';
  if (statuses.every((status) => status === 'skipped')) return 'skipped';
  if (statuses.every((status) => status === 'passed' || status === 'skipped')) return 'passed';
  return 'pending';
}

function renderRunTestItems(testItems, jobStatus, resolveLeafStatus) {
  if (!Array.isArray(testItems) || testItems.length === 0) return '';

  return `<ol>${testItems
    .map((testItem) => {
      const children = renderRunTestItems(testItem.tests, jobStatus, resolveLeafStatus);
      const hasChildren = Boolean(children);
      const childStatuses = hasChildren ? collectRunStatuses(testItem.tests, jobStatus, resolveLeafStatus) : [];
      const itemStatus = hasChildren ? combineChildStatuses(childStatuses, jobStatus) : resolveLeafStatus(testItem);
      const type = testItem.type === 'suite' ? 'suite' : 'case';
      const suiteLabel = testItem.suite ? `<strong>${escapeHtml(formatMatrixValue(testItem.suite))}</strong> ` : '';
      const countLabel =
        type === 'suite'
          ? ` <span>${Number(testItem.testCount || 0)} case${Number(testItem.testCount || 0) === 1 ? '' : 's'} · ${escapeHtml(testItem.mode || 'serial')} · ${escapeHtml(testItem.workers || 1)} worker${Number(testItem.workers || 1) === 1 ? '' : 's'}</span>`
          : '';
      const tooltip = describeTestItemTooltip(testItem, type);
      return `<li>
        <div class="run-case-line" data-tooltip="${escapeHtml(tooltip)}">
          ${renderRunStatusIcon(itemStatus)}
          <span class="matrix-case-type ${type}">${type}</span>
          ${suiteLabel}${escapeHtml(formatMatrixValue(testItem.description))}${countLabel}
        </div>
        ${children}
      </li>`;
    })
    .join('')}</ol>`;
}

function collectRunStatuses(testItems, jobStatus, resolveLeafStatus) {
  if (!Array.isArray(testItems)) return [];
  return testItems.map((testItem) => {
    if (Array.isArray(testItem.tests) && testItem.tests.length > 0) {
      return combineChildStatuses(collectRunStatuses(testItem.tests, jobStatus, resolveLeafStatus), jobStatus);
    }
    return resolveLeafStatus(testItem);
  });
}

function renderRunPlan(job) {
  const matrixRows = Array.isArray(job.matrix?.include) ? job.matrix.include : [];
  if (!matrixRows.length) {
    runResult.hidden = true;
    runResult.innerHTML = '';
    return;
  }

  const totalJobs = matrixRows.length;
  const totalCases = matrixRows.reduce((total, item) => total + countMatrixLeaves(item.testItems), 0);
  const resolveLeafStatus = buildRunStatusResolver(job);
  runResult.hidden = false;
  runResult.innerHTML = `
    <div class="matrix-stats">
      <div><span>Suite jobs</span><strong>${totalJobs}</strong></div>
      <div><span>Cases</span><strong>${totalCases}</strong></div>
      <div><span>Status</span><strong>${escapeHtml(job.status)}</strong></div>
      <div><span>Workers</span><strong>${escapeHtml(job.config?.workers || '-')}</strong></div>
    </div>
    ${matrixRows
      .map((item) => {
        const directItems = countDirectMatrixItems(item.testItems);
        const leafCases = Number(item.leafCaseCount || countMatrixLeaves(item.testItems));
        return `
          <details class="matrix-cases run-cases" open>
            <summary>${renderRunStatusIcon(job.status)} ${escapeHtml(item.suite)} contains ${escapeHtml(formatContentsLabel(directItems.suites, directItems.cases))} (${leafCases} total cases)</summary>
            ${renderRunTestItems(item.testItems, job.status, resolveLeafStatus)}
          </details>
        `;
      })
      .join('')}
  `;
}

function renderMatrixResult(outputText) {
  const matrix = parseMatrixJson(outputText);
  const table = parseMarkdownTable(outputText);
  const stats = parseMatrixStats(outputText);
  if (!table && !matrix?.include?.length) {
    runResult.hidden = true;
    runResult.innerHTML = '';
    toggleRunLogButton.hidden = true;
    return;
  }

  const statEntries = Object.entries(stats);
  const statsHtml = statEntries.length
    ? `<div class="matrix-stats">${statEntries.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}</div>`
    : '';

  runResult.hidden = false;
  toggleRunLogButton.hidden = false;
  const matrixRows = Array.isArray(matrix?.include) ? matrix.include : [];
  const tableHeaders = matrixRows.length
    ? ['Order', 'Suite', 'Type', 'Kind', 'Mode', 'Workers', 'Contents', 'Total cases', 'Description']
    : table.headers;
  const tableRows = matrixRows.length
    ? matrixRows.map((item) => {
        const directItems = countDirectMatrixItems(item.testItems);
        return [
          item.order,
          item.suite,
          Number(item.testCount || 0) > 1 ? 'suite' : 'case',
          item.kind,
          item.mode,
          item.workers,
          formatContentsLabel(Number(item.directSuiteCount ?? directItems.suites), Number(item.directCaseCount ?? directItems.cases)),
          Number(item.leafCaseCount || countMatrixLeaves(item.testItems)),
          item.description,
        ];
      })
    : table.rows;
  const casesHtml = matrixRows
    .filter((item) => (Array.isArray(item.testItems) && item.testItems.length > 0) || (Array.isArray(item.tests) && item.tests.length > 0))
    .map((item) => {
      const fallbackTests = Array.isArray(item.tests) ? item.tests : [];
      const directItems = countDirectMatrixItems(item.testItems);
      const suiteCount = Number(item.directSuiteCount ?? directItems.suites);
      const fallbackCaseCount = directItems.cases || fallbackTests.length || 0;
      const caseCount = Number(item.directCaseCount ?? fallbackCaseCount);
      const leafCases = Number(item.leafCaseCount || countMatrixLeaves(item.testItems) || caseCount);
      return `
        <details class="matrix-cases" ${leafCases <= 24 ? 'open' : ''}>
          <summary>${escapeHtml(item.suite)} contains ${escapeHtml(formatContentsLabel(suiteCount, caseCount))} (${leafCases} total cases)</summary>
          ${Array.isArray(item.testItems) && item.testItems.length > 0 ? renderMatrixTestItems(item.testItems) : `<ol>${fallbackTests.map((testDescription) => `<li>${escapeHtml(formatMatrixValue(testDescription))}</li>`).join('')}</ol>`}
        </details>
      `;
    })
    .join('');

  runResult.innerHTML = `
    ${statsHtml}
    <div class="matrix-table-wrap">
      <table class="matrix-table">
        <thead>
          <tr>${tableHeaders.map((header) => `<th>${escapeHtml(formatMatrixValue(header))}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${tableRows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(formatMatrixValue(cell))}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </div>
    ${casesHtml}
  `;
}

function renderActionResult(job) {
  if (job.action === 'run') {
    renderRunPlan(job);
    toggleRunLogButton.hidden = false;
    setRunLogVisible(false);
    return;
  }

  if (job.action === 'matrix' && job.output) {
    renderMatrixResult(job.output);
    setRunLogVisible(false);
    return;
  }

  runResult.hidden = true;
  runResult.innerHTML = '';
  toggleRunLogButton.hidden = true;
  setRunLogVisible(true);
}

function setRunLogVisible(isVisible) {
  isRunLogVisible = isVisible;
  runOutput.hidden = !isVisible;
  toggleRunLogButton.textContent = isVisible ? 'Hide raw log' : 'Show raw log';
}

function showActionDialog(action, status = 'starting', message = 'Starting...') {
  setRunModalVisible(true);
  runModalTitle.textContent = actionLabels[action] || `Action: ${action}`;
  runModalSubtitle.textContent = message;
  runStatus.textContent = status;
  runStatus.className = status === 'failed' ? 'failed' : status === 'passed' || status === 'saved' ? 'passed' : 'running';
  runSuite.textContent = field('testSuite')?.value || '-';
  runWorkers.textContent = field('workers')?.value || '-';
  runRetries.textContent = field('retries')?.value || '-';
  runBrowserMode.textContent = field('headless')?.checked ? 'headless' : 'headed';
  runElapsed.textContent = '0s';
  runResult.hidden = true;
  runResult.innerHTML = '';
  toggleRunLogButton.hidden = true;
  setRunLogVisible(true);
  runOutput.textContent = `${message}\n`;
  runOutput.scrollTop = runOutput.scrollHeight;
}

function renderRunJob(job) {
  const command = [job.command, ...(job.args || [])].join(' ');
  runModalTitle.textContent = actionLabels[job.action] || `Action: ${job.action}`;
  runModalSubtitle.textContent = command;
  runStatus.textContent = job.status;
  runStatus.className = job.status;
  runSuite.textContent = job.config?.testSuite || '-';
  runWorkers.textContent = job.config?.workers || '-';
  runRetries.textContent = job.config?.retries || '-';
  runBrowserMode.textContent = job.config?.headless === 'true' ? 'headless' : 'headed';
  runElapsed.textContent = formatDuration(job.startedAt, job.finishedAt);
  renderActionResult(job);
  runOutput.textContent = job.output || 'Waiting for output...';
  runOutput.scrollTop = runOutput.scrollHeight;
}

async function pollRunJob(jobId) {
  const job = await jsonRequest(`/api/run/${encodeURIComponent(jobId)}`);
  renderRunJob(job);

  if (job.status !== 'running') {
    clearInterval(activeRunPollId);
    activeRunPollId = undefined;
    setBusy(false);
    appendOutput(job.output || '');
    appendOutput(`\nExit code: ${job.code}\n`);
    await loadState().catch(() => {});
  }
}

function renderSuites() {
  const filter = suiteFilter.value.trim().toLowerCase();
  const parallelKeys = new Set(parseSuiteKeys(field('parallelSuiteKeys')?.value));
  const selectedRunTarget = field('testSuite')?.value;
  const suites = state.suites.filter((suite) => {
    const matchesKind = selectedSuiteKind === 'all' || suite.kind === selectedSuiteKind;
    const matchesTargetType = selectedTargetType === 'all' || suite.targetType === selectedTargetType;
    const matchesSafety = selectedParallelSafety === 'all' || suite.parallelSafety === selectedParallelSafety;
    const matchesText = !filter || suite.key.toLowerCase().includes(filter) || suite.description.toLowerCase().includes(filter);
    return matchesKind && matchesTargetType && matchesSafety && matchesText;
  });

  suiteList.innerHTML = '';
  for (const suite of suites) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `suite-row ${parallelKeys.has(suite.key) || selectedRunTarget === suite.key ? 'selected' : ''}`;
    row.dataset.tooltip = describeTargetTooltip(
      suite,
      suiteClickTarget === 'parallelSuiteKeys' ? 'Add to parallel suite keys' : 'Select run target',
    );
    row.innerHTML = `
      <span>
        <span class="suite-key">${suite.key}</span>
        <span class="suite-meta">${targetTypeLabel(suite.targetType)} · ${safetyLabel(suite.parallelSafety)} · ${suite.kind} · ${suite.mode} · ${suite.workers} worker${suite.workers === 1 ? '' : 's'}${suite.dataNamespace ? ` · ${suite.dataNamespace}` : ''}</span>
      </span>
      <span class="badge ${safetyBadgeClass(suite.parallelSafety)}">${suite.tests}</span>
    `;
    row.addEventListener('mousedown', (event) => event.preventDefault());
    row.addEventListener('click', () => {
      const scrollTop = suiteList.scrollTop;
      if (suiteClickTarget === 'parallelSuiteKeys') {
        addParallelSuiteKey(suite.key);
        renderSuites();
        suiteList.scrollTop = scrollTop;
        return;
      }

      field('testSuite').value = suite.key;
      updateSummary();
      renderSuites();
      suiteList.scrollTop = scrollTop;
    });
    suiteList.appendChild(row);
  }
}

function targetTypeLabel(targetType) {
  if (targetType === 'suite') return 'suite';
  if (targetType === 'testCase') return 'single case';
  if (targetType === 'bug') return 'bug';
  return 'target';
}

function safetyLabel(parallelSafety) {
  if (parallelSafety === 'safe') return 'parallel-safe';
  if (parallelSafety === 'readOnly') return 'read-only';
  if (parallelSafety === 'unsafe') return 'unsafe';
  return 'unknown';
}

function safetyBadgeClass(parallelSafety) {
  if (parallelSafety === 'safe') return 'safe';
  if (parallelSafety === 'readOnly') return 'readonly';
  if (parallelSafety === 'unsafe') return 'missing';
  return 'unknown';
}

function updateSummary() {
  const config = readFormConfig();
  setFieldValue('apiEndpoint', apiEndpointFromBaseUrl(config.baseUrl));
  parallelSuiteKeysField.hidden = config.testSuite !== 'parallel';
  activeSummary.textContent = `${config.testSuite || 'no suite'} · ${config.workers || 0} worker${config.workers === 1 ? '' : 's'} · ${config.headless ? 'headless' : 'headed'}`;
}

function resetSecretRow(row) {
  const valueNode = row?.querySelector('.secret-value');
  const editor = row?.querySelector('.secret-editor');
  const editButton = row?.querySelector('.secret-edit');
  const toggleButton = row?.querySelector('.secret-toggle');
  const saveButton = row?.querySelector('.secret-save');
  const cancelButton = row?.querySelector('.secret-cancel');
  if (!valueNode || !editor || !editButton || !toggleButton || !saveButton || !cancelButton) return;

  const value = valueNode.dataset.secretValue || '';
  valueNode.textContent = maskSecretValue(value);
  valueNode.hidden = false;
  editor.hidden = true;
  editButton.hidden = false;
  toggleButton.hidden = false;
  toggleButton.textContent = 'Show';
  saveButton.hidden = true;
  saveButton.disabled = false;
  saveButton.textContent = 'Save';
  cancelButton.hidden = true;
}

function renderSecrets() {
  secretList.innerHTML = '';
  for (const secret of state.secrets) {
    const secretName = escapeHtml(secret.name);
    const secretSource = escapeHtml(secret.source || 'configured');
    const secretValue = escapeHtml(secret.value || '');
    const maskedSecretValue = escapeHtml(maskSecretValue(secret.value));
    const secretTooltip = escapeHtml(
      [
        `Environment key: ${secret.name}`,
        `Source: ${secret.source || 'unknown'}`,
        `Status: ${secret.present ? 'configured' : 'missing'}`,
        `Current value: ${secret.present ? 'masked by default' : 'missing'}`,
      ].join('\n'),
    );
    const row = document.createElement('div');
    row.className = 'status-row secret-row';
    row.innerHTML = `
      <span class="secret-main">
        <span class="secret-name" data-tooltip="${secretTooltip}">${secretName}</span>
        <code class="secret-value" data-secret-value="${secretValue}">${maskedSecretValue}</code>
        <span class="secret-editor" hidden>
          <input class="secret-input" type="password" value="${secretValue}" autocomplete="off" spellcheck="false" />
        </span>
      </span>
      <span class="secret-actions">
        <span class="badge ${secret.present ? '' : 'missing'}">${secret.present ? secretSource : 'missing'}</span>
        <button class="secret-toggle" type="button" ${secret.present ? '' : 'disabled'} data-tooltip="Show or hide the current effective value for this environment key.">Show</button>
        <button class="secret-edit" type="button" data-tooltip="Edit this value in .env. If the current value comes from process env, saving here writes a .env override for local runs.">Edit</button>
        <button class="secret-save" type="button" data-secret-name="${secretName}" hidden data-tooltip="Save this value to .env.">Save</button>
        <button class="secret-cancel" type="button" hidden data-tooltip="Cancel editing without changing .env.">Cancel</button>
      </span>
    `;
    secretList.appendChild(row);
  }
  for (const button of secretList.querySelectorAll('.secret-toggle')) {
    button.addEventListener('click', () => {
      const row = button.closest('.secret-row');
      const valueNode = row?.querySelector('.secret-value');
      if (!valueNode) return;
      const isRevealed = button.textContent === 'Hide';
      const value = valueNode.dataset.secretValue || '';
      valueNode.textContent = isRevealed ? maskSecretValue(value) : value;
      button.textContent = isRevealed ? 'Show' : 'Hide';
    });
  }
  for (const button of secretList.querySelectorAll('.secret-edit')) {
    button.addEventListener('click', () => {
      const row = button.closest('.secret-row');
      const valueNode = row?.querySelector('.secret-value');
      const editor = row?.querySelector('.secret-editor');
      const input = row?.querySelector('.secret-input');
      const toggleButton = row?.querySelector('.secret-toggle');
      const saveButton = row?.querySelector('.secret-save');
      const cancelButton = row?.querySelector('.secret-cancel');
      if (!valueNode || !editor || !input || !toggleButton || !saveButton || !cancelButton) return;

      input.value = valueNode.dataset.secretValue || '';
      valueNode.hidden = true;
      editor.hidden = false;
      button.hidden = true;
      toggleButton.hidden = true;
      saveButton.hidden = false;
      cancelButton.hidden = false;
      input.focus();
      input.select();
    });
  }
  for (const button of secretList.querySelectorAll('.secret-cancel')) {
    button.addEventListener('click', () => resetSecretRow(button.closest('.secret-row')));
  }
  for (const input of secretList.querySelectorAll('.secret-input')) {
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') input.closest('.secret-row')?.querySelector('.secret-save')?.click();
      if (event.key === 'Escape') input.closest('.secret-row')?.querySelector('.secret-cancel')?.click();
    });
  }
  for (const button of secretList.querySelectorAll('.secret-save')) {
    button.addEventListener('click', async () => {
      const row = button.closest('.secret-row');
      const input = row?.querySelector('.secret-input');
      if (!input) return;

      button.disabled = true;
      button.textContent = 'Saving';
      try {
        const result = await jsonRequest('/api/secrets', {
          method: 'PUT',
          body: JSON.stringify({ secrets: { [button.dataset.secretName]: input.value } }),
        });
        state.secrets = result.secrets;
        state.overrides = result.overrides;
        appendOutput(`Saved ${button.dataset.secretName} to .env\n`);
        renderSecrets();
        renderOverrides();
      } catch (error) {
        appendOutput(`\nError: ${error.message}\n`);
        button.disabled = false;
        button.textContent = 'Save';
      }
    });
  }
}

function renderOverrides() {
  overrideList.innerHTML = '';
  if (state.overrides.length === 0) {
    const row = document.createElement('div');
    row.className = 'status-row';
    row.innerHTML = '<span>No runtime overrides detected</span><span class="badge">clean</span>';
    overrideList.appendChild(row);
  } else {
    for (const override of state.overrides) {
      const row = document.createElement('div');
      row.className = 'status-row';
      row.innerHTML = `<span>${override}</span><span class="badge">active</span>`;
      overrideList.appendChild(row);
    }
  }
}

function render() {
  suiteSelect.innerHTML = '';
  const parallel = document.createElement('option');
  parallel.value = 'parallel';
  parallel.textContent = 'Parallel run';
  suiteSelect.appendChild(parallel);

  for (const suite of state.suites) {
    const option = document.createElement('option');
    option.value = suite.key;
    option.textContent = `${suite.key} (${targetTypeLabel(suite.targetType)}, ${suite.kind}, ${suite.mode})`;
    suiteSelect.appendChild(option);
  }

  const config = { ...state.effective, ...state.config };
  for (const [key, value] of Object.entries(config)) {
    setFieldValue(key, value);
  }
  setFieldValue('apiEndpoint', apiEndpointFromBaseUrl(config.baseUrl));

  renderSecrets();
  renderOverrides();

  renderValidation(state.validation);

  renderSuites();
  updateSummary();
}

function renderValidation(validation) {
  const errors = validation?.errors || [];
  const warnings = validation?.warnings || [];
  validationPanel.hidden = errors.length === 0 && warnings.length === 0;
  validationList.innerHTML = '';

  for (const error of errors) {
    const row = document.createElement('div');
    row.className = 'status-row';
    row.innerHTML = `<span>${error}</span><span class="badge missing">error</span>`;
    validationList.appendChild(row);
  }

  for (const warning of warnings) {
    const row = document.createElement('div');
    row.className = 'status-row';
    row.innerHTML = `<span>${warning}</span><span class="badge">warning</span>`;
    validationList.appendChild(row);
  }
}

async function loadState() {
  state = await jsonRequest('/api/state');
  render();
}

async function saveConfig() {
  const result = await jsonRequest('/api/config', {
    method: 'PUT',
    body: JSON.stringify(readFormConfig()),
  });
  state.config = result.config;
  state.validation = result.validation;
  renderValidation(state.validation);
  appendOutput('Saved framework.config.json\n');
  updateSummary();
}

async function runAction(action) {
  setBusy(true);
  if (activeRunPollId) {
    clearInterval(activeRunPollId);
    activeRunPollId = undefined;
  }
  showActionDialog(action, 'starting', 'Saving configuration before starting...');
  try {
    await saveConfig();
    appendOutput(`\n$ ${action}\n`);
    showActionDialog(action, 'starting', 'Starting command...');

    const job = await jsonRequest('/api/run', {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
    renderRunJob(job);
    activeRunPollId = setInterval(() => {
      pollRunJob(job.id).catch((error) => {
        clearInterval(activeRunPollId);
        activeRunPollId = undefined;
        setBusy(false);
        runOutput.textContent += `\nError: ${error.message}\n`;
      });
    }, 1000);
    await pollRunJob(job.id);
  } catch (error) {
    appendOutput(`\nError: ${error.message}\n`);
    runStatus.textContent = 'failed';
    runStatus.className = 'failed';
    runModalSubtitle.textContent = 'Action failed before the command started.';
    runOutput.textContent += `\nError: ${error.message}\n`;
    setBusy(false);
    await loadState().catch(() => {});
  }
}

buttons.save.addEventListener('click', async () => {
  setBusy(true);
  showActionDialog('save', 'saving', 'Saving configuration...');
  try {
    await saveConfig();
    runStatus.textContent = 'saved';
    runStatus.className = 'passed';
    runModalSubtitle.textContent = 'Configuration saved.';
    runOutput.textContent += 'Saved framework.config.json\n';
  } catch (error) {
    appendOutput(`\nError: ${error.message}\n`);
    runStatus.textContent = 'failed';
    runStatus.className = 'failed';
    runModalSubtitle.textContent = 'Save failed.';
    runOutput.textContent += `\nError: ${error.message}\n`;
  } finally {
    setBusy(false);
  }
});

buttons.doctor.addEventListener('click', () => runAction('doctor'));
buttons.validate.addEventListener('click', () => runAction('validate'));
buttons.matrix.addEventListener('click', () => runAction('matrix'));
buttons.run.addEventListener('click', () => runAction('run'));
buttons.clear.addEventListener('click', () => {
  output.textContent = '';
});
buttons.toggleRunLog.addEventListener('click', () => {
  setRunLogVisible(!isRunLogVisible);
});
buttons.closeRunModal.addEventListener('click', () => {
  setRunModalVisible(false);
});
runModal.addEventListener('click', (event) => {
  if (event.target === runModal) setRunModalVisible(false);
});
suiteFilter.addEventListener('input', renderSuites);
for (const tab of suiteTabs) {
  tab.addEventListener('click', () => {
    selectedSuiteKind = tab.dataset.kind || 'all';
    for (const candidate of suiteTabs) {
      candidate.classList.toggle('active', candidate === tab);
    }
    renderSuites();
  });
}
for (const tab of targetTabs) {
  tab.addEventListener('click', () => {
    selectedTargetType = tab.dataset.targetType || 'all';
    for (const candidate of targetTabs) {
      candidate.classList.toggle('active', candidate === tab);
    }
    renderSuites();
  });
}
for (const tab of safetyTabs) {
  tab.addEventListener('click', () => {
    selectedParallelSafety = tab.dataset.parallelSafety || 'all';
    for (const candidate of safetyTabs) {
      candidate.classList.toggle('active', candidate === tab);
    }
    renderSuites();
  });
}
buttons.recommendedParallel.addEventListener('click', () => {
  const input = field('parallelSuiteKeys');
  const currentKeys = parseSuiteKeys(input.value).join(',');
  const recommendedKeys = parseSuiteKeys(state.recommendedParallelSuiteKeys).join(',');
  input.value = currentKeys === recommendedKeys ? '' : recommendedKeys;
  if (input.value) field('testSuite').value = 'parallel';
  field('parallelSuiteKeys').dispatchEvent(new Event('input', { bubbles: true }));
  updateSummary();
  renderSuites();
});
form.addEventListener('input', updateSummary);
form.addEventListener('focusin', (event) => {
  const name = event.target?.name;
  if (name === 'parallelSuiteKeys') {
    suiteClickTarget = 'parallelSuiteKeys';
  } else if (name === 'testSuite') {
    suiteClickTarget = 'testSuite';
  }
  renderSuites();
});
field('parallelSuiteKeys').addEventListener('input', renderSuites);
suiteList.addEventListener('pointerover', (event) => {
  const row = event.target.closest('.suite-row');
  if (row) showFloatingTooltip(row);
});
suiteList.addEventListener('pointerout', (event) => {
  const row = event.target.closest('.suite-row');
  if (row && !row.contains(event.relatedTarget)) hideFloatingTooltip();
});
suiteList.addEventListener('focusin', (event) => {
  const row = event.target.closest('.suite-row');
  if (row) showFloatingTooltip(row);
});
suiteList.addEventListener('focusout', hideFloatingTooltip);
suiteList.addEventListener('scroll', hideFloatingTooltip);
window.addEventListener('resize', hideFloatingTooltip);

loadState().catch((error) => appendOutput(`Error: ${error.message}\n`));
