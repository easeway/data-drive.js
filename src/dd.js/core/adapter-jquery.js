// Copyright (c) 2012, Yisui Hu <easeway@gmail.com>
// All rights reserved.
// -----------------------------------------------------------------------------

// Adapter for jQuery

//#require foundation.js

(function (_W) {

    if (_W.jQuery == null) {
        // jQuery is not present, do nothing
        return;
    }
    
    var DD = _W.DataDrive;
    
    var jQuery = _W.jQuery;
    
    DD.inherit = function (sub, base) {
            jQuery.extend(sub, base);
            jQuery.extend(sub.prototype, base.prototype);
        };
    
    DD.ajax = function (url, opts) {
        var params = { };
        var context = opts.context;
        if (context == null) {
            context = this;
        }
        if (opts != null) {
            if (opts.method != null) {
                params.type = opts.method;
            }
            if (opts.contentType != null) {
                params.contentType = opts.contentType;
            }
            if (opts.content != null) {
                params.data = opts.content;
            }
            if (opts.async != null) {
                params.async = opts.async;
            }
            if (opts.accepts != null) {
                params.accepts = opts.accepts;
            }
            if (typeof(opts.onsuccess) == "function") {
                params.success = function (data, textStatus, jqXHR) {
                    opts.onsuccess.call(context, {
                        content: data,
                        status: textStatus,
                        xhr: jqXHR
                    });
                }
            }
            if (typeof(opts.onerror) == "function") {
                params.error = function (jqXHR, textStatus, errorThrown) {
                    opts.onerror.call(context, {
                        error: errorThrown,
                        status: textStatus,
                        xhr: jqXHR
                    });
                }
            }
        }
        return jQuery.ajax(url, params);
    };
    
    DD.getSync = function (url, opts) {
        var myopts = { }
        if (opts != null) {
            jQuery.extend(myopts, opts);
        }
        myopts.async = false;
        return DD.ajax(url, myopts);
    };
    
    DD.ready = function (callback) {
        jQuery(document).ready(function () {
            callback();    
        });
    };
    
})(window);
