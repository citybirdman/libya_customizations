import frappe


def execute():
    if frappe.db.exists("Role", "Warehouse Manager"):
        print("Warehouse Manager role already exists. Skipping creation.")
        return

    role = frappe.get_doc({
        "doctype": "Role",
        "role_name": "Warehouse Manager",
        "desk_access": 1,
        "disabled": 0,
    })
    role.insert(ignore_permissions=True)
    print("Warehouse Manager role created successfully.")