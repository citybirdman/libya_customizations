frappe.listview_settings["Sales Invoice"] = {
    refresh: function(listview){
        listview.page.clear_primary_action();

        listview.page.wrapper.on('change', '.list-row-checkbox', function() {
            listview.page.clear_primary_action();
        });

        listview.page.wrapper.on('change', '.list-header-checkbox', function() {
            listview.page.clear_primary_action();
        });
        
        listview.page.wrapper.on('change', '.list-check-all', function() {
            listview.page.clear_primary_action();
        });
    },
    get_indicator: function (doc) {
		const status_colors = {
			Draft: "grey",
			Unpaid: "orange",
			Paid: "green",
			Return: "gray",
			"Credit Note Issued": "gray",
			"Unpaid and Discounted": "orange",
			"Partly Paid and Discounted": "yellow",
			"Overdue and Discounted": "red",
			Overdue: "red",
			"Partly Paid": "yellow",
			"Internal Transfer": "darkgrey",
		};
		return [__(doc.status), status_colors[doc.status], "status,=," + doc.status];
	}
}