let creating: Promise<void> | undefined;
async function ensurePlayer() {
  if (!creating) creating = (async () => {
    const contexts = await chrome.runtime.getContexts({ contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT], documentUrls: [chrome.runtime.getURL('alarm.html')] });
    if (!contexts.length) await chrome.offscreen.createDocument({ url: 'alarm.html', reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK], justification: 'Play the bundled alarm sound for scheduled Tab Story reminders.' });
  })().finally(() => { creating = undefined; });
  await creating;
}
export async function playReminderSound() {
  try {
    await ensurePlayer();
    const result = await chrome.runtime.sendMessage({ target: 'tab-story:alarm', operation: 'play' });
    if (!result?.ok) throw new Error('Alarm playback failed');
  } catch (error) { console.warn('[Tab Story] alarm sound unavailable', error); }
}
export async function stopReminderSound() {
  try {
    const contexts = await chrome.runtime.getContexts({ contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT], documentUrls: [chrome.runtime.getURL('alarm.html')] });
    if (contexts.length) await chrome.runtime.sendMessage({ target: 'tab-story:alarm', operation: 'stop' });
  } catch (error) { console.warn('[Tab Story] alarm stop failed', error); }
}
