---
title: Impressions from Elm Europe 2017
layout: post
tags: Elm
---

<img src="/images/elmeuropelogo.png" alt="logo" class="half-page">So, hundreds of European Elmers meet in [Paris](https://elmeurope.org/) and what is the result? A lot of energy, confidence, much fun and - for me at least - ever more enthusiasm to get back to my Elm code as it prepares for production. There was a lot to be learned in the conference talks, and even more from the conversations in the sunny garden of the Parisian technical college hosting us.

Funnily enough the strengths and weaknesses of the conference echoed my impressions of the first Elm Conf (in the US, and thus only seen online) last Autumn. In other words, a barnstorming presentation from Richard Feldman; some hints at exciting new pistes for Elm together with some useful presentations of libraries. But we missed an update on the language itself, and it would have been good to have some technical presentations of production grade deployments.

The message from Evan's keynote - module boundaries should be guided by data structures - was instructive, but I had been hoping for something like his visionary [2015 Curry On](https://www.youtube.com/watch?v=oYk8CKH7OhE) talk. In the margins of the meeting, he was more than willing to describe the exciting new additions for release 0.19 (which sounded like it is not far off :-) ) and beyond. We learnt on day 2 - and almost by chance - that work is underway with the help of Google Summer of Code to research the foundations for an Elm equivalent to React Native, so it would have been exciting to hear more about what is aspired to here. And while the State of Elm 2017 survey was presented later in the day, it would have been interesting to see some of the metrics on the community's growth that can be derived from the various elm-lang.org websites and discussion fora.

The day 2 keynote from Richard Feldman was another energetic distillation of recent learnings from the world's largest Elm code base. At heart was a set of considerations for developers to balance out as their code base scales - don't fear long files, but do look for points in the view function, update function or model definition to break code up (and with the option of moving blocks to separate files and directories). Richard offered a clever, new idea of using extensible, rather than nested, records to simplify the cognitive load in update functions without the mess of nested updates (or [lenses](https://github.com/evancz/focus)).

![Richard Feldman](/images/elmeuropephoto.jpg)

The two most exciting other presentations were from Matthew Griffith, whose [Style Elements](http://package.elm-lang.org/packages/mdgriffith/style-elements/latest) library points towards a sort of type-safety for view layouts, and Tomek Wiszniewski's discussion of page architectures combining Elm with Web and React Components.

Tomek was the closest anyone got to discussing Elm's co-existence with its host runtime. With work on native support for Web APIs not the current priority, the relationship to Javascript deserved more attention at the conference. Perhaps the **biggest take away for me** was a shift of emphasis among prominent community members that I spoke to bilaterally from Javascript being the necessary, but ancillary, recipient of port messages, to the need for carefully crafted 'Javascript-as-a-service' packages as trustworthy external partners for your Elm code. Animations and Local Storage were identified as examples. Exciting ideas, but that will deserve some sort of accommodation within Elm's official channels which currently preclude Javascript (perhaps thought could be given to hosting such packages on the elm-community github pages?).

Three talks that I will certainly re-watch online (I presume the [raw streams](https://www.youtube.com/channel/UCT5HLUjjXdqUSUnpblFNOwQ0) are currently being edited) came from the library authors: Jakub Hampl, [elm-visualizations](http://package.elm-lang.org/packages/gampleman/elm-visualization/latest), Greg Ziegan, reorderable, and Martin Janiczek, fuzz testing messages. Do also take a look at the contributions from Sébastien Crème and Amitai Burstein who both delivered among the most entertaining talks of the event on convincing decision makers about Elm for production apps. Among the side projects, Mario Rogic's stood out, which was a pity given that he had the last slot of the event and some people had already needed to leave.

I'm looking forward to Elm Europe 2018 already!
