import { describe, expect, it, vi } from "vitest";
import { DependencyUnavailableError } from "@/shared/errors";
import { isMailConfigured, type MailConfig } from "../mail.config";
import { MailService } from "../mail.service";
import type { MailTransportFactory } from "../mail.types";

vi.mock("@/config/env", () => ({
  env: {
    mail: {},
  },
}));

const configuredMail: MailConfig = {
  provider: "resend",
  host: "smtp.resend.com",
  port: 465,
  secure: true,
  username: "resend",
  password: "re_test",
  fromName: "Luraba",
  fromEmail: "team@example.com",
  replyEmail: "reply@example.com",
  tlsCiphers: "TLS_AES_256_GCM_SHA384",
};

function createMockTransport() {
  const sendMail = vi.fn().mockResolvedValue({
    messageId: "message-123",
    accepted: ["accepted@example.com"],
    rejected: [{ name: "Rejected", address: "rejected@example.com" }],
  });
  const createTransport = vi.fn(() => ({ sendMail })) as MailTransportFactory;

  return {
    sendMail,
    createTransport,
  };
}

describe("mail configuration", () => {
  it("is configured only when every required SMTP field is present", () => {
    expect(isMailConfigured({})).toBe(false);
    expect(isMailConfigured({ ...configuredMail, password: undefined })).toBe(false);
    expect(isMailConfigured({ ...configuredMail, secure: false })).toBe(true);
    expect(isMailConfigured(configuredMail)).toBe(true);
  });
});

describe("MailService", () => {
  it("creates the SMTP transport lazily and sends with configured defaults", async () => {
    const { createTransport, sendMail } = createMockTransport();
    const service = new MailService(configuredMail, createTransport);

    expect(service.isConfigured()).toBe(true);
    expect(createTransport).not.toHaveBeenCalled();

    const result = await service.send({
      to: "accepted@example.com",
      subject: "Welcome",
      html: "<p>Welcome</p>",
      text: "Welcome",
    });

    expect(createTransport).toHaveBeenCalledWith({
      host: "smtp.resend.com",
      port: 465,
      secure: true,
      auth: {
        user: "resend",
        pass: "re_test",
      },
      tls: {
        ciphers: "TLS_AES_256_GCM_SHA384",
      },
    });
    expect(sendMail).toHaveBeenCalledWith({
      from: {
        name: "Luraba",
        address: "team@example.com",
      },
      to: "accepted@example.com",
      subject: "Welcome",
      html: "<p>Welcome</p>",
      text: "Welcome",
      replyTo: "reply@example.com",
    });
    expect(result).toEqual({
      messageId: "message-123",
      accepted: ["accepted@example.com"],
      rejected: ["rejected@example.com"],
    });
  });

  it("supports explicit sender and reply-to overrides", async () => {
    const { createTransport, sendMail } = createMockTransport();
    const service = new MailService(configuredMail, createTransport);

    await service.send({
      to: ["one@example.com", "two@example.com"],
      subject: "Notice",
      html: "<p>Notice</p>",
      from: {
        name: "Luraba Support",
        address: "support@example.com",
      },
      replyTo: "help@example.com",
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: {
          name: "Luraba Support",
          address: "support@example.com",
        },
        replyTo: "help@example.com",
      }),
    );
  });

  it("rejects invalid payloads before creating a transport", async () => {
    const { createTransport } = createMockTransport();
    const service = new MailService(configuredMail, createTransport);

    await expect(
      service.send({
        to: "not-an-email",
        subject: "Invalid",
        html: "<p>Invalid</p>",
      }),
    ).rejects.toThrow();
    expect(createTransport).not.toHaveBeenCalled();
  });

  it("reports unavailable configuration without creating a transport", async () => {
    const { createTransport } = createMockTransport();
    const service = new MailService({}, createTransport);

    expect(service.isConfigured()).toBe(false);
    await expect(
      service.send({
        to: "user@example.com",
        subject: "Unavailable",
        html: "<p>Unavailable</p>",
      }),
    ).rejects.toBeInstanceOf(DependencyUnavailableError);
    expect(createTransport).not.toHaveBeenCalled();
  });

  it("wraps SMTP delivery failures without leaking provider errors", async () => {
    const providerError = new Error("Authentication failed for re_secret");
    const sendMail = vi.fn().mockRejectedValue(providerError);
    const createTransport = vi.fn(() => ({ sendMail })) as MailTransportFactory;
    const service = new MailService(configuredMail, createTransport);

    await expect(
      service.send({
        to: "user@example.com",
        subject: "Failure",
        html: "<p>Failure</p>",
      }),
    ).rejects.toMatchObject({
      message: "Email delivery is currently unavailable",
      statusCode: 503,
    });
  });
});
