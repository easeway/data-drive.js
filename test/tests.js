!function (exports) {
    var ajaxAvailable = undefined;
    
    exports.isAjaxAvailable = function () {
        if (ajaxAvailable == undefined) {
            ajaxAvailable = false;
            try {
                jQuery.ajax("sample.json", {
                    async: false,
                    complete: function (xhr, textStatus) {
                        if (textStatus === 'success') {
                            ajaxAvailable = true;
                        }
                    }
                });
            } catch (e) {
            }
        }
        return ajaxAvailable;
    }

    exports.asyncExpects = function (fn, done) {
        if (!done) {
            return fn();
        } else {
            var result
            try {
                result = fn();
                done();
            } catch (e) {
                done(e);
            }
            return result;
        }
    };

    $(document).ready(function () {
        if (!DD.compatibility.ok) {
            $("#incompatible").removeClass("hidden");
        }
        if (!isAjaxAvailable()) {
            $("#noajax").removeClass("hidden");
        }
    });
}(window);