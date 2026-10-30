import type { HttpFetch } from "../market-data.types";

/** Recorded-shape responses (trimmed). Tests never reach the network. */
export function fakeHttp(
  routes: Record<string, { status?: number; json?: unknown; text?: string }>,
): HttpFetch {
  return async (input) => {
    const key = Object.keys(routes).find((pattern) => input.includes(pattern));
    const route = key ? routes[key] : undefined;
    if (!route) return { ok: false, status: 404, json: async () => ({}), text: async () => "" };
    const status = route.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => route.json ?? {},
      text: async () => route.text ?? JSON.stringify(route.json ?? {}),
    };
  };
}

export const alphaVantageFixtures = {
  quote: {
    "Global Quote": {
      "01. symbol": "PETR4.SAO",
      "05. price": "38.4500",
      "07. latest trading day": "2024-06-14",
      "09. change": "0.5000",
      "10. change percent": "1.3175%",
    },
  },
  daily: {
    "Meta Data": { "2. Symbol": "AAPL" },
    "Time Series (Daily)": {
      "2024-06-13": {
        "1. open": "214.74",
        "2. high": "216.75",
        "3. low": "211.60",
        "4. close": "214.24",
        "5. volume": "97862729",
      },
      "2024-06-14": {
        "1. open": "213.85",
        "2. high": "215.17",
        "3. low": "211.30",
        "4. close": "212.49",
        "5. volume": "70122748",
      },
    },
  },
  weekly: {
    "Weekly Adjusted Time Series": {
      "2024-06-07": {
        "1. open": "37.0",
        "2. high": "38.0",
        "3. low": "36.5",
        "4. close": "37.8",
        "5. adjusted close": "37.3",
        "6. volume": "5000",
      },
      "2024-06-14": {
        "1. open": "37.8",
        "2. high": "39.0",
        "3. low": "37.5",
        "4. close": "38.45",
        "5. adjusted close": "37.95",
        "6. volume": "6000",
      },
    },
  },
  search: {
    bestMatches: [
      {
        "1. symbol": "PETR4.SAO",
        "2. name": "Petroleo Brasileiro SA Petrobras",
        "3. type": "Equity",
        "4. region": "Brazil",
        "8. currency": "BRL",
      },
    ],
  },
  note: {
    Note: "Thank you for using Alpha Vantage! Our standard API rate limit is 25 requests per day.",
  },
  information: {
    Information:
      "Thank you for using Alpha Vantage! Our standard API rate limit is 25 requests per day. Please subscribe to any of the premium plans to instantly remove all daily rate limits.",
  },
  premium: {
    Information:
      "This is a premium endpoint. You may subscribe to any of the premium plans at https://www.alphavantage.co/premium/ to instantly unlock all premium endpoints",
  },
  error: {
    "Error Message":
      "Invalid API call. Please retry or visit the documentation for TIME_SERIES_DAILY.",
  },
};

export const yahooQuote = {
  symbol: "PETR4.SA",
  regularMarketPrice: 38.45,
  regularMarketChange: 0.5,
  regularMarketChangePercent: 1.3175,
  currency: "BRL",
  regularMarketTime: new Date("2024-06-14T20:00:00Z"),
  exchangeDataDelayedBy: 15,
};
export const yahooChart = {
  quotes: [
    {
      date: new Date("2024-06-13T13:00:00Z"),
      open: 37.9,
      high: 38.7,
      low: 37.8,
      close: 38.1,
      adjclose: 37.6,
      volume: 1000,
    },
    {
      date: new Date("2024-06-14T13:00:00Z"),
      open: 38.1,
      high: 38.9,
      low: 38.0,
      close: 38.45,
      adjclose: 37.95,
      volume: 1200,
    },
    {
      date: new Date("2024-06-15T13:00:00Z"),
      open: null,
      high: null,
      low: null,
      close: null,
      adjclose: null,
      volume: null,
    },
  ],
  events: { dividends: [{ date: new Date("2024-06-10T00:00:00Z"), amount: 0.45 }], splits: [] },
};

export const brapiQuote = {
  results: [
    {
      symbol: "PETR4",
      regularMarketPrice: 38.45,
      regularMarketChange: 0.5,
      regularMarketChangePercent: 1.3175,
      regularMarketTime: "2024-06-14T20:00:00.000Z",
      currency: "BRL",
      historicalDataPrice: [
        {
          date: 1718323200,
          open: 37.9,
          high: 38.7,
          low: 37.8,
          close: 38.1,
          adjustedClose: 37.6,
          volume: 1000,
        },
        {
          date: 1718409600,
          open: 38.1,
          high: 38.9,
          low: 38.0,
          close: 38.45,
          adjustedClose: 37.95,
          volume: 1200,
        },
      ],
      dividendsData: {
        cashDividends: [
          {
            paymentDate: "2024-06-20T00:00:00.000Z",
            rate: 0.45,
            lastDatePrior: "2024-06-10T00:00:00.000Z",
          },
        ],
        stockDividends: [],
      },
    },
  ],
};

export const bcbCdi = [
  { data: "12/06/2024", valor: "0.040168" },
  { data: "13/06/2024", valor: "0.040168" },
  { data: "14/06/2024", valor: "0.040168" },
];

export const tesouroCsv = [
  "Tipo Titulo;Data Vencimento;Data Base;Taxa Compra Manha;Taxa Venda Manha;PU Compra Manha;PU Venda Manha;PU Base Manha",
  "Tesouro IPCA+;15/05/2035;13/06/2024;6,10;6,20;3.100,50;3.090,25;3.095,00",
  "Tesouro IPCA+;15/05/2035;14/06/2024;6,12;6,22;3.101,50;3.091,25;3.096,00",
  "Tesouro Selic;01/03/2029;14/06/2024;0,10;0,12;14.500,10;14.499,90;14.500,00",
].join("\n");
