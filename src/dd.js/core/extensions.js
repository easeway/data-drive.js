// Copyright (c) 2013, Yisui Hu <easeway@gmail.com>
// All rights reserved.
// -----------------------------------------------------------------------------

//# require base

!function (DD) {
    function callExtension(fn, ext, args, value) {
        var params = [].slice.call(args, 0);
        params.push(value);
        return fn.apply(ext, params);
    }

    var Extensions = DD.defClass({
        constructor: function () {
            this.extensions = {};
        },
        
        connect: function (extensionPoint, extension) {
            var exts = this.extensions[extensionPoint];
            if (!exts) {
                this.extensions[extensionPoint] = exts = [];
            }
            exts.push(extension);
            return this;
        },
        
        use: function (extensionPoint, op) {
            var exts = this.extensions[extensionPoint];
            if (!exts) {
                return function () { return undefined; };
            }
            if (typeof(op) == 'function') {
                return function () {
                    var args = arguments;
                    return exts.reduce(function (value, ext) {
                        return callExtension(op, ext, args, value);
                    }, undefined);
                };
            } else {
                return function () {
                    var args = arguments;
                    return exts.reduce(function (value, ext) {
                        var fn = ext[op];
                        if (typeof(fn) == 'function') {
                            return callExtension(fn, ext, args, value);
                        }
                        return value;
                    }, undefined);
                };
            }
        }
    });
    
    DD.extensions = new Extensions();
}(DataDrive);