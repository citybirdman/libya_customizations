import frappe
from erpnext.stock.doctype.item_price.item_price import ItemPrice, ItemPriceDuplicateItem
from frappe.query_builder import Criterion
from frappe.query_builder.functions import Cast_
from frappe import _

class CustomItemPrice(ItemPrice):
    def check_duplicates(self):
        item_price = frappe.qb.DocType("Item Price")

        query = (
            frappe.qb.from_(item_price)
            .select(item_price.price_list_rate)
            .where(
                (item_price.item_code == self.item_code)
                & (item_price.price_list == self.price_list)
                & (item_price.name != self.name)
            )
        )
        data_fields = (
            "uom",
            "valid_from",
            "valid_upto",
            "customer",
            "supplier",
            "batch_no",
            "production_year"
        )

        number_fields = ["packing_unit"]

        for field in data_fields:
            if self.get(field):
                query = query.where(item_price[field] == self.get(field))
            else:
                query = query.where(
                    Criterion.any(
                        [
                            item_price[field].isnull(),
                            Cast_(item_price[field], "varchar") == "",
                        ]
                    )
                )

        for field in number_fields:
            if self.get(field):
                query = query.where(item_price[field] == self.get(field))
            else:
                query = query.where(
                    Criterion.any(
                        [
                            item_price[field].isnull(),
                            item_price[field] == 0,
                        ]
                    )
                )

        price_list_rate = query.run(as_dict=True)

        if price_list_rate:
            frappe.throw(
                _(
                    "Item Price appears multiple times based on Price List, Supplier/Customer, Currency, Item, Batch, UOM, Qty, and Dates."
                ),
                ItemPriceDuplicateItem,
            )
