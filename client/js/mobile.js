
// Full screen mode
let fullscreenBtn = document.getElementById("fullscreenBtn");
fullscreenBtn.onclick = function(){
    if (RunPrefixMethod(document, "FullScreen") || RunPrefixMethod(document, "IsFullScreen")) {
        RunPrefixMethod(document, "CancelFullScreen");
    }
    else {
        RunPrefixMethod(document.body, "RequestFullScreen");
    }
};


let pfx = ["webkit", "moz", "ms", "o", ""];
function RunPrefixMethod(obj, method) {

    let p = 0, m, t;
    while (p < pfx.length && !obj[m]) {
        m = method;
        if (pfx[p] === "") {
            m = m.substr(0,1).toLowerCase() + m.substr(1);
        }
        m = pfx[p] + m;
        t = typeof obj[m];
        if (t !== "undefined") {
            pfx = [pfx[p]];
            return (t === "function" ? obj[m]() : obj[m]);
        }
        p++;
    }

}

window.onload = function(){

    let mover = document.getElementById("circle-mover");
    let bomb = document.getElementById("bomb");
    console.log(typeof window.orientation);
    if(typeof window.orientation !== 'undefined'){

        let moverX = 0, moverY = 0;
        let spacing = 20; // Spacing from the middle
        // bomb.onclick = function(){
        //     main.placeBomb();
        // };
        bomb.addEventListener('touchstart',function(){
            main.placeBomb();
        });


        mover.addEventListener('touchstart',function(){
            moverX = mover.offsetLeft + mover.offsetWidth/2;
            moverY = mover.offsetTop + mover.offsetHeight/2;
        }, false);

        mover.addEventListener("touchend", function(){
            main.keyPress = {};
        }, false);


        mover.addEventListener("touchmove", function(e){
            let touches = e.changedTouches;
            let x = touches[0].pageX;
            let y = touches[0].pageY;
            main.keyPress = {};


            // Up
            if(moverY-spacing > y){
                main.keyPress[38] = true;
            }

            // Left
            if(moverX-spacing > x){
                main.keyPress[37] = true;
            }

            // Down
            if(moverY+spacing < y){
                main.keyPress[40] = true;
            }

            // Right
            if(moverX+spacing < x){
                main.keyPress[39] = true;
            }
        }, false);
    }else{
        // Remove mobile controls
        mover.style.display = "none";
        bomb.style.display = "none";
    }
};
