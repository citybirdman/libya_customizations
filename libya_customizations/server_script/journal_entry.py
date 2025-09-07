import frappe

def on_trash(doc, method):
    if doc.cannot_be_cancelled:
        # frappe.throw("This document cannot be cancelled!")
        pass