const alarm = document.getElementById('alarm');
let playing;
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || message?.target !== 'tab-story:alarm') return;
  if (message.operation === 'stop') {
    alarm.pause(); alarm.currentTime = 0;
    respond({ ok: true }); return;
  }
  if (message.operation !== 'play') return;
  // Simultaneous reminders share one playback rather than overlapping sounds.
  if (!playing && alarm.paused) {
    alarm.currentTime = 0;
    playing = alarm.play().finally(() => { playing = undefined; });
  }
  Promise.resolve(playing).then(() => respond({ ok: true }), () => respond({ ok: false }));
  return true;
});
