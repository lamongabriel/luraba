# components/products

The household product catalog UI. There is no products page. Products are created inline from the Items section of the transaction form: type a new name in the item row and it is saved as a product (with its price) when the transaction is saved; picking a saved product fills its latest price and updates it on save.

- `product-picker.tsx` (`ProductPicker`): the autocomplete used by item rows. Suggests saved products (picture, name, latest price) as you type, offers "Add “name” as a new product" for an unknown name, and unlinks the product when the text is edited.
- `product-sheet.tsx`: create/edit sheet. After creating it stays open on the new product so a picture can be added straight away.
- `product-image-field.tsx`: picture upload, built on the shared `components/uploads/entity-image-field.tsx` (`targetType="product"`).
- The form is `components/forms/create-edit-product-form/`. Prices use `MoneyInput` in the product's currency.
- Products are always shown with `ProductDisplay` / `ProductMark` from `components/display/`.
- Items on a transaction: `components/forms/create-edit-transaction-form/sections/items-section.tsx` (compact rows; the sum may not exceed the transaction amount and the header shows what is left to allocate, rule in `create-edit-transaction-form.schema.ts`, maths in `lib/transaction-items.ts`) and `components/transactions/transaction-items-list.tsx` (detail panel). Items are saved with `PUT /transactions/:id/items` after the transaction itself is saved (`saveItems` in the form hook), for expenses, income and card purchases only.
