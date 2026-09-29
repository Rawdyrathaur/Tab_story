export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

export function getFavicon(faviconUrl: string | undefined, domain: string): string {
  void faviconUrl;
  return getFaviconForDomain(domain);
}

export function getFaviconForDomain(domain: string): string {
  const icon = new URL(chrome.runtime.getURL('/_favicon/'));
  icon.searchParams.set('pageUrl', `https://${domain}`);
  icon.searchParams.set('size', '32');
  return icon.href;
}

export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function isInternalUrl(url: string): boolean {
  try { return !['http:', 'https:'].includes(new URL(url).protocol); }
  catch { return true; }
}
