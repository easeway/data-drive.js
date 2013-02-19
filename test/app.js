var express = require("express");

var app = express();

app.configure(function () {
    app.use(express.static(__dirname + "/.."));
    app.use(express.logger("dev"));
    app.use(express.bodyParser());
    app.use(app.router);
    app.use(express.errorHandler());
});

app.get("/", function (req, res) { res.redirect("test/tests.html"); });

app.listen(process.env.PORT || 3000);
