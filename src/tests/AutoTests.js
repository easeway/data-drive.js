// Copyright (c) 2012, Yisui Hu <easeway@gmail.com>
// All rights reserved.

(function (_W) {

    // Export cases array
    var AutoCases = [ ];
    
    AutoCases.register = function (name, description, func, opts) {
        var test ={
            name: name,
            description: description,
            test: func
        };
        if (opts != null) {
            for (var k in opts) {
                test[k] = opts[k];
            }
        }
        AutoCases.push(test);
    };
    
    _W.AutoCases = AutoCases;
    
    var DD = _W.DataDrive;
    
    var TableLayout = function (className) {
        this.tableClass = className;
    };
    
    TableLayout.prototype = { };
    
    TableLayout.prototype.initialize = function (viewList) {
        this.table = document.createElement("table");
        this.table.className = this.tableClass;
        viewList.element.appendChild(this.table);
    };
    
    TableLayout.prototype.cleanup = function (viewList) {
        if (this.table != null) {
            viewList.element.removeChild(this.table);
            this.table = null;
        }
    };
    
    TableLayout.prototype.insertItem = function (viewList, index, itemView) {
        itemView.attach(this.table, index);
    };
    
    var AutoTests = function (container, tableTemplate, progress) {
        var tr = tableTemplate.getElementsByTagName("tr")[0];
        var layout = new TableLayout(tableTemplate.className);
        this.listView = new DD.ViewList(DD.templateFromElement(tr), layout);
        this.listView.attach(container);
        this.progress = progress;
    };

    AutoTests.prototype = { };

    AutoTests.prototype.load = function (listData) {
        this.dataContext = DD.createDataContext(listData);
        this.dataSource = new DD.DataSource(this.dataContext);
        this.listView.subscribe(this.dataSource);
    };
    
    AutoTests.prototype.start = function () {
        this.stop();
        this.currentCase = 0;
        var instance = this;
        this.intervalID = setInterval(function () {
            instance.execNextCase();
        }, 0);
    };
    
    AutoTests.prototype.stop = function () {
        if (this.intervalID != null) {
            clearInterval(this.intervalID);
            this.intervalID = null;
        }
    };
    
    AutoTests.prototype.execNextCase = function () {
        if (this.currentCase < this.dataContext.data().length) {
            ReportProgress.call(this);
            var item = this.dataContext.item(this.currentCase);
            var itemData = item.data();
            try {
                itemData.test.call(itemData);
                itemData.status = "PASS";
                itemData.error = null;
            } catch (e) {
                itemData.status = "FAIL";
                if (e.testFail) {
                    itemData.error = e;
                } else {
                    itemData.error = {
                        type: Test.Errors.Exception,
                        message: e.message,
                        exception: e
                    };
                }
            }
            item.update();
            this.currentCase ++;
        } else {
            ReportProgress.call(this);
            this.stop();
        }
    };
    
    function ReportProgress() {
        if (typeof(this.progress) == "function") {
            this.progress(this.currentCase, this.dataContext.data().length);
        }
    }
    
    AutoTests.start = function (container, template, progress_callback) {
        if (typeof(container) == "string") {
            container = document.getElementById(container);
        }
        if (typeof(template) == "string") {
            template = document.getElementById(template);
        }
        
        var test = new AutoTests(container, template, progress_callback);
        test.load(AutoCases);
        test.start();
    };
    
    _W.AutoTests = AutoTests;
    
    // Test primitives
    var Test = { };
    
    Test.Errors = {
        Exception: "Exception",
        AssertFail: "AssertFail"    
    };
    
    Test.assert = function (condition, message) {
        if (!condition) {
            throw {
                testFail: true,
                type: Test.Errors.AssertFail,
                message: message
            };
        }
    };
    
    _W.Test = Test;
    
})(window);
