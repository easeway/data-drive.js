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

    var tests = function () {
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
    };

    if (isAjaxAvailable()) {
        describe("AjaxConnect", tests);
    } else {
        describe.skip("AjaxConnect", tests);
    }
});