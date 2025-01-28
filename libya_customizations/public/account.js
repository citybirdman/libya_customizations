frappe.ui.form.on('Account', {
	refresh(frm){
		frm.add_custom_button(
			__("Account Statment Summary"),
			function () {
				frappe.route_options = {
					account: frm.doc.name,
					from_date: frappe.datetime.year_start(frappe.datetime.nowdate()),
					to_date: frappe.datetime.nowdate()
				};
				frappe.set_route("query-report", "Account Statement Summary");
			},
			__("View"));
	},
	account_name(frm) {
		if (frm.doc.__islocal) {
			frappe.call({
				method: "libya_customizations.server_script.apis.check_user_role",
				args: {
					user: frappe.session.user,
					role: "Libya Team"
				},
				callback: function(response) {
					if (response.message === true) {
						frappe.db.get_value('Company', frm.doc.company, 'temporary_parent_account', function(value) {
							if (value && value.temporary_parent_account) {
								frappe.model.set_value(frm.doc.doctype, frm.doc.name, 'parent_account', value.temporary_parent_account);
							} else {
								console.log('Temporary Parent Account is not set in Company Master.');
							}
						});
					}
				}
			});
		}
	},
});