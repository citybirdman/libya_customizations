# Copyright (c) 2025, Ahmed Zaytoon and contributors
# For license information, please see license.txt

import frappe
from frappe import _

def execute(filters=None):
    if not filters:
        filters = {}

    # --- Default values ---
    filters.setdefault("to_date", frappe.utils.today())
    filters.setdefault("filter_based_on", "Actual Balances")
    filters.setdefault("brand", [])
    filters.setdefault("minimum_qty", 1)

    # --- Parameters for query ---
    conditions = []
    params = {
        "to_date": filters["to_date"],
        "filter_based_on": filters["filter_based_on"],
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
        SELECT item_code, IFNULL(production_year, "") AS production_year, SUM(actual_qty) AS actual_qty
        FROM `tabStock Ledger Entry`
        WHERE is_cancelled = 0
        AND posting_date <= %(to_date)s
        GROUP BY item_code, IFNULL(production_year, "")
        HAVING SUM(actual_qty) > 0
    ),
    sales_order_item AS (
        SELECT item_code, production_year, SUM(qty_to_deliver) AS qty_to_deliver FROM (
            SELECT
                soi.item_code,
                IFNULL(soi.production_year, "") AS production_year,
                IF(SUM(soi.qty - soi.delivered_qty) > 0, SUM(soi.qty - soi.delivered_qty), 0) AS qty_to_deliver
            FROM `tabSales Order Item` soi
            INNER JOIN `tabSales Order` so ON soi.parent = so.name
            WHERE so.docstatus = 1
              AND soi.docstatus = 1
              AND so.status NOT IN ('Completed', 'Closed')
              AND (soi.qty - soi.delivered_qty) > 0
              AND so.transaction_date <= %(to_date)s
            GROUP BY so.name, soi.item_code, IFNULL(soi.production_year, "")
        ) t
        GROUP BY item_code, production_year
    ),
    item_price AS (
        SELECT item_code, price_list_rate, IFNULL(production_year, "") AS production_year
        FROM `tabItem Price`
        WHERE selling = 1
        AND price_list IN (
            SELECT value FROM `tabSingles`
            WHERE doctype = 'Selling Settings' AND field = 'selling_price_list'
        )
    ),
	purchase_receipt_item_virtual AS (
		SELECT pri.item_code, IFNULL(pri.production_year, "") AS production_year, SUM(pri.qty) AS qty
		FROM `tabPurchase Receipt Item` pri
		INNER JOIN `tabPurchase Receipt` pr ON pri.parent = pr.name
		WHERE pri.docstatus = 0
		AND pri.qty > 0
		AND pr.is_return = 0
		AND pr.docstatus = 0
		AND pr.virtual_receipt = 1
		GROUP BY pri.item_code, IFNULL(pri.production_year, "")
	),
    item AS (
        SELECT i.name, i.item_name, i.brand, i.is_stock_item, i.tire_size, IFNULL(sle.production_year, "") AS production_year
        FROM `tabItem` i
        LEFT JOIN `tabStock Ledger Entry` sle ON i.name = sle.item_code
        WHERE is_cancelled = 0
        GROUP BY i.name, IFNULL(sle.production_year, "")
    )
    SELECT
        i.name AS item_code,
        i.item_name,
        i.production_year,
        i.brand,
        IFNULL(sle.actual_qty, 0) AS actual_qty,
        IFNULL(soi.qty_to_deliver, 0) AS qty_to_deliver,
        IFNULL(sle.actual_qty, 0) - IFNULL(soi.qty_to_deliver, 0) AS available_qty,
        IFNULL(priv.qty, 0) AS qty_to_receive,
        ip.price_list_rate
    FROM item i
    LEFT JOIN stock_ledger_entry sle ON i.name = sle.item_code AND i.production_year = sle.production_year
    LEFT JOIN `tabTire Size` ts ON i.tire_size = ts.name
    LEFT JOIN item_price ip ON i.name = ip.item_code AND i.production_year = ip.production_year
    LEFT JOIN sales_order_item soi ON i.name = soi.item_code AND i.production_year = soi.production_year
    LEFT JOIN purchase_receipt_item_virtual priv ON i.name = priv.item_code AND i.production_year = priv.production_year
    WHERE
        i.is_stock_item = 1
        AND (
            (%(filter_based_on)s = 'Actual Balances' AND IFNULL(sle.actual_qty, 0) >= %(minimum_qty)s)
            OR
            (%(filter_based_on)s = 'Available Balances' AND (IFNULL(sle.actual_qty, 0) - IFNULL(soi.qty_to_deliver, 0)) >= %(minimum_qty)s)
            OR
            (%(filter_based_on)s = 'Available and Future Balances' AND (IFNULL(sle.actual_qty, 0) - IFNULL(soi.qty_to_deliver, 0) + IFNULL(priv.qty, 0)) >= %(minimum_qty)s)
        )
        {brand_condition}
    ORDER BY i.brand, ts.sorting_code
    """

    data = frappe.db.sql(query, params, as_dict=True)

    columns = [
        {"label": _("Item Code"), "fieldname": "item_code", "fieldtype": "Data", "width": 100},
        {"label": _("Item Name"), "fieldname": "item_name", "fieldtype": "Data", "width": 400},
        {"label": _("Production"), "fieldname": "production_year", "fieldtype": "Link", "options": "Production Year", "width": 100},
        {"label": _("Brand"), "fieldname": "brand", "fieldtype": "Link", "options": "Brand", "width": 150},
        {"label": _("Actual Balance"), "fieldname": "actual_qty", "fieldtype": "Int", "width": 140},
        {"label": _("Qty To Deliver"), "fieldname": "qty_to_deliver", "fieldtype": "Int", "width": 140},
        {"label": _("Available Balance"), "fieldname": "available_qty", "fieldtype": "Int", "width": 140},
		{"label": _("Qty To Receive"), "fieldname": "qty_to_receive", "fieldtype": "Int", "width": 140},
        {"label": _("Selling Price"), "fieldname": "price_list_rate", "fieldtype": "Currency", "width": 140},
    ]

    return columns, data
