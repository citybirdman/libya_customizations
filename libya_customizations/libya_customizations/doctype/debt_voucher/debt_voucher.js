// Copyright (c) 2024, Ahmed Zaytoon and contributors
// For license information, please see license.txt

frappe.ui.form.on('Debt Voucher', {
	from_or_to(frm){
		frm.doc.party_name= null;
		frm.doc.from_or_to_account = null;
		frm.doc.party = null;
		frm.refresh_fields("party","party_name", "from_or_to_account")
		if(frm.doc.from_or_to != "Account")
			frm.set_value("party_type", frm.doc.from_or_to)
		else{
			frm.set_value("party_type", null)
		}
	},
    party(frm){
	    if(frm.doc.party_type && frm.doc.party) {
	        return frappe.call({
				method: 'erpnext.accounts.doctype.payment_entry.payment_entry.get_party_details',
				args: {
					company: frm.doc.company,
					party_type: frm.doc.party_type,
					party: frm.doc.party,
					date: frm.doc.posting_date
				},
				callback: function(r, rt) {
					if(r.message) {
					    if(frm.doc.from_or_to) {
							frm.set_value('from_or_to_account', r.message.party_account);
							frm.set_value('party_name', r.message.party_name);
							frm.set_value('from_or_to_account_currency', r.message.party_account_currency);
					    }
					}
				}
			});
		}
	},
});

/////////////////////////////////////////////////

frappe.ui.form.on("Debt Voucher", "from_or_to", function(frm) {
    frm.set_query("party_type", function() {
        return {
            filters: {
                name: ["in", ["Customer", "Supplier"]]
           }
        };
    });
});

/////////////////////////////////////////////////

frappe.ui.form.on("Debt Voucher", "onload", function(frm) {
    frm.set_query("from_or_to_account", function() {
        return {
            filters: {
                account_type: ["not in", ["Cash", "Bank", "Payable", "Receivable"]],
                is_group: 0
           }
        };
    });
});

/////////////////////////////////////////////////

frappe.ui.form.on('Debt Voucher', 'from_or_to_account', function(frm){
    if(cur_frm.doc.from_or_to_account_currency == 'LYD'){
        cur_frm.doc.exchange_rate = 1;
        cur_frm.refresh_field('exchange_rate');
        
    }
});

/////////////////////////////////////////////////

frappe.ui.form.on('Debt Voucher', 'before_save', function(frm){
    if(cur_frm.doc.from_or_to_account_currency == 'LYD'){
        cur_frm.doc.exchange_rate = 1;
        cur_frm.refresh_field('exchange_rate');
        
    }
});

/////////////////////////////////////////////////

frappe.ui.form.on("Debt Voucher", "amount", function(frm) {
    calculate_base_amount(frm);
});

frappe.ui.form.on("Debt Voucher", "exchange_rate", function(frm) {
    calculate_base_amount(frm);
});

frappe.ui.form.on("Debt Voucher", "before_save", function(frm) {
    calculate_base_amount(frm);
});


var calculate_base_amount = function(frm) {
    var base_amount = flt(frm.doc.amount) * flt(frm.doc.exchange_rate);
    frm.set_value("base_amount", base_amount);
};

/////////////////////////////////////////////////

// frappe.ui.form.on('Debt Voucher', 'type', function(frm){
//     if(cur_frm.doc.type == 'Add'){
//         cur_frm.doc.debt_account = 'Write Off - I';
//         cur_frm.refresh_field('debt_account');
        
//     }
// });

// /////////////////////////////////////////////////

// frappe.ui.form.on('Debt Voucher', 'type', function(frm){
//     if(cur_frm.doc.type == 'Deduct'){
//         cur_frm.doc.debt_account = 'Write Off - I';
//         cur_frm.refresh_field('debt_account');
        
//     }
// });

/////////////////////////////////////////////////