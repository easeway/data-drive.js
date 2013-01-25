!function () {
    $(document).ready(function () {
        if (!DD.compatibility.ok) {
            $("#incompatible").removeClass("hidden");
        }
    });
}();