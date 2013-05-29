Data-Drive Javascript Framework Reference
=========================================

Schema Definition
-----------------

Using DD.js starts from defining schemas. A schema defines the properties a data object contains. E.g.

```javascript
var nameSchema = new DD.Schema({
    first: DD.Types.Scalar,
    last: DD.Types.Scalar,
    middle: DD.Types.Scalar
}, {
    "mappings": {
        "first": "firstName",
        "last": "lastName",
        "middle": "middleName"
    }
});

var userSchema = new DD.Schema({
    id: DD.Types.Scalar,
    username: DD.Types.Scalar,
    name: nameSchema,
    email: DD.Types.Scalar,
    phones: [DD.Types.Scalar]
});
```

A schema is an instance of ```DD.Schema```. The constructor is defined as

```javascript
DD.Schema(definition, options)
```

```definition``` defines the name and type of each properties.
```options``` a optional hash, the available built-in options are:
* ```mappings``` defines the mapping from the name of the property to the key in data object.
For example, the model created with ```nameSchema``` above will read ```firstName``` from data object to its internal ```first``` property.
Give a full sample:

```javascript
var model = userSchema.createValue();
model.name = {
    firstName: "Albert",
};
console.log(model.name.first);  // show Albert
```

In the example above, a schema can reference another schema as the type of a property.
To define a property as an array, just put the type in an array as the only element. See ```phones``` in ```userSchema```.

Property Types
--------------

Generally, DD.js defines three basic classes of property types:
* _Scalar_ (```DD.Types.Scalar```) represents any simple value, like ```string```, ```number```, ```boolean```, ```null```, ```undefined```
* _Array_ (```[]```) represents an array
* _Schema_ (any Schema instance) represents a nested schema, the value will be a data object.

Internally, each property is implemented using an instance of a class derived from ```DD.Value``` which supports the observer pattern.

Generating Model
----------------

Models are created from schemas. Use the method of your schema instance:

```javascript
schema.createValue()
```

It returns the model created.

Model Manipulation
------------------

You can use assignment operator to get/set values of the properties in model. E.g.

```javascript
var userModel = userSchema.createValue();
...
var username = userModel.username;
...
userModel.username = "albert";
userModel.name = { firstName: "Albert", lastName: "Golds" };
userModel.phones = ["123-456-7890", "321-654-0987"];
```

Each assignment will notify the listeners listening on the corresponding property.

_NOTE_ the manipulation on array properties is quite different from normal array.
In the example above ```userModel.phones``` is not an array, but an instance of ```DD.List``` which is a subclass of ```DD.Value```.
A simple assignment with a normal array will replace all the elements in the property.
To manipulate individual element or do some insertion or deletion, special methods must be used.

Here are the methods of ```DD.List```:

```javascript
at(index)
```

Returns the instance of ```DD.Value``` of the element at specified index.

```javascript
valAt(index)
```

Returns the value of the element at specified index, equivalent to ```at(index).value```.

```javascript
update(index, items)
```

Updates the elements starting from ```index``` with values specified by ```items``` which can be a single value of an array.

```javascript
insert(index, items)
```

Inserts elements at ```index``` with values specified by ```items```.

```javascript
remove(index, count)
```

Removes ```count``` elements at ```index```. ```count``` is optional and defaults to 1.

```javascript
append(items)
```

Inserts elements to the end of the array with values specified by ```items```. This is equivalent to ```list.insert(list.length, items)```.

The reason we don't expose array properties as normal arrays is to support the observer pattern.
With above methods, notifications for only changed elements will be sent which helps optimize the performance for big arrays.

Here's an example of how to manipulate some elements of an array property:

```javascript
userModel.phones.at(0);     // this returns the instance of ```DD.Value```
userModel.phones.valAt(0);  // this returns "123-456-7890"
userModel.phones.update(1, ["321-654-0798", , "654-321-7890"]); // update some elements, sparse array is supported
userModel.phones.insert(1, "789-012-3456"); // inserts a single value
userModel.phones.remove(2); // remove 1 element
userModel.phones.remove(2, 10); // remove 10 element, it is OK if there's less than 10 elements
```

Events
------

For each instance of ```DD.Value```, listeners can be connected for notifications on any changes.