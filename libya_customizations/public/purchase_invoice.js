frappe.ui.form.on("Purchase Invoice", {
    custom_incoterm: function(frm) {
        frm.set_value("freight_account", null);
        frm.set_value("freight_account_currency", null);
        frm.set_value("freight_amount", 0);
        frm.set_value("freight_exchange_rate", 0);
        frm.refresh_field("freight_account");
        frm.refresh_field("freight_account_currency");
        frm.refresh_field("freight_exchange_rate");
        frm.refresh_field("freight_exchange_rate");
    },
    before_save: function(frm) {
        if (frm.doc.custom_incoterm == "CFR") {
            frm.set_value("freight_account", null);
            frm.set_value("freight_account_currency", null);
            frm.set_value("freight_amount", 0);
            frm.set_value("freight_exchange_rate", 0);
            frm.refresh_field("freight_account");
            frm.refresh_field("freight_account_currency");
            frm.refresh_field("freight_exchange_rate");
            frm.refresh_field("freight_exchange_rate");
        }
    },
    payment_method: function(frm) {
        frm.set_value("inspection_account", null);
        frm.set_value("inspection_account_currency", null);
        frm.set_value("inspection_amount", 0);
        frm.set_value("inspection_exchange_rate", 0);
        frm.refresh_field("inspection_account");
        frm.refresh_field("inspection_account_currency");
        frm.refresh_field("inspection_exchange_rate");
        frm.refresh_field("inspection_exchange_rate");
    },
    before_save: function(frm) {
        if (frm.doc.payment_method != "LC") {
            frm.set_value("inspection_account", null);
            frm.set_value("inspection_account_currency", null);
            frm.set_value("inspection_amount", 0);
            frm.set_value("inspection_exchange_rate", 0);
            frm.refresh_field("inspection_account");
            frm.refresh_field("inspection_account_currency");
            frm.refresh_field("inspection_exchange_rate");
            frm.refresh_field("inspection_exchange_rate");
        }
    },
});

frappe.ui.form.on("Purchase Invoice", {
    refresh: function(frm) {
        // Show button only if doc is submitted and user has Accounts User role
        if (frm.doc.docstatus === 1 && frappe.user_roles.includes("Accounts User")) {
            frm.add_custom_button(__("Update Exchange Rate"), function() {
                show_exchange_rate_dialog(frm);
            });
        }
    }
});

function show_exchange_rate_dialog(frm) {
    let d = new frappe.ui.Dialog({
        title: __("Update Exchange Rate"),
        fields: [
            {
                label: __("New Exchange Rate"),
                fieldname: "new_rate",
                fieldtype: "Float",
                reqd: 1,
                default: frm.doc.exchange_rate
            }
        ],
        primary_action_label: __("Save"),
        primary_action(values) {
            frappe.call({
                method: "libya_customizations.server_script.purchase_invoice.update_exchange_rate",
                args: {
                    invoice_name: frm.doc.name,
                    new_rate: values.new_rate
                },
                callback: function(r) {
                    if (r.message && r.message.status === "success") {
                        // frappe.msgprint(r.message.msg);
                        frm.reload_doc().then(() => {
                            d.hide();
                            frappe.call({
                                method:"frappe.desk.form.save.savedocs",
                                args:{
                                    doc: frm.doc,
                                    action: "Update"
                                }
                            });
                            frappe.show_alert({message: __("Exchange rate updated and ledger reposted."), indicator: 'green'});
                        });
                    }
                }
            });
        }
    });

    d.show();
}
