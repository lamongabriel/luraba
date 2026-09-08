INSERT INTO "currencies" ("code", "symbol", "precision") VALUES
  ('USD', '$', 2), ('EUR', '€', 2), ('BRL', 'R$', 2), ('JPY', '¥', 0),
  ('GBP', '£', 2), ('AUD', 'A$', 2), ('CAD', 'C$', 2), ('CHF', 'Fr', 2),
  ('CNY', '¥', 2), ('INR', '₹', 2), ('MXN', '$', 2), ('ZAR', 'R', 2),
  ('RUB', '₽', 2), ('KRW', '₩', 0), ('TRY', '₺', 2), ('SEK', 'kr', 2),
  ('SGD', 'S$', 2), ('HKD', 'HK$', 2), ('PLN', 'zł', 2)
ON CONFLICT ("code") DO NOTHING;
--> statement-breakpoint
INSERT INTO "payment_methods" ("code", "name", "currency_id", "translation_key") VALUES
  ('cash', 'Cash', NULL, 'paymentMethods.system.cash'),
  ('credit_card', 'Credit Card', NULL, 'paymentMethods.system.credit_card'),
  ('debit_card', 'Debit Card', NULL, 'paymentMethods.system.debit_card'),
  ('paypal', 'PayPal', NULL, 'paymentMethods.system.paypal'),
  ('wire', 'Wire Transfer', 'USD', 'paymentMethods.system.wire'),
  ('pix', 'Pix', 'BRL', 'paymentMethods.system.pix'),
  ('boleto', 'Boleto', 'BRL', 'paymentMethods.system.boleto'),
  ('alipay', 'Alipay', 'CNY', 'paymentMethods.system.alipay'),
  ('wechat_pay', 'WeChat Pay', 'CNY', 'paymentMethods.system.wechat_pay'),
  ('upi', 'UPI', 'INR', 'paymentMethods.system.upi'),
  ('eft', 'EFT', 'ZAR', 'paymentMethods.system.eft')
ON CONFLICT DO NOTHING;
