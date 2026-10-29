import { describe, expect, it } from "vitest";
import { createMemoryStorage } from "./memory.js";

async function read(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString();
}

describe("memory storage", () => {
  it("stores, reads, ranges and deletes objects", async () => {
    const storage = createMemoryStorage();
    await storage.put({ key: "a", body: Buffer.from("hello world"), contentType: "text/plain" });

    expect(await storage.exists("a")).toBe(true);
    expect(await read((await storage.get("a"))?.body as NodeJS.ReadableStream)).toBe("hello world");

    const ranged = await storage.get("a", { start: 6, end: 10 });
    expect(await read(ranged?.body as NodeJS.ReadableStream)).toBe("world");
    expect(ranged).toMatchObject({ totalLength: 11, range: { start: 6, end: 10 } });

    await storage.delete("a");
    expect(await storage.get("a")).toBeUndefined();
    await expect(storage.delete("a")).resolves.toBeUndefined();
  });
});
