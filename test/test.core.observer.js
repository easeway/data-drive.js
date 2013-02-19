describe("core.observer", function () {
    var observer;

    beforeEach(function () {
        observer = new DD.Observer();
    });

    describe("DD.Observer", function () {
        it("notify all listeners", function () {
            var count = 0;
            var listener = function () { count ++; };
            observer.add(listener)
                    .add(listener);
            observer.notify();
            expect(count).to.eql(2);
        });

        it("notify with arguments", function () {
            var received;
            observer.add(function (a) { received = a; })
                    .notify("a1");
            expect(received).to.eql("a1");
        });

        it("remove listeners", function () {
            var v1 = 0, v2 = 0;
            var l1 = function () { v1 ++; };
            var l2 = function () { v2 ++; };
            observer.add(l1)
                    .add(l2)
                    .remove(l1)
                    .notify();
            expect(v1).to.eql(0);
            expect(v2).to.eql(1);
        });

        it("invoke listener with context", function () {
            var ctx = Object.create({ key: 123 });
            var ob = new DD.Observer(ctx);
            var result;
            ob.add(function () { result = this; })
              .notify();
            expect(result).to.be(ctx);
        });
    });

    describe("DD.Listener", function () {
        it("receive notification", function () {
            var received = null;
            new DD.Listener(function (a) {
                received = a;
            }).listen(observer);
            observer.notify("x");
            expect(received).to.eql("x");
        });

        it("receive notification with context", function () {
            var ctx = Object.create({ key: 321 });
            var received = null;
            new DD.Listener(function () {
                received = this;
            }, ctx).listen(observer);
            observer.notify();
            expect(received).to.be(ctx);
        });

        it("receive notification with default context", function () {
            var received = null;
            var l = new DD.Listener(function () {
                received = this;
            });
            l.listen(observer);
            observer.notify();
            expect(received).to.be(l);
        });

        it("listen on new observer", function () {
            var count = 0;
            var received = null;
            var l = new DD.Listener(function (a) { count ++; received = a; });
            l.listen(observer);
            var obs2 = new DD.Observer();
            l.listen(obs2);
            observer.notify(1);
            obs2.notify(2);
            expect(count).be.eql(1);
            expect(received).be.eql(2);
        });

        it("detach from the observer", function () {
            var count = 0;
            var l = new DD.Listener(function (a) { count ++; });
            l.listen(observer);
            l.listen();
            observer.notify();
            expect(count).be.eql(0);
        });
    });
});