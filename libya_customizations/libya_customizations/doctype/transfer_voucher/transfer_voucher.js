// Copyright (c) 2024, Ahmed Zaytoon and contributors
// For license information, please see license.txt

frappe.ui.form.on("Transfer Voucher", "onload", function(frm) {
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

frappe.ui.form.on('Transfer Voucher', 'paid_from', function(frm){
    if(cur_frm.doc.paid_from_account_currency == 'LYD'){
        cur_frm.doc.source_exchange_rate = 1;
        cur_frm.refresh_field('source_exchange_rate');
    }
});

/////////////////////////////////////////////////

frappe.ui.form.on('Transfer Voucher', 'before_save', function(frm){
    if(cur_frm.doc.paid_from_account_currency == 'LYD'){
        cur_frm.doc.source_exchange_rate = 1;
        cur_frm.refresh_field('source_exchange_rate');
        
    }
});
/////////////////////////////////////////////////

frappe.ui.form.on('Transfer Voucher', 'paid_to', function(frm){
    if(cur_frm.doc.paid_to_account_currency == 'LYD'){
        cur_frm.doc.target_exchange_rate = 1;
        cur_frm.refresh_field('target_exchange_rate');
        
    }
});

/////////////////////////////////////////////////

frappe.ui.form.on('Transfer Voucher', 'before_save', function(frm){
    if(cur_frm.doc.paid_to_account_currency == 'LYD'){
        cur_frm.doc.target_exchange_rate = 1;
        cur_frm.refresh_field('target_exchange_rate');
        
    }
});

/////////////////////////////////////////////////

frappe.ui.form.on("Transfer Voucher", "paid_amount", function(frm) {
    calculate_base_paid_amount(frm);
});

frappe.ui.form.on("Transfer Voucher", "source_exchange_rate", function(frm) {
    calculate_base_paid_amount(frm);
});

frappe.ui.form.on("Transfer Voucher", "before_save", function(frm) {
    calculate_base_paid_amount(frm);
});


var calculate_base_paid_amount = function(frm) {
    var base_paid_amount = flt(frm.doc.paid_amount) * flt(frm.doc.source_exchange_rate);
    frm.set_value("base_paid_amount", base_paid_amount);
};
/////////////////////////////////////////////////

frappe.ui.form.on("Transfer Voucher", "onload", function(frm) {
    frm.set_query("paid_from", function() {
        return {
            filters: {
                account_type: ["in", ["Cash", "Bank"]],
                is_group: 0
           }
        };
    });
});

/////////////////////////////////////////////////

frappe.ui.form.on('Transfer Voucher', 'before_save', function(frm){
    if(cur_frm.doc.paid_to_account_currency == cur_frm.doc.paid_from_account_currency){
        cur_frm.doc.target_exchange_rate = cur_frm.doc.source_exchange_rate;
        cur_frm.refresh_field('target_exchange_rate');
        
    }
});

/////////////////////////////////////////////////

frappe.ui.form.on("Transfer Voucher", "paid_from", function(frm) {
    if (frm.doc.paid_to_account_currency == frm.doc.paid_from_account_currency) {
        calculate_received_amount(frm);
    }
});

frappe.ui.form.on("Transfer Voucher", "before_save", function(frm) {
    if (frm.doc.paid_to_account_currency == frm.doc.paid_from_account_currency) {
        calculate_received_amount(frm);
    }
});

var calculate_received_amount = function(frm) {
    var received_amount = flt(frm.doc.paid_amount);
    frm.set_value("received_amount", received_amount);
};

/////////////////////////////////////////////////

frappe.ui.form.on("Transfer Voucher", "received_amount", function(frm) {
    calculate_base_received_amount(frm);
});

frappe.ui.form.on("Transfer Voucher", "target_exchange_rate", function(frm) {
    calculate_base_received_amount(frm);
});

frappe.ui.form.on("Transfer Voucher", "before_save", function(frm) {
    calculate_base_received_amount(frm);
});

var calculate_base_received_amount = function(frm) {
    var base_received_amount = flt(frm.doc.received_amount) * flt(frm.doc.target_exchange_rate);
    frm.set_value("base_received_amount", base_received_amount);
};
/////////////////////////////////////////////////