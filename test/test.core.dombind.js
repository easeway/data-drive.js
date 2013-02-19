!function (exports) {
    var simpleBindingSchema = new DD.Schema({
        title: DD.Types.Scalar
    });

    DD.Models.register("simpleBinding", simpleBindingSchema);

    exports.TestScope = {};
}(window);

describe("core.dombind", function () {
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

        var AsyncBindingTest = DD.defClass({
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
                return this;
            }
        });

        function withBinding (selector, done) {
            return new AsyncBindingTest(selector, done);
        }

        function withSpan (done) {
            return new AsyncBindingTest(function () {
                return $(container).find("span")[0];
            }, done);
        }

        function withSpanText (done) {
            return new AsyncBindingTest(function () {
                return $(container).find("span")[0].childNodes[0];
            }, done);
        }

        it("simple binding", function (done) {
            this.timeout(200);

            scope.bind();
            container.innerHTML = "<div><span data-drive-map='simple'>%{ $D.title }</span></div>";

            var m = models.query("simple");
            withSpanText(done).go(function () {
                m.title = "test scope simple binding";
                expect($(container).find("span").html()).to.eql("test scope simple binding");
            });
        });

        it("no map", function (done) {
            this.timeout(200);

            var m = bindingSchema.createValue();
            scope.scope(container, m).bind();
            container.innerHTML = "<div><span>%{ $D.title }</span></div>";

            withSpanText(done).go(function () {
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
            withSpan(done).go(function () {
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
            container.innerHTML = "<div data-drive-map='simple.items'><div>Id: %{ $D.id }, Name: %{ $D.name }</div></div>";
            var elem = $(container).find("div")[0];
            var items = models.query("simple.items");
            withBinding(function () { return elem; }, done).go(function () {
                items.value = [{ id: 1, name: "a1" }, { id: 2, name: "a2" }];
                var nodes = elem.childNodes;
                expect(nodes.length).to.eql(2);
                expect(nodes[0].innerHTML).to.eql("Id: 1, Name: a1");
                expect(nodes[1].innerHTML).to.eql("Id: 2, Name: a2");

                items.at(1).name = "a2x";
                expect(nodes[1].innerHTML).to.eql("Id: 2, Name: a2x");

                nodes[0].__test_ver = 0;
                nodes[1].__test_ver = 0;
                items.insert(1, { id: 1.5, name: "a1.5" });
                var children = elem.childNodes;
                expect(children[0].__test_ver).to.eql(0);
                expect(children[1].__test_ver).to.be(undefined);
                expect(children[2].__test_ver).to.eql(0);
                expect(children[1].innerHTML).to.eql("Id: 1.5, Name: a1.5");

                items.remove(2, 1);
                children = elem.childNodes;
                expect(children.length).to.eql(2);
                expect(children[0].innerHTML).to.eql("Id: 1, Name: a1");
                expect(children[1].innerHTML).to.eql("Id: 1.5, Name: a1.5");
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