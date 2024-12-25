frappe.query_reports["report test"] = {
	filters: [
		{
			fieldname: "date",
			label: __("Date"),
			fieldtype: "Date",
			default: new Date,
		}
	]
};