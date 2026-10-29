"use client";

import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CHANNELS,
  type NotificationChannel,
  type NotificationChannels,
  type NotificationPreference,
} from "@luraba/contracts";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  useUpdateNotificationContactMutation,
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
  const [phone, setPhone] = useState(channels.phoneNumber ?? "");
  const save = useUpdateNotificationContactMutation({
    successToast: { title: "Phone number saved" },
  });

  useEffect(() => {
    setPhone(channels.phoneNumber ?? "");
  }, [channels.phoneNumber]);

  const trimmed = phone.trim();
  const unchanged = trimmed === (channels.phoneNumber ?? "");

  return (
    <div className="flex items-center gap-2">
      <div className="space-y-1">
        <Label htmlFor="notification-phone" className="sr-only">
          Phone number
        </Label>
        <Input
          id="notification-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+5511999999999"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className="w-44"
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={unchanged || save.isPending}
        onClick={() => save.mutate({ phoneNumber: trimmed === "" ? null : trimmed })}
      >
        Save
      </Button>
    </div>
  );
}

function ChannelsCard({ channels }: { channels: NotificationChannels }) {
  const { email, push, sms } = channels.channels;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Channels</CardTitle>
        <p className="text-xs text-muted-foreground">
          Set up where Luraba can reach you. Which alerts use each channel is chosen below.
        </p>
      </CardHeader>
      <CardContent>
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
          description="Text messages to your phone, in international format."
          status={
            sms.available
              ? sms.ready
                ? "Ready"
                : "Add a phone number."
              : "No SMS provider is set up yet."
          }
          testChannel="sms"
          testDisabled={!sms.available || !sms.ready}
        >
          <SmsControls channels={channels} />
        </ChannelRow>
      </CardContent>
    </Card>
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
    <Card>
      <CardHeader>
        <CardTitle>Alerts</CardTitle>
        <p className="text-xs text-muted-foreground">
          Choose, for each alert, which channels it uses.
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
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
      </CardContent>
    </Card>
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
