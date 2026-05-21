---
title: Single File Components (SFCs)
---

# Single File Components (SFCs)

On the majority of the lessons' playground for this platform (just as if you created a Vue app using [`create-vue`](https://vuejs.org/guide/quick-start#creating-a-vue-application) on your local machine) we are now working with _Single File Components_ (SFCs): you probably noticed that in this case we are greeted with an `App.vue` file as opposed to the `index.html` file we've been seeing up to this point.

These `*.vue` files are one of the characteristics that make Vue.js stand out. They allow us to encapsulate the template, logic, and styles that are related to each other in a single file while retaining sort of a logical unit (the component) separation in our codebases. It is one of the reasons I fell in love with the framework, because it "felt natural" to me. What do you think about this?

You have 3 main sections in a Vue SFC:

```file:/src/App.vue title="App.vue" showLineNumbers=false {"the logic":1-15} {"the structure":17-25} {"the styles":27-48}
-
```

The order of the tags is not important, but I liked the reasoning I heard from a Vue instructor once: _"the template is the part that relates to both logic and style, so I place it in between those two"_. And it stuck with me, so it is also the way I do it 🤓.

## Language Pre-processors

You can also specify language attributes for different sections to use different languages or preprocessors. Keen eyes will have already noticed we are using SASS (the SCSS syntax) in the styles section of our `App.vue` file, and TypeScript in the logic section. This is done by adding the `lang` attribute to the respective tags:

```vue showLineNumbers=false /lang="ts"/
<script lang="ts">
export default {
  // TypeScript code here
}
</script>
```

```vue showLineNumbers=false /lang="pug"/
<template lang="pug">
  div
    h1 Hello, World!
</template>
```

```vue showLineNumbers=false /lang="scss"/
<style lang="scss">
  /* SCSS styles here */
</style>
```

I point this out because we will be mostly leveraging TS in a few of the examples ahead. As for the other tags, we will be sticking to HTML and CSS, but you should be aware that in a real-world project [you can use them](https://vuejs.org/api/sfc-spec#pre-processors).

Since I want to keep things beginner friendly, I won't add lots of the details revolving SFCs, but you can check out the official docs where they describe them in more detail at these 2 places:

- [The official guide](https://vuejs.org/guide/scaling-up/sfc)
- [The official API docs](https://vuejs.org/api/sfc-spec)
