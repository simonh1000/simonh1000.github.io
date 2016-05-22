---
title: Connecting Elm with Phoenix using Channels
layout: post
tags: Elm, Phoenix
---

One of the big strengths of Phoenix is Channels. Channels seem to have been a [key motivation for Elm's recent 0.17 release](http://elm-lang.org/blog/farewell-to-frp), which introduced a new WebSocket library (that takes advantage of Elm's new effects handlers). I had a go at trying to wire it up a simple chat app. There are many posts about Channels already so the focus here will be on Elm. 

My aim was to emulate the sockets.js library that ships with Phoenix - in practise I have not got very far, but I do have working communications and a 'library' that factors out the Channels specific code so I thought it was time to share progress! The code is available on [Github](https://github.com/simonh1000/elm-phoenix-channels), and it includes some traditional ports based code so you can see what sort of communications the Phoenix socets.js library is generating.

## Modeling a Socket Channel

Keeping things simple we'll just store the socket's Url and the socket's connection state (we won't be using the `ref` yet).

{% highlight Haskell %}
type SOCKET_STATES
    = Connecting
    | Open
    | Closing
    | Closed

type alias Model =
    { socketUrl : String
    , ref : String
    , state : SOCKET_STATES
    }

type alias SendMsg =
    { topic : String
    , event: String
    , payload : String
    , ref : String
    }
{% endhighlight %}

Phoenix expects messages with a particular format and those that we send will need the fields in `SendMsg`. Responses are similar, but not identical, in structure.

## Joining a Channel

First things first: let's join an open channel. The [Phoenix docs](http://www.phoenixframework.org/docs/channels) lead you to create a "rooms:lobby" channel so we will use that. Our Channels 'library' has a Join Msg that uses Elm's WebSocket library to connect. Here's the code:

{% highlight Haskell %}
type Msg
    = Join
    | Send String
    | Raw String

update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
    case msg of
        Join ->
            let joinMsg = SendMsg "rooms:lobby" "phx_join" "rooms:lobby" "1"
            in
            ( model
            , WebSocket.send model.socketUrl (encoder joinMsg)
            )

     [...]

encoder : SendMsg -> String
encoder m =
    E.object
        [ ("topic", E.string m.topic)
        , ("event", E.string m.event)
        , ("payload", payloadEncoder m.payload)
        , ("ref", E.string m.ref)
        ]
    |> E.encode 0

payloadEncoder : String -> E.Value
payloadEncoder p = E.object [("body", E.string p)]
{% endhighlight %}

## Listening to the socket

So our join message has been sent, but how we do get a response. This is where the new Subscriptions come in. WebSocket has a [listen](http://package.elm-lang.org/packages/elm-lang/websocket/1.0.1/WebSocket#listen) function which we need to wire up in Main.elm.

{% highlight Haskell %}
main =
  Html.program
    { init = init
    , view = view
    , update = update
    , subscriptions = subscriptions
    }

subscriptions : Model -> Sub Msg
subscriptions model =
    WebSocket.listen WWS.socketUrl (App.WSMsg << WWS.SocketMessage)
{% endhighlight %}

We listen on the socket Url and wrap the raw, incoming communication with app-specific Messages. One way or another we need to pass the string wrapped as `Raw` to our update function to decode and establish whether our request to join has been confirmed:

{% highlight Haskell %}
Raw s ->
    case processRaw (Debug.log "Raw" s) of
        Result.Ok conf ->
            if conf.event == "phx_reply" && conf.payload == "ok"
            then
                ( { model | state = Open }, Cmd.none )
            else (model, Cmd.none)
        Result.Err err ->
            ( model, Cmd.none)
{% endhighlight %}

## Using our connection

Sending a chat message is similar to joining a channel:

{% highlight Haskell %}
Send m ->
    let myMsg = SendMsg "rooms:lobby" "new_msg" m "1"
    in
    ( model
    , sendChannel model myMsg
    )
{% endhighlight %}

## Listening to others

Finally we want to hear what others have to say. Above we routed incoming socket messages to `WWS.SocketMessage`, and this picks out packets with a "new_msg" tag:

{% highlight Haskell %}
SocketMessage msg' ->
    case C.getNewMessage msg' of
        Just m ->
            ( { model | messages = m :: messages }
            , Cmd.none
            )
        Nothing ->
            update (ChannelsMsg <| C.Raw msg') model
{% endhighlight %}

Anything else (e.g. include a join confirmation) is passed on to the 'library' code.

This is of course just the beginning, but shows some of the latest additions to Elm working nicely with Phoenix's core strength.
