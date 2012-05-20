// Copyright (c) 2012, Yisui Hu <easeway@gmail.com>
// All rights reserved.

// The registration of DataDrive namespace
// and provides basic functions

(function (_W) {

    var DataDrive = {
            VERSION: "0.1.0"
        };
    
    // Simple logging facility
    // may be refactored in future
    DataDrive.Log = {
        debug: function (message) {
            console.debug(message);    
        },
        
        info: function (message) {
            console.info(message);        
        },
        
        error: function (e, message) {
            if (message) {
                console.error(message);
            }
            if (e != null) {
                console.error(e);
            }
        }
    };
    
    /* The following functions are provided by an adapter
    
        DataDrive.inherit(sub, base):
            copy all the properties from base to sub and copy
            all the properties from base.prototype to sub.prototype.

        DataDrive.ajax(url, opts):
            do an AJAX call. the opts are defined as follow:
            - method: the HTTP command to use, e.g. 'GET', 'POST'
                default: 'GET'
            - contentType: specifies the content-type of data to be sent to server
                default: null
            - content: the data to be sent to server
                default: null
            - async: do the HTTP request asynchronously
                default: true
            - accepts: the expected content-type of response data from server
                default: null
            - context: the context used for callbacks (used as this)
            - onsuccess: the callback when the HTTP request completes
                default: null
                prototype: function (content, status, xhr)
                    content: the response from server
                    status: the text status
                    xhr: the browser-specific XMLHttpRequest object
            - onerror: the callback when the HTTP request fails
                default: null
                prototype: function (error, status, xhr)
                    error: the error object thrown
                    status: the text status
                    xhr: the browser-specific XMLHttpRequest object
            
            When async is false, the return value of the function is the
            browser-specific XMLHttpRequest object.
        
        DataDrive.getSync(url, opts):
            The simplified form of DataDrive.ajax with opts.async always set to false.
        
        DataDrive.ready(function):
            Used to scheduled a callback to be invoked when document is ready.
    */
    
    // Export namespace
    _W.DataDrive = DataDrive;
    
    // Create alias
    _W.DD = DataDrive;
    
})(window);
