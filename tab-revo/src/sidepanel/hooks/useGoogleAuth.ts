export async function getAuthToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken(
      { interactive: true, scopes: ['https://www.googleapis.com/auth/calendar.events'] },
      (result) => {
        if (chrome.runtime.lastError) {
          reject(
            new Error(
              'Google sign-in failed. Check that the OAuth Chrome extension ID matches this installation and Calendar access is allowed.'
            )
          );
        } else {
          const token = typeof result === 'string' ? result : result?.token;
          if (token) resolve(token);
          else reject(new Error('No auth token received'));
        }
      }
    );
  });
}

export async function createCalendarEvent(
  token: string,
  event: {
    title: string;
    description: string;
    startDateTime: string;
    endDateTime: string;
  }
): Promise<void> {
  if (Date.parse(event.startDateTime) <= Date.now()) {
    throw new Error(
      'The reminder time passed during sign-in. Choose a later time for the Google reminder.'
    );
  }
  const escapeText = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!
    );
  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    signal: AbortSignal.timeout(20000),
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: `🔖 Review: ${event.title}`,
      description: `TAB STORY · SAVED PAGE REMINDER\n\nPick up where you left off.\n\n${escapeText(event.title)}\n\n${escapeText(event.description)}\n\nOpen the page above when you are ready. Manage this email reminder in Google Calendar.`,
      start: {
        dateTime: event.startDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: event.endDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 0 },
          { method: 'email', minutes: 0 },
        ],
      },
    }),
  });
  if (!response.ok) {
    if (response.status === 401) {
      await chrome.identity.removeCachedAuthToken({ token });
      throw new Error('Google sign-in expired. Sign in again to add the email reminder.');
    }
    if (response.status === 403)
      throw new Error(
        'Google Calendar access denied. Enable the Calendar API for this OAuth project and allow Calendar access when signing in.'
      );
    if (response.status === 429)
      throw new Error('Google Calendar rate limit reached. Retry shortly.');
    throw new Error(`Google Calendar could not save the event (HTTP ${response.status}).`);
  }
}

export async function backupToGoogleDrive(token: string, data: object): Promise<void> {
  const fileName = 'tabstory-backup.json';
  const fileContent = JSON.stringify(data);

  // Check if backup file already exists
  const listRes = await fetch(
    'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name=' + "'" + fileName + "'",
    { headers: { Authorization: 'Bearer ' + token } }
  );
  if (!listRes.ok) throw new Error('Failed to list backup files');
  const listData = await listRes.json();
  const existingFile = listData.files?.[0];

  if (existingFile) {
    // Update existing file
    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files/' + existingFile.id + '?uploadType=media',
      {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: fileContent,
      }
    );
    if (!response.ok) throw new Error('Failed to update backup');
  } else {
    // Create new file
    const metadata = { name: fileName, parents: ['appDataFolder'] };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([fileContent], { type: 'application/json' }));
    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        body: form,
      }
    );
    if (!response.ok) throw new Error('Failed to create backup');
  }
}
