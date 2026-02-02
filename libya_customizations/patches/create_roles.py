import frappe

def execute():
    roles = [
        "Procurement Team",
        "Finance Team",
        "Trade Finance Team",
        "Accounting Team",
        "Warehouse Manager"
    ]

    for role in roles:
        if not frappe.db.exists("Role", role):
            frappe.get_doc({
                "doctype": "Role",
                "role_name": role
            }).insert(ignore_permissions=True)
            print(f"Created Role: {role}")
        else:
            print(f"Role {role} already exists")
    frappe.db.commit()
    print("Roles created/verified successfully.")