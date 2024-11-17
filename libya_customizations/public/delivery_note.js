frappe.ui.form.on("Delivery Note", {
    onload(frm) {
        // Handle item grid button visibility changes
        frm.fields_dict.items.wrapper.onchange = function() {
            frm.fields_dict.items.wrapper.querySelectorAll(".btn-open-row").forEach(btn => btn.remove());
            const gridButtons = frm.fields_dict.items.grid.grid_buttons[0].children;
            gridButtons[1].style.display = "none"; // Edit button
            gridButtons[2].style.display = "none"; // Delete button
            gridButtons[3].style.display = "none"; // Duplicate button
            frm.fields_dict.items.grid.wrapper.find('.grid-delete-row').hide(); // Hide delete row
            frm.fields_dict.items.wrapper.querySelector(".grid-upload").style.display = "none"; // Hide upload button
            frm.fields_dict.items.wrapper.querySelector(".grid-download").style.display = "none"; // Hide download button
        };

        // Check if the Delivery Note status allows for creating a Sales Invoice
        if (!["Completed"].includes(frm.doc.status) && frm.doc.custom_per_billed !== 100 && frm.doc.docstatus == 1) {
            frappe.call({
                method: "frappe.client.has_permission",
                args: {
                    doctype: "Sales Invoice",
                    docname: null,
                    perm_type: "create"
                },
                callback: function(r) {
                    if (r.message.has_permission) {
                        // User has permission to create Sales Invoice, show the button
                        frm.add_custom_button(__("Sales Invoice "), function() {
                            frappe.call({
                                method: "libya_customizations.server_script.delivery_note.create_si_from_dn",
                                args: {
                                    doc: frm.doc
                                },
                                callback: function(r) {
                                    if (r.message) {
                                        const docname = r.message;
                                        frappe.set_route("Form", "Sales Invoice", docname);
                                    }
                                }
                            });
                        }, __("Create"));
                    }
                }
            });
        }
    },

    onload_post_render(frm) {
        // Remove unnecessary buttons on load
        const buttonsToRemove = [
            ["Shipment", "Create"],
            ["Installation Note", "Create"],
            ["Sales Return", "Create"],
            ["Sales Invoice", "Create"],
            ["Delivery Trip", "Create"],
            ["Quality Inspection(s)", "Create"],
            ["Packing Slip", "Create"],
            ["Stock Ledger", "View"],
            ["Accounting Ledger", "View"],
            ["Stock Ledger", "Preview"],
            ["Accounting Ledger", "Preview"],
            ["Sales Order", "Get Items From"],
            ["Close", "Status"]
        ];

        buttonsToRemove.forEach(([button, action]) => {
            frm.remove_custom_button(button, action);
        });
    },

    refresh(frm) {
        // Slight delay to ensure form is fully loaded before removing buttons
        setTimeout(() => {
            const buttonsToRemove = [
                ["Shipment", "Create"],
                ["Installation Note", "Create"],
                ["Sales Return", "Create"],
                ["Sales Invoice", "Create"],
                ["Delivery Trip", "Create"],
                ["Quality Inspection(s)", "Create"],
                ["Packing Slip", "Create"],
                ["Stock Ledger", "View"],
                ["Accounting Ledger", "View"],
                ["Stock Ledger", "Preview"],
                ["Accounting Ledger", "Preview"],
                ["Sales Order", "Get Items From"],
                ["Close", "Status"]
            ];

            buttonsToRemove.forEach(([button, action]) => {
                frm.remove_custom_button(button, action);
            });
        }, 300); 

        const billing_status_info = {
            "Not Billed": { color: "red", label: "Not Billed" },
            "Partly Billed": { color: "orange", label: "Partly Billed" },
            "Fully Billed": { color: "green", label: "Fully Billed" }
        };

        let billing_status = frm.doc.billing_status;

        if (billing_status_info[billing_status] && frm.doc.docstatus === 1 && !["Closed"].includes(frm.doc.status)) {
			console.log(["Closed"].includes(frm.doc.status))
            frm.page.set_indicator(billing_status_info[billing_status].label, billing_status_info[billing_status].color);
        }
    }
});