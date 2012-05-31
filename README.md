Data-Drive Javascript Framework (DD.js)
=======================================

What is Data-Drive?
-------------------

Data-Drive is a Javascript Framework which simplifies and automates the work to update the views when the associated data models are changed. With help of this framework, we can focus on either UI design, modeling, or transition (event processing), with each group of work separated clearly. Changes on UI design won't impact any other two groups of work, and vice versa.

The short name is DD.js which is simpler.

The initiative
--------------

Normally, when developing web pages using some Javascript MVC frameworks, we need to update all related views explicitly after we update the data models.  
For example:

    // we got some data from the form and update the model  
    var person = Persons.add();
    person.name = formData["name"];
    person.birthday = formData["birthday"];
    Persons.select(person);
    // now it is time to update the views
    personListView.update();
    selectedPersonInfoView.update();

We really hate the lines explicitly updating the views. We actually have the knowledge about the relationships between views and data models when we initialize the whole page. We want to that update automatically, with Data-Drive, as follow:  

    // same code to update the model
    var person = Persons.add();
    person.name = formData["name"];
    person.birthday = formData["birthday"];
    Persons.select(person);
    // now, the simple statement do all updates
    Persons.update();

Wanna to know the magic? Look into the code. It's fairly simple.

And secondly, we feel uncomfortable that we have to develop the UI using Javascript every time. As UI changes frequently, using Javascript to generate HTML dynamically introduces a lot of work constantly. Well, HTML is powerful enough, why shall we still stay in a non-WYSIWYG way?

The Data-Drive framework brings another feature that organizes UI dynamically and automatically based on the concepts of template and data-binding. The UI is organized with pieces of HTML templates while the data can be filled in using data-binding. What's more, data-binding can also change the layout, styles, events, animations, etc, by reflecting the changes automatically from data models which are specially designed for UI structures. Then we can focus on pure HTML design, and only very little code.

How to build
------------

In "src" folder, the code is splitted in several .js files. You can build to generate a single .js file including all code pieces. It is quite straight forward to build the code:
1. cd into the root folder of the source tree
2. type "./build.pl" or "perl build.pl"

That's all, you will find the all-in-one .js file under the root folder of the source tree, like "data-drive-core.js".

Supported Browsers
------------------

The initial version supports WebKit based browsers: Safari, Chrome. And Firefox will be in near future.
Here are the browsers we have tested the code:
* Safari 5.1.6
* Chrome 19.0
* Firefox 12.0

Some older versions should be able to work. Please notify me if you have tested with them. Thanks!
