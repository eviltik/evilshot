var _insertUrlBanner = function() {

    if (!document.body) return setTimeout(_insertUrlBanner, 200);

    var _d = document.createElement("div");
    _d.style="position:absolute;top:0px;height:70px;background-color:black;left:0px;right:0px;text-align:center;font-family:verdana;font-size:20px;color:white;line-height:70px;z-index:10000;opacity:0.8";
    _d.innerHTML = "__URL__";

    var h = document.getElementsByTagName('html')[0];
    h.style = 'margin-top:70px';

    document.body.appendChild(_d);

}

_insertUrlBanner();
