# Copyright (c) 2025, Ahmed Zaytoon and contributors
# For license information, please see license.txt

import frappe
from frappe import _

def execute(filters=None):
    if not filters:
        filters = {}

    # --- Default values ---
    filters.setdefault("to_date", frappe.utils.today())
    filters.setdefault("brand", [])
    filters.setdefault("minimum_qty", 1)

    # --- Parameters for query ---
    conditions = []
    params = {
        "to_date": filters["to_date"],
        "minimum_qty": int(filters.get("minimum_qty", 0))
    }

    if filters.get("brand"):
        brand_list = [b.strip() for b in filters["brand"] if b.strip()]
        if brand_list:
            conditions.append("i.brand IN %(brand)s")
            params["brand"] = brand_list

    brand_condition = f" AND {' AND '.join(conditions)}" if conditions else ""

    # --- Query ---
    query = f"""
    WITH
    stock_ledger_entry AS (
        SELECT item_code, SUM(actual_qty) AS actual_qty
        FROM `tabStock Ledger Entry`
        WHERE is_cancelled = 0
	    AND warehouse = %(warehouse)s
        AND posting_date <= %(to_date)s
        GROUP BY item_code
        HAVING SUM(actual_qty) > 0
    ),
    item_price AS (
        SELECT item_code, price_list_rate
        FROM `tabItem Price`
        WHERE selling = 1
        AND price_list = %(price_list)s
    ),
    item AS (
        SELECT i.name, i.item_name, i.brand, i.is_stock_item
        FROM `tabItem` i
        LEFT JOIN `tabStock Ledger Entry` sle ON i.name = sle.item_code
        WHERE is_cancelled = 0 AND warehouse = %(warehouse)s
        GROUP BY i.name
    )
    SELECT
        i.name AS item_code,
        i.item_name,
        i.brand,
        IFNULL(sle.actual_qty, 0) AS actual_qty,
        ip.price_list_rate
    FROM item i
    LEFT JOIN stock_ledger_entry sle ON i.name = sle.item_code
    LEFT JOIN item_price ip ON i.name = ip.item_code
    WHERE
        i.is_stock_item = 1
        AND IFNULL(sle.actual_qty, 0) >= %(minimum_qty)s
        {brand_condition}
    ORDER BY i.brand
    """

    data = frappe.db.sql(query, params, as_dict=True)

    columns = [
        {"label": _("Item Code"), "fieldname": "item_code", "fieldtype": "Data", "width": 100},
        {"label": _("Item Name"), "fieldname": "item_name", "fieldtype": "Data", "width": 400},
        {"label": _("Brand"), "fieldname": "brand", "fieldtype": "Link", "options": "Brand", "width": 150},
        {"label": _("Actual Balance"), "fieldname": "actual_qty", "fieldtype": "Int", "width": 140},
        {"label": _("Selling Price"), "fieldname": "price_list_rate", "fieldtype": "Currency", "width": 140},
    ]

    return columns, data
