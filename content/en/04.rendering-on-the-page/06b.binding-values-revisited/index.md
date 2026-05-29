---
title: Quick note
ogImage: true
---

# A note on binding values to attributes

Depending on the setup you have, a different output might occur when you try to use mustaches in attributes.

I specifically modified the environment so the previous lesson showed the original behavior that Vue had when I started learning it.

But now there is a more prominent error that you might find if you tried to do the same "use mustaches on the attributes". Which I guess is a better :tooltip-trigger{id='developer-experience'}[DX] given you KNOW for sure something is wrong with that. I figured you'd likely find both behaviors in the wild.

So, in the playground for this lesson you will see that this

```vue /src="[^"]+"/
  <img class="bad" src="{{assets/${helpAlbum.cover}}" alt="Album cover">
```

Now throws an error that won't let your app run. Something similar to:

```bash showLineNumbers=false

9:23:07 PM [vite] Internal server error: Failed to resolve import "{{assets/${helpAlbum.cover}}}" from "src/App.vue". Does the file exist?
  Plugin: vite:import-analysis
  File: /home/gqihe0qvkkdzfnah0h6udm3jh3nlo3-1tnf/src/App.vue:20:54
  27 |  }
  28 |  import { createElementVNode as _createElementVNode, createTextVNode as _createTextVNode, createCommentVNode as _creat...
  29 |  import _imports_0 from '{{assets/${helpAlbum.cover}}}'
     |                          ^
  30 |
  31 |
      at TransformPluginContext._formatLog (file:///home/gqihe0qvkkdzfnah0h6udm3jh3nlo3-1tnf/node_modules/.pnpm/vite@8.0.14/node_modules/vite/dist/node/chunks/node.js:30561:39)
      at TransformPluginContext.error (file:///home/gqihe0qvkkdzfnah0h6udm3jh3nlo3-1tnf/node_modules/.pnpm/vite@8.0.14/node_modules/vite/dist/node/chunks/node.js:30558:14)
      at normalizeUrl (file:///home/gqihe0qvkkdzfnah0h6udm3jh3nlo3-1tnf/node_modules/.pnpm/vite@8.0.14/node_modules/vite/dist/node/chunks/node.js:27801:18)
      at async eval (file:///home/gqihe0qvkkdzfnah0h6udm3jh3nlo3-1tnf/node_modules/.pnpm/vite@8.0.14/node_modules/vite/dist/node/chunks/node.js:27864:30)
      at async TransformPluginContext.transform (file:///home/gqihe0qvkkdzfnah0h6udm3jh3nlo3-1tnf/node_modules/.pnpm/vite@8.0.14/node_modules/vite/dist/node/chunks/node.js:27832:4)
      at async EnvironmentPluginContainer.transform (file:///home/gqihe0qvkkdzfnah0h6udm3jh3nlo3-1tnf/node_modules/.pnpm/vite@8.0.14/node_modules/vite/dist/node/chunks/node.js:30346:14)
      at async loadAndTransform (file:///home/gqihe0qvkkdzfnah0h6udm3jh3nlo3-1tnf/node_modules/.pnpm/vite@8.0.14/node_modules/vite/dist/node/chunks/node.js:24605:26)
      at async viteTransformMiddleware (file:///home/gqihe0qvkkdzfnah0h6udm3jh3nlo3-1tnf/node_modules/.pnpm/vite@8.0.14/node_modules/vite/dist/node/chunks/node.js:24399:20)

```

Of course you now how to fix it by now 😉

::tooltip-content{id='developer-experience'}
Developer Experience. Read more about it [here](https://about.gitlab.com/topics/devops/what-is-developer-experience/)
::
