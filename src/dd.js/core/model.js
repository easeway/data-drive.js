// Copyright (c) 2012, Yisui Hu <easeway@gmail.com>
// All rights reserved.
// -----------------------------------------------------------------------------

//# require base
//# require observer

!function (DD) {
    "use strict";

    var Value = DD.defClass(DD.Observer, {
        constructor: function () {
            DD.Observer.prototype.constructor.call(this);
            this.caching = false;
            this.cachedRev = null;
            this.cachedVal = null;
            this.valueRev = 0;
        },

        get value () {
            if (!this.caching) {
                return this.getVal();
            }
            if (this.cachedRev === this.valueRev) {
                return this.cachedVal;
            }
            this.cachedVal = this.getVal();
            this.cachedRev = this.valueRev;
            return this.cachedVal;
        },

        set value (val) {
            var oldVal = this.getVal();
            var newVal = this.setVal(val);
            this.flush({ change: 'update', oldVal: oldVal, newVal: newVal });
        },

        query: function (path, callback) {
            var names;
            if (Array.isArray(path)) {
                names = path;
            } else {
                names = path.split(".");
            }
            var value = this, left = undefined;
            for (var i = 0; i < names.length; i ++) {
                if (names[i] == '') continue;
                if (typeof(value.findProperty) == 'function') {
                    var next = value.findProperty(names[i]);
                    if (next) {
                        value = next;
                        continue;
                    }
                }
                left = names.slice(i);
                break;
            }
            if (typeof(callback) == 'function') {
                return callback(value, left);
            }
            return left ? null : value;
        },

        flush: function (notification) {
            if (this.caching) {
                this.cachedVal = null;
                this.valueRev ++;
            }
            if (notification) {
                notification.data = this;
                this.notify(notification);
            }
        },

        refresh: function () {
            this.notify({ change: 'update', refresh: true, data: this });
        }
    });

    var Scalar = DD.defClass(Value, {
        constructor: function () {
            Value.prototype.constructor.call(this);
            this._value = null;
        },

        getVal: function () {
            return this._value;
        },

        setVal: function (val) {
            return this._value = val;
        }
    });

    var List = DD.defClass(Value, {
        constructor: function (itemType) {
            Value.prototype.constructor.call(this);
            this.isList = true;
            this.itemType = itemType;
            this.items = [];
        },

        findProperty: function (name) {
            var index = parseInt(name);
            return isNaN(index) ? null : this.items[index];
        },

        getVal: function () {
            return this.items.map(function (item) { return item.value; });
        },

        setVal: function (items) {
            if (Array.isArray(items)) {
                var val = [];
                this.items = this._createItems(items, function (v) { val.push(v); });
                return val;
            } else if (items === null || items === undefined) {
                this.items = [];
                return [];
            }
            throw new TypeError("items is not an Array");
        },

        get length () {
            return this.items.length;
        },

        at: function (index) {
            return this.items[index];
        },

        valAt: function (index) {
            var item = this.at(index);
            return item ? item.value : undefined;
        },

        update: function (index, items) {
            if (items && !Array.isArray(items)) {
                items = [items];
            }
            if (Array.isArray(items) && items.length > 0) {
                var updates = [], updIndex = null, updOff;
                for (var n in items) {
                    var i = parseInt(n);
                    if (isNaN(i)) continue;
                    var item = this.at(i + index);
                    if (item == undefined && items[n] == undefined) continue;

                    if (updIndex == null) {
                        updIndex = index + i;
                        updOff = i;
                    }
                    if (items[n] == undefined) {
                        delete this.items[i + index];
                    } else if (item == undefined) {
                        var v = Type.createValue(this.itemType);
                        v.value = items[n];
                        this.items[i + index] = v;
                    } else {
                        item.value = items[n];
                    }
                    updates[i - updOff] = this.items[i + index];
                }
                if (updIndex) {
                    this.flush({
                        change: 'items',
                        op: 'update',
                        index: updIndex,
                        items: updates
                    });
                }
            }
            return this;
        },

        insert: function (index, items) {
            if (items && !Array.isArray(items)) {
                items = [items];
            }
            if (Array.isArray(items) && items.length > 0) {
                var values = this._createItems(items);
                this.items.splice.apply(this.items, [index, 0].concat(values));
                this.flush({
                    change: 'items',
                    op: 'insert',
                    index: index,
                    items: values
                });
            }
            return this;
        },

        remove: function (index, count) {
            if (!count) count = 1;
            else if (count < 0) count = this.items.length - index;
            var values = this.items.splice(index, count);
            this.flush({
                change: 'items',
                op: 'remove',
                index: index,
                items: values
            });
            return this;
        },

        append: function (items) {
            return this.insert(this.items.length, items);
        },

        _createItems: function (items, proc) {
            if (!proc) proc = function () { };
            var itemType = this.itemType;
            return items.map(function (item) {
                var v = Type.createValue(itemType);
                proc(v.value = item);
                return v;
            });
        }

    });

    var Model = DD.defClass(Value, {
        constructor: function (schema) {
            Value.prototype.constructor.call(this);
            this._properties = {};
            if (schema instanceof Schema) {
                for (var key in schema.descriptor) {
                    this.define(key, schema.descriptor[key]);
                }
            }
        },

        define: function (name, type) {
            var v = Type.createValue(type);
            var self = this;
            Object.defineProperty(this, name, {
                get: function () {
                    return v.isList ? v : v.value;
                },
                set: function (newVal) {
                    var val = v.value = newVal;
                    self.flush({
                        change: 'property',
                        name: name,
                        value: val
                    });
                    return val;
                }
            });
            this._properties[name] = v;
        },

        findProperty: function (name) {
            return this._properties[name];
        },

        getVal: function () {
            var val = {};
            for (name in this._properties) {
                val[name] = this._properties[name].value;
            }
            return val;
        },

        setVal: function (data) {
            var val = {};
            for (name in this._properties) {
                val[name] = this._properties[name].value = data[name];
            }
            return val;
        }
    });

    var Type = DD.defClass({
        createValue: function () {
            throw new DD.NotImplementedError("createValue");
        }
    });

    Type.createValue = function (typeOrVal) {
        var v;
        if (!typeOrVal) {
            v = new Scalar();
        } else if (Array.isArray(typeOrVal)) {
            v = new List(typeOrVal[0]);
        } else if (typeOrVal instanceof Type) {
            v = typeOrVal.createValue();
        } else if (typeOrVal instanceof Value) {
            v = typeOrVal;
        } else {
            throw new TypeError("type must be instance of DD.Type or DD.Value");
        }
        return v;
    };

    var Schema = DD.defClass(Type, {
        constructor: function (descriptor) {
            this.descriptor = descriptor;
        },

        createValue: function () {
            return new Model(this);
        }
    });

    var ScalarType = DD.defClass(Type, {
        createValue: function () {
            return new Scalar();
        }
    });

    DD.Value = Value;
    DD.Scalar = Scalar;
    DD.List = List;
    DD.Model = Model;

    DD.Type = Type;
    DD.ScalarType = ScalarType;
    DD.Schema = Schema;

    DD.Types = {
        Scalar: new ScalarType()
    };

    DD.ModelRegistry = DD.defClass(Model, {
        constructor: function () {
            Model.prototype.constructor.call(this);
        },

        register: function (name, type) {
            var oldVal = this.findProperty(name);
            if (!oldVal) {
                this.define(name, type);
            } else {
                this._properties[name] = Type.createValue(type);
            }
            return oldVal;
        }
    });

    DD.Models = new DD.ModelRegistry();

}(DataDrive);