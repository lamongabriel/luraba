import { describe, expect, it } from "vitest";
import {
  toTransactionApiParams,
  UNCATEGORIZED,
} from "@/components/tables/transactions/transactions-table-filters";
import {
  countActive,
  createEmptyTree,
  decodeTree,
  encodeTree,
  readValues,
  setFieldRule,
} from "../tree";

describe("filter tree", () => {
  it("round-trips through the URL parameter", () => {
    let tree = setFieldRule(createEmptyTree(), "originTypes", {
      operator: "is_any_of",
      value: ["expense"],
    });
    tree = setFieldRule(tree, "includeInBudget", { operator: "is", value: "true" });
    const decoded = decodeTree(encodeTree(tree));
    expect(readValues(decoded).list("originTypes")).toEqual(["expense"]);
    expect(readValues(decoded).flag("includeInBudget")).toBe(true);
    expect(countActive(decoded)).toBe(2);
  });

  it("ignores garbage and unknown fields", () => {
    expect(countActive(decodeTree("not json"))).toBe(0);
    const tree = decodeTree('[["nope","is",1],["a","is_any_of",["x"]]]', new Set(["a"]));
    expect(countActive(tree)).toBe(1);
  });

  it("keeps one rule per field and removes with null", () => {
    let tree = setFieldRule(createEmptyTree(), "a", { operator: "is_any_of", value: ["x"] });
    tree = setFieldRule(tree, "a", { operator: "is_any_of", value: ["y"] });
    expect(readValues(tree).list("a")).toEqual(["y"]);
    expect(countActive(setFieldRule(tree, "a", null))).toBe(0);
  });

  it("does not encode half-built chips", () => {
    const tree = setFieldRule(createEmptyTree(), "a", { operator: "is_any_of", value: [] });
    expect(encodeTree(tree)).toBeNull();
  });

  it("reads money ranges", () => {
    const tree = setFieldRule(createEmptyTree(), "amount", {
      operator: "between",
      value: [10, 50],
    });
    expect(readValues(tree).money("amount")).toEqual({ min: 10, max: 50 });
  });
});

describe("toTransactionApiParams", () => {
  it("maps chips to the unchanged API params", () => {
    let tree = setFieldRule(createEmptyTree(), "categoryIds", {
      operator: "is_any_of",
      value: ["c1", UNCATEGORIZED],
    });
    tree = setFieldRule(tree, "amount", { operator: "between", value: [10, 50] });
    tree = setFieldRule(tree, "includeInBudget", { operator: "is", value: "false" });
    expect(toTransactionApiParams(readValues(tree))).toEqual({
      categoryIds: ["c1"],
      uncategorized: true,
      amountMin: 1000,
      amountMax: 5000,
      includeInBudget: false,
    });
  });
});

describe("operators", () => {
  it("reads negations, amount and date operators", () => {
    let tree = setFieldRule(createEmptyTree(), "originTypes", {
      operator: "is_none_of",
      value: ["refund"],
    });
    tree = setFieldRule(tree, "amount", { operator: "gt", value: 10 });
    tree = setFieldRule(tree, "purchaseDate", { operator: "is_before", value: "2026-11-01" });
    tree = setFieldRule(tree, "includeInBudget", { operator: "is_not", value: "true" });
    const values = readValues(tree);
    expect(values.list("originTypes")).toEqual([]);
    expect(values.excluded("originTypes")).toEqual(["refund"]);
    expect(values.money("amount")).toEqual({ min: 10, max: null, minExclusive: true });
    expect(values.dates("purchaseDate")).toEqual({ from: null, to: "2026-10-31" });
    expect(values.flag("includeInBudget")).toBe(false);
    expect(toTransactionApiParams(values)).toMatchObject({
      excludeOriginTypes: ["refund"],
      amountMin: 1001,
      purchaseDateTo: "2026-10-31",
      includeInBudget: false,
    });
  });
});
