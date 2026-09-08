import { categoriesEndpoints, healthEndpoints } from "@luraba/contracts";
import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { requestContract } from "@/services/contract-client.service";

function clientReturning(data: unknown, status = 200) {
  return {
    request: vi.fn().mockResolvedValue({ data, status }),
  } as unknown as AxiosInstance;
}

describe("contract client", () => {
  it("builds paths, validates inputs, and parses list envelopes", async () => {
    const client = clientReturning({
      success: true,
      data: [],
      meta: {
        pagination: { page: 1, perPage: 20, totalCount: 0, totalPages: 0 },
      },
    });

    const result = await requestContract(categoriesEndpoints.list, {
      client,
      query: { page: 1 },
    });

    expect(result.data).toEqual([]);
    expect(result.meta.pagination.totalCount).toBe(0);
    expect(client.request).toHaveBeenCalledWith(
      expect.objectContaining({ method: "get", url: "/categories" }),
    );
  });

  it("selects the endpoint method, validates path params, and serializes queries", async () => {
    const id = "8ba1a21a-f0c7-475d-a91d-cad8349ff6c9";
    const updateClient = clientReturning({
      success: true,
      data: {
        id,
        name: "Updated",
        parentId: null,
        type: "expense",
        color: null,
        icon: null,
        createdAt: "2026-08-26T12:00:00.000Z",
        updatedAt: "2026-08-26T12:00:00.000Z",
      },
    });

    await requestContract(categoriesEndpoints.update, {
      client: updateClient,
      params: { id },
      body: { name: "Updated" },
    });

    expect(updateClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "patch",
        url: `/categories/${id}`,
        data: { name: "Updated" },
      }),
    );

    const listClient = clientReturning({
      success: true,
      data: [],
      meta: {
        pagination: { page: 2, perPage: 25, totalCount: 0, totalPages: 0 },
      },
    });

    await requestContract(categoriesEndpoints.list, {
      client: listClient,
      query: {
        page: "2",
        perPage: "25",
        search: "  food  ",
        sort: "name",
        sortDirection: "desc",
      },
    });

    expect(listClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "get",
        url: "/categories",
        params: {
          page: 2,
          perPage: 25,
          search: "food",
          sort: "name",
          sortDirection: "desc",
        },
      }),
    );
  });

  it("rejects invalid path params before making a request", async () => {
    const client = clientReturning({ success: true, data: {} });

    await expect(
      requestContract(categoriesEndpoints.update, {
        client,
        params: { id: "not-a-uuid" },
        body: { name: "Updated" },
      }),
    ).rejects.toThrow();
    expect(client.request).not.toHaveBeenCalled();
  });

  it("fails clearly when a successful response violates its schema", async () => {
    const client = clientReturning({
      success: true,
      data: { status: "not-a-health-status" },
    });
    await expect(requestContract(healthEndpoints.get, { client })).rejects.toMatchObject({
      code: "INVALID_API_RESPONSE",
    });
  });

  it("fails clearly when list metadata violates its contract", async () => {
    const client = clientReturning({
      success: true,
      data: [],
      meta: { pagination: { page: 1 } },
    });

    await expect(requestContract(categoriesEndpoints.list, { client })).rejects.toMatchObject({
      code: "INVALID_API_RESPONSE",
    });
  });

  it("parses raw operational responses without changing their wire format", async () => {
    const client = clientReturning({
      status: "ok",
      checkedAt: "2026-08-26T12:00:00.000Z",
      uptimeSeconds: 12,
      services: {
        api: {
          status: "up",
          checkedAt: "2026-08-26T12:00:00.000Z",
          uptimeSeconds: 12,
        },
        db: { status: "up", checkedAt: "2026-08-26T12:00:00.000Z" },
        fxProviders: {},
      },
    });

    await expect(requestContract(healthEndpoints.get, { client })).resolves.toMatchObject({
      status: "ok",
      services: { db: { status: "up" } },
    });
  });

  it("returns undefined for no-content endpoints", async () => {
    const client = clientReturning(undefined, 204);
    await expect(
      requestContract(categoriesEndpoints.delete, {
        client,
        params: { id: "8ba1a21a-f0c7-475d-a91d-cad8349ff6c9" },
      }),
    ).resolves.toBeUndefined();
  });
});
