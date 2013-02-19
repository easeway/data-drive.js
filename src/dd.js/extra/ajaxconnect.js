// Copyright (c) 2013, Yisui Hu <easeway@gmail.com>
// All rights reserved.
// -----------------------------------------------------------------------------

// Depeneds on jQuery

!function (DD) {
    var AjaxConnect = function (model, url, ajaxOpts) {
        var settings = jQuery.extend({ accepts: 'application/json' }, ajaxOpts || {});
        var successHandler = settings.success;
        settings.success = function (data) {
            model.setVal(data);
            if (typeof(successHandler) == 'function') {
                successHandler.apply(this, arguments);
            }
        };
        model.reload = function () {
            return jQuery.ajax(url, settings);
        };
        return model;
    };
    
    DD.AjaxConnect = AjaxConnect;
    
    DD.extensions.connect("Schema", {
        modeling: function (model, schema) {
            if (schema.options.ajax && schema.options.ajax.url) {
                AjaxConnect(model, schema.options.ajax.url, schema.options.ajax.settings);
            }
        }
    });
}(DataDrive);