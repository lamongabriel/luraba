export type ExternalChannel = "email" | "push" | "sms";

export type PushSubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type Recipient = {
  userId: string;
  email: string;
  name: string;
  phoneNumber: string | null;
  pushSubscriptions: PushSubscriptionRow[];
};

export type Message = {
  notificationId: string;
  title: string;
  body: string;
  /** In-app route, for example "/transactions". */
  url: string | null;
};

export type Outcome = { status: "sent" } | { status: "skipped"; reason: string };

/**
 * A delivery channel. `deliver` returns an outcome when the result is final and
 * throws when the failure is worth retrying.
 */
export interface ChannelProvider {
  readonly channel: ExternalChannel;
  isAvailable(): boolean;
  deliver(recipient: Recipient, message: Message): Promise<Outcome>;
}
