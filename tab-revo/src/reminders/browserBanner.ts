/** Optional website banner. Native notifications remain the fallback. */
export async function showBrowserReminder(
  items: { title: string; url: string; scheduledAt?: number }[]
): Promise<boolean> {
  try {
    const window = await chrome.windows.getLastFocused();
    if (!window.focused || window.type !== 'normal' || window.id === undefined) return false;
    const [tab] = await chrome.tabs.query({ active: true, windowId: window.id });
    if (!tab?.id || !tab.url || !/^https?:/.test(tab.url)) return false;
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [
        items.slice(0, 5).map((item) => ({
          title: item.title.slice(0, 160),
          url: item.url,
          scheduledAt: item.scheduledAt,
        })),
        items.length,
      ],
      func: (pages: { title: string; url: string; scheduledAt?: number }[], dueCount: number) => {
        // The side panel/address bar can own focus while this page remains visible.
        if (document.visibilityState !== 'visible' || !document.body) return false;
        document.getElementById('tab-revo-reminder-banner')?.remove();
        const host = document.createElement('div');
        host.id = 'tab-revo-reminder-banner';
        host.style.cssText =
          'all:initial!important;position:fixed!important;top:16px!important;right:16px!important;z-index:2147483647!important;display:block!important;max-width:calc(100vw - 32px)!important;';
        const root = host.attachShadow({ mode: 'closed' });
        const styles = document.createElement('style');
        styles.textContent =
          'button,a{font:inherit}button{cursor:pointer}button:focus-visible,a:focus-visible{outline:2px solid #a5b4fc;outline-offset:3px}a:hover{background:#4f46e5!important}button:hover{filter:brightness(1.2)}';
        root.append(styles);
        const box = document.createElement('div');
        box.setAttribute('role', 'status');
        box.style.cssText =
          'box-sizing:border-box;width:350px;max-width:calc(100vw - 32px);padding:16px;border:1px solid #474960;border-radius:16px;background:#20212b;color:#f5f5fa;box-shadow:0 12px 40px #0005;font:14px/1.5 system-ui;';
        const header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;gap:8px';
        const title = document.createElement('strong');
        title.textContent = '🔖 Time for a quick review';
        title.style.flex = '1';
        const toggle = document.createElement('button');
        toggle.textContent = '−';
        toggle.setAttribute('aria-label', 'Minimize reminder');
        toggle.setAttribute('aria-expanded', 'true');
        toggle.style.cssText =
          'border:0;border-radius:6px;background:#343544;color:white;width:28px;height:28px';
        const details = document.createElement('div');
        details.style.cssText = 'max-height:50vh;overflow:auto;overflow-wrap:anywhere';
        toggle.onclick = () => {
          details.hidden = !details.hidden;
          toggle.textContent = details.hidden ? '+' : '−';
          toggle.setAttribute('aria-expanded', String(!details.hidden));
          toggle.setAttribute(
            'aria-label',
            details.hidden ? 'Expand reminder' : 'Minimize reminder'
          );
        };
        const message = document.createElement('p');
        message.textContent =
          dueCount === 1
            ? 'Pick up where you left off.'
            : `${dueCount} saved pages are ready to revisit.`;
        message.style.cssText = 'color:#bfc1d4;margin:12px 0';
        details.append(message);
        for (const page of pages) {
          let url: URL;
          try {
            url = new URL(page.url);
            if (!['https:', 'http:'].includes(url.protocol)) continue;
          } catch {
            continue;
          }
          const row = document.createElement('div');
          row.style.cssText = 'padding:12px 0;border-top:1px solid #3a3b4d';
          const name = document.createElement('strong');
          name.textContent = page.title || url.hostname;
          const meta = document.createElement('div');
          meta.textContent =
            url.hostname +
            (page.scheduledAt
              ? ` · ${new Date(page.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : '');
          meta.style.cssText = 'font-size:12px;color:#bfc1d4;margin:4px 0 10px';
          const open = document.createElement('a');
          open.href = url.href;
          open.target = '_blank';
          open.rel = 'noopener noreferrer';
          open.textContent = 'Open page ↗';
          open.style.cssText =
            'display:inline-block;text-decoration:none;background:#6366f1;color:white;border-radius:8px;padding:6px 12px';
          row.append(name, meta, open);
          details.append(row);
        }
        if (dueCount > pages.length) {
          const more = document.createElement('p');
          more.textContent = `+${dueCount - pages.length} more in Tab Revo → Calendar`;
          details.append(more);
        }
        const dismiss = document.createElement('button');
        dismiss.textContent = '×';
        dismiss.setAttribute('aria-label', 'Dismiss reminder');
        dismiss.style.cssText =
          'border:0;border-radius:6px;padding:6px 12px;background:#6366f1;color:white;cursor:pointer;font:inherit;';
        dismiss.onclick = () => host.remove();
        header.append(title, toggle, dismiss);
        box.append(header, details);
        root.append(box);
        document.body.append(host);
        return true;
      },
    });
    return results.some((result) => result.result === true);
  } catch {
    return false;
  } // Restricted pages / denied site access use the native alert.
}
