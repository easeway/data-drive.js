describe("core.extensions", function () {
    describe("DD.extensions", function () {
        it("connect a new extension", function () {
            DD.extensions.connect("Test", {
                sample: function (passInVal) { return 101 + passInVal; }
            });
            var extFn = DD.extensions.use("Test", "sample");
            expect(extFn).to.be.a(Function);
            var result = extFn(201);
            expect(result).to.eql(302);
        });
        
        it("return a dummy function for non-connected extension-point", function () {
            var extFn = DD.extensions.use("Test", "non-exist");
            expect(extFn).to.be.a(Function);
            var result = extFn();
            expect(result).to.be(undefined);
            
            extFn = DD.extensions.use("TestNonExist", "non-exist");
            expect(extFn).to.be.a(Function);
            result = extFn();
            expect(result).to.be(undefined);
        });
        
        it("invoke extension in a special way", function () {
            DD.extensions.connect("TestSpecial", {
                fn1: function (val) { return val + 1; },
                fn2: function (val) { return val * 2; }
            });
            
            var extFn = DD.extensions.use("TestSpecial", function () {
                return this.fn2(this.fn1(100));
            });
            expect(extFn).to.be.a(Function);
            var result = extFn();
            expect(result).to.eql(202);
        });
        
        it ("invoke extensions by reduce", function () {
            var calc = function (prevResult) {
                return prevResult == undefined ? 1 : (prevResult + 1);
            };
            for (var i = 0; i < 10; i ++) {
                DD.extensions.connect("TestReduce", { calc: calc });
            }
            var extFn = DD.extensions.use("TestReduce", "calc");
            expect(extFn).to.be.a(Function);
            var result = extFn();
            expect(result).to.eql(10);
        });
    });
});