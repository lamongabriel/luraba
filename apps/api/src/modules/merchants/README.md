# merchants

Merchants. Logos are attachments (`merchant` target, role `logo`). `imageUploadId` points at an image upload of the same household (`assertHouseholdImageUpload`, `null` clears it) and wins over the domain-derived `logoUrl` in the web `MerchantDisplay`. Migration `0038_merchant_image`.

## Rules

Reference implementation next to categories; extends `HouseholdScopedRepository`.

General module conventions: [../README.md](../README.md).
