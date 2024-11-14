import frappe

def after_submit_sales_invoice(doc, method):
    rows = [{"name": row.so_detail, "qty": row.qty} for row in doc.items]

    for row in rows:
        qty = frappe.db.get_value("Sales Order Item", row["name"], "billed_qty")
        frappe.db.set_value("Sales Order Item", row["name"], "billed_qty", qty + row["qty"])
    docname = frappe.db.get_value("Sales Order Item", rows[0]['name'], "parent")
    doc = frappe.get_doc("Sales Order", docname)
    flag = True
    for row in doc.items:
        # frappe.throw(f"{row.qty} != {row.bille_d_qty}")
        if row.qty != row.billed_qty:
            flag = False
            break
    if flag:
        frappe.call("erpnext.selling.doctype.sales_order.sales_order.update_status", status="Closed", name=docname)

def before_cancel_sales_invoice(doc, method):
    rows = [{"name": row.so_detail, "qty": row.qty} for row in doc.items]

    for row in rows:
        qty = frappe.db.get_value("Sales Order Item", row["name"], "billed_qty")
        frappe.db.set_value("Sales Order Item", row["name"], "billed_qty", qty - row["qty"])
    docname = frappe.db.get_value("Sales Order Item", rows[0]['name'], "parent")
    doc = frappe.get_doc("Sales Order", docname)
    flag = False
    for row in doc.items:
        if row.qty != row.billed_qty:
            flag = True
            break
    if flag:
        frappe.call("erpnext.selling.doctype.sales_order.sales_order.update_status", status="Draft", name=docname)