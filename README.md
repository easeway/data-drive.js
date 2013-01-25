Data-Drive Javascript Framework (DD.js)
=======================================

What is Data-Drive?
-------------------

Data-Drive is a client-side Javascript MVC Framework. It helps you focus on data
models and business logics by saving the time writing a lot of code manipulating
HTML dynamically. See how Data-Drive works in next three steps:

How to use
----------

Step 1. Design your data models

```javascript
var personSchema = new DD.Schema({
    name: DD.Types.Scalar,
    gender: DD.Types.Scalar,
    age: DD.Types.Scalar,
    birthday: DD.Types.Scalar,
    ...
});

DD.Models.register("person", personSchema);
```

Step 2. Build your static HTML file

```html
...
   <table id="#person" data-drive-map="person">
       <tr><td>Name</td><td>%{ $D.name }</td></tr>
       <tr><td>Gender</td><td>%{ $D.gender }</td></tr>
       <tr><td>Age</td><td>%{ $D.age }</td></tr>
       <tr><td>Birthday</td><td>%{ formatToLocalDate($D.birthday) }</td></tr>
   </table>
...
```

Step 3. Fill data in data model

```javascript
$.get("persons/id").done(function (json) {
    DD.Models.person = json;
    // The HTML is automatically updated
});
```

More complicated use
--------------------

The most powerful use is to manipulate a list of data items automatically. Let's
add one more data model:

```javascript
var groupSchema = new DD.Schema({
    name: DD.Types.Scalar,
    members: [personSchema]
});

DD.Models.register("group", groupSchema);
```

Now, create HTML for the list

```html
...
   <div data-drive-map="group" data-drive-on="update:onGroupUpdated(this)">
       <h1>Group - %{ $D.name }</h1>
       <ul data-drive-map=".members">
           <li>
               <table>
                   <tr><td>Name</td><td>%{ $D.name }</td></tr>
                   <tr><td>Gender</td><td>%{ $D.gender }</td></tr>
                   <tr><td>Age</td><td>%{ $D.age }</td></tr>
                   <tr><td>Birthday</td><td>%{ formatDate($D.birthday) }</td></tr>
               </table>
           </li>
       </ul>
   </div>
...
```

We can use AjaxConnector to automatically load data from server

```javascript
var model = DD.Models.findProperty("group");
DD.AjaxConnect(model, "groups/groupId", { method: 'GET' });
// DD.AjaxConnect extend the data model with "reload" method. This is used only once.
model.reload();
// reload will automatically invoke Ajax call and fill the response JSON to data model
// and finally update HTML
```

Events Subscription
-------------------

In the example above, we use ```data-drive-on``` attribute to subscribe the events for
any changes on the model specified by ```data-drive-map``` on current element or parents.
Here ```update:onGroupUpdated(this)``` will invoke ```onGroupUpdated(this)``` when ```update```
event is emitted on the data model.

Change of HTML by Javascript
----------------------------

What about dynamically manipulating DOM tree in your own Javascript? Don't worry,
Data-Drive uses MutationsObserver to monitor all DOM updates. It will parse all
data-drive-xxx attributes when nodes are inserted or removed.

For example:

```javascript
document.getElementById("content").innerHTML = "<div data-drive-map='person'>...";
```

The next time you do ```DD.Models.person = ...``` will automatically refresh the
newly added content under "#content" element. This also works with DOM node
manipulation like "appendChild".

Compatibility
-------------

Data-Drive fully utilizes HTML5 and ECMAScript5 features, so only modern browers
are supported. The listed browsers are tested:

* Safari 5.1.6
* Chrome 19.0
* Firefox 12.0

For Internet Explorer, it goes too far away from standard. We don't have plan to
support it. Anyway, any patches are welcome for making Data-Drive work on IE.
