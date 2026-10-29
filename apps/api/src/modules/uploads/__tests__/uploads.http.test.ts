import { createMemoryStorage } from "@luraba/storage";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "@/app";
import * as accountsService from "@/modules/accounts/accounts.service";
import * as merchantsService from "@/modules/merchants/merchants.service";
import * as transactionsService from "@/modules/transactions/transactions.service";
import { createAuthenticatedContext, createAuthHeaders } from "@/test/auth";
import { buildAccountInput, buildMerchantInput } from "@/test/factories";
import { setStorageForTesting } from "../uploads.storage";

// A real 1x1 PNG, so content sniffing sees genuine image bytes.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const PDF = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n");

const storage = createMemoryStorage();

beforeAll(() => setStorageForTesting(storage));
afterAll(() => setStorageForTesting(undefined));

async function upload(
  headers: Record<string, string>,
  file: Buffer,
  filename: string,
  type: string,
  scope = "household",
) {
  return request(app)
    .post(`/api/v1/uploads?scope=${scope}`)
    .set(headers)
    .attach("file", file, { filename, contentType: type });
}

describe("uploads", () => {
  it("requires authentication", async () => {
    expect((await request(app).get("/api/v1/uploads")).status).toBe(401);
  });

  it("stores a file, lists it and streams it back with range and caching support", async () => {
    const context = await createAuthenticatedContext();
    const headers = createAuthHeaders(context.token, context.household.id);

    const created = await upload(headers, PNG, "logo.png", "image/png");
    expect(created.status).toBe(201);
    const file = created.body.data;
    expect(file).toMatchObject({
      scope: "household",
      householdId: context.household.id,
      uploadedByUserId: context.user.id,
      filename: "logo.png",
      contentType: "image/png",
      kind: "image",
      attachmentCount: 0,
    });
    expect(storage.keys()).toContain(`households/${context.household.id}/${file.id}`);

    const list = await request(app).get("/api/v1/uploads").set(headers);
    expect(list.body.data.map((row: { id: string }) => row.id)).toContain(file.id);

    // No household header: the browser sends only the session cookie for <img>.
    const content = await request(app)
      .get(`/api/v1/uploads/${file.id}/content`)
      .set({ Cookie: context.token })
      .buffer(true)
      .parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => done(null, Buffer.concat(chunks)));
      });
    expect(content.status).toBe(200);
    expect(content.headers["content-type"]).toContain("image/png");
    expect(content.headers["content-disposition"]).toContain("inline");
    expect(Buffer.compare(content.body as Buffer, PNG)).toBe(0);

    const cached = await request(app)
      .get(`/api/v1/uploads/${file.id}/content`)
      .set({ Cookie: context.token })
      .set("If-None-Match", content.headers.etag as string);
    expect(cached.status).toBe(304);

    const ranged = await request(app)
      .get(`/api/v1/uploads/${file.id}/content`)
      .set({ Cookie: context.token })
      .set("Range", "bytes=0-3");
    expect(ranged.status).toBe(206);
    expect(ranged.headers["content-range"]).toMatch(/^bytes 0-3\//);
  });

  it("trusts the file's bytes over its name and declared type", async () => {
    const context = await createAuthenticatedContext();
    const headers = createAuthHeaders(context.token, context.household.id);

    const created = await upload(headers, Buffer.from("not an image"), "evil.png", "image/png");
    expect(created.status).toBe(201);
    expect(created.body.data.kind).not.toBe("image");

    const pdf = await upload(headers, PDF, "receipt.bin", "application/octet-stream");
    expect(pdf.body.data).toMatchObject({ contentType: "application/pdf", kind: "pdf" });

    const empty = await upload(headers, Buffer.alloc(0), "empty.txt", "text/plain");
    expect(empty.status).toBe(422);
  });

  it("keeps uploads private to their household and respects roles", async () => {
    const owner = await createAuthenticatedContext();
    const ownerHeaders = createAuthHeaders(owner.token, owner.household.id);
    const created = await upload(ownerHeaders, PNG, "private.png", "image/png");
    const id = created.body.data.id;

    const stranger = await createAuthenticatedContext();
    const hidden = await request(app)
      .get(`/api/v1/uploads/${id}/content`)
      .set({ Cookie: stranger.token });
    expect(hidden.status).toBe(404);

    const viewer = await createAuthenticatedContext({ role: "viewer" });
    const denied = await upload(
      createAuthHeaders(viewer.token, viewer.household.id),
      PNG,
      "x.png",
      "image/png",
    );
    expect(denied.status).toBe(403);
  });

  it("attaches uploads to records by role, replacing single-use roles", async () => {
    const context = await createAuthenticatedContext();
    const headers = createAuthHeaders(context.token, context.household.id);
    const merchant = await merchantsService.createMerchant(
      context.householdContext,
      buildMerchantInput({ name: "Logo Store" }),
    );

    const first = (await upload(headers, PNG, "one.png", "image/png")).body.data;
    const second = (await upload(headers, PNG, "two.png", "image/png")).body.data;
    const pdf = (await upload(headers, PDF, "doc.pdf", "application/pdf")).body.data;

    const attach = (uploadId: string, targetType: string, targetId: string, role?: string) =>
      request(app)
        .post("/api/v1/attachments")
        .set(headers)
        .send({ uploadId, targetType, targetId, role });

    expect((await attach(first.id, "merchant", merchant.id)).status).toBe(201);
    expect((await attach(second.id, "merchant", merchant.id)).status).toBe(201);

    const logos = await request(app)
      .get("/api/v1/attachments")
      .set(headers)
      .query({ targetType: "merchant", targetIds: merchant.id });
    expect(logos.body.data).toHaveLength(1);
    expect(logos.body.data[0].upload.id).toBe(second.id);

    // The replaced upload is still in the library and now unused.
    const unused = await request(app)
      .get("/api/v1/uploads")
      .set(headers)
      .query({ unattached: true });
    expect(unused.body.data.map((row: { id: string }) => row.id)).toContain(first.id);

    expect((await attach(pdf.id, "merchant", merchant.id)).status).toBe(422);
    expect((await attach(first.id, "merchant", crypto.randomUUID())).status).toBe(404);
    expect((await attach(first.id, "transaction", merchant.id, "receipt")).status).toBe(404);
    expect((await attach(first.id, "transaction", merchant.id, "nonsense")).status).toBe(422);
  });

  it("keeps several receipts on a transaction and protects used files from deletion", async () => {
    const context = await createAuthenticatedContext();
    const headers = createAuthHeaders(context.token, context.household.id);
    const account = await accountsService.createAccount(
      context.householdContext,
      buildAccountInput({ name: "Receipts", type: "cash", currencyCode: "BRL" }),
    );
    const transaction = await transactionsService.createTransaction(context.householdContext, {
      type: "expense",
      description: "iPhone",
      amount: 500_000,
      currencyCode: "BRL",
      paymentMethodCode: "pix",
      accountId: account.id,
      purchaseDate: new Date(),
      postedDate: new Date(),
    });

    const receipt = (await upload(headers, PDF, "receipt.pdf", "application/pdf")).body.data;
    const photo = (await upload(headers, PNG, "box.png", "image/png")).body.data;

    const send = (uploadId: string, role: string) =>
      request(app)
        .post("/api/v1/attachments")
        .set(headers)
        .send({ uploadId, targetType: "transaction", targetId: transaction.id, role });
    expect((await send(receipt.id, "receipt")).status).toBe(201);
    expect((await send(photo.id, "product")).status).toBe(201);

    const all = await request(app)
      .get("/api/v1/attachments")
      .set(headers)
      .query({ targetType: "transaction", targetIds: transaction.id });
    expect(all.body.data.map((row: { role: string }) => row.role).sort()).toEqual([
      "product",
      "receipt",
    ]);

    const blocked = await request(app).delete(`/api/v1/uploads/${receipt.id}`).set(headers);
    expect(blocked.status).toBe(409);

    const forced = await request(app)
      .delete(`/api/v1/uploads/${receipt.id}?force=true`)
      .set(headers);
    expect(forced.status).toBe(204);
    expect(storage.keys()).not.toContain(`households/${context.household.id}/${receipt.id}`);

    const left = await request(app)
      .get("/api/v1/attachments")
      .set(headers)
      .query({ targetType: "transaction", targetIds: transaction.id });
    expect(left.body.data).toHaveLength(1);
  });

  it("reports usage and cleans up unused uploads", async () => {
    const context = await createAuthenticatedContext();
    const headers = createAuthHeaders(context.token, context.household.id);
    await upload(headers, PNG, "unused-1.png", "image/png");
    await upload(headers, PDF, "unused-2.pdf", "application/pdf");

    const usage = await request(app).get("/api/v1/uploads/usage").set(headers);
    expect(usage.body.data).toMatchObject({ totalCount: 2, unattachedCount: 2, attachedCount: 0 });

    const used = await upload(headers, PNG, "used.png", "image/png");
    const merchant = await merchantsService.createMerchant(
      context.householdContext,
      buildMerchantInput({ name: "Cleanup Store" }),
    );
    await request(app)
      .post("/api/v1/attachments")
      .set(headers)
      .send({ uploadId: used.body.data.id, targetType: "merchant", targetId: merchant.id });

    const dry = await request(app)
      .post("/api/v1/uploads/cleanup")
      .set(headers)
      .send({ olderThanDays: 0, dryRun: true });
    expect(dry.body.data).toMatchObject({ dryRun: true, deletedCount: 2 });
    expect((await request(app).get("/api/v1/uploads").set(headers)).body.data).toHaveLength(3);

    const real = await request(app)
      .post("/api/v1/uploads/cleanup")
      .set(headers)
      .send({ olderThanDays: 0, dryRun: false });
    expect(real.body.data).toMatchObject({ dryRun: false, deletedCount: 2 });
    // The attached file survives cleanup.
    expect((await request(app).get("/api/v1/uploads").set(headers)).body.data).toHaveLength(1);

    const fresh = await upload(headers, PNG, "fresh.png", "image/png");
    const kept = await request(app)
      .post("/api/v1/uploads/cleanup")
      .set(headers)
      .send({ olderThanDays: 7, dryRun: false });
    expect(kept.body.data.deletedCount).toBe(0);
    expect(fresh.status).toBe(201);
  });

  it("keeps personal uploads personal and lets one become the profile picture", async () => {
    const context = await createAuthenticatedContext();
    const cookie = { Cookie: context.token };

    // No household header at all: personal uploads do not need one.
    const created = await upload(cookie, PNG, "me.png", "image/png", "user");
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ scope: "user", householdId: null });

    const attached = await request(app)
      .post("/api/v1/attachments")
      .set(cookie)
      .send({ uploadId: created.body.data.id, targetType: "user", targetId: context.user.id });
    expect(attached.status).toBe(201);
    expect(attached.body.data.role).toBe("avatar");

    const mine = await request(app).get("/api/v1/uploads?scope=user").set(cookie);
    expect(mine.body.data).toHaveLength(1);

    const stranger = await createAuthenticatedContext();
    const hidden = await request(app)
      .get(`/api/v1/uploads/${created.body.data.id}/content`)
      .set({ Cookie: stranger.token });
    expect(hidden.status).toBe(404);

    const wrongTarget = await request(app)
      .post("/api/v1/attachments")
      .set(cookie)
      .send({ uploadId: created.body.data.id, targetType: "user", targetId: stranger.user.id });
    expect(wrongTarget.status).toBe(404);
  });
});

describe("uploads without a bucket", () => {
  it("explains that storage is not configured", async () => {
    setStorageForTesting(undefined);
    const context = await createAuthenticatedContext();
    const headers = createAuthHeaders(context.token, context.household.id);

    const config = await request(app).get("/api/v1/uploads/config").set(headers);
    expect(config.body.data.enabled).toBe(false);

    const response = await upload(headers, PNG, "a.png", "image/png");
    expect(response.status).toBe(503);
    setStorageForTesting(storage);
  });
});
