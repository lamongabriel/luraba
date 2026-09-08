import { listTagsQuerySchema } from "@luraba/contracts/tags";
import { describe, expect, it } from "vitest";
import { ConflictError, NotFoundError } from "@/shared/errors";
import { createAuthenticatedContext } from "@/test/auth";
import { buildTagInput } from "@/test/factories";
import * as tagsService from "../tags.service";

describe("tags service", () => {
  it("creates a tag", async () => {
    const context = await createAuthenticatedContext();

    const tag = await tagsService.createTag(
      context.householdContext,
      buildTagInput({
        name: "Gramado Trip",
        color: "#16A34A",
        icon: "Ticket01Icon",
      }),
    );

    expect(tag.name).toBe("Gramado Trip");
    expect(tag.color).toBe("#16A34A");
    expect(tag.icon).toBe("Ticket01Icon");
  });

  it("rejects duplicate tag names in the same household", async () => {
    const context = await createAuthenticatedContext();
    const input = buildTagInput({ name: "Family" });

    await tagsService.createTag(context.householdContext, input);

    await expect(tagsService.createTag(context.householdContext, input)).rejects.toThrow(
      ConflictError,
    );
  });

  it("allows the same tag name in different households", async () => {
    const left = await createAuthenticatedContext();
    const right = await createAuthenticatedContext();
    const input = buildTagInput({ name: "2026 Travel Expenses" });

    const leftTag = await tagsService.createTag(left.householdContext, input);
    const rightTag = await tagsService.createTag(right.householdContext, input);

    expect(leftTag.id).not.toBe(rightTag.id);
    expect(leftTag.name).toBe(rightTag.name);
  });

  it("lists only tags from the active household", async () => {
    const context = await createAuthenticatedContext();
    const otherContext = await createAuthenticatedContext();

    await tagsService.createTag(context.householdContext, buildTagInput({ name: "Family" }));
    await tagsService.createTag(otherContext.householdContext, buildTagInput({ name: "Work" }));

    const tags = await tagsService.listTags(
      context.householdContext,
      listTagsQuerySchema.parse({}),
    );

    expect(tags.data).toHaveLength(1);
    expect(tags.data[0]?.name).toBe("Family");
  });

  it("updates a tag and can clear optional display fields", async () => {
    const context = await createAuthenticatedContext();
    const tag = await tagsService.createTag(
      context.householdContext,
      buildTagInput({ name: "Trip", color: "#16A34A", icon: "Ticket01Icon" }),
    );

    const updated = await tagsService.updateTag(context.householdContext, tag.id, {
      name: "Updated Trip",
      color: null,
      icon: null,
    });

    expect(updated).toEqual(
      expect.objectContaining({
        id: tag.id,
        name: "Updated Trip",
        color: null,
        icon: null,
      }),
    );
  });

  it("deletes a tag from the active household", async () => {
    const context = await createAuthenticatedContext();
    const tag = await tagsService.createTag(
      context.householdContext,
      buildTagInput({ name: "Temporary Tag" }),
    );

    await tagsService.deleteTag(context.householdContext, tag.id);

    await expect(tagsService.deleteTag(context.householdContext, tag.id)).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe("tags DB list filters", () => {
  it("combines search and every structured filter in SQL", async () => {
    const context = await createAuthenticatedContext();
    const target = await tagsService.createTag(
      context.householdContext,
      buildTagInput({
        name: "Filter Target Tag",
        color: "#16A34A",
        icon: "Ticket01Icon",
      }),
    );

    const result = await tagsService.listTags(
      context.householdContext,
      listTagsQuerySchema.parse({
        search: "Target",
        colors: "#16A34A,#FFFFFF",
        icons: "Ticket01Icon",
        hasColor: true,
        hasIcon: true,
        createdAtFrom: "2020-01-01",
        createdAtTo: "2030-01-01",
        updatedAtFrom: "2020-01-01",
        updatedAtTo: "2030-01-01",
        sort: "name",
        perPage: 1,
      }),
    );

    expect(result.data).toEqual([expect.objectContaining({ id: target.id })]);
    expect(result.meta.pagination.totalCount).toBe(1);
  });
});
