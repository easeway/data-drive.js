// Copyright (c) 2013, Yisui Hu <easeway@gmail.com>
// All rights reserved.
// -----------------------------------------------------------------------------

// Depeneds on jQuery

!function (DD) {
    "use strict";

    var AjaxConnect = function (model, url, ajaxOpts) {
        var settings = jQuery.extend({ accepts: 'application/json' }, ajaxOpts || {});
        var successHandler = settings.success;
        var modelUpdate = settings.modelUpdate;
        var dataConvert = settings.dataConvert;
        delete settings.modelUpdate;
        delete settings.dataConvert;
        settings.success = function (data) {
            if (typeof(modelUpdate) == 'function') {
                modelUpdate.call(model, data);
            } else {
                if (typeof(dataConvert) == 'function') {
                    data = dataConvert(data);
                }
                model.value = data;
            }
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
    
    // Connect extension point
    DD.extensions.connect("Schema", {
        modeling: function (model, schema) {
            if (schema.options.ajax && schema.options.ajax.url) {
                AjaxConnect(model, schema.options.ajax.url, schema.options.ajax.settings);
            }
        }
    });
    
    // Extend Model prototype
    DD.Value.prototype.ajax = function (url, opts) {
        return AjaxConnect(this, url, opts);
    };
}(DataDrive);