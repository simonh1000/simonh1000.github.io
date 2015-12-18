---
title: Elm and lazy loading Google Maps
layout: post
category: elm
---

Imagine you have multi-view Elm app, where one of the views includes a Google map. I covered previously the basics of wiring up a [Google Maps in Elm](http://simonh1000.github.io/2015/10/elm-architecture-ports/) but, in that example, the div for the Google Map was hard coded into the html, and Elm was was run via the `embed` method. What if you want to run `fullscreen`, with Elm creating the div for the map?

The obvious approach is to set up a port that sends a trigger state to Javascript land to load a map onto a particular div. Unfortunately the timing does not permit that: as soon as the global model is updated to include the trigger state, the port sends its message to Javascript land, and this happens before the necesary div can be rendered by the view process. The Javascript code can't find the div, an error occurs, and the user gets no map.

The quick fix is to use a Javascript `setInterval` to delay the map loading process. It works but is hardly elegant.

A more Elm based approach is add an extra loop to the program, that lets the view create the map div before the port signals to Javascript land. To achieve this we need to add a 'Transitioning' state.

{% highlight Haskell %}
type State =
      Page1
    | Transitioning
    | Page2
{% endhighlight %}

We also need an action representing the transition to the page with the map on.
{% highlight Haskell %}
type Action =
    TransitioningAction
{% endhighlight %}

Then the guts of the Elm code is the update and view functions (with the full code in the gist below).

{% highlight Haskell %}
update : Action -> Model -> (Model, Effects Action)
update action model =
    if model == Transitioning
    then ( Page2, Effects.none )
    else if action == TransitioningAction
        then ( Transitioning, Effects.tick (\_ -> TransitioningAction) )
        else ( model, Effects.none )

view : Signal.Address Action -> Model -> Html
view address model =
    case model of
        Page1 ->
            viewP1 address model
        Transitioning ->
            viewP2 address model
        Page2 ->
            viewP2 address model
{% endhighlight %}

The update function should be read in reverse. When update is first called with the `TransitioningAction` we switch state to `Transitioning`. This causes the view to render the page with the map div on. To that we add a dummy Effect that triggers on the next tick and returns with a second `TransitioningAction`. However, on this second loop the `if` test catches the new model state first and pushes the state on to `Page2`.

While our port pushes out all state changes, in Javascript land we are only looking for `"Page2"`, and not `"Transitioning"` (Union types have to be mapped to strings to pass through a port), before triggering the map rendering.

{% highlight javascript %}
map.ports.state.subscribe(function(newState) {
    if (newState == "Page2") {
        mapDiv = document.getElementById('map');
        ...
    }
});
{% endhighlight %}

## Alternatives

Another alternative would be to have Javascript monitor for the DOM mutation where the map's div is created before loading the Google Map code. My first efforts in this direction were however unsuccessful with the mutation observer not detecting Elm adding a div. More experimentation needed here.

## Full code
<script src="https://gist.github.com/93d6f1c927af3ed2d38f.js"> </script>
