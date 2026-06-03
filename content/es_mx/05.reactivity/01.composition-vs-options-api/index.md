---
title: Composition vs Options API
ogImage: true
---

# Composition vs Options API

::info
I'll be honest: I can't fit everything there is to be covered about the differences in philosophy, pros and cons for each one in just one quick lesson here. But also, there are way more intelligent people who worked on the official docs that put it very well in a [dedicated section](https://vuejs.org/guide/extras/composition-api-faq.html). I encourage you to give it a read and you'll have all the context you need regarding this subject.

Having said that, I'll do my best to give you a perspective on their differences and justify my choice of using Composition API for the rest of the materials in Amoxtli Vue.
::

Vue has a couple ways for authoring your code: the "original flavor" and the "new approach".

To be honest, that original flavor is one of the reasons I liked Vue when I started learning how to use it. It's orderly, descriptive and overall just made sense to me.

# Options API example

Here is a little breakdown of the code we have in the playground right now when the Options API is used:

::magic-move{lang="vue" }

```vue title="We start from an object"
<script>
export default {
}
</script>
```

```vue title="We add properties to it"
<script>
export default {
  data() { // all properties are reactive by default, even if we don't need them to be
    return {
      msg: 'Hola Options API!',
      greetedCount: 0,
    }
  }
}
</script>
```

```vue title="We can derive some computed state"
<script>
export default {
  data() { // all properties are reactive by default, even if we don't need them to be
    return {
      msg: 'Hola Options API!',
      greetedCount: 0, // we start using the prop now as `this.greetedCount`
    }
  },
  computed: {
    timesGreeted() {
      const isPlural = this.greetedCount > 1
      const times = isPlural ? 'times' : 'time'

      return this.greetedCount > 0
        ? `I've greeted you ${this.greetedCount} ${times}`
        : 'I have not greeted you yet.'
    },
  },
}
</script>
```

```vue title="And then some behaviors too"
<script>
export default {
  data() { // all properties are reactive by default, even if we don't need them to be
    return {
      msg: 'Hola Options API!',
      greetedCount: 0, // but note how it is never used in the template
    }
  },
  computed: {
    timesGreeted() {
      const isPlural = this.greetedCount > 1
      const times = isPlural ? 'times' : 'time'

      return this.greetedCount > 0
        ? `I've greeted you ${this.greetedCount} ${times}`
        : 'I have not greeted you yet.'
    },
  },
  methods: {
    greetMe() {
      console.log(`Hello there!`)
      this.greetedCount++
    },
    reset() {
      this.greetedCount = 0
    },
  },
}
</script>
```

::

As I mentioned, everything is in its place, neatly grouped and there is a very specific pattern you will find in a codebase with this kind of syntax. You would find this to be true:

> "I can find **what** any component **does** in the `methods` key. _Always._"

And so on for the rest of the "parts" that make up your component. It gives you structure!

I would highlight one particular aspect of it which I think expresses well the flow of data in your components using **Options API**. You can see that we refer to the `greetedCount` by prepending a `this.` to it. even This can feel a little bit magic if you are used to writing JS, but otherwise makes it really straightforward.

As long as you access to the component instance (`this`) in your component code, you will be able to read (and potentially write) to that piece of data. Your methods are accessible this way as presented in the example too.

Everything in the data is reactive, including `msg` even if we don't really need it to be reactive.

## Composition API example

Let's see what this same app looks like when authored with the newer approach: <ButtonShowSolution />

::magic-move{lang="vue" }

```vue title="Let's start with a function. These are called 'composables'"
<script setup>
import { computed, ref } from 'vue'

function useGreeter() {
  // a reactive property, but internal to this function only
  // we are not using it on the template
  const greetedCount = ref(0)

  // still derived, computed state
  const timesGreeted = computed(() => {
    const isPlural = greetedCount.value > 1
    const times = isPlural ? 'times' : 'time'

    return greetedCount.value > 0
      ? `I've greeted you ${greetedCount.value} ${times}`
      : 'I have not greeted you yet.'
  })

  // the methods are now functions
  function greetMe() {
    console.log(`Hello there!`)
    greetedCount.value++
  }

  function reset() {
    greetedCount.value = 0
  }

  // we expose the specific parts of the composable we mean to be "public"
  return {
    greetMe,
    reset,
    timesGreeted,
  }
}
</script>
```

```vue title="We start adding the props now"
<script setup>
import { computed, ref } from 'vue'

// it will only be used once in the template and never change
// so it doesn't need to be reactive
const msg = 'Hola Composition API!'

function useGreeter() {
  const greetedCount = ref(0)

  const timesGreeted = computed(() => {
    const isPlural = greetedCount.value > 1
    const times = isPlural ? 'times' : 'time'

    return greetedCount.value > 0
      ? `I've greeted you ${greetedCount.value} ${times}`
      : 'I have not greeted you yet.'
  })

  function greetMe() {
    console.log(`Hello there!`)
    greetedCount.value++
  }

  function reset() {
    greetedCount.value = 0
  }

  // NOTE: We expose what the component will leverage from here
  return {
    greetMe,
    reset,
    timesGreeted,
  }
}
</script>
```

```vue title="And get a hold of the composable's exposed properties and behaviors"
<script setup>
import { computed, ref } from 'vue'

// this is not reactive, but we don't need it to be
const msg = 'Hola Composition API!'

// destructuring the result with the exposed props / behaviors from the composable
const { greetMe, reset, timesGreeted } = useGreeter()

function useGreeter() {
  const greetedCount = ref(0)

  const timesGreeted = computed(() => {
    const isPlural = greetedCount.value > 1
    const times = isPlural ? 'times' : 'time'

    return greetedCount.value > 0
      ? `I've greeted you ${greetedCount.value} ${times}`
      : 'I have not greeted you yet.'
  })

  function greetMe() {
    console.log(`Hello there!`)
    greetedCount.value++
  }

  function reset() {
    greetedCount.value = 0
  }

  // NOTE: We expose what the component will leverage from here
  return {
    greetMe,
    reset,
    timesGreeted,
  }
}
</script>
```

::

This time we encapsulate the logic that will hold all the pieces that make up _the logic that greets_ in this app into its own unit of code: a `useGreeter` **composable function**.

Now you can see some obvious differences, and some less obvious ones, but the purpose is really that you can get a "feel" for how different / similar these two APIs can be.

One difference is the way we treat the `greetedCount`. For starters, it isn't really exposed to the app component directly, as it lives only within the `useGreeter` function and its purpose is to help "calculate" the actual value we care about: the `timesGreeted` string (There is also a `.value` involved now that I will explain shortly).

Did you catch the `msg` difference? Since we didn't explicitly make it reactive, it won't be!

::tip

Feel free to examine the differences carefully and take your time with the two APIs on the playground. <ButtonShowSolution />

::

## We'll use Composition API in Amoxtli Vue

Allow me to try and justify now the use of the Composition API throughout the contents of Amoxtli Vue from this point onward.

- I really need to pick one because I simply don't have the bandwidth to write the examples / explainers in both APIs like the official docs do.
- The official docs already give you the exact experience I just described.
- There is a very subtle (but IMO, very real) push from the Vue community to make use of the Composition API over the alternative. Some libraries simply do not support both and only provide APIs that are composables.
- I think the flexibility that the Composition API gives you is actually a good thing: it allows you to author your code in your own style and find the patterns that work for you (and your team).

## Bonus material

Here is a clip from a podcast called DejaVue where Evan You (the creator of Vue) explains differences between the 2 approaches.
::YouTubePlayer{videoId="-oMCloHM09U" title="Evan You: Options API vs Composition API" duration="1 min"}
Evan You explains in DejaVue episode 15 what the mental model difference between the Options API and the Composition API is.
::

Here is a video that summarizes well the whole subject. [Alex Lichter](https://www.lichter.io/) is one of the most prominent voices in the ecosystem these days.

::YouTubePlayer{videoId="7sBev_SxWGI" title="Composition API vs. Options API - One API to Rule Them All?!" duration="27 min"}
Alexander Lichter discusses his findings when asking the community about their preferences.

Talks about a possible future and gives his opinion on the subject.
::
 