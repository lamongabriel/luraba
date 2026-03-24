# Transaction Request Examples

All amounts are minor units (cent-based).

- BRL 50.00 -> `5000`
- BRL 30.00 -> `3000`
- USD 5.00 -> `500`

## 1) Create merchant

```bash
curl -X POST http://localhost:8080/api/v1/merchants \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "name": "Mullvad VPN",
    "website": "mullvad.net",
    "logoUrl": "https://img.logo.dev/mullvad.net"
  }'
```

## 2) 50 BRL pastel via PIX (expense)

```bash
curl -X POST http://localhost:8080/api/v1/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "type": "expense",
    "description": "Pastel",
    "amount": 5000,
    "currencyId": 1,
    "paymentMethod": "pix",
    "accountId": 1,
    "purchaseDate": "2026-03-23",
    "postedDate": "2026-03-23",
    "isExcluded": false,
    "isOneTimeTransaction": false
  }'
```

## 3) 30 BRL notebook via credit card (card_purchase)

```bash
curl -X POST http://localhost:8080/api/v1/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "type": "card_purchase",
    "description": "Notebook",
    "amount": 3000,
    "currencyId": 1,
    "paymentMethod": "credit_card",
    "creditCardId": 1,
    "purchaseDate": "2026-03-23",
    "postedDate": "2026-03-23",
    "isExcluded": false,
    "isOneTimeTransaction": false
  }'
```

## 4) 5 USD Mullvad via global credit card (card_purchase)

```bash
curl -X POST http://localhost:8080/api/v1/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "type": "card_purchase",
    "description": "Mullvad VPN",
    "amount": 500,
    "currencyId": 2,
    "paymentMethod": "credit_card",
    "creditCardId": 2,
    "merchantId": 1,
    "purchaseDate": "2026-03-23",
    "postedDate": "2026-03-23",
    "isExcluded": false,
    "isOneTimeTransaction": true
  }'
```

## 5) Transfer between accounts

```bash
curl -X POST http://localhost:8080/api/v1/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "type": "transfer",
    "description": "Transfer from checking to savings",
    "amount": 10000,
    "currencyId": 1,
    "paymentMethod": "pix",
    "accountId": 1,
    "toAccountId": 2,
    "purchaseDate": "2026-03-23",
    "postedDate": "2026-03-23",
    "isExcluded": false,
    "isOneTimeTransaction": false
  }'
```

## 6) List transactions

```bash
curl "http://localhost:8080/api/v1/transactions?userId=1"
```
