<script setup lang="ts">
import { AnimatePresence, LayoutGroup, motion } from 'motion-v'

const ui = useUiState()
const fm = useFileManagerStore()
const computedList = computed(() => fm.snapshotsList)

const { list, containerProps, wrapperProps } = useVirtualList(computedList, {
  itemHeight: 112,
})

const isScrolling = ref(false)
let scrollTimeout: number

function handleScroll() {
  isScrolling.value = true
  clearTimeout(scrollTimeout)
  scrollTimeout = window.setTimeout(() => {
    isScrolling.value = false
  }, 100)
}
</script>

<template>
  <div class="sidebar-container">
    <div class="main-content">
      <slot />
    </div>

    <motion.div
      :animate="{ width: ui.isSnapshotSidebarOpen ? '350px' : '0px' }"
      :transition="{ duration: 0.3, ease: 'easeInOut' }"
      bg="light-100 dark:dark-900"
      border="l bgr-100 dark:bgr-700"
      class="sidebar-drawer"
    >
      <AnimatePresence>
        <motion.div
          v-if="ui.isSnapshotSidebarOpen"
          :initial="{ opacity: 0, x: 30 }"
          :animate="{ opacity: 1, x: 0 }"
          :exit="{ opacity: 0, x: 30 }"
          :transition="{ duration: 0.25, delay: 0.15, ease: 'easeOut' }"
          class="drawer-inner"
        >
          <!-- <div bg-background p-4 shadow-md dark="shadow-black bg-dark-900">
            <YvSessionSelector />
          </div> -->

          <div class="sidebar-content">
            <div
              v-if="!fm.snapshotsList.length"
              class="dark:bg-accent/10 bg-accent/40 text-sm text-bgr-200 dark:text-bgr-600"
              flex="~ grow-1 items-center justify-center"
            >
              {{ $t('no-snapshots-saved-in-this-session') }}
            </div>

            <div
              v-else
              v-bind="containerProps"
              overflow-auto pt-4
              class="sidebar-scroll-container"
              @scroll="handleScroll"
            >
              <ClientOnly>
                <ul v-bind="wrapperProps" mb-8>
                  <LayoutGroup>
                    <AnimatePresence mode="popLayout">
                      <YvSnapshot
                        v-for="({ data: snapshot }) in list"
                        :key="snapshot.id"
                        :snapshot="snapshot"
                        :disable-animation="isScrolling"
                      />
                    </AnimatePresence>
                  </LayoutGroup>
                </ul>
              </ClientOnly>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  </div>
</template>

<style>
.sidebar-container {
  display: grid;
  grid-template-columns: 1fr auto;
  height: 100%; /* fill the 1fr row */
  min-height: 0; /* allow shrinking inside the grid row */
  overflow: hidden;
}

.main-content {
  display: grid;
  grid-template-rows: min-content 1fr; /* ← key fix */
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.sidebar-drawer {
  overflow: hidden;
  width: 0;
  min-height: 0;
  transition: width 0.3s ease-in-out;
  box-shadow: 3px 0px 5px 4px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.sidebar-drawer.is-open {
  width: 350px;
}

.drawer-inner {
  width: 350px;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.sidebar-content {
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
}

.sidebar-scroll-container {
  flex: 1 1 0;
  min-height: 0;
  overflow: auto;
  scrollbar-gutter: stable;
}
</style>
