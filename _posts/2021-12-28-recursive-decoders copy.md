---
title: Recursive event handler decoders
layout: post
tags: Elm
---

Here's a technique for using a single event handler for a portion of the DOM, which uses an event's "dataset" to keep track of what was clicked. We use this in production code to render clickable, user-declared html.

And here is an example of the finished result:

<iframe src="https://ellie-app.com/embed/gfjb73v3ckQa1" style="width:100%; height:400px; border:0; overflow:hidden;" sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"></iframe>

## HTML Dataset

Each element of the DOM can be given `data` attributes

```html
<span data-my-meta="greek" style="width: 100px;">alpha</span>
```

which is produced in Elm using

```elm
span
    [ Html.Attributes.attribute "data-my-meta" "greek", style "width" "100px" ]
    [ text greek ]
```

Notice how there is no event handler on this DOM element. Nonetheless, when a click event occurs on this element, an event is created that bubbles up the DOM tree. Of interest here is that the `data` attribute(s) is added to this event object, and stored at the key `"dataset"`.

```js
{"myMeta": "greek"}
```

Note:

- kebab-case becomes camelCase in the process
- the dataset field is only attached when a `data` attribute exists on on DOM element

## HTML Click events

Browser click events are detected using event handlers. By default events "bubble" meaning that listeners higher in the DOM tree receive the click events of descendent elements. Such a click event has a payload with the following, recursive structure:

```json
{
    ...
    "target": {
        "id": ...,
        "class": ...,
        "dataset": {...},
        "parentNode": {
            "id": ...,
            "class": ...,
            "dataset": {...},
            "parentNode": {
                ...
            }
        }
    }
}
```

Notice how we have a series of nested `parentNode` objects. This recursion continues upto the top of the DOM, or until a `stopPropagation` event listener is encountered.

## Implementing in Elm

There are three parts to this technique

- annotating view code with `data` attributes - see above
- adding a parent event listener
- writing the recursive decoder that the listener uses

### Parent event listener

We attach a single parent listener at the root of the nodes we are interested in _together_ with an attribute that will tell our recursive decoder to stop. (Recall that `data-my-stop` will become `myStop` in the event object. Strictly speaking the stop attribute is not needed, but improves performace by stopping recursion at the earliest possible moment.)

```elm
 div [ Html.Attributes.attribute "data-my-stop" "stop" , parentEventHandler ]
```

Here's an example of the custom event listener.

```elm
parentEventHandler : Attribute Msg
parentEventHandler =
    let
        targetDecoder : Decoder (Dict String String)
        targetDecoder =
            Decode.field "target" (datasetDecoder Dict.empty)
    in
    Html.Events.stopPropagationOn "click" <|
        Decode.map (\dict -> ( OnClickParent dict, True )) targetDecoder
```

Here our event handler will stop further propagation (but that is not essential to this code). We decode the `target` field with a special `datasetDecoder`.

### Parent event decoder

This is the heart of the technique.

```elm
datasetDecoder : Dict String String -> Decoder (Dict String String)
datasetDecoder acc =
    let
        decDataset =
            Decode.oneOf
                [ Decode.field "dataset" (Decode.dict Decode.string)
                , Decode.succeed Dict.empty
                ]
    in
    decDataset
        |> Decode.andThen
            (\dataset ->
                if Dict.member "myStop" dataset then
                    -- we reached the listener => stop recursing
                    Decode.succeed acc

                else
                    -- merge the accumulator (with priority to information collected closer to the event source)
                    dataset
                        |> Dict.union acc
                        |> datasetDecoder
                        |> Decode.field "parentNode"
            )
```

This decoder will first be applied to the `target` field in the event object. It decodes the `dataset` field, and has a default for parts of the tree where no `data` attributes have been added. Then we look at what we have.

If we find the `stop` attribute that we added (alongside the parent listener,) we stop and return our accumulator.

Otherwise, we will add the dataset found at this level of the tree to our accumulator and recurse by decoding the `parentNode`. In the example, Dict.union ensures that when dataset keys occur at different levels in the DOM tree, we use the value closes to the click event.

Note that the data found above is NOT accessible using e.g. `Decode.value` - the the data in the event object is only manifested on specific demand, in the Elm case using `Decode.field`.
