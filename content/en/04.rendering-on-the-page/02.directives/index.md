---
title: Directives
---

# Directives

One of the defining aspects of Vue is how it lets you write HTML and _sprinkle_ a little bit of special syntax on top of it to make it more powerful.

You'll see that even if this is **not** _"just JS"_, it is pretty easy to pick up and remember it because it is really straight forward.

Take this example:

```vue showLineNumbers=false
<div v-if="isUserLoggedIn">
    Hi, user!
</div>

<div v-else>
    Log in to see more.
</div>
```

I am willing to bet you can tell what this code does even if you have never seen it before.

The `v-` prefix is something you will find pretty often in Vue codebases. These attribute-like pieces are known as **directives**. Vue provides some built in ones to make our lives easier and to perform common tasks on the DOM.
