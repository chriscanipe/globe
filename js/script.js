////////////////////////////////
////////////////////////////////  
// preparation: svg's width/height, projection, path, voronoi
////////////////////////////////
////////////////////////////////

// I followed Mike Bostock's margin convention to set margins first, 
// and then set the width and height based on margins.
// Here's the link to the margin convention 
// http://bl.ocks.org/mbostock/3019563


//Set map hieght to be the same as the width of the #Map div.
//Should be a squre.
$("#map").css("height", $("#map").outerWidth() + "px");

var sens = .1

var margin = {
        top: 15,
        right: 15,
        bottom: 15,
        left: 15
    },
    width = $("#map").outerWidth() - margin.left - margin.right,
    height = $("#map").outerHeight() - margin.top - margin.bottom;


//This is the project for the globe 
var projection = d3.geo.orthographic()
    .scale(height / 2 - margin.left - margin.right)
    .translate([width / 2, height / 2])
    .clipAngle(90)
    .precision(0.5);


//Centerpoint for Los Angeles.
var losAngeles = [34.0575283, -118.4159553];

//Set intitial view so LA is centerpoint.
projection.rotate([94.7908512330838, -40.79682768575549, 0]);

//Path function. All paths are drawn through the projection.
var path = d3.geo.path()
    .projection(projection)
    .pointRadius(function(d) {
        //This is where we set circle radii to show count of attendees
        if (d.count) {
            return Math.sqrt(d.count / Math.PI) * 1.3;
        }
    });

//Zoom is defined.
var zoom = d3.behavior.zoom()
    .scaleExtent([1, 3])
    .on("zoom", zoomed);

var zoomEnhanced = d3.geo.zoom().projection(projection)
    .on("zoom", zoomedEnhanced);

// Create a voronoi layer for better mouse interaction experience
// For more reading on voronoi, check out 
// http://www.visualcinnamon.com/2015/07/voronoi.html

var voronoi = d3.geom.voronoi()
    .x(function(d) {
        return d.x;
    })
    .y(function(d) {
        return d.y;
    })
    .clipExtent([
        [0, 0],
        [width, height]
    ]);



var svg = d3.select('#map').append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .attr('class', 'graph-svg-component')
    .call(responsivefy) // Call function responsivefy to make the graphic reponsive according to the window width/height
    .append('g')
    .attr("class", "globe-g")
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
    .call(zoomEnhanced);


// Globe Outline (Background circle)
// -------------
var globe = svg.selectAll('path.globe').data([{
        type: 'Sphere'
    }])
    .enter().append('path')
    .attr('class', 'globe')
    .attr('d', path);








////////////////////////////////
////////////////////////////////  
// Queue: queue is an asynchronous helper library for JavaScrip 
// It helps coders to easily load multiple datasets 
// Here's the link to queue github repository:
// https://github.com/mbostock/queue
////////////////////////////////
////////////////////////////////s

queue()
    .defer(d3.json, 'data/world_countries.json') // load geojson/topojson data
.defer(d3.csv, 'data/dataSmall.csv')
// .defer(d3.csv, 'flights.csv')
.await(ready);

function ready(error, world, data) {
    if (error) throw error;

    data.forEach(
        function(d) {

            var latlong = d.lat_long.replace(/\"/g, "").replace(/\'/g, "").split(",");
            latlong = [+latlong[0], +latlong[1]];

            d.end_lat = latlong[0];
            d.end_long = latlong[1];
            d.start_lat = losAngeles[0];
            d.start_long = losAngeles[1];

            if (isNaN(latlong[0]) || isNaN(latlong[1])) {
                //Do nothing.
            } else {
                d.greatcircle = new arc.GreatCircle({
                    x: d.start_long,
                    y: d.start_lat
                }, {
                    x: d.end_long,
                    y: d.end_lat
                });
                d.line = d.greatcircle.Arc(100, {
                    offset: 10
                });
                d.arc = d.line.json();
            }

        }
    );


    data = data.filter(function(d) {
        if (isNaN(d.end_lat) || isNaN(d.end_long)) {
            //Do nothing.
        } else {
            return d;
        }
    });



    svg.selectAll('baseMap')
        .data(world.features)
        .enter()
        .append('path')
        .attr('d', path)
    // .append("g")
    .attr('class', 'baseMap');

    svg.selectAll('.cities_end')
        .data(data)
        .enter().append("path")
        .datum(function(d) {
            return {
                type: "Point",
                coordinates: [d.end_long, d.end_lat],
                count: +d.count
            };
        })
        .attr("d", path)
        .attr('class', 'cities_end');

    svg.append("g")
        .attr("class", "line")
        .selectAll(".arc")
        .data(data.map(function(d) {
            return d.arc;
        }))
        .enter()
        .append("path")
        .attr("class", "arc")
        .attr("d", path);
}

d3.select("svg").call( //drag on the svg element
    d3.behavior.drag()
    .origin(function() {
        var r = projection.rotate();
        return {
            x: r[0],
            y: -r[1]
        }; //starting point
    })
    .on("drag", function() {
        var r = projection.rotate();
        /* update retation angle */
        projection.rotate([d3.event.x, -d3.event.y, r[2]]);

        /* redraw the map and circles after rotation */
        svg.selectAll(".baseMap").attr("d", path);
        svg.selectAll(".arc").attr("d", path);
        svg.selectAll('.cities_end')
            .attr("d", path);
    })
);


d3.select("svg")
    .call(d3.behavior.drag()
        .origin(function() {
            var r = projection.rotate();
            return {
                x: r[0] / sens,
                y: -r[1] / sens
            }; //starting point
        })
        .on("drag", function() {
            var rotate = projection.rotate();
            
            projection.rotate([d3.event.x * sens, -d3.event.y * sens, rotate[2]]);

            /* redraw the map and circles after rotation */
            svg.selectAll(".baseMap").attr("d", path);
            svg.selectAll(".arc").attr("d", path);
            svg.selectAll('.cities_end')
                .attr("d", path);



        }))









// apply transformations to map and all elements on it 
function zoomed() {
    svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    //grids.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    //geofeatures.select("path.graticule").style("stroke-width", 0.5 / d3.event.scale);
    svg.selectAll("path.boundary").style("stroke-width", 0.5 / d3.event.scale);
}

function zoomedEnhanced() {
    console.log("zoomEnhanced()");
    svg.selectAll(".baseMap").attr("d", path);
    svg.selectAll(".arc").attr("d", path);
    svg.selectAll('.cities_end').attr("d", path);
    svg.selectAll('.globe').attr("d", path);
}

// function dragstarted(d) {
//     console.log("dragstarted()");
//     //stopPropagation prevents dragging to "bubble up" which triggers same event for all elements below this object
//     d3.event.sourceEvent.stopPropagation();
//     d3.select(this).classed("dragging", true);
// }

// function dragged() {
//     console.log("dragged()");
//     projection.rotate([d3.event.x, -d3.event.y]);
//     svg.selectAll("path").attr("d", path);
// }

// function dragended(d) {
//     console.log("dragended()");
//     d3.select(this).classed("dragging", false);
// }









function responsivefy(svg) {
    var container = d3.select(svg.node().parentNode),
        width = parseInt(svg.style('width')),
        height = parseInt(svg.style('height')),
        aspect = width / height;

    svg.attr('viewBox', '0 0 ' + width + ' ' + height)
        .attr('perserveAspectRatio', 'xMinYMid')
        .call(resize);

    d3.select(window).on('resize', resize);

    function resize() {

        $("#map").css("height", $("#map").width() + "px");

        var targetWidth = parseInt(container.style('width'));
        svg.attr('width', targetWidth);
        svg.attr('height', Math.round(targetWidth / aspect));
    }
}