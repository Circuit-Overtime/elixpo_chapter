var sourceBlock = document.getElementById('galleryImagesAutoEditaBtn');
var destblock = document.getElementById('image-container');
var namespace = joint.shapes;
var graph = new joint.dia.Graph({}, { cellNamespace: namespace });

var paper = new joint.dia.Paper({
    el: document.getElementById('connectorOne'),
    model: graph,
    width: 600,
    height: 100,
    gridSize: 1,
    cellViewNamespace: namespace
});


var link = new joint.shapes.standard.Link();
link.source({id : destblock.id});
link.target({id : sourceBlock.id});
link.addTo(graph);