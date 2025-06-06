// Copyright (c) 2024, Ahmed Zaytoon and contributors
// For license information, please see license.txt

frappe.ui.form.on("Receipt Voucher", {
	receipt_from(frm){
		frm.doc.party_name= null;
		frm.doc.paid_from = null;
		frm.doc.party= null;
		frm.refresh_fields("party","party_name", "paid_from")

		if(frm.doc.receipt_from != "Account")
			frm.set_value("party_type", frm.doc.receipt_from)
		else{
			frm.set_value("party_type", null)
		}
	},
	party(frm){
		frappe.call({
			method: "erpnext.accounts.doctype.payment_entry.payment_entry.get_party_details",
			args: {
				company: frm.doc.company,
				party_type: frm.doc.party_type,
				party: frm.doc.party,
				date: frm.doc.posting_date,
				// cost_center: frm.doc.cost_center,
			},
			callback: function (r, rt) {
				if (r.message) {
					if (frm.doc.receipt_from != "Account") {
						frm.set_value('paid_from', r.message.party_account);
						frm.set_value('party_name', r.message.party_name);
						frm.set_value('paid_from_account_currency', r.message.party_account_currency);
					}
				}
			}
		})
	}
});


frappe.ui.form.on("Receipt Voucher", "receipt_from_a_party", function(frm) {
    frm.set_query("party_type", function() {
        return {
            filters: {
                name: ["in", ["Customer", "Supplier"]]
           }
        };
    });
});
/////////////////////////////////////////////////

frappe.ui.form.on("Receipt Voucher", "onload", function(frm) {
    frm.set_query("paid_from", function() {
        return {
            filters: {
                account_type: ["not in", ["Cash", "Bank"]],
                is_group: 0
           }
        };
    });
});

/////////////////////////////////////////////////

frappe.ui.form.on('Receipt Voucher', 'before_save', function(frm){
    if(cur_frm.doc.paid_from_account_currency == cur_frm.doc.paid_to_account_currency){
        cur_frm.doc.source_exchange_rate = cur_frm.doc.target_exchange_rate;
        cur_frm.refresh_field('source_exchange_rate');
        
    }
});

/////////////////////////////////////////////////

frappe.ui.form.on("Receipt Voucher", "paid_amount", function(frm) {
    calculate_base_paid_amount(frm);
});

frappe.ui.form.on("Receipt Voucher", "source_exchange_rate", function(frm) {
    calculate_base_paid_amount(frm);
});

frappe.ui.form.on("Receipt Voucher", "before_save", function(frm) {
    calculate_base_paid_amount(frm);
});


var calculate_base_paid_amount = function(frm) {
    var base_paid_amount = flt(frm.doc.paid_amount) * flt(frm.doc.source_exchange_rate);
    frm.set_value("base_paid_amount", base_paid_amount);
};
/////////////////////////////////////////////////

frappe.ui.form.on("Receipt Voucher", "onload", function(frm) {
    frm.set_query("paid_to", function() {
        return {
            filters: {
                account_type: ["in", ["Cash", "Bank"]],
                is_group: 0
           }
        };
    });
});

/////////////////////////////////////////////////

frappe.ui.form.on('Receipt Voucher', 'paid_to', function(frm){
    if(cur_frm.doc.paid_to_account_currency == 'LYD'){
        cur_frm.doc.target_exchange_rate = 1;
        cur_frm.refresh_field('target_exchange_rate');
        
    }
});

/////////////////////////////////////////////////

frappe.ui.form.on('Receipt Voucher', 'before_save', function(frm){
    if(cur_frm.doc.paid_to_account_currency == 'LYD'){
        cur_frm.doc.target_exchange_rate = 1;
        cur_frm.refresh_field('target_exchange_rate');
        
    }
});

/////////////////////////////////////////////////

frappe.ui.form.on('Receipt Voucher', 'paid_from', function(frm){
    if(cur_frm.doc.paid_from_account_currency == 'LYD'){
        cur_frm.doc.source_exchange_rate = 1;
        cur_frm.refresh_field('source_exchange_rate');
    }
});

/////////////////////////////////////////////////

frappe.ui.form.on('Receipt Voucher', 'before_save', function(frm){
    if(cur_frm.doc.paid_from_account_currency == 'LYD'){
        cur_frm.doc.source_exchange_rate = 1;
        cur_frm.refresh_field('source_exchange_rate');
    }
});

/////////////////////////////////////////////////

frappe.ui.form.on('Receipt Voucher', 'target_exchange_rate', function(frm){
    if(cur_frm.doc.paid_from_account_currency == cur_frm.doc.paid_to_account_currency){
        cur_frm.doc.source_exchange_rate = cur_frm.doc.target_exchange_rate;
        cur_frm.refresh_field('source_exchange_rate');
    }
});

/////////////////////////////////////////////////

frappe.ui.form.on('Receipt Voucher', 'before_save', function(frm){
    if(cur_frm.doc.paid_from_account_currency == cur_frm.doc.paid_to_account_currency){
        cur_frm.doc.source_exchange_rate = cur_frm.doc.target_exchange_rate;
        cur_frm.refresh_field('source_exchange_rate');
    }
});

/////////////////////////////////////////////////

frappe.ui.form.on("Receipt Voucher", "paid_from", function(frm) {
    if (frm.doc.paid_to_account_currency == frm.doc.paid_from_account_currency) {
        calculate_paid_amount(frm);
    }
});

frappe.ui.form.on("Receipt Voucher", "before_save", function(frm) {
    if (frm.doc.paid_to_account_currency == frm.doc.paid_from_account_currency) {
        calculate_paid_amount(frm);
    }
});

var calculate_paid_amount = function(frm) {
    var paid_amount = flt(frm.doc.received_amount);
    frm.set_value("paid_amount", paid_amount);
};
/////////////////////////////////////////////////

frappe.ui.form.on("Receipt Voucher", "received_amount", function(frm) {
    calculate_base_received_amount(frm);
});

frappe.ui.form.on("Receipt Voucher", "target_exchange_rate", function(frm) {
    calculate_base_received_amount(frm);
});

frappe.ui.form.on("Receipt Voucher", "before_save", function(frm) {
    calculate_base_received_amount(frm);
});


var calculate_base_received_amount = function(frm) {
    var base_received_amount = flt(frm.doc.received_amount) * flt(frm.doc.target_exchange_rate);
    frm.set_value("base_received_amount", base_received_amount);
};
/////////////////////////////////////////////////