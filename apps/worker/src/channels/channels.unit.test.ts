import { describe, expect, it, vi } from "vitest";
import { createEmailChannel } from "./email.js";
import { createPushChannel } from "./push.js";
import { createSmsChannel, formatSmsText } from "./sms.js";
import type { Message, Recipient } from "./types.js";

vi.mock("../logger.js", () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }));

const message: Message = {
  notificationId: "n-1",
  title: "Water bill due",
  body: "R$ 80,00 is due today",
  url: "/bills",
};

const recipient: Recipient = {
  userId: "u-1",
  email: "pat@example.com",
  name: "Pat",
  phoneNumber: "+5511999999999",
  pushSubscriptions: [
    { endpoint: "https://push.example/a", p256dh: "key-a", auth: "auth-a" },
    { endpoint: "https://push.example/b", p256dh: "key-b", auth: "auth-b" },
  ],
};

const mailConfig = {
  host: "smtp.example.com",
  port: 465,
  secure: true,
  username: "u",
  password: "p",
  fromName: "Luraba",
  fromEmail: "team@example.com",
};

describe("email channel", () => {
  it("is unavailable without SMTP settings and skips delivery", async () => {
    const channel = createEmailChannel(undefined, "https://app.example.com");

    expect(channel.isAvailable()).toBe(false);
    await expect(channel.deliver(recipient, message)).resolves.toMatchObject({ status: "skipped" });
  });

  it("sends an escaped message with an absolute link", async () => {
    const sendMail = vi.fn().mockResolvedValue({});
    const channel = createEmailChannel(mailConfig, "https://app.example.com", () => ({ sendMail }));

    const outcome = await channel.deliver(recipient, { ...message, title: "<b>Hi</b>" });

    expect(outcome).toEqual({ status: "sent" });
    const sent = sendMail.mock.calls[0]?.[0];
    expect(sent.to).toBe("pat@example.com");
    expect(sent.html).toContain("&lt;b&gt;Hi&lt;/b&gt;");
    expect(sent.html).toContain("https://app.example.com/bills");
  });

  it("lets transport errors bubble up so the job retries", async () => {
    const channel = createEmailChannel(mailConfig, "https://app.example.com", () => ({
      sendMail: vi.fn().mockRejectedValue(new Error("connection reset")),
    }));

    await expect(channel.deliver(recipient, message)).rejects.toThrow("connection reset");
  });
});

describe("push channel", () => {
  const config = { publicKey: "pub", privateKey: "priv", subject: "mailto:a@b.co" };

  it("sends to every subscription", async () => {
    const sender = { setVapidDetails: vi.fn(), sendNotification: vi.fn().mockResolvedValue({}) };
    const channel = createPushChannel(config, vi.fn(), sender);

    expect(await channel.deliver(recipient, message)).toEqual({ status: "sent" });
    expect(sender.sendNotification).toHaveBeenCalledTimes(2);
    expect(sender.setVapidDetails).toHaveBeenCalledOnce();
  });

  it("removes revoked subscriptions and still succeeds if another works", async () => {
    const onExpired = vi.fn().mockResolvedValue(undefined);
    const sender = {
      setVapidDetails: vi.fn(),
      sendNotification: vi
        .fn()
        .mockRejectedValueOnce(Object.assign(new Error("gone"), { statusCode: 410 }))
        .mockResolvedValueOnce({}),
    };
    const channel = createPushChannel(config, onExpired, sender);

    expect(await channel.deliver(recipient, message)).toEqual({ status: "sent" });
    expect(onExpired).toHaveBeenCalledWith("https://push.example/a");
  });

  it("throws when every attempt fails transiently", async () => {
    const sender = {
      setVapidDetails: vi.fn(),
      sendNotification: vi
        .fn()
        .mockRejectedValue(Object.assign(new Error("boom"), { statusCode: 500 })),
    };
    const channel = createPushChannel(config, vi.fn(), sender);

    await expect(channel.deliver(recipient, message)).rejects.toThrow("boom");
  });

  it("skips when the user has no registered browsers", async () => {
    const channel = createPushChannel(config, vi.fn(), {
      setVapidDetails: vi.fn(),
      sendNotification: vi.fn(),
    });

    await expect(
      channel.deliver({ ...recipient, pushSubscriptions: [] }, message),
    ).resolves.toMatchObject({ status: "skipped" });
  });
});

describe("sms channel", () => {
  it("is unavailable without a provider", () => {
    expect(createSmsChannel(undefined).isAvailable()).toBe(false);
  });

  it("sends a short text to the phone number", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const channel = createSmsChannel({ name: "test", send });

    expect(await channel.deliver(recipient, message)).toEqual({ status: "sent" });
    expect(send).toHaveBeenCalledWith("+5511999999999", formatSmsText(message.title, message.body));
  });

  it("caps the text length", () => {
    expect(formatSmsText("t", "x".repeat(1000)).length).toBe(320);
  });
});
