import frappe

def update_item_price(doc, method=None):
    price_list = (
        frappe.get_cached_value("Warehouse", doc.warehouse, "price_list")
        or frappe.get_cached_value("Selling Settings", None, "selling_price_list")
    )
    if not price_list:
        return

    rate, qty = frappe.db.get_value(
        "Bin",
        {"item_code": doc.item_code, "warehouse": doc.warehouse},
        ["valuation_rate", "actual_qty"],
    ) or (None, None)

    if rate is None or qty is None:
        return

    frappe.db.sql(
        """
        UPDATE `tabItem Price`
        SET stock_valuation_rate = %s,
            stock_qty = %s
        WHERE item_code = %s
          AND price_list = %s
        """,
        (rate, qty, doc.item_code, price_list),
    )


