import { captureLink } from './reminders/capture';
import { getPresets, normalizeTaskUrl } from './reminders/model';
import { db } from './sidepanel/db';
import { stopReminderSound } from './reminders/sound';
import {
  ensureRecovery,
  execute,
  handleAlarm,
  handleNotification,
  recover,
  serialized,
} from './reminders/engine';
import { REMINDER_MESSAGE } from './reminders/service';
import { reminderError } from './reminders/errors';
import { handleAI } from './ai/background';
import { BACKUP_ALARM, ensureBackupAlarm, handleBackup } from './backup';
import { syncNow } from './sync/client';

const SYNC_ALARM = 'tab-revo:sync';
const resumeSync = () => {
  void chrome.alarms.create(SYNC_ALARM, { periodInMinutes: 1 });
  void syncNow().catch(() => {});
};
chrome.runtime.onStartup.addListener(resumeSync);
chrome.runtime.onInstalled.addListener(resumeSync);
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SYNC_ALARM) void syncNow().catch(() => {});
});
resumeSync();

chrome.runtime.onMessage.addListener((request, sender, respond) => {
  if (request?.type !== 'tab-revo:backup' || sender.id !== chrome.runtime.id || sender.tab) return;
  const operation = String(request.operation);
  const action =
    operation === 'restore'
      ? serialized(async () => {
          const result = await handleBackup(operation, request.id);
          await recover().catch(console.error);
          return result;
        })
      : handleBackup(operation, request.id);
  void action
    .then((result) => {
      respond({ ok: true, ...result });
    })
    .catch((error) =>
      respond({ ok: false, error: error instanceof Error ? error.message : 'Backup failed.' })
    );
  return true;
});
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === BACKUP_ALARM) void handleBackup('backup').catch(() => {});
});
chrome.runtime.onStartup.addListener(() => {
  void ensureBackupAlarm().catch(console.error);
});
void ensureBackupAlarm().catch(console.error);

chrome.runtime.onMessage.addListener((request, sender, respond) => {
  if (request?.type !== 'tab-revo:ai') return;
  if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL(''))) return;
  void handleAI(request).then(
    (result) => respond({ ok: true, ...result }),
    (error) =>
      respond({
        ok: false,
        code: error && typeof error === 'object' && 'code' in error ? error.code : undefined,
        error:
          error?.name === 'AbortError' || error?.name === 'TimeoutError'
            ? 'Request cancelled or timed out. Please retry.'
            : error instanceof Error
              ? error.message
              : 'AI request failed.',
      })
  );
  return true;
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'tab-revo:ai-stream') return;
  if (
    port.sender?.id !== chrome.runtime.id ||
    !port.sender.url?.startsWith(chrome.runtime.getURL(''))
  ) {
    port.disconnect();
    return;
  }
  const controller = new AbortController();
  let started = false;
  let connected = true;
  const send = (message: Record<string, unknown>) => {
    if (!connected) return;
    try {
      port.postMessage(message);
    } catch {
      controller.abort();
      connected = false;
    }
  };
  port.onDisconnect.addListener(() => {
    connected = false;
    controller.abort();
  });
  port.onMessage.addListener((request) => {
    if (started || request?.operation !== 'generate') return;
    started = true;
    // Keep the worker alive while a provider prepares its first token.
    const keepAlive = setInterval(() => send({ type: 'pending' }), 20000);
    void handleAI(
      request,
      (text) => send({ type: 'delta', text }),
      controller.signal,
      (progress) => send({ type: 'progress', ...progress })
    )
      .then(
        (result) => send({ type: 'result', result }),
        (error) =>
          send({
            type: 'error',
            code: error && typeof error === 'object' && 'code' in error ? error.code : undefined,
            error:
              error?.name === 'TimeoutError'
                ? 'The provider took too long. Please retry.'
                : error?.name === 'AbortError'
                  ? 'Request cancelled.'
                  : error instanceof Error
                    ? error.message
                    : 'AI request failed.',
          })
      )
      .finally(() => {
        clearInterval(keepAlive);
      });
  });
});

const runRecovery = () => {
  void serialized(recover).catch(console.error);
};
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
  runRecovery();
});

chrome.runtime.onStartup.addListener(runRecovery);
// Older Chromium builds (and some test browsers) do not expose the optional
// permission-level event.  Notification scheduling still works through the
// explicit permission checks, so treat the event as an enhancement only.
chrome.notifications?.onPermissionLevelChanged?.addListener((level) => {
  if (level === 'granted') runRecovery();
});
chrome.alarms.onAlarm.addListener((alarm) => {
  void serialized(() => handleAlarm(alarm)).catch(console.error);
});
chrome.notifications.onClosed.addListener((_id, byUser) => {
  if (byUser) void stopReminderSound();
});
chrome.notifications.onClicked.addListener((id) => {
  void serialized(() => handleNotification(id)).catch(console.error);
});
chrome.notifications.onButtonClicked.addListener((id, button) => {
  void serialized(() => handleNotification(id, button)).catch(console.error);
});
chrome.runtime.onMessage.addListener((request, sender, respond) => {
  if (request?.type !== REMINDER_MESSAGE || sender.id !== chrome.runtime.id) return;
  if (!sender.url?.startsWith(chrome.runtime.getURL(''))) return;
  void serialized(async () => {
    await execute(request);
    if (request.operation !== 'test' && request.operation !== 'reconcile') runRecovery();
  }).then(
    () => respond({ ok: true }),
    (error) => respond({ ok: false, code: reminderError(error, 'reminderDatabase').code })
  );
  return true;
});
void ensureRecovery().then(runRecovery).catch(console.error);

chrome.action.onClicked.addListener((tab) => {
  if (tab.windowId) {
    chrome.sidePanel.open({ windowId: tab.windowId }).catch(console.error);
  }
});

chrome.runtime.onInstalled.addListener(() => {
  void chrome.contextMenus
    .removeAll()
    .then(() =>
      chrome.contextMenus.create({
        id: 'schedule-link',
        title: 'Schedule link for later',
        contexts: ['link'],
      })
    );
});
chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== 'schedule-link' || !info.linkUrl) return;
  void chrome.storage.local
    .set({ 'tabStory.capture': { url: info.linkUrl, title: '' } })
    .then(() => chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel.html#capture') }));
});
chrome.commands.onCommand.addListener((command) => {
  if (command !== 'quick-save') return;
  void serialized(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url || !/^https?:/.test(tab.url)) return;
    const duplicate = (await db.tabs.toArray()).find(
      (t) =>
        !t.deletedAt &&
        !t.completedAt &&
        t.status === 'pending' &&
        normalizeTaskUrl(t.url) === normalizeTaskUrl(tab.url!)
    );
    if (duplicate) {
      await chrome.storage.local.set({
        'tabStory.capture': { url: tab.url, title: tab.title || '' },
      });
      await chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel.html#capture') });
      return;
    }
    const id = await captureLink(tab.url, tab.title || '', tab.favIconUrl);
    const when = getPresets().find((p) => p.id === 'tomorrow')!.when;
    await execute({ type: REMINDER_MESSAGE, operation: 'schedule', tabId: id, scheduledAt: when });
    await chrome.notifications.create('tab_story_capture', {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
      title: 'Saved for tomorrow morning',
      message: `${tab.title || tab.url} · ${new Date(when).toLocaleString()}`,
    });
    await recover();
  }).catch(console.error);
});
