"use client";

import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CHANNELS,
  type NotificationChannel,
  type NotificationChannels,
  type NotificationPreference,
} from "@luraba/contracts";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/error-state";
import { SectionCard } from "@/components/section/section-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  getCurrentPushEndpoint,
  getPushSupport,
  subscribeBrowserToPush,
  unsubscribeBrowserFromPush,
} from "@/lib/web-push";
import {
  useSendTestNotificationMutation,
  useSubscribePushMutation,
  useUnsubscribePushMutation,
  useUpdateNotificationPreferencesMutation,
} from "@/mutations/notifications/use-notification-mutations";
import {
  useNotificationChannelsQuery,
  useNotificationPreferencesQuery,
} from "@/queries/notifications/use-notifications-queries";

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  in_app: "In-app",
  email: "Email",
  push: "Push",
  sms: "SMS",
};

const CATEGORY_LABELS: Record<(typeof NOTIFICATION_CATEGORIES)[number], string> = {
  transactions: "Transactions",
  bills: "Bills",
  investments: "Investments",
  system: "System",
};

function ChannelRow({
  title,
  description,
  status,
  testChannel,
  testDisabled,
  children,
}: {
  title: string;
  description: string;
  status: string;
  testChannel: NotificationChannel;
  testDisabled: boolean;
  children?: React.ReactNode;
}) {
  const test = useSendTestNotificationMutation({
    successToast: { title: "Test notification sent" },
  });

  return (
    <div className="flex flex-col gap-3 border-b border-border/60 py-4 first:pt-0 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
        <p className="text-xs text-muted-foreground">{status}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <Button
          variant="outline"
          size="sm"
          disabled={testDisabled || test.isPending}
          onClick={() => test.mutate({ channel: testChannel })}
        >
          Send test
        </Button>
      </div>
    </div>
  );
}

function PushControls({ channels }: { channels: NotificationChannels }) {
  const support = getPushSupport();
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const subscribe = useSubscribePushMutation();
  const unsubscribe = useUnsubscribePushMutation();

  useEffect(() => {
    void getCurrentPushEndpoint().then(setEndpoint);
  }, []);

  if (support === "needs-install") {
    return (
      <p className="max-w-xs text-xs text-muted-foreground">
        On iPhone, add Luraba to your Home Screen first, then open it from there.
      </p>
    );
  }
  if (support === "unsupported") {
    return <p className="text-xs text-muted-foreground">This browser doesn't support push.</p>;
  }
  if (!channels.channels.push.available || !channels.pushPublicKey) return null;

  const publicKey = channels.pushPublicKey;
  const enabledHere = endpoint !== null;

  async function enable() {
    setBusy(true);
    try {
      const subscription = await subscribeBrowserToPush(publicKey);
      await subscribe.mutateAsync(subscription);
      setEndpoint(subscription.endpoint);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't enable push notifications");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const removed = await unsubscribeBrowserFromPush();
      if (removed) await unsubscribe.mutateAsync(removed);
      setEndpoint(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't disable push notifications");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant={enabledHere ? "outline" : "default"}
      size="sm"
      disabled={busy}
      onClick={enabledHere ? disable : enable}
    >
      {enabledHere ? "Disable on this browser" : "Enable on this browser"}
    </Button>
  );
}

function SmsControls({ channels }: { channels: NotificationChannels }) {
  if (channels.channels.sms.ready) return null;
  return (
    <Button asChild variant="outline" size="sm">
      <Link href="/settings/profile">Add a phone number</Link>
    </Button>
  );
}

function ChannelsCard({ channels }: { channels: NotificationChannels }) {
  const { email, push, sms } = channels.channels;

  return (
    <SectionCard
      title="Channels"
      description="Set up where Luraba can reach you. Which alerts use each channel is chosen below."
    >
      <ChannelRow
        title="Email"
        description="Sent to the email address on your account."
        status={email.available ? "Ready" : "Not configured on this server."}
        testChannel="email"
        testDisabled={!email.available}
      />
      <ChannelRow
        title="Push"
        description="Browser and installed-app notifications, even when Luraba is closed."
        status={
          !push.available
            ? "Not configured on this server."
            : channels.pushSubscriptionCount > 0
              ? `Enabled on ${channels.pushSubscriptionCount} browser${channels.pushSubscriptionCount === 1 ? "" : "s"}.`
              : "Not enabled on any browser yet."
        }
        testChannel="push"
        testDisabled={!push.available || !push.ready}
      >
        <PushControls channels={channels} />
      </ChannelRow>
      <ChannelRow
        title="SMS"
        description="Text messages to the phone number on your profile."
        status={
          sms.available
            ? sms.ready
              ? "Ready"
              : "Add a phone number to your profile."
            : "No SMS provider is set up yet."
        }
        testChannel="sms"
        testDisabled={!sms.available || !sms.ready}
      >
        <SmsControls channels={channels} />
      </ChannelRow>
    </SectionCard>
  );
}

function AlertsCard({
  preferences,
  channels,
}: {
  preferences: NotificationPreference[];
  channels: NotificationChannels;
}) {
  const update = useUpdateNotificationPreferencesMutation();

  return (
    <SectionCard
      title="Alerts"
      description="Choose, for each alert, which channels it uses."
      contentClassName="overflow-x-auto"
    >
      <table className="w-full min-w-[28rem] text-left text-xs">
        <thead>
          <tr className="text-muted-foreground">
            <th className="pb-2 font-medium">Alert</th>
            {NOTIFICATION_CHANNELS.map((channel) => (
              <th key={channel} className="w-16 pb-2 text-center font-medium">
                {CHANNEL_LABELS[channel]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {NOTIFICATION_CATEGORIES.map((category) => {
            const rows = preferences.filter((preference) => preference.category === category);
            if (rows.length === 0) return null;

            return [
              <tr key={category}>
                <th
                  colSpan={NOTIFICATION_CHANNELS.length + 1}
                  className="pt-4 pb-1 text-[0.68rem] font-medium uppercase tracking-[0.18em] text-muted-foreground"
                >
                  {CATEGORY_LABELS[category]}
                </th>
              </tr>,
              ...rows.map((preference) => (
                <tr key={preference.eventType} className="border-t border-border/60">
                  <td className="py-3 pr-3">
                    <p className="text-sm font-medium">{preference.label}</p>
                    <p className="text-muted-foreground">{preference.description}</p>
                  </td>
                  {NOTIFICATION_CHANNELS.map((channel) => (
                    <td key={channel} className="text-center">
                      <Switch
                        aria-label={`${preference.label} by ${CHANNEL_LABELS[channel]}`}
                        checked={preference.channels[channel] ?? false}
                        disabled={!channels.channels[channel].available || update.isPending}
                        onCheckedChange={(enabled) =>
                          update.mutate({
                            preferences: [{ eventType: preference.eventType, channel, enabled }],
                          })
                        }
                      />
                    </td>
                  ))}
                </tr>
              )),
            ];
          })}
        </tbody>
      </table>
    </SectionCard>
  );
}

export function NotificationSettings() {
  const channelsQuery = useNotificationChannelsQuery();
  const preferencesQuery = useNotificationPreferencesQuery();

  if (channelsQuery.isLoading || preferencesQuery.isLoading) {
    return <Skeleton className="h-96" />;
  }

  if (channelsQuery.isError || !channelsQuery.data) {
    return (
      <ErrorState
        title="Couldn't load notification channels"
        description={channelsQuery.error?.message}
        onRetry={() => channelsQuery.refetch()}
      />
    );
  }

  if (preferencesQuery.isError || !preferencesQuery.data) {
    return (
      <ErrorState
        title="Couldn't load notification settings"
        description={preferencesQuery.error?.message}
        onRetry={() => preferencesQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-5">
      <ChannelsCard channels={channelsQuery.data} />
      <AlertsCard preferences={preferencesQuery.data} channels={channelsQuery.data} />
    </div>
  );
}
