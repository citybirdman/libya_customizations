frappe.listview_settings["Sales Order"] = {
    get_indicator: function(doc) {
        if(!["On Hold", "Closed"].includes(doc.status)){
            if (doc.per_delivered === 0 && doc.docstatus == 1) {
                return ["Not Delivered", "red", "delivery_status,=,Not Delivered"];
            } else if (doc.per_delivered < 100 && doc.docstatus == 1) {
                return ["Partially Delivered", "orange", "delivery_status,=,Partially Delivered"];
            } else if (doc.per_delivered === 100  && doc.docstatus == 1) {
                return ["Fully Delivered", "green", "delivery_status,=,Fully Delivered"];
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