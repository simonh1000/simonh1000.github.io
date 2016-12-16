---
title: Google Maps with Elm (0.16) and ports
layout: post
category: elm
---

This post is the start of a series about Elm and Google Maps, but the key learning from my initial 'quick and dirty' approach was how to use ports with the ubiquitous [Elm Architecture](https://github.com/evancz/elm-architecture-tutorial/).

To start with I'm going to use Javascript externally from Elm to load a map, and just leave Elm to handle the modeling of the map position. In practise, we'll build a way to pan from the South to the North of France.

<div id="elmContainer" class="lands" style="width:49%; float:left">
    <h4>Elm land</h4>
    <div id="elm"></div>
</div>

<div id="jsContainer" class="lands" style="width:49%; float:left">
    <h4>Javascript land</h4>
    <div id="map"></div>
</div>

<script type="text/javascript" src="/js/gmaps.js"></script>
<script src="//maps.googleapis.com/maps/api/js?key=AIzaSyBQ7rfAz9CP20XeFm54Yq72Lkv6aSY7QUg"></script>
<script type="text/javascript">
    var div = document.getElementById('elm');
    var mapDiv = document.getElementById('map');
    var map = Elm.embed(Elm.Main, div);

    map.ports.lat.subscribe(function(lat) {
        console.log("received", lat);
        var myLatlng = new google.maps.LatLng(lat, 5);
        gmap.setCenter(myLatlng);
    });

    var myLatlng = new google.maps.LatLng(43, 4.5);
    var mapOptions = {
      zoom: 6,
      center: myLatlng
    };
    console.log("loading", mapDiv);
    var gmap = new google.maps.Map(mapDiv, mapOptions);
</script>

The button simply causes the model to increment.

{% highlight Haskell %}
-- MODEL
type alias Position =
    { lat : Float
    , lng : Float
    }

type alias Model = Position

init : Model
init = { lat = 43, lng = 4.5 }

-- UPDATE
type Action =
      North

update : Action -> Model -> (Model, Effects Action)
update action model =
    case action of
        North -> ( { model | lat <- model.lat + 1 }, Effects.none )

-- VIEW
view : Signal.Address Action -> Model -> Html
view address model =
    div []
        [ button [ onClick address North ] [ text "North" ]
        ]
{% endhighlight %}

The magic - such as it is - comes from pushing the updated model back out to Javascript land. I have Peter Damoc to thank on the forums for help, but in Main.Elm I have added a new port.

{% highlight Haskell %}
-- Main Elm Architecture port
port tasks : Signal (Task.Task Never ())
port tasks =
  app.tasks

-- extra port
port lat : Signal Float
port lat = Signal.map (\m -> m.lat) app.model
{% endhighlight %}

When the code is run, StartApp.start is called, but so too, in parallel, is `port lat`. This 'subscribes' to the Signal of my model, and extracts the latitude value each time the model changes.

In Javascript land it is then a simple matter of subscribing to the [port](http://elm-lang.org/guide/interop), and updating the map.

{% highlight Html %}
<div id="elm"></div>
<div id="map"></div>
<script>
var div = document.getElementById('elm');
var mapDiv = document.getElementById('map');
var map = Elm.embed(Elm.Main, div);

map.ports.lat.subscribe(function(lat) {
    console.log("received", lat);
    var myLatlng = new google.maps.LatLng(lat, 5);
    gmap.setCenter(myLatlng);
});

var myLatlng = new google.maps.LatLng(43, 4.5);
var mapOptions = {
  zoom: 6,
  center: myLatlng
};
var gmap = new google.maps.Map(mapDiv, mapOptions);
</script>
{% endhighlight %}
