describe("DD/core", function () {
    describe("DD.defClass", function () {
        var results = {};

        var BaseClass = DD.defClass({
            constructor: function () {
                results["base_ctor"] = arguments[0];
            },

            sample: function () {
                return "B";
            },

            get prop () { return "B"; },

            set prop (val) { return results["prop"] = ("B" + val); }
        });

        var Derived1 = DD.defClass(BaseClass, {
            constructor: function () {
                BaseClass.prototype.constructor.apply(this, arguments);
                results["d1_ctor"] = arguments[0];
            },

            sample: function () {
                return "D1";
            },

            get prop () { return BaseClass.prototype.prop + "D1"; },

            set prop (val) { return BaseClass.prototype.prop = ("D1" + val); }
        });

        var Derived2 = DD.defClass(BaseClass, {
            constructor: function () {
                results["d2_ctor"] = arguments[0];
            },

            sample: function () {
                return BaseClass.prototype.sample.apply(this, arguments) + "D2";
            },

            get prop () { return "D2"; },

            set prop (val) { return results["prop"] = ("D2" + val); }
        });

        beforeEach(function () {
            results = {};
        });

        it("invoke constructor of super class", function () {
            new Derived1("a1");
            console.debug(results);
            expect(results.base_ctor).to.eql("a1");
            expect(results.d1_ctor).to.eql("a1");
        });

        it("not invoke constructor of super class", function () {
            new Derived2("b1");
            console.debug(results);
            expect(results.base_ctor).to.be(undefined);
            expect(results.d2_ctor).to.eql("b1");
        });

        it("override method", function () {
            var d = new Derived1();
            var v = d.sample();
            expect(v).to.eql("D1");
            d = new Derived2();
            v = d.sample();
            expect(v).to.eql("BD2");
        });

        it("override property getter", function () {
            var d = new Derived2();
            var v = d.prop;
            expect(v).to.eql("D2");
            d = new Derived1();
            v = d.prop;
            expect(v).to.eql("BD1");
        });

        it("override property setter", function () {
            var d = new Derived2();
            d.prop = "x";
            expect(results.prop).to.eql("D2x");
            d = new Derived1();
            d.prop = "y";
            expect(results.prop).to.eql("BD1y");
        });
    });
});