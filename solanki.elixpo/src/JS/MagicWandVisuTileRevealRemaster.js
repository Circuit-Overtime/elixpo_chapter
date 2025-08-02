const wandTiles = document.getElementById("wandVisuMagicTwo"),
tileIcons = document.getElementById("tileIconSVG"),
tileContainer = document.getElementById("logosTileMove");

tileContainer.onmousemove = e => {
    //console.log(e.clientX); //345 993
    //console.log(tileContainer.getBoundingClientRect().left)
    //console.log(tileContainer.getBoundingClientRect().right)

    percentageMoved = per(parseInt(mapRange(e.clientX, tileContainer.getBoundingClientRect().left, tileContainer.getBoundingClientRect().right, 0 , 100)))
    pixelsMovedX = px(parseInt(mapRange(e.clientX, tileContainer.getBoundingClientRect().left, tileContainer.getBoundingClientRect().right, 50 , 600)))
    pixelsMovedY = px(parseInt(mapRange(e.clientY, tileContainer.getBoundingClientRect().top, tileContainer.getBoundingClientRect().bottom, 100 , 120)))
    svgBackgroundMoveX = px(parseInt(mapRange(e.clientX, tileContainer.getBoundingClientRect().left, tileContainer.getBoundingClientRect().right, 0 , 600))+20);
    const TileWandStyles = 
    {
        left: pixelsMovedX,
        top: pixelsMovedY,
        rotate : deg(pixelsMovedX * 0.05)
    }
    wandTiles.animate(TileWandStyles, { duration: 200, fill: "forwards" });
    tileIcons.animate({width : [svgBackgroundMoveX]}, {duration : 300, fill : "forwards"});
}
tileContainer.onmouseleave = () => {
    const TileWandStylesOut = 
    {
        left: px(450),
        top: px(108),
        rotate : deg(2)
    }
    wandTiles.animate(TileWandStylesOut, { duration: 200, fill: "forwards" });
    tileIcons.animate({width : [px(460)]}, {duration : 300, fill : "forwards"});
}