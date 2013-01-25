!function (exports) {
    var simpleBindingSchema = new DD.Schema({
        title: DD.Types.Scalar
    });

    DD.Models.register("simpleBinding", simpleBindingSchema);

    exports.TestScope = {};
}(window);

describe("DD/core", function () {
    describe("Scoped binding", function () {
        var itemSchema = new DD.Schema({
            id: DD.Types.Scalar,
            name: DD.Types.Scalar
        });

        var bindingSchema = new DD.Schema({
            title: DD.Types.Scalar,
            items: [itemSchema]
        });

        var models, container, scope;

        beforeEach(function () {
            models = new DD.ModelRegistry();
            models.register("simple", bindingSchema);
            container = document.createElement("div");
            scope = new DD.BindingScope(container, models);
        });

        var WithBinding = DD.defClass({
            constructor: function (selector, done) {
                this.selector = selector;
                this.done = done;
            },

            go: function (fn) {
                var node = this.selector();
                if (node && node.__dd_binding) {
                    try {
                        fn();
                        this.done();
                    } catch (e) {
                        this.done(e);
                    }
                } else {
                    setTimeout(function (self, fn) { self.go(fn); }, 0, this, fn);
                }
            }
        });

        var WithSpan = DD.defClass(WithBinding, {
            constructor: function (done) {
                WithBinding.prototype.constructor.call(this, function () {
                    return $(container).find("span")[0];
                }, done);
            }
        });

        var WithSpanText = DD.defClass(WithBinding, {
            constructor: function (done) {
                 WithBinding.prototype.constructor.call(this, function () {
                    return $(container).find("span")[0].childNodes[0];
                }, done);
            }
        });

        it("simple binding", function (done) {
            this.timeout(200);

            scope.bind();
            container.innerHTML = "<div><span data-drive-map='simple'>%{ $D.title }</span></div>";

            var m = models.query("simple");
            new WithSpanText(done).go(function () {
                m.title = "test scope simple binding";
                expect($(container).find("span").html()).to.eql("test scope simple binding");
            });
        });

        it("no map", function (done) {
            this.timeout(200);

            var m = bindingSchema.createValue();
            scope.scope(container, m).bind();
            container.innerHTML = "<div><span>%{ $D.title }</span></div>";

            new WithSpanText(done).go(function () {
                m.title = "test scope no map";
                expect($(container).find("span").html()).to.eql("test scope no map");
            });
        });

        it("invoke script on model change", function (done) {
            this.timeout(200);

            scope.bind();
            container.innerHTML =
                "<div data-drive-map='simple' data-drive-on='update:TestScope.onModelChange(this, $C)'>\
                 <span data-drive-map='.title' data-drive-on='update:TestScope.onTitleChange(this, $C)'>\
                 </span></div>";

            var result = null, modelChanged = false;

            TestScope.onModelChange = function () {
                modelChanged = true;
            };

            TestScope.onTitleChange = function (binding, change) {
                result = { binding: binding, change: change };
            };

            var m = models.query("simple");
            new WithSpan(done).go(function () {
                m.title = "test scope script";
                expect(modelChanged).to.be(false);
                expect(result).to.be.ok();
                expect(result.change.change).to.eql('update');
                expect(result.change.newVal).to.eql("test scope script");
            });
        });

        it("manipulate a list", function (done) {
            this.timeout(200);

            scope.bind();
            container.innerHTML = "<div data-drive-map='simple.items' data-drive-list='auto'></div>";
            var elem = $(container).find("div")[0];
            var items = models.query("simple.items");
            new WithBinding(function () { return elem; }, done).go(function () {
                items.value = [{ id: 1, name: "a1" }, { id: 2, name: "a2" }];
                expect($(elem).find("div")).to.have.length(2);
            });
        });
    });

    describe("DOM binding", function () {
        it("bind on document ready", function () {
            var title = $("#title");
            var m = DD.Models.query("simpleBinding");
            m.title = "Initial Title";
            expect(title.html()).to.eql("Initial Title");
            m.title = "Changed Title";
            expect(title.html()).to.eql("Changed Title");
        });
    });
});