---
title: About ESM
---

# About ESM

Just like [in the official docs](https://vuejs.org/guide/quick-start.html#using-the-es-module-build), we will be making use of the :tooltip-trigger{id="esm"}[ESM] flavor to get a hold of Vue.

Note that the `script` tag has now a `type=module`, so we can use the browser ready package.

```html file:/index.html title="index.html" /https://unpkg.com/vue@3/dist/vue.esm-browser.js/ /type="module"/ {"We are importing directly from the module now":7-11}
-
```

::tooltip-content{id="esm"}
EcmaScript Modules or JavaScript Modules. See more about them [here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
::
 