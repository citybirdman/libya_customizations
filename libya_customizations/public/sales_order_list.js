frappe.listview_settings["Sales Order"] = {
    get_indicator: function(doc) {
        if(!["On Hold", "Closed"].includes(doc.status)){
            if (doc.per_delivered === 0 && doc.docstatus == 1) {
                return [__("Not Delivered"), "red", "delivery_status,=,Not Delivered"];
            } else if (doc.per_delivered < 100 && doc.docstatus == 1) {
                return [__("Partly Delivered"), "orange", "delivery_status,=,Partly Delivered"];
            } else if (doc.per_delivered === 100  && doc.docstatus == 1) {
                return [__("Fully Delivered"), "green", "delivery_status,=,Fully Delivered"];
            }
        }else{
            if (doc.status === "Closed") {
                return [__("Closed"), "green", "status,=,Closed"];
            } else if (doc.status === "On Hold") {
                return [__("On Hold"), "orange", "status,=,On Hold"];
            }
        }
    }
};