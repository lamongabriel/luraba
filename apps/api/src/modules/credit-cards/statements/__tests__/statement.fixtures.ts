/**
 * Statement files built from the cases the issuers produced (amounts are what the invoice printed). The Luraba side
 * of each case (the split it created) lives in the integration test.
 */

/** Nubank card CSV: `date,title,amount`, ISO dates, dot decimals, "Parcela X/Y" in the title. */
export const nubankSep2026 = [
  "date,title,amount",
  "2026-08-02,KaBuM - Parcela 2/10,478.63",
  "2026-08-14,Decolar - Parcela 1/2,364.90",
  "2026-08-20,Wiper blades - Parcela 1/2,105.11",
  "2026-08-21,Touti - Parcela 1/3,26.63",
  "2026-08-25,Riachuelo - Parcela 1/3,133.34",
  "2026-09-01,Coffee shop,12.50",
  "2026-09-02,IOF de compra internacional,3.77",
  "2026-09-02,Estorno de IOF,-3.77",
  "2026-09-03,Pagamento recebido,-1500.00",
].join("\n");

export const nubankOct2026 = [
  "date,title,amount",
  "2026-08-02,KaBuM - Parcela 3/10,478.64",
  "2026-08-14,Decolar - Parcela 2/2,364.88",
  "2026-08-20,Wiper blades - Parcela 2/2,105.10",
  "2026-08-21,Touti - Parcela 2/3,26.63",
  "2026-08-25,Riachuelo - Parcela 2/3,133.32",
  "2026-10-01,Pagamento recebido,-1200.00",
].join("\n");

export const nubankNov2026 = [
  "date,title,amount",
  "2026-08-02,KaBuM - Parcela 4/10,478.63",
  "2026-08-21,Touti - Parcela 3/3,26.63",
  "2026-08-25,Riachuelo - Parcela 3/3,133.32",
].join("\n");

/** Inter card CSV: semicolons, dd/mm/yyyy, "R$ 1.234,56", installment in the Lancamento or Tipo column. */
export const interNov2026 = [
  "Data;Lançamento;Categoria;Tipo;Valor",
  "03/08/2026;SHOPEE;COMPRAS;Parcela 3/3;R$ 66,34",
  "10/11/2026;PADARIA CENTRAL;ALIMENTACAO;Compra à vista;R$ 18,90",
  "12/11/2026;PAGAMENTO ON LINE;PAGAMENTO;Pagamento;- R$ 500,00",
].join("\n");

export const xpSample = [
  "Data;Estabelecimento;Portador;Valor;Parcela",
  "05/10/2026;AMAZON BR;JOHN DOE;R$ 1.234,56;2 de 6",
  "07/10/2026;UBER TRIP;JOHN DOE;R$ 24,30;-",
].join("\n");

export const interGlobalSample = [
  "Date,Description,Category,Type,Amount",
  "10/05/2026,Coffee Bean,Food,Purchase,$4.50",
  "10/06/2026,Payment Received,Payment,Payment,-$100.00",
].join("\n");
