// Copyright (c) 2012, Yisui Hu <easeway@gmail.com>
// All rights reserved.

// The Binding module provides an observer pattern implementation.
// The main purpose is for binding a data source to a certain element
// in view, with automated update notification.

//#require foundation.js

(function (_W) {

    var DD = _W.DataDrive;
    
    // constants
    DD.UPDATE = "UPDATE";
    DD.INSERT = "INSERT";
    DD.REMOVE = "REMOVE";
    
    // The basic subscription model
    // Subscription implements an observer that manages multiple
    // listeners and deliver notifications.
    
    var Subscription = function () {
        this._subscribers = [ ];
    };
    
    Subscription.prototype = { };
    
    // Add a listener to subscription
    // @param callback    The listener function
    // @param context     The context used for the callback
    Subscription.prototype.add = function (callback, context) {
        var entry = {
            key: callback,
            onchange: callback
        };
        
        if (context != null) {
            entry.onchange = function (change, changes) {
                callback.call(context, change, changes);
            };
        }
        
        this._subscribers.push(entry);
    };
    
    // Remove a listener from subscription
    // @param key    The callback used in "add"
    Subscription.prototype.remove = function (key) {
        for (var i = 0; i < this._subscribers.length; i ++) {
            if (this._subscribers[i].key == key) {
                    this._subscribers.splice(i, 1);
                    return true;
            }
        }
        return false;
    };
    
    // Send notifications to all listeners
    // @param change    The name of change: DD.INSERT, DD.UPDATE or DD.REMOVE
    // @param changes   The details of the change
    Subscription.prototype.notify = function (change, changes) {
        // we should save the eligible subscribers to a local list instead of
        // using _subscribers directly because during invocation, add/remove 
        // can be invoked to change _subscribers.
        var subscribers = [ ];
        for (var i = 0; i < this._subscribers.length; i ++) {
            if (typeof(this._subscribers[i].onchange) == "function") {
                subscribers.push(this._subscribers[i]);
            }
        }
        for (var i = 0; i < subscribers.length; i ++) {
            try {
                subscribers[i].onchange(change, changes);
            } catch (e) {
                DD.Log.error(e);
            }
        }
    };
    
    // DataContext
    // A data context is a wrapper over a data model. It provides the functionality
    // of Subscription for monitoring the change of the wrapped data model.
    
    // Scalar data context
    // An instance of the Scalar data context is a simple
    // data model that doesn't have child data models which
    // can be monitored for changes separately.
    
    var DataContext = function (provider) {
        Subscription.call(this);
        if (typeof(provider) != "function") {
            this._provider = function () {
                return provider;
            }
        } else {
            this._provider = provider;
        }
        this._contextType = "DataContext";
    };
    
    DD.inherit(DataContext, Subscription);
    
    // Get the wrapped data model
    DataContext.prototype.data = function () {
        return this._provider();
    };
    
    // Notify that the data model is updated in-place
    // @param oldData    Optional, specifies the data before the change
    DataContext.prototype.update = function (oldData) {
        var changes = {
            action: DD.UPDATE,
            data: this.data(),
            oldData: oldData
        };
        this.notify(changes.action, changes);
    };

    // Check whether a data model is an array
    DataContext.isArray = function (data) {
        return data != null && typeof(data.length) == "number" &&
               typeof(data.push) == "function" && typeof(data.pop) == "function" &&
               typeof(data.splice) == "function";
    };
    
    // Export to namespace
    DD.DataContext = DataContext;
    
    // List data context
    // An instance of the List data context is similar to Scalar data context
    // but monitors the change of list items. For each of the item is a
    // standalone instance of data context which can be monitored separately.
    
    var ListContext = function (provider) {
        DataContext.call(this, provider);
        this._itemContexts = [ ];
        var items = this.data();
        if (DataContext.isArray(items)) {
            for (var i = 0; i < items.length; i ++) {
                this._itemContexts.push(DD.createDataContext(items[i]));
            }
        }
        this._contextType = "ListContext";
    };
    
    DD.inherit(ListContext, DataContext);
    
    // Retrieve all the data contexts for all the items
    ListContext.prototype.items = function () {
        return this._itemContexts;
    };
    
    // Retrieve the data context for the item specified by index
    // @param index    The zero-based index of the item in the list
    ListContext.prototype.item = function (index) {
        return this._itemContexts[index];
    };
    
    // Inserts an item into the list
    // @param item     The data model of the item
    // @param index    Optional, for the position to insert the item;
    //                 if not present, the item is appended.
    ListContext.prototype.insert = function (item, index) {
        var items = this.data();
        if (!DataContext.isArray(items)) {
            return null;
        }
        
        var context = DD.createDataContext(item);
        if (context == null) {
            return null;
        }
        
        if (index < 0 || index == null) {
            index = items.length;
        }
        items.splice(index, 0, item);
        this._itemContexts.splice(index, 0, context);
        
        var changes = {
            action: DD.INSERT,
            index: index,
            data: item,
            dataContext: context
        };
        this.notify(changes.action, changes);
        return index;
    };
    
    // Append an item to the end of the list
    // @param item     The data model of the item
    ListContext.prototype.append = function (item) {
        return this.insert(item);
    };
    
    // Remove an item from the list
    // @param index    The index of the item to be removed
    ListContext.prototype.remove = function (index) {
        var items = this.data();
        if (!DataContext.isArray(items)) {
            return false;
        }
        if (index >= 0 && index < items.length) {
            var item = items[index];
            var context = this._itemContexts[index];
            items.splice(index, 1);
            this._itemContexts.splice(index, 1);
            
            var changes = {
                action: DD.REMOVE,
                index: index,
                data: item,
                dataContext: context
            };
            this.notify(changes.action, changes);
            return true;
        }
        return false;
    };
    
    // Remove all items in the list
    ListContext.prototype.clear = function () {
        var items = this.data();
        if (!DataContext.isArray(items)) {
            return null;
        }

        var count = items.length;
        if (count > 0) {
            items.splice(0, count);
            var contexts = this._itemContexts;
            this._itemContexts = [ ];
            var changes = {
                action: DD.REMOVE,
                count: count,
                contexts: contexts
            };
            this.notify(changes.action, changes);
        }
        return count;
    };
    
    // Check whether a data context is and instance of ListContext
    ListContext.isInstance = function (context) {
        return context && context._contextType == "ListContext" && typeof(context.insert) == "function" && 
                typeof(context.items) == "function" && typeof(context.item) == "function";
    };
    
    // Export to namespace
    DD.ListContext = ListContext;
    
    // The factory to create a data context
    // according to the actual data provided
    DD.createDataContext = function (provider) {
        var data;
        
        if (typeof(provider) != "function") {
            // provider is already a data context
            if (typeof(provider._contextType) == "string") {
                return provider;
            }
            
            data = provider;
            provider = function () {
                return data;
            };
        } else {
            data = provider();
        }
        
        if (DataContext.isArray(data)) {
            return new ListContext(provider);
        }
        return new DataContext(provider);
    };
    
    // The named data context map
    // All the data contexts are organized with named keys in
    // a flat namespace.
    var NamedDataMap = function () {
        this._map = { };
    };
    
    // Associate a data context with a specified name
    // @param name    The unique name to be associated
    // @param context The data context
    NamedDataMap.prototype.put = function (name, context) {
        var prev = this._map[name];
        this._map[name] = DD.createDataContext(context);
        return prev;
    };
    
    // Retrieve a named data context or an item of it
    // @param name    The unique name of the data context
    // @param index   Optional, if present, retrieve the item of the list context
    NamedDataMap.prototype.get = function (name, index) {
        var context = this._map[name];
        if (index != null && ListContext.isInstance(context)) {
            context = context.item(index);
        }
        return context;
    };
    
    // Subscribe the changes of a named data context
    // @param params   Specifies which data context and how to subscribe
    //     - name      Specifies the name of data context
    //     - index     Optional, if present, specifies the item to subscribe
    //     - onchange  The callback for the subscription
    //     - context   The context for the callback
    NamedDataMap.prototype.subscribe = function (params) {
        if (typeof(params.onchange) != "function") {
            return false;
        }
        var context = this.get(params.name, params.index);
        if (context) {
            context.add(params.onchange, params.context);
            return true;
        }
        return false;
    };
    
    // Unsubscribe the changes of a named data context
    // @param params   Specifies which data context and how to subscribe
    //     - name      Specifies the name of data context
    //     - index     Optional, if present, specifies the item to subscribe
    //     - onchange  The callback for the subscription
    NamedDataMap.prototype.unsubscribe = function (params) {
        if (typeof(params.onchange) != "function") {
            return false;
        }
        var context = this.get(params.name, params.index);
        if (context) {
            return context.remove(params.onchange);
        }
        return false;
    };
    
    // Export to namespace
    DD.NamedDataMap = NamedDataMap;
    
    // DataSource
    // DataSource is the abstraction for binding data to views. It provides the
    // simplified interface for a subscription, and hides the details of data contexts.
    // The implementation of DataSource is to find the actual data source
    // by resolving a name (or path). As the resolving logic varies,
    // some implementation can provide relative (aka nested) data sources.
    
    // The default implementation provides flat name resolving using NamedDataMap.
    var DataSource = function (context, dataMap) {
        this.dataContext = context;
        this.dataMap = dataMap;
    };
    
    DataSource.prototype = { };
    
    // Resolve a name for a data context
    // @param name    The name of a data context; it can be suffixed by "[index]" for
    //                an item in the list context.
    //                simply "[index]" is equivalent to resolveItem.
    DataSource.prototype.resolve = function (name) {
        var m = name.match(/^(.*)\[(\d+)\]$/);
        var path = name, index = -1;
        if (m.length >= 3) {
            path = m[1];
            index = parseInt(m[2]);
        }
        if (typeof(path) == "string" && path.length > 0) {
            if (this.dataMap == null) {
                return null;
            }
            return index >= 0 ? this.dataMap.get(path, index) : this.dataMap.get(path);
        } else if (index >= 0) {
            return this.resolveItem(index);
        }
        return null;
    };

    // Resolve for the data source of an item
    // @param index    The index of the item
    DataSource.prototype.resolveItem = function (index) {
        var context = null;
        if (ListContext.isInstance(this.dataContext)) {
            context = this.dataContext.item(index);
        }
        return context != null ? new DataSource(context, this.dataMap) : null;
    };

    // Retrieve the data model inside this data source.
    DataSource.prototype.data = function () {
        return this.dataContext.data();
    };
    
    // Subscribe for the changes on the data model    
    DataSource.prototype.subscribe = function (callback, context) {
        this.dataContext.add(callback, context);
    };
    
    // Unsubscribe the changes
    DataSource.prototype.unsubscribe = function (callback) {
        this.dataContext.remove(callback);
    };
    
    // Export to namespace
    DD.DataSource = DataSource;

})(window);
