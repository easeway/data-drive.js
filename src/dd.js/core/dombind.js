// Copyright (c) 2012, Yisui Hu <easeway@gmail.com>
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