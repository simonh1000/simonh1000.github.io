---
title: Decode dropped directory of files
layout: post
tags: Elm
---

In 2018, Elm got support for [Files](https://github.com/elm/file) from HTML `drop` events. This enabled Elm developers to work with the contents of a File and upload it elsewhere or read the content into their program.

But the Web platform has not stood still and you can now drop directories on to your browser window. Unfortunately support for this is still pending, but there is a work around.

## Prior Art

I have previously been able to write an Elm Decoder that could read a list of Files dropped onto a webpage. It's not pretty, but it works:

```elm
fileListDecoder : Decoder (List File)
fileListDecoder =
    let
        decodeFileValues indexes =
            indexes
                |> List.map (\index -> Decode.field (String.fromInt index) File.decoder)
                |> List.foldr (Decode.map2 (::)) (Decode.succeed [])
    in
    Decode.field "length" Decode.int
        |> Decode.andThen (\i -> decodeFileValues <| List.range 0 (i - 1))
```

JS events are 'lazy', you have to decode things explicitly to materialise their data; so here we first check the length of the list of files and then decode each one at field `"1", "2",...` in the list, using an applicative pattern.

## File Entries

In order to process a dropped directory, you need to be able to call [`webkitGetAsEntry`](https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItem/webkitGetAsEntry), a javascript method. That's not possible in standard Elm code, but the "event prototype hack" provides a work around (I can't find an early post of the technique, but it comes up from time to time on discussion groups. The example I worked from was https://ellie-app.com/pdfRqcWKp8Pa1. Thanks Martin Janiczek).

In this trick we modify the Javascript event prototype. Here's the code:

```js
// 1) create a new field in a 'drop' event
Object.defineProperty(Event.prototype, "fileTree", {
  configurable: false,
  enumerable: true,
  get() {
    this.preventDefault();
    if (this.type === "drop" && this.dataTransfer) {
      convertItems(this.dataTransfer.items).then((res) => {
        let detail = res.flat();
        // 2) create a new "fileTree" event
        let evt = new CustomEvent("fileTree", { detail });
        // this is the event, so this.target is the element with the drop event
        this.target.dispatchEvent(evt);
      });
    }
  },
});
```

There are several parts:

- We add a `"fileTree"` _field_ to the `"drop"` event.
- Our Elm code will attempt to decode this field, which causes the `get` method to run, and call `convertItems`, which returns a promise
- But `get` is returned to the calling (Elm) code immediately, which leaves Elm struggling to decode a promise. We cannot therefore get the data we want this way
- So the second trick is to use the first event to trigger a subsequent, Custom event with the data once the promise resolves. For simplicity (or perhaps not!) this event is _named_ `"fileTree"` too.

Here's the Elm code to work with these two events

```elm
view : Model -> Html Msg
view model =
    let
        dzAttrs_ =
            [ onDragOver DragLeave
            , onDragLeave DragOver
            , onDropRequestFileTree NoOp
            , onFileTree OnFiles
            ]
    in
    div (id "dz" :: class "drop-zone" :: dzAttrs_) [ text "Drop File or Directory Here" ]


{-| We attach a drop listener and request the `fileTree` field of the event.
This causes our custom code to run, which triggers the subsequent in a custom "fileTree" event
-}
onDropRequestFileTree : msg -> Attribute msg
onDropRequestFileTree noop =
    Events.preventDefaultOn "drop"
        (Decode.map (\_ -> ( noop, True )) (Decode.field "fileTree" <| Decode.fail "I just needed to trigger this"))


{-| This custom event contains the data we want
-}
onFileTree : (List ( String, File ) -> msg) -> Attribute msg
onFileTree msgCreator =
    Events.on "fileTree"
        (Decode.map msgCreator (Decode.field "detail" <| Decode.list decEntry))


decEntry : Decoder ( String, File )
decEntry =
    Decode.map2 Tuple.pair
        (Decode.field "path" Decode.string)
        (Decode.field "file" File.decoder)
```

Notice how we attach a `"drop"` event handler that accesses the `"fileTree"` field, but doesn't actually decode any data. That's enough to trigger the async Javacript code thus results in the subsequent `"fileTree"` event, which we do decode.

The full source code is at https://github.com/simonh1000/elm-drop-directory
