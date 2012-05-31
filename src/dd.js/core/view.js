// Copyright (c) 2012, Yisui Hu <easeway@gmail.com>
// All rights reserved.
// -----------------------------------------------------------------------------

// This module includes
//    - Template    The template for creating a view
//    - Binding     Automated view updates on data model changes

//#require binding.js

(function (_W) {
    
    var DD = _W.DataDrive;

    // Class Template, the constructor is internal
    var Template = function (container) {
        this.container = container;
        this.contentBinders = [ ];
        this.datasetBinders = [ {
            id: 0,
            contents: [ ],
            datasets: [ ]
        } ];
        Template_BuildBinders.call(this, container, this.datasetBinders[0]);
    };
    
    Template.prototype = { };

    Template.prototype.topBinder = function () {
        return this.contentBinders[0];
    };
    
    Template.prototype.createBinding = function (view) {
        return new BindingInstance(this, view);
    };

    // Privates
    
    var attrBindId = "bind:id";
    var attrBindDataSource = "bind:ds";
    var attrBindScript = "bind:x";
    var attrBindText = "bind:t";
    
    function evalUpdateScript($, script) {
        var $D = $.data;
        var $E = $.element;
        var $V = $.view;
        return eval(script);
    }
    
    function Template_BuildBinders(element, currentDatasetBinder) {
        if (element.attributes) {
            var attr = element.attributes.getNamedItem(attrBindDataSource);
            if (attr) {
                var binder = {
                    id: this.datasetBinders.length,
                    parent: currentDatasetBinder,
                    source: attr.value,
                    contents: [ ],
                    datasets: [ ]
                };
                attr.value = binder.id;
                this.datasetBinders.push(binder);
                currentDatasetBinder.datasets.push(binder);
                currentDatasetBinder = binder;
            }
            attr = element.attributes.getNamedItem(attrBindScript);
            if (attr) {
                var execScript = attr.value;
                var binder = {
                    id: this.contentBinders.length,
                    parent: currentDatasetBinder,
                    update: function (context) {
                        evalUpdateScript(context, execScript);
                    }
                };
                attr.value = binder.id;
                this.contentBinders.push(binder);
                currentDatasetBinder.contents.push(binder);
            }
        }
        
        for (var i = 0; i < element.childNodes.length; i ++) {
            var node = element.childNodes[i];
            if (node.nodeType == 1) {  // Element
                Template_BuildBinders.call(this, node, currentDatasetBinder);
            } else if (node.nodeType == 3 && typeof(node.textContent) == "string") {    // Text
                // break up string, to extract script parts
                var textContent = node.textContent;
                var content = [ ];
                var start = 0, scriptCount = 0;
                while (true) {
                    var pos = textContent.indexOf("{?=", start);
                    if (pos >= 0) {
                        if (pos > start) {
                            content.push({ f: false, t: textContent.substr(start, pos - start)});
                        }
                        var next = textContent.indexOf("?}", pos);
                        if (next > pos) {
                            var textScript = textContent.substr(pos + 3, next - pos - 3);
                            if (textScript.length > 0) {
                                content.push({ f: true, t: textScript });
                                scriptCount ++;
                            }
                            start = next + 2;
                            continue;
                        } else {
                            content[content.length - 1] = { f: false, t: textContent.substr(start) };
                        }
                    } else if (content.length > 0 && start < textContent.length) {
                        content.push({ f: false, t: textContent.substr(start) });
                    }
                    break;
                }
                
                // create binder if there're any scripts
                if (scriptCount > 0) {
                    var index = i;
                    var binder = {
                        id: this.contentBinders.length,
                        parent: currentDatasetBinder,
                        nodeIndex: index,
                        textContents: content,
                        update: function (context) {
                            var node = context.element.childNodes[this.nodeIndex];
                            if (node != null && node.nodeType == 3) {
                                var text = "";
                                for (var j = 0; j < this.textContents.length; j ++) {
                                    var cnt = this.textContents[j];
                                    text += cnt.f ? evalUpdateScript(context, cnt.t) : cnt.t;
                                }
                                node.textContent = text;
                            }
                        }
                    }
                    var attr = element.attributes.getNamedItem(attrBindText);
                    if (attr == null) {
                        attr = document.createAttribute(attrBindText);
                        attr.value = "";
                        element.attributes.setNamedItem(attr);
                    }
                    if (attr.value == null || attr.value == "") {
                        attr.value = binder.id;
                    } else {
                        attr.value += "," + binder.id;
                    }
                    
                    this.contentBinders.push(binder);
                    currentDatasetBinder.contents.push(binder);
                }
                
            }
        }
    }

    // BindingInstance - the binding created from template.
    // This class is intended to be used internally.
    var BindingInstance = function (template, view) {
        this.template = template;
        this.container = template.container.cloneNode(true);
        this.contents = [ ];
        this.datasets = [ ];
        this.elements = { };
        this.view = view;
        this.container.view = view;
        
        for (var i = 0; i < template.contentBinders.length; i ++) {
            var binder = template.contentBinders[i];
            var content = {
                id: binder.id,
                update: binder.update,
                nodeIndex: binder.nodeIndex,
                textContents: binder.textContents
            };
            this.contents.push(content);
        }
        
        for (var i = 0; i < template.datasetBinders.length; i ++) {
            var ds = template.datasetBinders[i];
            var dataset = {
                id: ds.id,
                binder: ds,
                parent: ds.parent == null ? null : this.datasets[ds.parent.id],
                source: ds.source,
                contents: [ ],
                datasets: [ ]
            };
            for (var j = 0; j < ds.contents.length; j ++) {
                var binder = ds.contents[j];
                dataset.contents.push(this.contents[binder.id]);
                this.contents[binder.id].dataset = dataset;
            }
            if (dataset.parent != null) {
                dataset.parent.datasets.push(dataset);
            }
            this.datasets.push(dataset);
        }
        
        BindingInstance_AssociateContentsWithElements.call(this, this.container);
    };
    
    BindingInstance.prototype = { };
    
    BindingInstance.prototype.elementById = function (bindId) {
        return this.elements[bindId];
    };
    
    BindingInstance.prototype.subscribe = function (dataSource) {
        this.unsubscribe();
        var view = this.view;
        if (dataSource != null) {
            this.subscriptions = [ ];
            for (var i = 0; i < this.datasets.length; i ++) {
                var dataset = this.datasets[i];
                var subscription = {
                    id: dataset.id,
                    dataset: dataset,
                    instance: this,
                    source: dataset.source != null ? dataSource.resolve(dataset.source) : dataSource,
                    callback: function (change, changes) {
                        for (var j = 0; j < this.dataset.contents.length; j ++) {
                            var content = this.dataset.contents[j];
                            var context = {
                                changes: changes,
                                subscription: this,
                                source: this.source,
                                data: this.source != null ? this.source.data() : null,
                                element: content.element,
                                view: view
                            };
                            content.update.call(content, context);
                        }
                    }
                };
                
                this.subscriptions.push(subscription);
                if (dataset.element != null) {
                    dataset.element.subscription = subscription;
                }
                
                if (subscription.source != null) {
                    subscription.source.subscribe(subscription.callback, subscription);
                    // initial update after being subcribed
                    subscription.callback.call(subscription);
                }
            }
            return true;
        }
        return false;
    };
    
    BindingInstance.prototype.unsubscribe = function () {
        if (this.subscriptions != null) {
            for (var i = 0; i < this.subscriptions.length; i ++) {
                var subscription = this.subscriptions[i];
                if (subscription.source != null) {
                    subscription.source.unsubscribe(subscription.callback);
                }
                if (subscription.dataset.element != null) {
                    subscription.dataset.element.subscription = null;
                }
            }
            this.subscriptions = null;
        }
    };

    // Privates
    
    function BindingInstance_AssociateContentsWithElements(element) {
        var attr = null;
        
        attr = element.attributes.getNamedItem(attrBindId);
        if (attr) {
            this.elements[attr.value] = element;
        }
        
        attr = element.attributes.getNamedItem(attrBindScript);
        if (attr) {
            var id = parseInt(attr.value);
            if (id >= 0 && id < this.contents.length && this.contents[id].element == null) {
                this.contents[id].element = element;
            }
        }
        
        attr = element.attributes.getNamedItem(attrBindText);
        if (attr) {
            ids = attr.value.split(",");
            for (var i = 0; i < ids.length; i ++) {
                var id = ids[i].length > 0 ? parseInt(ids[i]) : -1;
                if (id >= 0 && id < this.contents.length && this.contents[id].element == null) {
                    this.contents[id].element = element;
                }                
            }
        }
        
        attr = element.attributes.getNamedItem(attrBindDataSource);
        if (attr) {
            var id = parseInt(attr.value);
            if (id >= 0 && id < this.datasets.length && this.datasets[id].element == null) {
                this.datasets[id].element = element;
            }
        }
        
        for (var i = 0; i < element.children.length; i ++) {
            BindingInstance_AssociateContentsWithElements.call(this, element.children[i]);
        }
    }
    
    // View
    // An instance of View is a sub DOM-tree with data bindings, it can
    // be attached to an element in current DOM document and updated
    // automatically when the bounded data models are changed.
    var View = function (template, opts) {

        // if containerUpdate is true, template.topBinder binds the container,
        // and onUpdate event should be triggered when the data source is changed        
        if (opts != null && opts.containerUpdate) {
            template.topBinder().update = function (context) {
                if (context != null && context.view != null &&
                    typeof(context.view.onUpdate) == "function") {
                    context.view.onUpdate(context);
                }
            };
        }
        this.container = null;
        this.parentView = null;
        this.binding = template.createBinding(this);
        this.element = this.binding.container;
        this.dataSource = null;
        this.childViews = [ ];
    };
    
    function findParentView(element) {
        while (element != null) {
            if (element.view != null) {
                return element.view;
            }
            element = element.parentElement;
        }
        return null;
    }
    
    View.prototype = { };
    
    View.prototype.elementById = function (bindId) {
        return this.binding.elementById(bindId);
    };
    
    View.prototype.findDataSourceByElement = function (leafElement) {
        for (var elm = leafElement; elm != null; elm = elm.parentElement) {
            if (elm.subscription != null) {
                return elm.subscription.source;
            }
            if (elm == this.element) {
                return this.dataSource;
            }
        }
        return null;
    };
    
    View.prototype.findDataSourceByView = function (childView) {
        return this.findDataSourceByElement(childView.container);
    };
    
    View.prototype.onUpdate = function (context) {
        // Do nothing, can be overridden by sub-classes
    };
    
    View.prototype.onAttachView = function (view) {
        var index = this.childViews.indexOf(view);
        if (index < 0) {
            this.childViews.push(view);
            view.subscribe(this.findDataSourceByView(view));
        }
    };
    
    View.prototype.onDetachView = function (view) {
        var index = this.childViews.indexOf(view);
        if (index >= 0) {
            this.childViews.splice(index, 1);
            view.unsubscribe();
        }
    };
    
    View.prototype.addView = function (view, index) {
        view.attach(this.element, index);
    };
    
    View.prototype.attach = function (container, index) {
        this.detach();
        
        this.parentView = findParentView(container);
        this.container = container;
        if (index == null || index < 0 || index >= container.children.length) {
            container.appendChild(this.element);
        } else {
            container.insertBefore(this.element, container.children[index]);
        }
        
        if (this.parentView) {
            this.parentView.onAttachView(this);
        }
    };
    
    View.prototype.detach = function () {
        if (this.container) {
            this.container.removeChild(this.element);
            this.container = null;
            if (this.parentView) {
                this.parentView.onDetachView(this);
                this.parentView = null;
            }
            if (this.dataSource != null) {
                this.unsubscribe();
            }
        }
    };

    View.prototype.subscribe = function (dataSource) {
        this.unsubscribe();
        // first set dataSource, for initializing update
        this.dataSource = dataSource;
        // reset dataSource if binding fails
        if (!this.binding.subscribe(dataSource)) {
            this.dataSource = null;
        }
    };
    
    View.prototype.unsubscribe = function () {
        var subscribed = this.dataSource != null;
        this.binding.unsubscribe();
        this.dataSource = null;
        if (subscribed) {
            for (var i = 0; i < this.childViews.length; i ++) {
                this.childViews[i].unsubscribe();
            }
        }
    };
    
    View.prototype.addStyles = function (styleNames) {
        DD.addStyles(this.element, styleNames);
    };
    
    View.prototype.removeStyles = function (styleNames) {
        DD.removeStyles(this.element, styleNames);
    };
    
    // Export to namespace
    DD.View = View;
    
    // ViewList
    // This class helps to manage a collection of views. The data source
    // bounded to this instance must be backed by a list. Then the ViewList
    // can perform insert/remove of item views automatically when the backed
    // list is changed.
    // When using ViewList, a layout manager must be provided to create and modify
    // the DOM-tree expectedly for every item change.
    var ViewList = function (itemTemplate, layoutManager) {
        var template = DD.containerTemplate(true);
        
        // call base constructor
        View.call(this, template, { containerUpdate: true });
        
        // initialize
        this.itemTemplate = itemTemplate;
        this.layoutManager = layoutManager;
    };
    
    DD.inherit(ViewList, View);

    ViewList.prototype.onUpdate = function (context) {
        if (context.changes == null) {
            // this is initializing update
            ViewList_InitializeItems.call(this);
        } else {
            if (context.changes.action == DD.INSERT &&
                typeof(this.onItemInserted) == "function") {
                this.onItemInserted(context, this);
            } else if (context.changes.action == DD.REMOVE &&
                       typeof(this.onItemRemoved) == "function") {
                this.onItemRemoved(context, this);
            } else {    // here mean whole list is changed
                ViewList_InitializeItems.call(this);
            }
        }
    };
    
    // Override onAttachView as they are organized ordered
    ViewList.prototype.onAttachView = function (view) {
        var index = view.viewListIndex;
        if (index == null || index < 0 || index >= this.childViews.length) {
            index = this.childViews.length;
        }
        view.viewListIndex = null;
        this.childViews.splice(index, 0, view);
        var dataSource = this.dataSource != null ? this.dataSource.resolveItem(index) : null;
        view.subscribe(dataSource);
    };
    
    ViewList.prototype.unsubscribe = function() {
        // remove items before call into base to prevent
        // unnecessary unsubscribe calls on each item
        ViewList_Clear.call(this);
        View.prototype.unsubscribe.call(this);
    };
    
    ViewList.prototype.onItemInserted = function (context, binding) {
        ViewList_AddItem.call(this, context.changes.index);
    };
    
    ViewList.prototype.onItemRemoved = function (context, binding) {
        var index = context.changes.index;
        if (index == null) {    // remove all items
            ViewList_Clear.call(this);
        } else if (index >= 0 && index < this.childViews.length) {
            var item = this.childViews[index];
            ViewList_RemoveItem.call(this, index, item);
        }
    };

    // Privates
    
    function ViewList_Clear() {
        while (this.childViews.length > 0) {
            this.childViews[0].detach();
        }
        
        ViewList_CleanupLayout.call(this);
    }
    
    function ViewList_InitializeItems () {
        ViewList_Clear.call(this);
        if (this.dataSource != null) {
            ViewList_InitializeLayout.call(this);
            var count = this.dataSource.data().length;
            for (var i = 0; i < count; i ++) {
                ViewList_AddItem.call(this, i);
            }
        }
    }

    function ViewList_AddItem(index) {
        var itemView = new View(this.itemTemplate);
        itemView.viewListIndex = index;
        ViewList_InsertItem.call(this, itemView);
    }

    function ViewList_InsertItem(item) {
        if (this.layoutManager != null &&
            typeof(this.layoutManager.insertItem) == "function") {
            this.layoutManager.insertItem.call(this.layoutManager, this, item.viewListIndex, item);    
        } else {
            item.attach(this.element, item.viewListIndex);
        }
    }
    
    function ViewList_CleanupLayout() {
        if (this.layoutManager != null &&
            typeof(this.layoutManager.cleanup) == "function") {
            this.layoutManager.cleanup.call(this.layoutManager, this);
        } else {
            this.element.innerHTML = "";
        }
    }
    
    function ViewList_InitializeLayout() {
        if (this.layoutManager != null &&
            typeof(this.layoutManager.initialize) == "function") {
            this.layoutManager.initialize.call(this.layoutManager, this);    
        }
    }
    
    function ViewList_RemoveItem(index, item) {
        if (this.layoutManager != null &&
            typeof(this.layoutManager.removeItem) == "function") {
            this.layoutManager.removeItem.call(this.layoutManager, this, index, item);
        } else {
            item.detach();
        }
    }
    
    // Exports to namespace
    DD.ViewList = ViewList;
    
    // create Template for an empty container
    DD.containerTemplate = function (registerBindScript) {
        var elm = document.createElement("div");
        
        // If registerBindScript is true, a stub script will be added for bind:x
        // and this can be later updated with function by assign
        // template.topBinder
        if (registerBindScript) {
            var attr = document.createAttribute(attrBindScript);
            attr.value = "true";    // this is dummy value as the callback will be updated later
            elm.attributes.setNamedItem(attr);
        }
        
        return DD.templateFromElement(elm);
    };
    
    // create Template from DOM element
    // @param element the container element, it is better to be a div
    DD.templateFromElement = function (element) {
        return new Template(element);
    };
    
    // create Template from HTML
    // The content inside body is used as innerHTML, and other contents are disposed.
    DD.templateFromHtml = function (html) {
        var matches = html.match(/\<body(\s[^\>]*)?\>(.+)\<\/body\>/i);
        var innerHTML = matches && matches.length >= 3 ? matches[2] : html;
        var elm = document.createElement("div");
        elm.innerHTML = innerHTML;
        return new Template(elm);
    };
        
})(window);