# Copyright (c) 2024, Ahmed Zaytoon and contributors
# For license information, please see license.txt

import frappe
import json
from frappe.model.document import Document
from openpyxl import Workbook
from frappe.utils.file_manager import save_file
from frappe.utils import get_site_path

class PurchaseReceiptManagement(Document):
	pass

@frappe.whitelist()
def update_is_virtual(docname, virtual_receipt):
    frappe.db.set_value('Purchase Receipt', docname, 'virtual_receipt', virtual_receipt)
    frappe.db.commit()

@frappe.whitelist()
def export_selected_data(names):
    # Ensure `names` is a list
    if isinstance(names, str):
        names = json.loads(names)  # If it's a string, parse it to a list
    
    if not isinstance(names, list):
        frappe.throw("Expected a list of names.")
    
    # Define the fields for the parent document and child table
    parent_doctype = "Purchase Receipt"
    child_doctype = "Purchase Receipt Item"
    parent_fields = ["name","title"]  # Example fields for the parent
    child_fields = [ "brand", "item_code", "item_name", "qty", "rate", "amount"]  # Example fields for the child table
    
    # Create a new Excel workbook
    workbook = Workbook()
    sheet = workbook.active
    sheet.append(parent_fields + child_fields)  # Add headers (Parent + Child)

    # Loop through each parent document (e.g., Purchase Receipts)
    for name in names:
        # Fetch the parent document (e.g., Purchase Receipt)
        parent_doc = frappe.get_doc(parent_doctype, name)
        
        # Fetch child table records (e.g., Purchase Receipt Item)
        child_records = parent_doc.items  # Assuming 'items' is the child table field
        
        # Check if child records exist
        if child_records:
            # Loop through each child record and write to Excel
            for index, child in enumerate(child_records):
                if index == 0:
                    # For the first child, add the parent fields along with the child fields
                    row = [parent_doc.name, parent_doc.title] + [getattr(child, field, "") for field in child_fields]
                else:
                    # For subsequent children, only add the child fields (no parent data)
                    row = [""] * len(parent_fields) + [getattr(child, field, "") for field in child_fields]
                sheet.append(row)

    # Define the file path for the Excel file
    file_path = get_site_path("private", "files", "Purchase_Receipt_Export.xlsx")

    # Save the workbook to the specified file path
    workbook.save(file_path)

    # Save the file in Frappe’s File Manager for download
    with open(file_path, "rb") as file:
        file_doc = save_file(
            "Purchase Receipt Export",
            file.read(),
            "File",
            frappe.session.user,
            is_private=1,
            # file_name="Purchase_Receipt_Export.xlsx"
        )

    return file_doc.file_url

@frappe.whitelist()
def submit_receipt(docname, posting_date):
    if not docname:
        frappe.throw("docname cannot be null")
    purchase_reciept = frappe.get_doc("Purchase Receipt", docname)
    purchase_reciept.posting_date = posting_date
    purchase_reciept.submit()

@frappe.whitelist()
def get_values_for_validation():
    doc = frappe.get_doc("Sales Order", doc.name)
    for row in doc.items:
        sql = frappe.db.sql(f"""
        SELECT
        IF(sales_future.future_qty_to_deliver > purchase_future.future_balance, stock_actual.actual_balance - (sales_actual.actual_qty_to_deliver + (sales_future.future_qty_to_deliver - purchase_future.future_balance)), stock_actual.actual_balance-sales_actual.actual_qty_to_deliver) AS actual_available_qty,
        (stock_actual.actual_balance + purchase_future.future_balance) - (sales_actual.actual_qty_to_deliver + sales_future.future_qty_to_deliver) AS future_available_qty
    FROM
        (
        SELECT
            SUM(actual_qty) AS actual_balance
        FROM
            `tabStock Ledger Entry`
        WHERE
            is_cancelled = 0
        AND
            item_code = "{row.item_code}"
        AND
            warehouse = "{doc.set_warehouse}"
        ) stock_actual
    LEFT JOIN
        (
        SELECT
            SUM(purchase_receipt_item.qty) AS future_balance
        FROM
            `tabPurchase Receipt Item` purchase_receipt_item
        INNER JOIN
            `tabPurchase Receipt` purchase_receipt
        ON
            purchase_receipt_item.parent = purchase_receipt.name
        WHERE
            purchase_receipt_item.docstatus = 0
        AND
            purchase_receipt.docstatus = 0
        AND
            purchase_receipt.virtual_receipt = 1
        AND
            purchase_receipt_item.item_code = "{row.item_code}"
        AND
            purchase_receipt_item.warehouse = "{doc.set_warehouse}"
        ) purchase_future
    ON
        TRUE
    LEFT JOIN
        (
        SELECT
            SUM(qty_to_deliver) AS actual_qty_to_deliver
        FROM
            (
            SELECT
                sales_order.name AS sales_order,
                sales_order.set_warehouse,
                sales_order_item.item_code,
                IF(SUM(sales_order_item.qty - sales_order_item.delivered_qty) > 0, SUM(sales_order_item.qty - sales_order_item.delivered_qty), 0) AS qty_to_deliver
            FROM
                `tabSales Order Item` sales_order_item
            INNER JOIN
                `tabSales Order` sales_order
            ON
                sales_order_item.parent = sales_order.name
            INNER JOIN
                `tabItem` item
            ON
                sales_order_item.item_code = item.name
            WHERE
                sales_order.docstatus = 1
            AND
                sales_order_item.docstatus = 1
            AND
                sales_order.status NOT IN ('Completed', 'Closed')
            AND
                sales_order.reservation_status NOT IN ('Reserve against Future Receipts')
            AND
                sales_order_item.qty - sales_order_item.delivered_qty > 0
            AND
                item.is_stock_item = 1
            GROUP BY
                sales_order.name,
                sales_order.set_warehouse,
                sales_order_item.item_code
            ) sales_order_item
        WHERE
            item_code = "{row.item_code}"
        AND
            set_warehouse = "{doc.set_warehouse}"
        ) sales_actual
    ON
        TRUE
    LEFT JOIN
        (
        SELECT
            SUM(qty_to_deliver) AS future_qty_to_deliver
        FROM
            (
            SELECT
                sales_order.name AS sales_order,
                sales_order.set_warehouse,
                sales_order_item.item_code,
                IF(SUM(sales_order_item.qty - sales_order_item.delivered_qty) > 0, SUM(sales_order_item.qty - sales_order_item.delivered_qty), 0) AS qty_to_deliver
            FROM
                `tabSales Order Item` sales_order_item
            INNER JOIN
                `tabSales Order` sales_order
            ON
                sales_order_item.parent = sales_order.name
            INNER JOIN
                `tabItem` item
            ON
                sales_order_item.item_code = item.name
            WHERE
                sales_order.docstatus = 1
            AND
                sales_order_item.docstatus = 1
            AND
                sales_order.status NOT IN ('Completed', 'Closed')
            AND
                sales_order.reservation_status IN ('Reserve against Future Receipts')
            AND
                sales_order_item.qty - sales_order_item.delivered_qty > 0
            AND
                item.is_stock_item = 1
            GROUP BY
                sales_order.name,
                sales_order.set_warehouse,
                sales_order_item.item_code
            ) sales_order_item
        WHERE
            item_code = "{row.item_code}"
        AND
            set_warehouse = "{doc.set_warehouse}"
        ) sales_future
    ON
        TRUE
        """, as_dict=True)
        