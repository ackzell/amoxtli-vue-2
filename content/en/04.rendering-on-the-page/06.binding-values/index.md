---
title: Binding attribute values
ogImage: true
---

# Binding attribute values

We've been able to render text data on the page, and that is cool and all, but say that you now want to render a few of the albums from The Beatles discography on the page.

But this time, there is another requirement: we also want to have the cover images rendered out.

```js showLineNumbers=false /cover.+'/
const discography = [
  {
    id: '4590436b-1c7d-415e-a2fd-2e15eeee05d8',
    cover: 'PleasePleaseMe.png',
    name: 'Please Please Me',
    releaseDate: '22 March 1963',
  },
  {
    id: '1ddea1f3-c2d3-4b7e-a8d8-b5108a7239a4',
    cover: 'Help.png',
    name: 'Help!',
    releaseDate: '6 August 1965',
  },
  {
    id: 'e7d06694-e683-4670-a890-51c89bf2693b',
    cover: 'WhiteAlbum.jpg',
    name: 'White Album',
    releaseDate: '22 March 1963',
  },
  {
    id: '8f870109-34cd-47cc-b490-79a96713bf48',
    cover: 'SgtPeppers.jpg',
    name: 'Sgt. Pepper\'s Lonely Hearts Club Band',
    releaseDate: '26 May 1967',
  },
  {
    id: '61f39216-0c9e-41cd-9144-055206280c62',
    cover: 'MagicalMysteryTour.jpg',
    name: 'Magical Mystery Tour',
    releaseDate: '27 November 1967',
  },
]
```

An `<img>` tag takes a `src` attribute to determine what image to render, right? This means that we could somehow, tell our image tag where to get the file to render from.

The first instinct could be again, very likely to stache' the heck out of the attribute and see what happens:

```vue
<img src="{{ album.cover }}" />
```

👎 That didn't work! Check the console in `yehyecoa-vue` and see what happens when you do it like that. (Besides the fact that the images are not rendered at all in the preview)

# `v-bind`

This is the solution to the pickle we found ourselves into: we _bind_ the value of the attribute to whatever is held by `album.cover` with `v-bind`.

```file:/src/App.vue title="App.vue" collapse={1-60, 73-101} {"building a dynamic value for the src attr":64}
-
```

::tip
Note that if we were able to _build the string_ (`assets/${album.cover}`) for the `src` we can directly bind the value too.
::

# Shorthand `:`

All right, next thing to note is this: this is a rather popular directive that is used a ton in Vue code usually. So you have a more comfortable way to write it: `:`

```vue {"Shorthand syntax for v-bind":4}
<img
  class="good"

  :src="`assets/${album.cover}`"
  alt="Album cover"
/>
```

Cool, huh? I will stick to that syntax from now on. It is also usually the way you will find it in the wild.

Let's go back to the list rendering so I can explain a few other important things there.
