---
title: Elm (0.18) & Ports - Google Maps quick and dirty
layout: post
category: elm
---

This is an update of my [earlier post](http://simonh1000.github.io/2015/10/elm-architecture-ports/), and is an example of using ports to work with the ubiquitous Google Maps library.

<script type="text/javascript" src="/js/gmaps2.js"></script>
<script src="//maps.googleapis.com/maps/api/js?key=AIzaSyBQ7rfAz9CP20XeFm54Yq72Lkv6aSY7QUg"></script>
<div id="elm">Loading...</div>
<script>
  const node = document.getElementById('elm');
  elm = Elm.Main.embed(node);
  //- elm = Elm.Main.fullscreen();

  elm.ports.loadMap.subscribe(function(model) {
      var mapDiv = document.getElementsByTagName('gmap')[0];

      var myLatlng = new google.maps.LatLng(model.lat, model.lng);
      var mapOptions = {
        zoom: 6,
        center: myLatlng
      };
      var gmap = new google.maps.Map(mapDiv, mapOptions);
      /*We store the Google Map object in Elm*/
      elm.ports.receiveMap.send(gmap);
  });

  elm.ports.setCenter.subscribe(function(model) {
      var myLatlng = new google.maps.LatLng(model.center.lat, model.center.lng);
      model.gmap.setCenter(myLatlng);
  });
</script>

## Elm side

All Elm code begins with the model, so let's start there.

{% highlight Haskell %}
-- MODEL
type alias Model =
    { gmap : Value
    , center : LatLng
    }

type alias LatLng =
    { lat : Float
    , lng : Float
    }

init : ( Model, Cmd Msg )
init =
    let
        center = LatLng 43 4.5
    in
        ( Model (E.string "to be replaced by google map") center
        , Time.now |> Task.perform Tick
        )

{% endhighlight %}

The model comprises the Google Maps object itself, which we simply store in Elm as a Json Value, and the center of the map.

If we are running full-screen, then when the program bootstraps the DOM has not been created, so we need to make the Google Maps Javascript wait for that before initiating the map. To do that, we force the Elm update loop to return immediately (with the current time, which we do not in practise use), and use the Tick message to trigger the port call to load the map.

{% highlight Haskell %}
port loadMap : LatLng -> Cmd msg
port setCenter : Model -> Cmd msg

type Msg
    = North
    | Tick Time
    | JSMap Value

update : Msg -> Model -> (Model, Cmd Msg)
update message model =
    case message of
        North ->
            let
                center = model.center
                newCenter = { center | lat = center.lat + 1 }
                newModel = { model | center = newCenter }
            in
            newModel ! [ setCenter newModel ]
        JSMap gmap ->
            { model | gmap = gmap } ! []
        Tick _ ->
            model ! [ loadMap model.center ]
{% endhighlight %}

The Tick content is dropped, but we now have the Dom available so we send the coordinates of the center of the map through the port `loadMap` to trigger our Javascript.

Notice the JSMap message. This has the Google Map attached to it, which we add to our model, and pass back to Javascript when we receive a `North`.

The map gets back to us through a port too, which we subscribe to when initialising the program:

{% highlight Haskell %}
port receiveMap : (Value -> msg) -> Sub msg

main =
  Html.program
    { init = init
    , update = update
    , view = view
    , subscriptions = always (receive App.JSMap)
    }
{% endhighlight %}

## Javascript side

We use `elm.ports.<port name>.subscribe( payload => {...})` to receive messages from Elm, and `elm.ports.<port name>.send(...)` to pass data to Elm.

{% highlight Javascript %}
elm = Elm.Main.embed(document.getElementById('elm'));

elm.ports.loadMap.subscribe(function(model) {
    var mapDiv = document.getElementsByTagName('gmap')[0];

    var myLatlng = new google.maps.LatLng(model.lat, model.lng);
    var mapOptions = {
      zoom: 6,
      center: myLatlng
    };
    // This is a local variable as we will store the map in the Elm model subsequently
    var gmap = new google.maps.Map(mapDiv, mapOptions);

    // We store the Google Map object in Elm
    elm.ports.receiveMap.send(gmap);
});

elm.ports.setCenter.subscribe(function(model) {
    var myLatlng = new google.maps.LatLng(model.center.lat, model.center.lng);
    // Use the Google Map object that we stored in Elm
    model.gmap.setCenter(myLatlng);
});
{% endhighlight %}

All the code can be found on [Github](https://github.com/simonh1000/elm-google-maps-2).
