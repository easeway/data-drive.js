// Copyright (c) 2013, Yisui Hu <easeway@gmail.com>
// All rights reserved.
// -----------------------------------------------------------------------------

//# require base
//# require observer
//# require model

!function (DD) {
    "use strict";

    var BINDING_PROP = "__dd_binding";
    var ATTR_MAP  = "data-drive-map";
    var ATTR_ON   = "data-drive-on";
    var ATTR_OPTS = "data-drive-opts";
    var ATTR_LIST = "data-drive-list";
    var SUBST_REGEX = /%\{[^\}]+\}/g;

    function binarySearch(array, compare, from, to) {
        if (typeof(compare) != 'function') {
            var val = compare;
            compare = function (v) { return val - v; }
        }

        var mi = from, ma = to, m = 0, d = 0;
        if (mi == undefined) mi = 0;
        if (ma == undefined) ma = array.length - 1;
        while (mi <= ma) {
            m = (mi + ma) >> 1;
            d = compare(array[m]);
            if (d == 0) {
                break;
            } else if (d > 0) {
                mi = m + 1;
            } else {
                ma = m - 1;
            }
        }

        if (d > 0) m ++;
        return m;
    }

    var SparseIndex = DD.defClass({
        constructor: function (array) {
            this.indices = Object.keys(array);
            this.from = 0;
        },

        closest: function (index, next) {
            if (!next) this.from = 0;
            var n = binarySearch(this.indices, index, this.from);
            this.from = n;
            return this.indices[n] ? parseInt(this.indices[n]) : undefined;
        }
    });

    function bindingFromNode(node) {
        return node[BINDING_PROP];
    }
    
    var Binding = DD.defClass(DD.Listener, {
        constructor: function (root, scope, params) {
            DD.Listener.prototype.constructor.call(this);

            this.root = root;
            this.scope = scope;
            this.element = params.element;
            this.node = params.node;
            this.options = params.options || {};

            // create handlers for data change
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
            } else {    // params.script should only be present for elements
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

            if (params.dataSource && params.dataSource[0] != '.') {  // find the data source
                this.data = scope.dataRoot.query(params.dataSource);
            } else {
                var data = params.data;
                if (!data) {
                    for (var elem = this.element; elem && elem != root.parentElement; elem = elem.parentElement) {
                        var binding = bindingFromNode(elem);
                        if (binding) {
                            data = binding.data;
                            break;
                        }
                    }
                }
                if (!data) {
                    data = scope.dataRoot;
                }

                if (params.dataSource) {
                    data = data.query(params.dataSource.substr(1));
                }
                this.data = data;
            }

            if (this.data) {
                if (this.data.isList) {
                    if (typeof(params.listFactory) == 'function') {
                        this.listFactory = params.listFactory.call(this, this.data, this.element, this.node);
                    } else {
                        this.listFactory = autoSelectListFactory(this);
                    }
                }

                if (this.listFactory || this.handlers.length > 0) {
                    this.listen(this.data);
                }
            } else {
                console.error("Data model not found: " + params.dataSource);
            }
        },

        get isList () {
            return !!this.listFactory;
        },

        unbind: function () {
            this.shutdown();
        },

        onNotify: function (change) {
            if (this.isList) {
                this.listFactory.onChange(change);
            }
            this.handlers.forEach(function (handler) {
                handler.call(this, change);
            }, this);
        },
    });

    function buildFunction(script) {
        var fn;
        return eval("fn = function ($C, $D, $E, $N) { " + script + " }");
    }

    function buildStatement(script) {
        var fn;
        return eval("fn = function ($C, $D, $E, $N) { return ( " + script + " ); }");
    }

    Binding.create = function (node, root, scope, opts) {
        var params = { };
        if (opts.data) {
            params.data = opts.data;
        }
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
                } else {
                    params.script = buildFunction(attr.value);
                    params.changes = null;
                }
                params.node = node;
            }
            if ((attr = node.attributes.getNamedItem(ATTR_OPTS))) {
                params.options = attr.value.split(';').reduce(function (result, item) {
                    var i = item.indexOf(':');
                    if (i > 0) {
                        result[item.substr(0, i).trim()] = item.substr(i + 1).trim();
                    }
                    return result;
                }, {});
                if (params.options.bind) {  // force binding
                    params.node = node;
                }
            }
            if ((attr = node.attributes.getNamedItem(ATTR_LIST))) {
                params.listFactory = buildStatement(attr.value);
            }
            if (params.data) {
                params.node = node;
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
            }
            if (count > 0 || params.data) {
                params.node = node;
                params.element = node.parentElement || opts.container;
            }
        }
        
        if (params.element) {
            return new Binding(root, scope, params);
        }
        return null;
    };
  
    // List factories
    var ListFactory = DD.defClass({
        constructor: function (binding) {
            this.binding = binding;
        },

        get container () {
            return this.binding.element;
        },

        get nodesPerItem () {
            if (Array.isArray(this.nodesTemplate)) {
                return this.nodesTemplate.length;
            }
            throw new DD.NotImplementedError("nodesPerItem not implemented");
        },

        rebuild: function () {
            // remove all items
            this.container.innerHTML = "";

            // append new items
            this.items = this._createItemViews(this.binding.data.items);
            this.items.forEach(function (view) {
                view.nodes.forEach(function (node) {
                    this.container.appendChild(node);
                }, this);
            }, this);

            return this;
        },

        onChange: function (change) {
            if (change.change == 'update') {
                this.rebuild();
            } else if (change.change == 'items' && change.op) {
                // Dispatch change by op
                var fn = "onItems" + change.op[0].toUpperCase() + change.op.substr(1);
                if (typeof(this[fn]) == 'function') {
                    this[fn].call(this, change.index, change.items);
                }
            }
        },

        onItemsInsert: function (index, items) {
            var insertFn = this._insertItemViewFn(index);
            var views = this._createItemViews(items);
            views.forEach(function (view) {
                insertFn.call(this, view);
            }, this);
            this.items.splice(index, 0, views);
        },

        onItemsRemove: function (index, items) {
            var indices = new SparseIndex(this.items);
            var startIndex = indices.closest(index);
            if (startIndex != undefined) {
                var endIndex = indices.closest(index + items.length, true);
                var views = this.items.slice(startIndex, endIndex);
                views.forEach(this._removeItemView, this);
            }
            this.items.splice(index, items.length);
        },

        onItemsUpdate: function (index, items) {
            var removes = [];
            items.forEach(function (item, n) {
                if (!item && this.items[index + n]) {
                    this._removeItemView(this.items[index + n]);
                    removes.push(index + n);
                } else if (item && !this.items[index + n]) {
                    var insertFn = this._insertItemViewFn(index + n);
                    var view = this._createItemViews([item])[0];
                    insertFn.call(this, view);
                    this.items[index + n] = view;
                }
            }, this);
        },

        createItemNodes: function () {
            if (Array.isArray(this.nodesTemplate)) {
                return this.nodesTemplate.map(function (node) {
                    return node.cloneNode(true);
                });
            }
            throw new DD.NotImplementedError("createItemNodes not implemented");
        },

        _createItemViews: function (items) {
            return items.map(function (item) {
                var itemView = {
                    data: item,
                    nodes: this.createItemNodes()
                };
                itemView.nodes.forEach(function (node) {
                    bindDOMTree(node, node, this.binding.scope, { data: item, container: this.container });
                }, this);
                item.refresh();
                return itemView;
            }, this);
        },

        _findDirectChild: function (node) {
            while (node && node.parentElement != this.container) {
                node = node.parentElement;
            }
            return node;
        },

        _insertItemViewFn: function (index) {
            var at = new SparseIndex(this.items).closest(index);
            var refNode = this._findDirectChild(at != undefined ? this.items[at].nodes[0] : null);
            var insertNodeFn = refNode ? function (node) {
                this.container.insertBefore(node, refNode);
            } : function (node) {
                this.container.appendChild(node);
            };

            return function (view) {
                view.nodes.forEach(function (node) {
                    insertNodeFn.call(this, node);
                }, this);
            }
        },

        _removeItemView: function (view) {
            view.nodes.forEach(function (node) {
                var child = this._findDirectChild(node);
                if (child) {
                    this.container.removeChild(child);
                }
            }, this);
        }
    });
    
    var TemplateListFactory = DD.defClass(ListFactory, {
        constructor: function (binding) {
            ListFactory.prototype.constructor.call(this, binding);

            var template = this.container;
            if (binding.options.item) {
                template = jQuery(binding.root).find(binding.options.item)[0];
            }
            
            var children = template ? template.childNodes : [];
            this.nodesTemplate = [];
            for (var i = 0; i < children.length; i ++) {
                this.nodesTemplate.push(children[i]);
            }
            this.container.innerHTML = "";
        }
    });

    function autoSelectListFactory(binding) {
        return new TemplateListFactory(binding);
    }

    function unbindNode(node) {
        var binding = node[BINDING_PROP];
        if (binding) {
            binding.unbind();
            delete node[BINDING_PROP];
        }
    }

    function bindNode(node, root, scope, opts) {
        if (!opts.noUnbind) {
            unbindNode(node);
        } else if (node[BINDING_PROP]) {
            return true;
        }
        var binding = Binding.create(node, root, scope, opts);
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

    function traverseDOMTree(node, callback, level) {
        if (level == undefined) {
            level = 0;
        }
        switch (node.nodeType) {
            case 1: // element
                callback(node, level);
                for (var i = 0; i < node.childNodes.length; i ++) {
                    traverseDOMTree(node.childNodes[i], callback, level + 1);
                }
                break;
            case 3: // characters
                callback(node, level);
                break;
        }
    }

    function unbindDOMTree(node) {
        traverseDOMTree(node, function (node) {
            unbindNode(node);
        });
    }

    function bindDOMTree(node, root, scope, opts) {
        traverseDOMTree(node, function (node, level) {
            // create data binding explicitly for all top-level
            // nodes of list items, but not children
            if (level > 0) {
                delete opts.data;
            }
            bindNode(node, root, scope, opts);
        });
    }

    var DOMObserverClass = window.MutationObserver;

    if (!DOMObserverClass) {
        DOMObserverClass = window.WebKitMutationObserver;
    }
    
    // Create own DOMObserver simulate with Mutation events
    if (!DOMObserverClass) {
        DOMObserverClass = DD.defClass({
            constructor: function (callback) {
                this.callback = callback;
                this.record = {
                    removedNodes: [],
                    addedNodes: []
                };
                var self = this;
                this.handlerNodeUpdated = function (ev) {
                    self.onNodeChange(self.record.addedNodes, ev);
                };
                this.handlerNodeRemoved = function (ev) {
                    self.onNodeChange(self.record.removedNodes, ev);
                };
            },
            
            observe: function (element) {
                this.disconnect();
                
                this.observed = element;
                this.observed.addEventListener("DOMNodeInserted", this.handlerNodeUpdated);
                this.observed.addEventListener("DOMNodeRemoved", this.handlerNodeRemoved);
                this.observed.addEventListener("DOMCharacterDataModified", this.handlerNodeUpdated);
                this.observed.addEventListener("DOMSubtreeModified", this.handlerNodeUpdated);
                
                return this;
            },
            
            disconnect: function () {
                if (this.observed) {
                    this.observed.removeEventListener("DOMSubtreeModified", this.handlerNodeUpdated);
                    this.observed.removeEventListener("DOMCharacterDataModified", this.handlerNodeUpdated);                    
                    this.observed.removeEventListener("DOMNodeRemoved", this.handlerNodeRemoved);
                    this.observed.removeEventListener("DOMNodeInserted", this.handlerNodeUpdated);
                    delete this.observed;
                }
            },
            
            onNodeChange: function (changedNodes, ev) {
                // schedule a callback if this is the first event
                if (changedNodes.length == 0) {
                    var self = this;
                    setTimeout(function () {
                        self.notifyNodeChanges();
                    }, 0);
                }
                changedNodes.push(ev.target);
                this.notifyNodeChanges();
            },
            
            notifyNodeChanges: function () {
                var record = {
                    removedNodes: this.record.removedNodes,
                    addedNodes: this.record.addedNodes
                }
                this.record.removedNodes = [];
                this.record.addedNodes = [];
                this.callback([record]);
            }
        });
    }

    var BindingScope = DD.defClass({
        constructor: function (node, dataRoot) {
            var self = this;
            this.observer = new DOMObserverClass(function () { self.onMutations.apply(self, arguments); });
            this.scope(node, dataRoot);
        },

        refresh: function (opts) {
            var _opts = { noUnbind: true };
            for (var k in opts) {
                _opts[k] = opts[k];
            }
            bindDOMTree(this.root, this.root, this, _opts);
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

        findBinding: function (node) {
            for (; node && node != this.root; node = node.parentElement) {
                var binding = bindingFromNode(node);
                if (binding) {
                    return binding;
                }
            }
            return null;
        },
        
        onMutations: function (mutations) {
            var self = this;
            mutations.forEach(function (record) {
                var i;
                for (i = 0; record.removedNodes && i < record.removedNodes.length; i ++) {
                    unbindDOMTree(record.removedNodes[i]);
                }
                for (i = 0; record.addedNodes && i < record.addedNodes.length; i ++) {
                    bindDOMTree(record.addedNodes[i], self.root, self, { noUnbind: true });
                }
            });
        }
    });

    DD.ListFactory = ListFactory;
    DD.TemplateListFactory = TemplateListFactory;
    DD.BindingScope = BindingScope;
    DD.binding = bindingFromNode;
    
    jQuery(document).ready(function () {
        if (DD.settings.autobind != false && DOMObserverClass) {
            var scope = new BindingScope();
            scope.bind();
            DD.documentScope = scope;
        }
    });
}(DataDrive);