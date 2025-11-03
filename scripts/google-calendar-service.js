/**
 * Google Calendar Service
 * Handles Google Calendar integration
 */

class GoogleCalendarService {
  constructor(authService) {
    this.authService = authService;
  }

  async createEvent(eventData) {
    try {
      const token = await this.authService.getToken();

      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      });

      if (!response.ok) {
        throw new Error('Failed to create calendar event');
      }

      const event = await response.json();
      console.log('Calendar event created:', event);
      return { success: true, event };
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      return { success: false, error: error.message };
    }
  }

  async listEvents(maxResults = 10) {
    try {
      const token = await this.authService.getToken();

      if (!token) {
        throw new Error('Not authenticated');
      }

      const now = new Date().toISOString();
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=${maxResults}&timeMin=${now}&orderBy=startTime&singleEvents=true`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch calendar events');
      }

      const data = await response.json();
      console.log('Calendar events fetched:', data.items?.length || 0);
      return { success: true, events: data.items || [] };
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteEvent(eventId) {
    try {
      const token = await this.authService.getToken();

      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete calendar event');
      }

      console.log('Calendar event deleted');
      return { success: true };
    } catch (error) {
      console.error('Failed to delete calendar event:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.GoogleCalendarService = GoogleCalendarService;
}
