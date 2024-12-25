def execute(filters = None):
    columns = [{"label": "Route", "fieldname": "route", "fieldtype": "Data", "width": 200}]
    data = [{"route": 0}]
    return columns, data