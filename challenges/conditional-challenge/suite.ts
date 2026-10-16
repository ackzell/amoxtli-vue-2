import { check, checks, expect } from 'harness'
import App from '../src/App.vue'

export default checks([
  check('uses-v-if', {
    run({ source }) {
      expect(source('src/App.vue')).toMatch(/v-if[\s=]/)
    },
  }),
  check('uses-v-else-if', {
    run({ source }) {
      expect(source('src/App.vue')).toMatch(/v-else-if[\s=]/)
    },
  }),
  check('uses-v-else', {
    run({ source }) {
      expect(source('src/App.vue')).toMatch(/v-else(?!-if)/)
    },
  }),
  check('renders-current-branch', {
    run({ mount }) {
      const wrapper = mount(App)
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.msg-new').exists()).toBe(false)
      expect(wrapper.find('.msg-mid').exists()).toBe(true)
      expect(wrapper.find('.msg-done').exists()).toBe(false)
    },
  }),
])
