---
title: Starter Code Explained
---

# Starter Code Explained

Cool, let's now actually look into the starter code we've been using throughout this chapter.

All apps will start in the **Application Instance**, which is the return value of `createApp()`. There, we pass in a _root component_. This means it could have more components nested in a hierarchy referred to as a _component tree_.

```file:/index.html title="index.html" /createApp/ collapse={1-13}
-
```

Below is the code that makes up the component, which is the parameter we are passing to `createApp`

```js {"These are the component options, for now it is just the setup() method":2-8}
{
    setup() {
      const message = ref('Hola Vue!');
      return {
        version,
        message,
      };
    },
}
```

When the build step is involved, usually this is a component called `App.vue`. If you initialize an app via the CLI tool you'll get it in your project.

You can see here that we are using the newer syntax for Vue components: the :tooltip-trigger{id="api-styles"}[Composition API]

Pay attention to the `message` _reactive_ variable and try to figure out how it flows until it is rendered on the browser. I'll tell you below:

```html title="index.html" /message/ collapse={5-13} {"1. Create the variable":18} {"2. Return it from the setup function":20} {"3. Print it on the screen":2}
<div id="app">
  <p>{{ message }}</p>
</div>

<script type="importmap">
  {
    "imports": {
      "vue": "https://unpkg.com/vue@3/dist/vue.esm-browser.js"
    }
  }
</script>

<script type="module">
  import { createApp, ref, version } from 'vue'

  createApp({
    setup() {
      const message = ref('Hola Vue!')
      return {
        message,
      }
    },
  }).mount('#app')
</script>
```

> "But wait a second". "How does the `message` know what the value is inside the `<div>`?"

Great catch! This my friend is because we _mounted_ the app.

> "We what now?"

After `createApp()` gives us an instance, we take that returned value and call its `mount()` method (line `28`). We pass in a [_selector string_](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_selectors), in this case: `#app` (but we could also pass a DOM element). The div with the `id` of `app` is the container element, and now everything inside that DOM element will be considered the **component's template**.

```html title=index.html title="index.html" showLineNumbers collapse={5-13} {"Everything inside here is the root component's template":2} {".mount() receives a DOM element or a string selector":23} /mount/
<div id="app">
  <p>{{ message }}</p>
</div>

<script type="importmap">
  {
    "imports": {
      "vue": "https://unpkg.com/vue@3/dist/vue.esm-browser.js"
    }
  }
</script>

<script type="module">
  import { createApp, ref, version } from 'vue'

  createApp({
    setup() {
      const message = ref('Hola Vue!')
      return {
        message,
      }
    },
  }).mount('#app')
</script>
```

::tooltip-content{id="api-styles"}
We will cover this in more detail, for now you can check the [official docs here](https://vuejs.org/guide/introduction.html#api-styles).
::
 