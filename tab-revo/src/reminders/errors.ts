export type ReminderErrorCode =
  | 'invalidTab' | 'missingTab' | 'deletedTab' | 'invalidDate' | 'invalidTime'
  | 'nonexistentLocalTime' | 'pastSchedule' | 'invalidSchedule' | 'invalidSnooze'
  | 'invalidUrl' | 'reminderUnavailable' | 'reminderDatabase'
  | 'alarmRegistration' | 'alarmCancellation' | 'alarmLimit'
  | 'notificationPermission' | 'notificationFailed' | 'tabOpenFailed';

export class ReminderError extends Error {
  readonly code: ReminderErrorCode;
  constructor(code: ReminderErrorCode, options?: ErrorOptions) {
    super(`errors.${code}`, options);
    this.name = 'ReminderError';
    this.code = code;
  }
}

export function reminderError(error: unknown, fallback: ReminderErrorCode): ReminderError {
  return error instanceof ReminderError ? error : new ReminderError(fallback, { cause: error });
}
