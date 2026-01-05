// Copyright (c) 2024, Ahmed Zaytoon and contributors
// For license information, please see license.txt

frappe.ui.form.on('Clearing Voucher', {
	from(frm){
		frm.doc.from_party_name= null;
		frm.doc.from_account = null;
		frm.doc.from_party= null;
		frm.refresh_fields("from_party","from_party_name", "from_account")

		if(frm.doc.from != "Account")
			frm.set_value("from_party_type", frm.doc.from)
		else{
			frm.set_value("from_party_type", null)
		}
	},
	to(frm){
		frm.doc.to_party_name= null;
		frm.doc.to_account = null;
		frm.doc.to_party= null;
		frm.refresh_fields("to_party","to_party_name", "to_account")

		if(frm.doc.to != "Account")
			frm.set_value("to_party_type", frm.doc.to)
		else{
			frm.set_value("to_party_type", null)
		}
	},
	from_party(frm) {
		frappe.call({
			method: 'erpnext.accounts.doctype.payment_entry.payment_entry.get_party_details',
			args: {
				company: frm.doc.company,
				party_type: frm.doc.from_party_type,
				party: frm.doc.from_party,
				date: frm.doc.posting_date
			},
			callback: function(r, rt) {
				if(r.message) {
					if(frm.doc.from != "Account") {
						frm.set_value('from_account', r.message.party_account);
						frm.set_value('from_party_name', r.message.party_name);
						frm.set_value('from_account_currency', r.message.party_account_currency);
					}
				}
			}
		});
	},
});

/////////////////////////////////////////////////

frappe.ui.form.on('Clearing Voucher', {
	to_party(frm) {
		frappe.call({
			method: 'erpnext.accounts.doctype.payment_entry.payment_entry.get_party_details',
			args: {
				company: frm.doc.company,
				party_type: frm.doc.to_party_type,
				party: frm.doc.to_party,
				date: frm.doc.posting_date
			},
			callback: function(r, rt) {
				if(r.message) {
					if(frm.doc.to != "Account") {
						frm.set_value('to_account', r.message.party_account);
						frm.set_value('to_party_name', r.message.party_name);
						frm.set_value('to_account_currency', r.message.party_account_currency);
					}
				}
			}
		});
	},
});

/////////////////////////////////////////////////

frappe.ui.form.on("Clearing Voucher", "onload", function(frm) {
    frm.set_query("from_account", function() {
        return {
            filters: {
                account_type: ["not in", ["Receivable", "Payable", "Bank", "Cash"]],
				is_group: 0
           }
        };
    });
});

/////////////////////////////////////////////////

frappe.ui.form.on("Clearing Voucher", "onload", function(frm) {
    frm.set_query("to_account", function() {
        return {
            filters: {
                account_type: ["not in", ["Receivable", "Payable", "Bank", "Cash"]],
				is_group: 0
           }
        };
    });
});

/////////////////////////////////////////////////

frappe.ui.form.on("Clearing Voucher", "from", function(frm) {
    frm.set_query("from_party_type", function() {
        return {
            filters: {
                name: ["in", ["Customer", "Supplier"]]
           }
        };
    });
});

/////////////////////////////////////////////////

frappe.ui.form.on("Clearing Voucher", "to", function(frm) {
    frm.set_query("to_party_type", function() {
        return {
            filters: {
                name: ["in", ["Customer", "Supplier"]]
           }
        };
    });
});

/////////////////////////////////////////////////

frappe.ui.form.on('Clearing Voucher', 'from_account', function(frm){
    if(cur_frm.doc.from_account_currency == 'LYD'){
        cur_frm.doc.source_exchange_rate = 1;
        cur_frm.refresh_field('source_exchange_rate');
        
    }
});

/////////////////////////////////////////////////

frappe.ui.form.on('Clearing Voucher', 'before_save', function(frm){
    if(cur_frm.doc.from_account_currency == 'LYD'){
        cur_frm.doc.source_exchange_rate = 1;
        cur_frm.refresh_field('source_exchange_rate');
        
    }
});

/////////////////////////////////////////////////

frappe.ui.form.on("Clearing Voucher", "deducted_amount", function(frm) {
    calculate_base_deducted_amount(frm);
});

frappe.ui.form.on("Clearing Voucher", "source_exchange_rate", function(frm) {
    calculate_base_deducted_amount(frm);
});

frappe.ui.form.on("Clearing Voucher", "before_save", function(frm) {
    calculate_base_deducted_amount(frm);
});


var calculate_base_deducted_amount = function(frm) {
    var base_deducted_amount = flt(frm.doc.deducted_amount) * flt(frm.doc.source_exchange_rate);
    frm.set_value("base_deducted_amount", base_deducted_amount);
};
/////////////////////////////////////////////////


frappe.ui.form.on('Clearing Voucher', 'to_account', function(frm){
    if(cur_frm.doc.to_account_currency == 'LYD'){
        cur_frm.doc.target_exchange_rate = 1;
        cur_frm.refresh_field('target_exchange_rate');
        
    }
});

/////////////////////////////////////////////////

frappe.ui.form.on('Clearing Voucher', 'before_save', function(frm){
    if(cur_frm.doc.to_account_currency == 'LYD'){
        cur_frm.doc.target_exchange_rate = 1;
        cur_frm.refresh_field('target_exchange_rate');
        
    }
});

/////////////////////////////////////////////////

frappe.ui.form.on('Clearing Voucher', 'to_account', function(frm){
    if(cur_frm.doc.to_account_currency == cur_frm.doc.from_account_currency){
        cur_frm.doc.target_exchange_rate = cur_frm.doc.source_exchange_rate;
        cur_frm.refresh_field('target_exchange_rate');
    }
});

/////////////////////////////////////////////////

frappe.ui.form.on('Clearing Voucher', 'before_save', function(frm){
    if(cur_frm.doc.to_account_currency == cur_frm.doc.from_account_currency){
        cur_frm.doc.target_exchange_rate = cur_frm.doc.source_exchange_rate;
        cur_frm.refresh_field('target_exchange_rate');
    }
});

/////////////////////////////////////////////////

frappe.ui.form.on("Clearing Voucher", "from_account", function(frm) {
    if (frm.doc.to_account_currency == frm.doc.from_account_currency) {
        calculate_added_amount(frm);
    }
});

frappe.ui.form.on("Clearing Voucher", "before_save", function(frm) {
    if (frm.doc.to_account_currency == frm.doc.from_account_currency) {
        calculate_added_amount(frm);
    }
});

var calculate_added_amount = function(frm) {
    var added_amount = flt(frm.doc.deducted_amount);
    frm.set_value("added_amount", added_amount);
};

/////////////////////////////////////////////////

frappe.ui.form.on("Clearing Voucher", "added_amount", function(frm) {
    calculate_base_added_amount(frm);
});

frappe.ui.form.on("Clearing Voucher", "target_exchange_rate", function(frm) {
    calculate_base_added_amount(frm);
});

frappe.ui.form.on("Clearing Voucher", "before_save", function(frm) {
    calculate_base_added_amount(frm);
});


var calculate_base_added_amount = function(frm) {
    var base_added_amount = flt(frm.doc.added_amount) * flt(frm.doc.target_exchange_rate);
    frm.set_value("base_added_amount", base_added_amount);
};
/////////////////////////////////////////////////