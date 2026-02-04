frappe.listview_settings["Purchase Invoice"] = {
    get_indicator: function (doc) {
        console.log(doc);
		const status_colors = {
			"Draft": "grey",
			"Credit Return": "gray",
			"Cash Invoice": "green",
			"Credit Invoice": "red",
			"Cash Return": "darkgrey",
			"Cancelled": "red"
		};
        if(doc.is_opening == "Yes"){
            return [__("Opening"), "orange", "is_opening,=," + doc.is_opening]
        }
        else{
            return [__(doc.custom_payment_status), status_colors[doc.custom_payment_status], "custom_payment_status,=," + doc.custom_payment_status];
        }
	}
}