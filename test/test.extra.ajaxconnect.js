describe("extra.ajaxconnect", function () {
    var simpleSchema = new DD.Schema({
        name: DD.Types.Scalar,
        email: DD.Types.Scalar
    });

    var nestedSchema = new DD.Schema({
        owner: simpleSchema,
        type: DD.Types.Scalar
    });
    
    var autoConnectSchema = new DD.Schema({
        name: DD.Types.Scalar,
        email: DD.Types.Scalar
    }, { ajax: { url: "sample.json" } });

    function verifyModelReload(model, fn, done) {
        model.reload().always(function (data, textStatus, xhr) {
            asyncExpects(function () {
                expect(textStatus).to.eql('success');
                fn.call(model, data, textStatus, xhr);
            }, done);
        });
    }

    function withAjax() {
        var self = this;
        return isAjaxAvailable() ? {
            describe: function () { return describe.apply(self, arguments); }
        } : {
            describe: function () { return describe.skip.apply(self, arguments); }
        };
    }

    withAjax().describe("AjaxConnect", function () {
        it("connect simple model", function (done) {
            var m = simpleSchema.createValue();
            DD.AjaxConnect(m, "sample.json");
            verifyModelReload(m, function (data) {
                expect(this.name).to.eql(data.name);
                expect(this.email).to.eql(data.email);
            }, done);
        });
        
        it("connect nested model", function (done) {
            var m = nestedSchema.createValue();
            DD.AjaxConnect(m, "nested.json");
            verifyModelReload(m, function (data) {
                expect(this.owner.name).to.eql(data.owner.name);
                expect(this.owner.email).to.eql(data.owner.email);
                expect(this.type).to.eql(data.type);
            }, done);
        });
        
        it("connect automatically with schema options", function (done) {
            var m = autoConnectSchema.createValue();
            verifyModelReload(m, function (data) {
                expect(this.name).to.eql(data.name);
                expect(this.email).to.eql(data.email);
            }, done);
        });
        
        it("support custom modelUpdate", function (done) {
            var m = simpleSchema.createValue();
            DD.AjaxConnect(m, "sample.json", {
                modelUpdate: function (data) {
                    this.email = data.email + '-modified';
                }
            });
            verifyModelReload(m, function (data) {
                expect(this.name).to.be(null);
                expect(this.email).to.eql(data.email + '-modified');
            }, done);
        });
        
        it("support dataConvert", function (done) {
            var m = simpleSchema.createValue();
            DD.AjaxConnect(m, "sample.json", {
                dataConvert: function (data) {
                    return { name: data.email, email: data.name };
                }
            });
            verifyModelReload(m, function (data) {
                expect(this.name).to.eql(data.email);
                expect(this.email).to.eql(data.name);
            }, done);
        });
    });
});