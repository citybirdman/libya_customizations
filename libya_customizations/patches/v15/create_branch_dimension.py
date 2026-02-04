import frappe

def execute():
    print("Running patch: create_branch_dimension")

    frappe.reload_doc("accounts", "doctype", "accounting_dimension")

    if not frappe.db.exists("Accounting Dimension", {"document_type": "Branch"}):
        dimension = frappe.get_doc({
            "doctype": "Accounting Dimension",
            "document_type": "Branch",
            "label": "Branch",
            "disabled": 0
        })
        dimension.insert(ignore_permissions=True)
        print("✅ Created Accounting Dimension for Branch")
    else:
        print("ℹ️ Accounting Dimension 'Branch' already exists")

    companies = frappe.get_all("Company", pluck="name")
    for company in companies:
        if not frappe.db.exists("Accounting Dimension Detail", {"parenttype": "Accounting Dimension", "company": company}):
            frappe.db.sql("""
                INSERT INTO `tabAccounting Dimension Detail` (name, parent, parentfield, parenttype, company, idx)
                VALUES (%s, %s, 'dimension_defaults', 'Accounting Dimension', %s, 0)
            """, (frappe.utils.make_autoname("ACC-DIM-DETAIL-.####"), "Branch", company))
            print(f"Added Branch dimension for {company}")

    frappe.db.commit()
