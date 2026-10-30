# components/products

The household product catalog UI. There is no products page: products are created and edited from the Items section of the transaction form ("New product", "Edit picture or name"), or implicitly by switching on "save as a product" on an item.

- `product-sheet.tsx`: create/edit sheet. After creating it stays open on the new product so a picture can be added straight away.
- `product-image-field.tsx`: picture upload, built on the shared `components/uploads/entity-image-field.tsx` (`targetType="product"`).
- The form is `components/forms/create-edit-product-form/`. Prices use `MoneyInput` in the product's currency.
- Products are always shown with `ProductDisplay` / `ProductMark` from `components/display/`.
- Items on a transaction: `components/forms/create-edit-transaction-form/sections/items-section.tsx` (edit) and `components/transactions/transaction-items-list.tsx` (detail panel). Items are saved with `PUT /transactions/:id/items` after the transaction itself is saved (`saveItems` in the form hook), for expenses, income and card purchases only.
