// Copyright (c) 2012, Yisui Hu <easeway@gmail.com>
// All rights reserved.
// 
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met: 
// 
// 1. Redistributions of source code must retain the above copyright notice, this
//    list of conditions and the following disclaimer. 
// 2. Redistributions in binary form must reproduce the above copyright notice,
//    this list of conditions and the following disclaimer in the documentation
//    and/or other materials provided with the distribution. 
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
// ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
// WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
// ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
// ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
// SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
// 
// The views and conclusions contained in the software and documentation are those
// of the authors and should not be interpreted as representing official policies, 
// either expressed or implied, of the FreeBSD Project.

// base.js


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

// observer.js


//# require base

!function (DD) {
    "use strict";

    DD.Observer = DD.defClass({
        constructor: function (context) {
            this.context = context || this;
            this.listeners = [];
        },

        add: function (listener) {
            this.listeners.push(listener);
            return this;
        },

        remove: function (listener) {
            var index = this.listeners.indexOf(listener);
            if (index >= 0) {
                this.listeners.splice(index, 1);
            }
            return this;
        },

        notify: function () {
            var ctx = this.context;
            var args = arguments;
            this.listeners.forEach(function (listener) {
                listener.apply(ctx, args);
            });
            return this;
        }
    });

    DD.Listener = DD.defClass({
        constructor: function (callback, context) {
            this.observer = null;
            this.callback = callback;
            this.context = context;
            var self = this;
            this._notifier = function () { self.onNotify.apply(self, arguments); }
        },

        listen: function (observer) {
            if (this.observer) {
                this.observer.remove(this._notifier);
            }
            this.observer = observer;
            if (this.observer) {
                this.observer.add(this._notifier);
            }
        },

        shutdown: function () {
            this.listen(null);
        },

        get listening () { return this.observer != null; },

        onNotify: function () {
            if (typeof(this.callback) == 'function') {
                var ctx = this.context || this;
                this.callback.apply(ctx, arguments);
            }
        }
    });
}(DataDrive);

// model.js


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
                this.notify(notification);
            }
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
            if (items && !Array.isArray) {
                items = [items];
            }
            if (Array.isArray(items) && items.length > 0) {
                var inserts = [], insIndex = null, insOff;
                var removes = [], remIndex = null, remOff;
                var updates = [], updIndex = null, updOff;
                for (var n in items) {
                    var i = parseInt(n);
                    if (isNaN(i)) continue;
                    var item = this.at(i + index);
                    if (item && items[n] == undefined) {
                        if (remIndex == null) {
                            remIndex = index + i;
                            remOff = i;
                        }
                        removes[i - remOff] = item;
                        delete this.items[i + index];
                    } else if (item == undefined && items[n]) {
                        if (insIndex == null) {
                            insIndex = index + i;
                            insOff = i;
                        }
                        var v = Type.createValue(this.itemType);
                        v.value = items[n];
                        this.items[i + index] = v;
                        inserts[i - insOff] = v;
                    } else if (item) {
                        if (updIndex == null) {
                            updIndex = index + i
                            updOff = i;
                        }
                        item.value = items[n];
                        updates[i - updOff] = item;
                    }
                }
                if (insIndex || remIndex || updIndex) {
                    this.flush({
                        change: 'items',
                        inserts: {
                            index: insIndex,
                            items: inserts
                        },
                        removes: {
                            index: remIndex,
                            items: removes
                        },
                        updates: {
                            index: updIndex,
                            items: updates
                        }
                    });
                }
            }
            return this;
        },

        insert: function (index, items) {
            if (Array.isArray(items) && items.length > 0) {
                var values = this._createItems(items);
                this.items.splice.apply(this.items, [index, 0].concat(values));
                this.flush({
                    change: 'insert',
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
                change: 'remove',
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

// dombind.js


//# require base
//# require observer
//# require model

!function (DD) {
    "use strict";

    var BINDING_PROP = "__dd_binding";
    var ATTR_MAP  = "data-drive-map";
    var ATTR_ON   = "data-drive-on";
    var ATTR_LIST = "data-drive-list";
    var SUBST_REGEX = /%\{[^\}]+\}/g;

    var Binding = DD.defClass(DD.Listener, {
        constructor: function (root, dataRoot, params) {
            DD.Listener.prototype.constructor.call(this);

            this.element = params.element;
            this.node = params.node;

            this.handlers = [];
            if (Array.isArray(params.contents)) {
                this.contents = params.contents;
                this.handlers.push(function (change) {
                    var self = this;
                    this.node.textContent = this.contents.reduce(function (text, content) {
                        if (typeof(content) == 'function') {
                            text += content.call(self, change, self.data, self.element, self.node);
                        } else {
                            text += content;
                        }
                        return text;
                    }, "");
                });
            } else {
                if (typeof(params.script) == 'function') {
                    this.script = params.script;
                    this.changes = params.changes;
                    this.handlers.push(function (change) {
                        if (!this.changes || this.changes[change.change]) {
                            this.script.call(this, change, this.data, this.element, this.node);
                        }
                    });
                }
            }

            if (params.dataSource && params.dataSource[0] != '.') {
                this.data = dataRoot.query(params.dataSource);
            } else {
                var data = null;
                for (var elem = this.element; elem && elem != root.parentElement; elem = elem.parentElement) {
                    if (elem[BINDING_PROP]) {
                        data = elem[BINDING_PROP].data;
                        break;
                    }
                }
                if (!data) {
                    data = dataRoot;
                }

                if (params.dataSource) {
                    data = data.query(params.dataSource.substr(1));
                }
                this.data = data;
            }
            if (!this.data) {
                console.error("Data model not found: " + params.dataSource);
            } else if (this.handlers.length > 0) {
                this.listen(this.data);
            }
        },

        unbind: function () {
            this.shutdown();
        },

        onNotify: function (change) {
            var self = this;
            this.handlers.forEach(function (handler) {
                handler.call(self, change);
            });
        }
    });

    function buildFunction(script) {
        var fn;
        return eval("fn = function ($C, $D, $E, $N) { " + script + " }");
    }

    function buildStatement(script) {
        var fn;
        return eval("fn = function ($C, $D, $E, $N) { return ( " + script + " ); }");
    }

    Binding.create = function (node, root, dataRoot) {
        var params = { };
        if (node.nodeType == 1) {
            var attr = node.attributes.getNamedItem(ATTR_MAP);
            if (attr) {
                params.dataSource = attr.value.trim();
                params.node = node;
            }
            if ((attr = node.attributes.getNamedItem(ATTR_ON))) {
                var i = attr.value.indexOf(':');
                if (i >= 0) {
                    params.script = buildFunction(attr.value.substr(i + 1));
                    params.changes = {};
                    var changes = attr.value.substr(0, i).split(',');
                    var count = 0;
                    for (var i = 0; i < changes.length; i ++) {
                        var name = changes[i].trim();
                        if (name === "*") {
                            params.changes = null;
                            break;
                        } else if (name != "") {
                            params.changes[name] = true;
                            count ++;
                        }
                    }
                    if (count == 0) {
                        params.changes = null;
                    }
                }
                params.script = buildFunction(attr.value);
                params.node = node;
            }
            if ((attr = node.attributes.getNamedItem(ATTR_LIST))) {

            }
            if (params.node) {
                params.element = node;
            }
        } else {
            params.contents = [];
            SUBST_REGEX.lastIndex = 0;
            var text = node.textContent, start = 0, m, count = 0;
            while ((m = SUBST_REGEX.exec(text)) != null) {
                var scriptBegin = m.index;
                if (scriptBegin > start) {
                    params.contents.push(text.substr(start, scriptBegin - start));
                }
                start = SUBST_REGEX.lastIndex;
                params.contents.push(buildStatement(m[0].substr(2, m[0].length - 3)));
                count ++;
            }
            if (count > 0) {
                if (start < text.length) {
                    params.contents.push(text.substr(start));
                }
                params.node = node;
                params.element = node.parentElement;
            }
        }

        if (params.element) {
            return new Binding(root, dataRoot, params);
        }
        return null;
    };

    function unbindNode(node) {
        var binding = node[BINDING_PROP];
        if (binding) {
            binding.unbind();
            delete node[BINDING_PROP];
        }
    }

    function bindNode(node, root, dataRoot) {
        unbindNode(node);
        var binding = Binding.create(node, root, dataRoot);
        if (binding) {
            Object.defineProperty(node, BINDING_PROP, {
                get: function () { return binding; },
                configurable: true,
                enumerable: false
            });
            return true;
        }
        return false;
    }

    function traverseDOMTree(node, callback) {
        switch (node.nodeType) {
            case 1: // element
                callback(node);
                for (var i = 0; i < node.childNodes.length; i ++) {
                    traverseDOMTree(node.childNodes[i], callback);
                }
                break;
            case 3: // characters
                callback(node);
                break;
        }
    }

    function unbindDOMTree(node) {
        traverseDOMTree(node, function (node) {
            unbindNode(node);
        });
    }

    function bindDOMTree(node, root, dataRoot) {
        traverseDOMTree(node, function (node) {
            bindNode(node, root, dataRoot);
        });
    }

    var DOMObserverClass = window.MutationObserver;
    if (!DOMObserverClass) {
        DOMObserverClass = window.WebKitMutationObserver;
    }
    if (!DOMObserverClass) {
        console.error("Your browser doesn't support DOM MutationObserver");
    }

    DD.compatibility.register("MutationObserver", function (results) {
        return DOMObserverClass;
    });

    var BindingScope = DD.defClass({
        constructor: function (node, dataRoot) {
            var self = this;
            this.observer = new DOMObserverClass(function () { self.onMutations.apply(self, arguments); });
            this.scope(node, dataRoot);
        },

        refresh: function () {
            bindDOMTree(this.root, this.root, this.dataRoot);
            return this;
        },

        scope: function (node, dataRoot) {
            this.unbind();
            this.root = node || document.body;
            this.dataRoot = dataRoot || DD.Models;
            return this;
        },

        bind: function (refresh) {
            this.observer.observe(this.root, {
                childList: true,
                attributes: true,
                characterData: true,
                subtree: true
            });
            return refresh === false ? this : this.refresh();
        },

        unbind: function () {
            this.observer.disconnect();
            if (this.root) {
                unbindDOMTree(this.root);
            }
            return this;
        },

        onMutations: function (mutations) {
            var self = this;
            mutations.forEach(function (record) {
                var i;
                for (i = 0; record.removedNodes && i < record.removedNodes.length; i ++) {
                    unbindDOMTree(record.removedNodes[i]);
                }
                for (i = 0; record.addedNodes && i < record.addedNodes.length; i ++) {
                    bindDOMTree(record.addedNodes[i], self.root, self.dataRoot);
                }
            });
        }
    });

    DD.BindingScope = BindingScope;

    if (!DD.settings.off.autobind && DOMObserverClass) {
        document.addEventListener("DOMContentLoaded", function () {
            new BindingScope().bind();
        });
    }
}(DataDrive);

