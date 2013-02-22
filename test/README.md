How to Test Data-Drive Javascript Framework
===========================================

Data-Drive Javascript Framework uses Mocha (http://github.com/visionmedia/mocha) as testing framework.
The tests can work in two different ways:

1. All the core test cases can run within a single browser from local file system;
2. The full suite requires Node.js to run a web server.

Test with single browser
------------------------

Use browser to open ```tests.html```, and it's done. In this mode, all Ajax related test cases will be skipped.

Test the full suite
-------------------

Enter to test folder:

```bash
npm install
node app
```

and point your browser to ```http://localhost:3000```.

If you want to specify the listening port, using:

```bash
PORT=4321 node app
```

when you lunching ```node app``` as above. Change 4321 to a port number you want.