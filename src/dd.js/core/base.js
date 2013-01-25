// Copyright (c) 2012, Yisui Hu <easeway@gmail.com>
// All rights reserved.
// -----------------------------------------------------------------------------

!function (exports) {
    var DD = {
        VERSION: "2.0.0"
    };

    DD.defClass = function (base, proto) {
        if (typeof(base) != 'function') {
            proto = base;
            base = Object;
        }
        if (!proto) {
            proto = {};
        }
        proto.__proto__ = base.prototype;
        var theClass = function () {
            if (typeof(this.constructor) == 'function') {
                this.constructor.apply(this, arguments);
            }
        };
        theClass.prototype = proto;
        return theClass;
    };

    DD.NotImplementedError = DD.defClass(Error, {
        constructor: function (name) {
            this.super.constructor.call(this, "Not implemented: " + name);
        }
    });

    var Compatibility = DD.defClass({
        constructor: function () {
            this.tests = [];
        },

        get ok () {
            return this.compatible;
        },

        get compatible () {
            this._testOnDemand();
            return this._compatible;
        },

        get report () {
            this._testOnDemand();
            return this._compatible;
        },

        register: function (suiteName, testFn) {
            this.tests.push({ name: suiteName, test: testFn });
            delete this._report;
            delete this._compatible;
        },

        test: function () {
            var report = {}, fails = 0;
            this.tests.forEach(function (test) {
                var results = {};
                try {
                    if (test.test(results)) {
                        results.ok = true;
                    }
                } catch (e) {
                    results.error = e;
                    delete results.ok;
                }
                if (!results.ok) fails ++;
                report[test.name] = results;
            });
            this._report = report;
            this._compatible = fails == 0;
        },

        _testOnDemand: function () {
            if (!this._report) {
                this.test();
            }
        }
    });

    DD.compatibility = new Compatibility();

    DD.settings = { on: {}, off: {} };

    exports.DataDrive = exports.DD = DD;
}(window);