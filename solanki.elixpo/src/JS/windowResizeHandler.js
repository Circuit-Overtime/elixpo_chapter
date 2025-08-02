function windowResizeHandler()
{
    windowHeight = screen.height;
    windowWidth = screen.width;
    if((windowHeight == 768) && (windowWidth == 1366))
    {
        scaleXValue = (windowWidth/1349).toFixed(8)
        scaleYValue = (windowHeight/641).toFixed(8)
        document.querySelector(".mainContainer").style.transform = "translateX(-50%) translateY(-50%) scaleX("+1+") scaleY("+1+")";
        // console.log(scaleXValue, scaleYValue)
    }
    else if((windowHeight != 768) && (windowWidth != 1366))
    {
        scaleXValue = (windowWidth/1349).toFixed(8)
        scaleYValue = (windowHeight/641).toFixed(8)
        document.querySelector(".mainContainer").style.transform = "translateX(-50%) translateY(-50%) scaleX("+scaleXValue+") scaleY("+scaleYValue+")";
        // console.log(scaleXValue, scaleYValue)
    }

        
}

setInterval(() => {
    windowResizeHandler();
}, 1000);
