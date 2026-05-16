---
title: From a CDN
---

# From a CDN

As an alternative, we can point the `<script src=` to a :tooltip-trigger{id="cdn"}[CDN]. In this case, [unpkg](https://unpkg.com/)

Note that at this point we are letting the CDN give us the latest version, which depending on when you are reading this, might be different than the static file we used in the previous lesson.

```html file:/index.html title="index.html" /https://unpkg.com/vue@3/dist/vue.global.js/
```

::tooltip-content{id="cdn"}
A Content Delivery Network. Read more about them [here](https://www.cloudflare.com/learning/cdn/what-is-a-cdn/)
::
 