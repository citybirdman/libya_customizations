import frappe
def after_insert_item(doc, method):
    doc = frappe.get_doc(doc)
    selling_price_list = frappe.db.get_single_value("Selling Settings", "selling_price_list")
    price = frappe.db.get_value("Item Price", {"item_code": doc.item_code, "price_list": selling_price_list})
    if not price:
        item_price_doc = frappe.get_doc({
            "doctype": "Item Price",
            "item_code": doc.item_code,
            "price_list": selling_price_list,
            "price_list_rate": 0,
            "selling": 1,
            "item_name": doc.item_name,
            "brand": doc.brand,
            'item_description': doc.description
        })
        item_price_doc.insert(ignore_permissions=True)