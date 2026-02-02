// Copyright (c) 2024, Ahmed Zaytoon and contributors
// For license information, please see license.txt

frappe.ui.form.on('Letter of Credit', {
	async refresh(frm) {
		if (frm.doc.workflow_state === 'Approved') {
            // Lock everything first
            frm.meta.fields.forEach(df => {
                frm.set_df_property(df.fieldname, 'read_only', 1);
            });
            r = await frappe.db.get_value(
                frm.doctype,
                frm.doc.name,
                "expected_presentation_date"
            )
            frm.doc.DBExpectedPresentationDate = r.message.expected_presentation_date;
            whitelisted_fields = [{fieldname:'expected_presentation_date', reqd: 1}, {fieldname:'actual_presentation_date', reqd: !!frm.doc.DBExpectedPresentationDate}, {fieldname:'lc_application', reqd: !!frm.doc.DBExpectedPresentationDate}];
            whitelisted_fields.forEach(field => {
                frm.set_df_property(field.fieldname, 'read_only', 0);
                frm.set_df_property(field.fieldname, 'reqd', field.reqd);
            });
            frm.refresh_fields();
        }
	}
})
