import { describe, expect, it, vi } from "vitest";
import type { ChannelProvider, ExternalChannel, Recipient } from "../channels/types.js";
import { type DeliverDeps, type DeliverJob, processDelivery } from "./deliver.js";

vi.mock("../logger.js", () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }));

const DELIVERY_ID = "6f0b8e3c-8d4a-4a53-9b3e-0c3b2f6a1e11";

const recipient: Recipient = {
  userId: "user-1",
  email: "pat@example.com",
  name: "Pat",
  phoneNumber: null,
  pushSubscriptions: [],
};

function setup(
  overrides: {
    status?: string;
    channel?: ExternalChannel;
    provider?: Partial<ChannelProvider>;
    notification?: boolean;
  } = {},
) {
  const repository = {
    getDelivery: vi.fn().mockResolvedValue({
      id: DELIVERY_ID,
      notificationId: "n-1",
      channel: overrides.channel ?? "email",
      status: overrides.status ?? "pending",
    }),
    getNotification: vi
      .fn()
      .mockResolvedValue(
        overrides.notification === false
          ? undefined
          : { id: "n-1", userId: "user-1", title: "Water bill", body: "Due today", url: "/bills" },
      ),
    getRecipient: vi.fn().mockResolvedValue(recipient),
    markSent: vi.fn().mockResolvedValue(undefined),
    markSkipped: vi.fn().mockResolvedValue(undefined),
    recordFailure: vi.fn().mockResolvedValue(undefined),
  };
  const provider: ChannelProvider = {
    channel: overrides.channel ?? "email",
    isAvailable: () => true,
    deliver: vi.fn().mockResolvedValue({ status: "sent" }),
    ...overrides.provider,
  };
  const deps = {
    repository,
    channels: { email: provider, push: provider, sms: provider },
  } as unknown as DeliverDeps;

  return { repository, provider, deps };
}

const job = (attemptsMade = 0, attempts = 5): DeliverJob => ({
  data: { deliveryId: DELIVERY_ID },
  attemptsMade,
  opts: { attempts },
});

describe("processDelivery", () => {
  it("sends the notification and records the attempt number", async () => {
    const { deps, repository, provider } = setup();

    await processDelivery(deps, job(2));

    expect(provider.deliver).toHaveBeenCalledWith(
      recipient,
      expect.objectContaining({ title: "Water bill", url: "/bills" }),
    );
    expect(repository.markSent).toHaveBeenCalledWith(DELIVERY_ID, 3);
  });

  it("does nothing for a delivery that is already settled", async () => {
    const { deps, provider, repository } = setup({ status: "sent" });

    await processDelivery(deps, job());

    expect(provider.deliver).not.toHaveBeenCalled();
    expect(repository.markSent).not.toHaveBeenCalled();
  });

  it("skips when the channel is not configured on the worker", async () => {
    const { deps, repository } = setup({ provider: { isAvailable: () => false } });

    await processDelivery(deps, job());

    expect(repository.markSkipped).toHaveBeenCalledWith(
      DELIVERY_ID,
      "Channel is not configured on the worker",
    );
  });

  it("skips when the notification no longer exists", async () => {
    const { deps, repository, provider } = setup({ notification: false });

    await processDelivery(deps, job());

    expect(repository.markSkipped).toHaveBeenCalled();
    expect(provider.deliver).not.toHaveBeenCalled();
  });

  it("records a skipped outcome without retrying", async () => {
    const { deps, repository } = setup({
      provider: {
        deliver: vi.fn().mockResolvedValue({ status: "skipped", reason: "No phone number" }),
      },
    });

    await processDelivery(deps, job());

    expect(repository.markSkipped).toHaveBeenCalledWith(DELIVERY_ID, "No phone number");
  });

  it("rethrows a provider failure so BullMQ retries, keeping the delivery pending", async () => {
    const { deps, repository } = setup({
      provider: { deliver: vi.fn().mockRejectedValue(new Error("SMTP down")) },
    });

    await expect(processDelivery(deps, job(1))).rejects.toThrow("SMTP down");
    expect(repository.recordFailure).toHaveBeenCalledWith(DELIVERY_ID, 2, "SMTP down", false);
  });

  it("marks the delivery failed on the last attempt", async () => {
    const { deps, repository } = setup({
      provider: { deliver: vi.fn().mockRejectedValue(new Error("SMTP down")) },
    });

    await expect(processDelivery(deps, job(4, 5))).rejects.toThrow();
    expect(repository.recordFailure).toHaveBeenCalledWith(DELIVERY_ID, 5, "SMTP down", true);
  });

  it("rejects a malformed job payload", async () => {
    const { deps } = setup();

    await expect(
      processDelivery(deps, { data: { deliveryId: "nope" }, attemptsMade: 0, opts: {} }),
    ).rejects.toThrow();
  });
});
