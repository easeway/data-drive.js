describe("core.model", function () {
    var listener, changes;

    beforeEach(function () {
        changes = [];
        listener = new DD.Listener(function (change) {
            changes.push(change);
        });
    });

    describe("DD.Value", function () {
        it("notify listeners on value change", function () {
            var v = DD.Types.Scalar.createValue();
            listener.listen(v);
            v.value = 5432;
            expect(changes.length).to.eql(1);
            expect(changes[0].change).to.eql('update');
            expect(changes[0].newVal).to.eql(5432);
            v.value = 2345;
            expect(changes.length).to.eql(2);
            expect(changes[1].change).to.eql('update');
            expect(changes[1].oldVal).to.eql(5432);
            expect(changes[1].newVal).to.eql(2345);
        });

        it("store assigned value property", function () {
            var v = DD.Types.Scalar.createValue();
            v.value = 8765;
            expect(v.value).to.eql(8765);
        });
    });

    describe("DD.ScalarType", function () {
        it("initial value", function () {
            var type = new DD.ScalarType({ initialVal: 3542 });
            var v = type.createValue();
            expect(v.value).to.eql(3542);
            v.value = 1234;
            expect(v.value).to.eql(1234);
            v.value = null;
            expect(v.value).to.be(null);
        });

        it("default value", function () {
            var type = new DD.ScalarType({ defaultVal: "someVal" });
            var v = type.createValue();
            expect(v.value).to.eql("someVal");
            v.value = 4567;
            expect(v.value).to.eql(4567);
            v.value = null;
            expect(v.value).to.eql("someVal");
        });
        
        it("initial value is not default value", function () {
            var type = new DD.ScalarType({ defaultVal: "someVal", initialVal: "otherVal" });
            var v = type.createValue();
            expect(v.value).to.eql("otherVal");
            v.value = 7890;
            expect(v.value).to.eql(7890);
            v.value = null;
            expect(v.value).to.eql("someVal");
        });
    });
    
    describe("DD.List", function () {
        var listSchema = new DD.Schema({
            items: [DD.Types.Scalar]
        });

        var listModel;

        beforeEach(function () {
            listModel = listSchema.createValue();
        });

        it("#value", function () {
            listModel.items = [, 3, , 6, 89, , 10];
            expect(listModel.items.value).to.eql([, 3, , 6, 89, , 10]);
        });

        it("#length", function () {
            listModel.items = [23];
            expect(listModel.items.length).to.eql(1);
            listModel.items = [2, 3, 4, 5];
            expect(listModel.items.length).to.eql(4);
        });

        it("#at", function () {
            listModel.items = [3, 4, 5, 6];
            expect(listModel.items.at(2)).to.be.a(DD.Scalar);
        });

        it("#valAt", function () {
            listModel.items = [3, 4, 5, 6];
            expect(listModel.items.valAt(2)).to.eql(5);
        });

        it("#insert", function () {
            listModel.items = [17, 58, 68];
            listener.listen(listModel.items);
            var adds = [45, 65];
            listModel.items.insert(1, adds);
            expect(listModel.items.value).to.eql([17, 45, 65, 58, 68]);
            expect(changes.length).to.eql(1);
            expect(changes[0].change).to.eql('items');
            expect(changes[0].op).to.eql('insert');
            expect(changes[0].index).to.eql(1);
            expect(changes[0].items.length).to.eql(2);
            for (var i = 0; i < changes[0].items.length; i ++) {
                expect(changes[0].items[i]).to.be.a(DD.Scalar);
                expect(changes[0].items[i].value).to.eql(adds[i]);
            }
        });

        it("#remove", function () {
            listModel.items = [17, 58, 68, 87, 99, 103, 106, 109];
            listener.listen(listModel.items);
            listModel.items.remove(1, 2);
            expect(listModel.items.value).to.eql([17, 87, 99, 103, 106, 109]);
            expect(changes).to.have.length(1);
            expect(changes[0].change).to.eql('items');
            expect(changes[0].op).to.eql('remove');
            expect(changes[0].index).to.eql(1);
            expect(changes[0].items).to.have.length(2);
            var rems = [58, 68];
            for (var i = 0; i < changes[0].items.length; i ++) {
                expect(changes[0].items[i]).to.be.a(DD.Scalar);
                expect(changes[0].items[i].value).to.eql(rems[i]);
            }

            listModel.items.remove(0);
            expect(listModel.items.value).to.eql([87, 99, 103, 106, 109]);
            expect(changes).to.have.length(2);
            expect(changes[1].change).to.eql('items');
            expect(changes[1].op).to.eql('remove');
            expect(changes[1].index).to.eql(0);
            expect(changes[1].items).to.have.length(1);

            listModel.items.remove(2, -1);
            expect(listModel.items.value).to.eql([87, 99]);
            expect(changes.length).to.eql(3);
            expect(changes[2].items).to.have.length(3);

            listModel.items.remove(0, 10);
            expect(listModel.items.value).to.eql([]);
            expect(changes.length).to.eql(4);
            expect(changes[3].items).to.have.length(2);
        });

        it("#update", function () {
            var list0 = [, , 2, , , 5]
            var list1 = [3, 6, 7, 8];
            listModel.items = list0;
            expect(listModel.items.length).to.eql(6);
            listener.listen(listModel.items);
            listModel.items.update(1, list1);
            expect(listModel.items.value).to.eql([, 3, 6, 7, 8, 5]);
            expect(changes.length).to.eql(1);
            expect(changes[0].change).to.eql('items');
            expect(changes[0].op).to.eql('update');
            expect(changes[0].index).to.eql(1);
            expect(changes[0].items).to.have.length(4);
            listModel.items.update(2, [, , 4]);
            expect(listModel.items.value).to.eql([, 3, 6, 7, 4, 5]);
            expect(changes[1].index).to.eql(4);
            expect(changes[1].items).to.have.length(1);
            listModel.items.update(1, [undefined, 9]);
            expect(listModel.items.value).to.eql([, , 9, 7, 4, 5]);
            expect(changes[2].index).to.eql(1);
            expect(changes[2].items).to.have.length(2);
        });
    });

    describe("DD.Schema", function () {
        var userSchema = new DD.Schema({
            name: DD.Types.Scalar,
            role: DD.Types.Scalar,
            emails: [DD.Types.Scalar]
        });
        var teamSchema = new DD.Schema({
            name: DD.Types.Scalar,
            members: [userSchema]
        });

        it("define the schema and create model property", function () {
            var m = userSchema.createValue();
            var vName = m.query("name");
            var vEmails = m.query("emails");
            expect(vName).to.be.a(DD.Scalar);
            expect(vEmails).to.be.a(DD.List);
            listener.listen(vName);
            m.name = "DD";
            expect(m.name).to.eql("DD");
            expect(changes[0].change).to.eql('update');
            expect(changes[0].oldVal).to.be(null);
            expect(changes[0].newVal).to.eql("DD");
            listener.listen(vEmails);
            m.emails = ["test@dd"];
            expect(changes[1].change).to.eql('update');
            expect(changes[1].oldVal).to.eql([]);
            expect(changes[1].newVal).to.eql(["test@dd"]);
            expect(m.emails).to.be.a(DD.List);
            expect(m.emails.length).to.eql(1);
            expect(m.emails.valAt(0)).to.eql("test@dd");
        });

        it("nest schemas", function () {
            var m = teamSchema.createValue();
            m.members = [{ name: "Jacky", role: "Leader", emails: ["jacky@DD"] }, { name: "Christ" }];
            expect(m.members).to.be.a(DD.List);
            expect(m.members.length).to.eql(2);
            expect(m.members.valAt(0)).to.eql({ name: "Jacky", role: "Leader", emails: ["jacky@DD"] });
            expect(m.members.valAt(1)).to.eql({ name: "Christ", role: null, emails: [] });
        });

        it("get value of model", function () {
            var m = userSchema.createValue();
            m.name = "Hudson";
            m.role = "Writer";
            m.emails = ["hudson@dd"];
            expect(m.value).to.eql({ name: "Hudson", role: "Writer", emails: ["hudson@dd"]});
        });

        it("query sub values", function () {
            var m = teamSchema.createValue();
            m.members = [{ name: "Jacky", role: "Leader", emails: ["jacky@DD"] }, { name: "Christ", role: "Chef" }];
            var result = m.query("members.1.role");
            expect(result).to.be.ok();
            expect(result.value).to.eql("Chef");
        });

        it("query with callback", function () {
            var m = teamSchema.createValue();
            m.members = [{ name: "Jacky", role: "Leader", emails: ["jacky@DD"] }, { name: "Christ", role: "Chef" }];

            var directReturn = function (value, names) { return { value: value, names: names }; };

            var result = m.query("members.100.role", directReturn);
            expect(result.value).to.be(m.members);
            expect(result.names).to.eql(["100", "role"]);

            result = m.query("nonexists.role", directReturn);
            expect(result.value).to.be(m);
            expect(result.names).to.eql(["nonexists", "role"]);

            result = m.query("members.1.role.x", directReturn);
            expect(result.value).to.be(m.members.at(1).findProperty("role"));
            expect(result.value.value).to.eql(m.members.at(1).role);
            expect(result.names).to.eql(["x"]);
        });
    });
});