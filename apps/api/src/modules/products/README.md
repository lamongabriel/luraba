# products

The household's reusable product catalog (a burger, a cable, butter): name, optional picture and the **latest known price**. Picture is an attachment (`product` target, role `image`); `imageUploadId` is validated with `assertHouseholdImageUpload` (`null` clears it). Migration `0042_products_and_transaction_items`.

## Rules

- Extends `HouseholdScopedRepository`. Names are unique per household (`findByName`, 409 on a duplicate).
- `price` is minor units in `currencyId`; the currency defaults to the household's. The price is only the *latest* one: a transaction item always stores its own snapshot, so repricing or deleting a product never rewrites history (deleting sets the items' `product_id` to null).
- Prices are normally updated from a transaction: the transactions module `PUT /transactions/:id/items` accepts `saveAsProductPrice` per item, which updates the product (or creates it by name) in the same database transaction. See [../transactions/README.md](../transactions/README.md).
- Permissions: members create and edit, viewers read, owners/admins delete.

General module conventions: [../README.md](../README.md).
