var _insertAudit = function() {

    if (!document.body) return setTimeout(_insertAudit, 200);

    var _d = document.createElement("div");
    _d.style="position:absolute;bottom:0px;height:70px;background-color:black;left:0px;right:0px;text-align:center;font-family:verdana;font-size:20px;color:white;line-height:70px;z-index:10000;opacity:0.8";
    _d.innerHTML = "__URL__";

    document.body.appendChild(_d);

}

_insertAudit();
