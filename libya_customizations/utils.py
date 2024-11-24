import frappe
@frappe.whitelist()
def get_linked_document(linked_doctype, docname, linked_field, field):
    return frappe.db.get_value(linked_doctype, [[linked_field, "=", docname]], field)