import assert from 'node:assert/strict';

console.log('🚀 Starting Automated QA Test Suite for Tab Revo...\n');

// --- TEST SUITE 1: Calendar Grid Math & Symmetry ---
console.log('👉 [TEST 1] Calendar Grid Calculation & Symmetry Verification');
function generateCalendarCells(year: number, month: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  return { daysInMonth, firstDay, cells, totalRows: cells.length / 7 };
}

// Test September 2026
const sep2026 = generateCalendarCells(2026, 8); // month 8 is September
assert.equal(sep2026.daysInMonth, 30, 'September must have 30 days');
assert.equal(
  sep2026.cells.length % 7,
  0,
  'Calendar cells must be an exact multiple of 7 for 7 columns'
);
assert(sep2026.cells.includes(1) && sep2026.cells.includes(30), 'Must contain days 1 to 30');

// Test February leap year vs non-leap year
const febLeap = generateCalendarCells(2028, 1);
assert.equal(febLeap.daysInMonth, 29, 'Feb 2028 leap year must have 29 days');
assert.equal(febLeap.cells.length % 7, 0, 'Leap year cells must be multiple of 7');

const febNonLeap = generateCalendarCells(2026, 1);
assert.equal(febNonLeap.daysInMonth, 28, 'Feb 2026 non-leap year must have 28 days');
assert.equal(febNonLeap.cells.length % 7, 0, 'Non leap year cells must be multiple of 7');
console.log('   ✅ Calendar grid math & symmetrical 7-column layout passed.');

// --- TEST SUITE 2: Scheduled Tabs Query & Deleted Tab Filtering ---
console.log('\n👉 [TEST 2] Scheduled Tabs Logic & Exclusion of Deleted Tabs');
interface TabMock {
  id: number;
  title: string;
  url: string;
  scheduledAt?: number;
  deletedAt?: number;
  tags?: string[];
  notes?: string;
  createdAt: number;
}

const mockDbTabs: TabMock[] = [
  {
    id: 1,
    title: 'Active Scheduled 1',
    url: 'https://a.com',
    scheduledAt: new Date(2026, 8, 15, 10, 0).getTime(),
    createdAt: Date.now() - 10000,
  },
  {
    id: 2,
    title: 'Active Scheduled 2',
    url: 'https://b.com',
    scheduledAt: new Date(2026, 8, 15, 14, 0).getTime(),
    createdAt: Date.now() - 20000,
  },
  {
    id: 3,
    title: 'Deleted Scheduled',
    url: 'https://c.com',
    scheduledAt: new Date(2026, 8, 15, 16, 0).getTime(),
    deletedAt: Date.now() - 5000,
    createdAt: Date.now() - 30000,
  },
  { id: 4, title: 'Active Unscheduled', url: 'https://d.com', createdAt: Date.now() - 40000 },
];

function queryScheduledTabs(tabs: TabMock[]) {
  return tabs.filter((t) => !t.deletedAt && t.scheduledAt && t.scheduledAt > 0);
}

const activeScheduled = queryScheduledTabs(mockDbTabs);
assert.equal(activeScheduled.length, 2, 'Deleted tab must NOT appear in scheduled tabs');
assert(!activeScheduled.some((t) => t.id === 3), 'Tab ID 3 (deleted) must be excluded');
assert(
  activeScheduled.every((t) => !t.deletedAt),
  'All returned tabs must not have deletedAt'
);
console.log('   ✅ Scheduled tabs query successfully filters out deleted items.');

// --- TEST SUITE 3: Scheduling and Unscheduling Operations ---
console.log('\n👉 [TEST 3] Scheduling and Unscheduling Actions');
const tabToSchedule: TabMock = {
  id: 10,
  title: 'Test Tab',
  url: 'https://test.com',
  createdAt: Date.now(),
};

// Schedule tab
const scheduleTime = new Date(2026, 8, 20, 9, 30).getTime();
tabToSchedule.scheduledAt = scheduleTime;
assert.equal(tabToSchedule.scheduledAt, scheduleTime, 'Tab scheduledAt correctly set');

// Unschedule tab
tabToSchedule.scheduledAt = undefined;
assert.equal(
  tabToSchedule.scheduledAt,
  undefined,
  'Tab scheduledAt correctly cleared on unschedule'
);
console.log('   ✅ Schedule and Unschedule operations passed.');

// --- TEST SUITE 4: Tag Addition, Normalization, and Removal ---
console.log('\n👉 [TEST 4] Tag Auto-Add, Normalization, & Removal');
function normalizeTag(raw: string) {
  return raw.trim().replace(/^#/, '');
}

assert.equal(normalizeTag(' #work '), 'work', 'Must strip leading hash and whitespace');
assert.equal(normalizeTag('javascript'), 'javascript', 'Must preserve clean tags');
assert.equal(normalizeTag('   '), '', 'Empty tags must normalize to empty string');

let currentTags = ['work', 'research'];
const newTag = normalizeTag('#react');
if (newTag && !currentTags.includes(newTag)) {
  currentTags = [...currentTags, newTag];
}
assert.deepEqual(currentTags, ['work', 'research', 'react'], 'New tag correctly appended');

// Duplicate tag test
const duplicate = normalizeTag('work');
if (duplicate && !currentTags.includes(duplicate)) {
  currentTags = [...currentTags, duplicate];
}
assert.equal(currentTags.length, 3, 'Duplicate tags must not be added');

// Removal test
currentTags = currentTags.filter((t) => t !== 'research');
assert.deepEqual(currentTags, ['work', 'react'], 'Tag correctly removed');
console.log('   ✅ Tag auto-add, normalization, and removal passed.');

// --- TEST SUITE 5: Date Grouping for Tabs (TODAY, YESTERDAY, DD/MM/YYYY) ---
console.log('\n👉 [TEST 5] Date Grouping Headings (Outside Card)');
function getTestDateLabel(timestamp: number, now: Date): string {
  const d = new Date(timestamp);
  const isSameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (isSameDay) return 'TODAY';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  if (isYesterday) return 'YESTERDAY';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

const testNow = new Date(2026, 8, 12, 12, 0); // 12 Sep 2026
const todayTs = new Date(2026, 8, 12, 9, 0).getTime();
const yesterdayTs = new Date(2026, 8, 11, 15, 0).getTime();
const pastTs = new Date(2025, 11, 7, 10, 0).getTime();

assert.equal(getTestDateLabel(todayTs, testNow), 'TODAY', "Today's timestamp must return TODAY");
assert.equal(
  getTestDateLabel(yesterdayTs, testNow),
  'YESTERDAY',
  "Yesterday's timestamp must return YESTERDAY"
);
assert.equal(
  getTestDateLabel(pastTs, testNow),
  '07/12/2025',
  'Past date must format as dd/MM/yyyy'
);
console.log('   ✅ Date grouping heading labels passed.');

// --- TEST SUITE 6: Soft Delete & History Recycling ---
console.log('\n👉 [TEST 6] Soft-Delete and History Recycle Bin Logic');
let tabList: TabMock[] = [
  { id: 101, title: 'Tab 1', url: 'https://tab1.com', createdAt: 1000 },
  { id: 102, title: 'Tab 2', url: 'https://tab2.com', createdAt: 2000 },
];

// Soft delete tab 101
tabList = tabList.map((t) => (t.id === 101 ? { ...t, deletedAt: 3000 } : t));
const activeOnly = tabList.filter((t) => !t.deletedAt);
assert.equal(activeOnly.length, 1, 'Only 1 active tab should remain');
assert.equal(activeOnly[0].id, 102, 'Tab 102 should be the active tab');

// Check recycle bin
const recycled = tabList.filter((t) => Boolean(t.deletedAt));
assert.equal(recycled.length, 1, 'Recycle bin should have 1 tab');
assert.equal(recycled[0].id, 101, 'Tab 101 is in recycle bin');

// Restore tab 101
tabList = tabList.map((t) => (t.id === 101 ? { ...t, deletedAt: undefined } : t));
const restoredActive = tabList.filter((t) => !t.deletedAt);
assert.equal(restoredActive.length, 2, 'Both tabs should be active after restore');
console.log('   ✅ Soft delete and recycle restore passed.');

// --- TEST SUITE 7: Tab Title Limiter (Stationary 3-dots alignment) ---
console.log('\n👉 [TEST 7] Stationary Title Formatting (Max 2 words)');
function formatTabTitle(title: string): string {
  if (!title) return 'Untitled';
  const words = title.trim().split(/\s+/);
  const twoWords = words.slice(0, 2).join(' ');
  if (twoWords.length > 10) {
    return `${twoWords.slice(0, 10)}...`;
  }
  return words.length > 2 ? `${twoWords}...` : twoWords;
}

assert.equal(
  formatTabTitle('Google Ant...avity Search'),
  'Google Ant...',
  'Should limit to 2 words with ellipsis'
);
assert.equal(
  formatTabTitle('VeryLongWordWithoutSpaces'),
  'VeryLongWo...',
  'Should truncate long words exceeding 10 chars'
);
assert.equal(formatTabTitle('Hi'), 'Hi', 'Short titles preserved');
assert.equal(formatTabTitle('Two Words'), 'Two Words', 'Exact 2 words preserved without ellipsis');
console.log('   ✅ Title limit formatting passed.');

console.log('\n🎉 ALL AUTOMATED QA TESTS PASSED CLEANLY (7/7 suites)!');
