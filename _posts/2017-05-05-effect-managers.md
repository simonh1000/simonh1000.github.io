---
title: Elm Effect Managers - an introduction
layout: post
tags: Elm
---

It started with a casual remark from a colleague: "How about debouncing that?" I had a drop down menu that, on a single click needed to navigate to a new page and remove the dropdown, while a double click should make the menu item editable. The trouble was that the second clikc was never detected as Elm had already cleared away the menu. A quick look on packages.elm-lang.org led to 6 debouncing libraries (!), all based on storing `Msg`s in the model. But which Msg - this is multi page App - and where?

Not impossible, but I have my model in one file, which is imported throughout the app by the update/view files that also host my `Msg` definitions. Maybe factoring Msgs into separate files that can be widely imported is a good pattern - I can see some benefits - but it had not been necessary before in my larger projects. Was a major refactoring in order just to enable debouncing?

When I shared my concerns on [elm-discuss](https://groups.google.com/forum/#!searchin/elm-discuss/debouncing%7Csort:relevance/elm-discuss/6o3t6mnEQIw/pE-wEyJeDwAJ), I was interested to be suggested a debouncer based on effects managers, a mysterious, largely undocumented part of Elm.

At this stage, I should remind readers that

> An extremely tiny portion of library authors should ever write effect managers. Fundamentally, Elm needs maybe 10 of them total. ... Public discussions of your explorations should be framed accordingly. [Elm Platform](http://package.elm-lang.org/packages/elm-lang/core/5.1.1/Platform)

I'd looked at Effects Managers before and come away confused, but debouncing is a simple goal, and it turned out that it provides a simple, but non-trivial, example to learn from. This blog documents what I learnt modifying code from Matthew Conger-Eldeen, but does not promise to be comprehensive. I'm certainly open to the suggestion that debouncing can be solved in user-land, and that this is not one of the "10" valid uses of Effects Managers.

## The three parts of an Effects Manager (EM)

If the conventional role of Elm's `update` functions is to modify state and trigger IO effects, then an EM has two of them. The first - `onEffects` - handles Messages from user-land, while the other - `onSelfMsg` - handles messages from the runtime initiated by the EM itself. Both return tasks rather the Cmds used by user-land `update`.

The third part of any EM is the entry point for user-land. Let's start with that.

## 1) Calling the EM from user-land

The entry point exposed to user-land is `debounce`:

    debounce : String -> Float -> msg -> Cmd msg
    debounce key delay msgToReturn =
        Debounce key delay msgToReturn
            |> command

The type signature is simple enough: it takes a name used to distinguish between Msgs that user-land wants debounced, a delay, and the `Msg` to return (if not displaced by some subsequent call to `debounce`). The incoming information is temporarily carried by the Debounce type constructor, and the EM runtime will subsequently pass this to `OnEffects`. The interesting thing is that the entry function returns a user-land `Cmd msg` (nothing else would be appropriate within the Elm Architecture).

The construction of the `Cmd` is complex, and is - as can be seen - handled by a function `command`, which itself is defined in the definition of the module

    effect module Debounce where { command = MyCmd } exposing (debounce)

while `Debounce` is the type constructor of type `MyCmd`

    type MyCmd msg
        = Debounce String Float msg

`command` is a reserved term, but MyCmd is set by the EM author.

The need for a mechanism to return something usable in user-land is clear, but the syntax is confusing in that it lend two interpretations to `command`:

    * a Functor: `command = MyCmd` (building an EM also requires the author provide a `map` function, `cmdMap`)
    * a function: `command : MyCmd msg -> Cmd msg`

(I'm not yet sure whether these are equivalent definitions or not - leave a comment if you have a view).

## OnEffects

In any event, behind the scenes the EM is collecting together the requests from user-land and passes them to

    onEffects : Platform.Router msg Msg -> List (MyCmd msg) -> State msg -> Task Never (State msg)

This function handles the `List (MyCmd msg)`, updates the local state, and "[a]n effect manager has access to a “router” that routes messages between the main app and your individual effect manager." `onEffects` works primarily with `Task`s, so that composition is possible, and is required to return one.

In the case of debouncing, for each incoming debouncing request it is necessary to kill any previously started delayed command (the essence of debouncing), while starting the wait to return the new `Msg`. For this we use `Platform.sendToSelf` to trigger an effect that will result in a `Msg` being returned to the EM. Details of process Ids for the delayed messages are stored in the State along with the commands to execute.

## Handling messages back to the Effects Manager.

The Effects Manager can perform any standard Elm IO actions, and cause the results to be returned back to it. For that it has its own set of `Msg`s and these are handled by

    onSelfMsg : Platform.Router msg Msg -> Msg -> State msg -> Task Never (State msg)

in the case of debouncing, we have just one message

    type Msg
        = Execute String

`Execute` is the Msg used by a Task that has slept the requisite period to return the name of the user-land `Msg` to send back to the main app. The code uses `Platform.sendToApp` to call the `router` to send the message, and relies upon Process.spawn to fork that task and enable `onEffects` to return the updated state (minus the command now debounced) to the EM's runtime.
