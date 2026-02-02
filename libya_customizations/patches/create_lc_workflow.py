import frappe

WORKFLOW_NAME = "Letter of Credit"
DOCTYPE = "Letter of Credit"


def execute():
    create_workflow_states()
    create_workflow_actions()
    create_workflow()
    create_states()
    create_transitions()

    frappe.db.commit()


# --------------------------------------------------
# Workflow State master
# --------------------------------------------------
def create_workflow_states():
    states = [
        "Open",
        "Pending",
        "Approved",
        "Rejected",
        "Presented",
    ]

    for state in states:
        if not frappe.db.exists("Workflow State", state):
            frappe.get_doc({
                "doctype": "Workflow State",
                "workflow_state_name": state
            }).insert(ignore_permissions=True)


# --------------------------------------------------
# Workflow Action master
# --------------------------------------------------
def create_workflow_actions():
    actions = [
        "Send",
        "Approve",
        "Reject",
        "Present",
    ]

    for action in actions:
        if not frappe.db.exists("Workflow Action Master", action):
            frappe.get_doc({
                "doctype": "Workflow Action Master",
                "workflow_action_name": action
            }).insert(ignore_permissions=True)


# --------------------------------------------------
# Workflow
# --------------------------------------------------
def create_workflow():
    if frappe.db.exists("Workflow", WORKFLOW_NAME):
        return

    frappe.get_doc({
        "doctype": "Workflow",
        "workflow_name": WORKFLOW_NAME,
        "document_type": DOCTYPE,
        "is_active": 1,
        "workflow_state_field": "workflow_state",
        "override_status": 0,
        "send_email_alert": 0,
    }).insert(ignore_permissions=True)


# --------------------------------------------------
# Workflow Document States
# --------------------------------------------------
def create_states():
    states = [
        ("Open", "0", "Procurement Team"),
        ("Pending", "0", "Finance Team"),
        ("Approved", "0", "Trade Finance Team"),
        ("Rejected", "0", "Administrator"),
        ("Presented", "0", "Administrator"),
    ]

    for state, doc_status, allow_edit in states:
        if frappe.db.exists(
            "Workflow Document State",
            {
                "parent": WORKFLOW_NAME,
                "state": state,
            },
        ):
            continue

        frappe.get_doc({
            "doctype": "Workflow Document State",
            "parent": WORKFLOW_NAME,
            "parenttype": "Workflow",
            "parentfield": "states",
            "state": state,
            "doc_status": doc_status,
            "allow_edit": allow_edit,
            "send_email": 1,
        }).insert(ignore_permissions=True)


# --------------------------------------------------
# Workflow Transitions
# --------------------------------------------------
def create_transitions():
    transitions = [
        # state, action, next_state, role
        ("Open", "Send", "Pending", "Procurement Team"),
        ("Pending", "Approve", "Approved", "Finance Team"),
        ("Pending", "Reject", "Rejected", "Finance Team"),
        ("Approved", "Present", "Presented", "Trade Finance Team"),
    ]

    for state, action, next_state, role in transitions:
        if frappe.db.exists(
            "Workflow Transition",
            {
                "parent": WORKFLOW_NAME,
                "state": state,
                "action": action,
                "next_state": next_state,
            },
        ):
            continue

        frappe.get_doc({
            "doctype": "Workflow Transition",
            "parent": WORKFLOW_NAME,
            "parenttype": "Workflow",
            "parentfield": "transitions",
            "state": state,
            "action": action,
            "next_state": next_state,
            "allowed": role,
            "allow_self_approval": 1,
            "send_email_to_creator": 0,
        }).insert(ignore_permissions=True)
