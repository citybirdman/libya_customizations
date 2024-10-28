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
