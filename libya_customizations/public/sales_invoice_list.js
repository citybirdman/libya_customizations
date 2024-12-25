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
			"Draft": "grey",
			"Credit Return": "gray",
			"Cash Invoice": "green",
			"Credit Invoice": "red",
			"Cash Return": "darkgrey",
			"Cancelled": "red"
		};
		return [__(doc.payment_status), status_colors[doc.payment_status], "payment_status,=," + doc.payment_status];
	}
}