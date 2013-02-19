// Copyright (c) 2013, Yisui Hu <easeway@gmail.com>
// All rights reserved.
// -----------------------------------------------------------------------------

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