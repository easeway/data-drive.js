
(function (_W) {

    var DD = _W.DataDrive;
    
    var AutoCases = _W.AutoCases;
    
    function TestBindingSubscription () {
        var data = { key: "value" };
        var dataContext = DD.createDataContext(data);
        Test.assert(dataContext._subscribers != null, "Subscribers presence");
        Test.assert(dataContext._subscribers.length == 0, "Initial subscribers empty");
        
        var dummyCallback = function () { };
        dataContext.add(dummyCallback, data);
        Test.assert(dataContext._subscribers.length == 1, "Add one subscriber");
        Test.assert(dataContext._subscribers[0].key == dummyCallback, "Subscriber key");
        
        dataContext.remove(dummyCallback);
        Test.assert(dataContext._subscribers.length == 0, "Remove a subscriber");
    }
    
    AutoCases.register(
        "Binding-Subscription",
        "Test subscribe/unsubscribe",
        TestBindingSubscription
    );
    
    function TestBindingCallback () {
        var data = { signal: 0 };
        var dataContext = DD.createDataContext(data);
        
        var signal = 0, expected_signal = 100;
        var callback = function (change, changes) {
            Test.assert(change == DD.UPDATE, "Change should be update");
            Test.assert(changes.data == data, "Data instance should not be changed");
            signal = this.signal;
        };
        
        dataContext.add(callback, data);
        data.signal = expected_signal;
        dataContext.update();
        
        Test.assert(signal == expected_signal, "Callback should be called");
    }
    
    AutoCases.register(
        "Binding-Callback",
        "Test callbacks in DataContext",
        TestBindingCallback
    );
    
    function TestBindingOldData () {
        var dataset = {
            current: {
                key: "original"
            }
        };
        var provider = function () {
            return dataset.current;
        };
        
        var dataContext = DD.createDataContext(provider);
        var value = "", expected_value = "new";
        var callback = function (change, changes) {
            value = this.current.key;
            Test.assert(changes.oldData == dataset.old, "Old data should be specified");
        };
        dataContext.add(callback, dataset);
        
        dataset.old = dataset.current;
        dataset.current = {
            key: expected_value
        };
        dataContext.update(dataset.old);
        
        Test.assert(value == expected_value, "Data should be updated");
    }
    
    AutoCases.register(
        "Binding-OldData",
        "Test old data can be specified in callback",
        TestBindingOldData
    );
    
    function TestBindingCreateDataContext () {
        var data1 = {
            key: "value"
        };
        var data2 = [
            {
                key: "item"
            }
        ];
        
        var dc1 = DD.createDataContext(data1);
        var dc2 = DD.createDataContext(data2);
        
        Test.assert(!DD.ListContext.isInstance(dc1), "Should not be a ListContext");
        Test.assert(DD.ListContext.isInstance(dc2), "Should be a ListContext");
    }
    
    AutoCases.register(
        "Binding-CreateDataContext",
        "Test the correct DataContext should be created according to data",
        TestBindingCreateDataContext
    );

    function TestBindingDataSourceItem () {
        var list = [
            { v: 0 },
            { v: 1 },
            { v: 2 }
        ];
        
        var dc = DD.createDataContext(list);
        var ds = new DD.DataSource(dc);
        
        var ds2 = ds.resolveItem(2);
        Test.assert(ds2.data().v == 2, "resolveItem");
        
        var ds1 = ds.resolve("[1]");
        Test.assert(ds1.data().v == 1, "resolve");
    }
    
    AutoCases.register(
        "Binding-DataSourceItem",
        "Test DataSource item resolving",
        TestBindingDataSourceItem
    );
})(window);
