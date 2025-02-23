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
