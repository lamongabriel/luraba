import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_EVENT_TYPES,
  NOTIFICATION_EVENTS,
  type NotificationChannel,
  type NotificationEventType,
  type NotificationPreference,
} from "@luraba/contracts";
import type { PreferenceOverride } from "./types.js";

export type PreferenceLookup = ReadonlyMap<string, boolean>;

function key(eventType: string, channel: string): string {
  return `${eventType}:${channel}`;
}

export function buildPreferenceLookup(overrides: readonly PreferenceOverride[]): PreferenceLookup {
  return new Map(overrides.map((row) => [key(row.eventType, row.channel), row.enabled]));
}

export function isChannelEnabled(
  lookup: PreferenceLookup,
  eventType: NotificationEventType,
  channel: NotificationChannel,
): boolean {
  return lookup.get(key(eventType, channel)) ?? NOTIFICATION_EVENTS[eventType].defaults[channel];
}

export function resolveEnabledChannels(
  lookup: PreferenceLookup,
  eventType: NotificationEventType,
): NotificationChannel[] {
  return NOTIFICATION_CHANNELS.filter((channel) => isChannelEnabled(lookup, eventType, channel));
}

/** The full event × channel matrix for one user, defaults filled in. */
export function buildPreferenceMatrix(lookup: PreferenceLookup): NotificationPreference[] {
  return NOTIFICATION_EVENT_TYPES.map((eventType) => {
    const event = NOTIFICATION_EVENTS[eventType];
    return {
      eventType,
      category: event.category,
      label: event.label,
      description: event.description,
      channels: {
        in_app: isChannelEnabled(lookup, eventType, "in_app"),
        email: isChannelEnabled(lookup, eventType, "email"),
        push: isChannelEnabled(lookup, eventType, "push"),
        sms: isChannelEnabled(lookup, eventType, "sms"),
      },
    };
  });
}
