import frappe
from openpyxl import Workbook
from frappe.utils.file_manager import save_file
from frappe.utils import get_site_path
import json

@frappe.whitelist()
def export_item_price_data(filters):
    # Define the fields for "Item Price" export
    doctype = "Item Price"
    fields = ["name", "item_code", "item_name", "brand", "price_list_rate", "stock_valuation_rate"]
    filters = json.loads(filters)
    names = frappe.get_all("Item Price", filters)
    # Initialize the workbook and add header row
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Item Price Export"
    sheet.append(fields)  # Add headers based on fields

    # Iterate over each selected document
    for name in names:
        # Fetch the document
        item_price_doc = frappe.get_doc(doctype, name)
        
        # Prepare a row with the specified fields
        row = [getattr(item_price_doc, field, "") for field in fields]
        sheet.append(row)  # Append the row to the sheet

    # Define and save the Excel file path
    file_path = get_site_path("private", "files", "Item_Price_Export.xlsx")
    workbook.save(file_path)

    # Save file in Frappe's File Manager to generate download URL
    with open(file_path, "rb") as file:
        file_doc = save_file(
            "Item Price Export.xlsx",
            file.read(),
            "File",
            frappe.session.user,
            is_private=True
        )

    return file_doc.file_url


from frappe.utils.xlsxutils import read_xlsx_file_from_attached_file
@frappe.whitelist(allow_guest=True)
def import_item_price_data(file_url):
    
    file_doc = frappe.get_doc("File", {"file_url": file_url})
    content = file_doc.get_content()
    data = read_xlsx_file_from_attached_file(fcontent=content)
    for row in data[1:]:
        frappe.db.set_value("Item Price", row[0], "price_list_rate", row[4])
    return data[1:]

@frappe.whitelist()
def update_stock_valuation_rate():
    sql = """
        UPDATE
            `tabItem Price` ip
        SET
            ip.stock_valuation_rate = (
                SELECT
                    SUM(b.stock_value) / SUM(b.actual_qty) AS avg_rate
                FROM
                    `tabBin` b
                WHERE
                    b.actual_qty > 0 AND b.item_code = ip.item_code
                GROUP BY
                    b.item_code
            )
        WHERE
            EXISTS (
                SELECT 1
                FROM `tabBin` b
                WHERE b.actual_qty > 0 AND b.item_code = ip.item_code
            )
    """
    frappe.db.sql(sql)