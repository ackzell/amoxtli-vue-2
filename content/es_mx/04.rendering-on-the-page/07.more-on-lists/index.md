---
title: More on lists
ogImage: true
---

# More on lists

We'll go through a few more things regarding rendering lists. Pun kind of intended.

Imagine we now have the following basic structure for the messages in a chat app:

```js showLineNumbers=false
const chatMessages = [
  {
    id: 'b79b7c8c-f265-4e78-91f6-8d30ee05636c',
    message: 'Are you coming to the party?',
    sender: 'they',
    reactions: [],
  },
  {
    id: '6c84f6c1-dab1-4994-a95b-fd08dfd67817',
    message: 'No, sorry. I am learning Vue',
    sender: 'me',
    reactions: ['😯', '🤓', '👏'],
  },
  {
    id: 'a096ff10-6dc0-4793-83c1-7073cb2201e1',
    message: 'I\'ve heard that\'s also pretty fun!',
    sender: 'they',
    reactions: ['💚'],
  },
]
```

The message text should be pretty straightforward, right? But what about the _reactions_?

## Nested `v-for`

We can loop through the `chatMessages` array with a `v-for`. [We know that](/rendering-on-the-page/rendering-lists), but now that we also want the reactions rendered, we'll have to loop through those as well.

Check this out:

```file:/src/App.vue title="App.vue" collapse={1-27, 39-102} {"1. Loop through the messages":29} {"2. Loop through the reactions":32}
-
```

You can write them as nested loops (I don't know there's a limit on how many levels deep you can nest to be honest) and that the :tooltip-trigger{id="nested-scopes"}[_scope_ of the outer loop is still accessible to the inner one], just like in JS functions!

::tip
I sneaked in a little detail, hopefully you caught it: you can use `of` and `in` for the **delimiter** interchangeably.
::

## The `key` attribute

Up to this point, we have been adding the `key` attribute every time we use the `v-for` directive, and even though we haven't _really needed it_ so far, it is advisable to **always** provide it.

```file:/src/App.vue title="App.vue" collapse={1-30, 38-103} /:key="[^"]+"/
-
```

So for now, just keep in mind that you should always provide a `key` that is unique. It should also be a _primitive_ (string or number).

## Second alias `index`

One last thing before we move on to other topics: you probably also noticed the `index` in the inner loop, to which we bound the `key`. This is an alias that `v-for` supports in case you want to know what the current index while you are dealing with your iterables.

Making this syntax also valid:

```vue showLineNumbers=false /(item, idx)/
<some-tag v-for="(item, idx) in items" :key="..." />
```

It **can have any name** you want to give to it, just remember that it is the second alias that is available while looping through your data in a template. In this case I named it `idx`. Since that is a number, you could use it for the `key`, but that is not always the case.

::tooltip-content{id="nested-scopes"}
To render the reactions, we are looping over the `entry.reactions` array, Where `entry` is the variable defined in the outer `v-for` loop.
::
