import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "@/app";
import { createAuthenticatedContext, createAuthHeaders } from "@/test/auth";

describe("investments: import and export", () => {
  it("previews, commits, dedupes and exports a B3 trade file", async () => {
    const auth = await createAuthenticatedContext();
    const headers = createAuthHeaders(auth.token, auth.household.id);
    const api = (method: "get" | "post", path: string) =>
      request(app)[method](`/api/v1/investments${path}`).set(headers);

    const account = await api("post", "/accounts").send({ name: "B3", currencyCode: "BRL" });
    const accountId = account.body.data.id as string;
    const symbol = `IMPT${Math.floor(Math.random() * 9000 + 1000)}`.slice(0, 5);
    const created = await api("post", "/assets").send({
      symbol: `${symbol}4`,
      name: "Import Corp",
      assetClass: "STOCK",
      exchange: "BVMF",
      country: "BR",
      currencyCode: "BRL",
    });
    expect(created.status).toBe(201);

    const csv = [
      "Data do Negócio;Tipo de Movimentação;Mercado;Prazo/Vencimento;Instituição;Código de Negociação;Quantidade;Preço;Valor",
      `02/01/2026;Compra;Mercado à Vista;-;XP;${symbol}4;100;10,00;1.000,00`,
      `05/01/2026;Venda;Mercado à Vista;-;XP;${symbol}4;40;12,00;480,00`,
      `06/01/2026;Compra;Mercado à Vista;-;XP;UNKNOWN9;1;1,00;1,00`,
    ].join("\n");

    const preview = await api("post", "/imports/preview").send({
      accountId,
      format: "b3_negociacao",
      content: csv,
      fileName: "b3.csv",
    });
    expect(preview.status).toBe(201);
    expect(preview.body.data).toMatchObject({ total: 3, ok: 2, errors: 1, duplicates: 0 });
    expect(preview.body.data.rows[2].message).toContain("not in the catalog");

    const commit = await api("post", `/imports/${preview.body.data.batchId}/commit`).send({});
    expect(commit.status).toBe(200);
    expect(commit.body.data.created).toBe(2);

    const positions = await api("get", `/positions?accountId=${accountId}`);
    expect(positions.body.data[0]).toMatchObject({ quantity: "60", realizedPnl: 8_000 });

    // Importing the same file again flags every row as a duplicate.
    const again = await api("post", "/imports/preview").send({
      accountId,
      format: "b3_negociacao",
      content: csv,
    });
    expect(again.body.data).toMatchObject({ duplicates: 2, ok: 0 });
    const twice = await api("post", `/imports/${preview.body.data.batchId}/commit`).send({});
    expect(twice.status).toBe(422);

    const exported = await request(app)
      .get("/api/v1/investments/export/events?format=csv")
      .set(headers);
    expect(exported.status).toBe(200);
    expect(exported.text).toContain(`${symbol}4`);
    const backup = await request(app).get("/api/v1/investments/export/backup").set(headers);
    expect(JSON.parse(backup.text).events).toHaveLength(2);
    const template = await request(app).get("/api/v1/investments/imports/template").set(headers);
    expect(template.text).toContain("date,type,symbol");
  });
});
