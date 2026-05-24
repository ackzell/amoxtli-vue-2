<script setup lang="ts">
import type { Snapshot, SnapshotType } from '@/db'
import { useTimeAgoIntl } from '@vueuse/core'
import { Tooltip } from 'floating-vue'
import { motion } from 'motion-v'
import { CodeDiff } from 'v-code-diff'

interface YVTimelineEntryProps {
  snapshot: Snapshot
  disableAnimation?: boolean
}

interface TypeColorConfig {
  dot: string
  line: string
  text: string
}

const props = defineProps<YVTimelineEntryProps>()

const fm = useFileManagerStore()
const colorMode = useColorMode()
const playground = usePlaygroundStore()

const typeColors = computed((): TypeColorConfig => {
  const colorMap: Record<SnapshotType, TypeColorConfig> = {
    manual: {
      dot: 'bg-orange-600 outline-orange-600',
      line: 'before:bg-orange-600',
      text: 'text-orange-600',
    },
    periodic: {
      dot: 'bg-violet-700 outline-violet-700',
      line: 'before:bg-violet-700',
      text: 'text-violet-700',
    },
    auto: {
      dot: 'bg-sky-600 outline-sky-600',
      line: 'before:bg-sky-600',
      text: 'text-sky-600',
    },
  }

  return colorMap[props.snapshot.type as SnapshotType] || colorMap.manual
})

function getChangedFiles(
  current: Record<string, string>,
  snapshot: Record<string, string>,
): string[] {
  const allKeys = new Set([...Object.keys(current), ...Object.keys(snapshot)])
  return [...allKeys].filter(key => current[key] !== snapshot[key])
}

const changedFiles = computed(() => {
  const currentFiles = Object.fromEntries(
    Array.from(playground.files.entries()).map(([path, file]) => [path, file.read()]),
  )
  return getChangedFiles(currentFiles, props.snapshot.files)
})

const fileDiffs = computed(() =>
  changedFiles.value.map(path => ({
    path,
    oldString: props.snapshot.files[path] ?? '',
    newString: playground.files.get(path)?.read() ?? '',
  })),
)
</script>

<template>
  <motion.li
    :initial="{ opacity: 0, scale: 0 }"
    :animate="{ opacity: 1, scale: 1 }"
    :exit="{ opacity: 0, scale: 0 }"
    :transition="props.disableAnimation ? { duration: 0 } : { duration: 0.25, ease: 'easeOut' }"
    layout px-4 h-28
    class="group/snapshot hover-bg-bgr-100/40 dark:hover-bg-bgr-dark"
  >
    <div flex="~ items-center justify-between" mb-1>
      <div flex gap-0 items-center>
        <div
          mr-2 mt-0.5 rounded-full size-2.5
          un-transition="all duration-150 ease-in-out"
          outline="0 offset-0"
          class="group-hover/snapshot:outline-1 group-hover/snapshot:outline-offset-2"
          :class="[
            typeColors.dot,
            typeColors.line,
          ]"
        />
        <p text="xs font-sans" mr-2 :class="typeColors.text">
          {{ props.snapshot.type }}
        </p>

        <!-- <Menu v-if="didFilesChange" theme="diff-card" :arrow-overflow="true" arrow-padding="1rem">
          <p text="sm neutral-400 dark:neutral-500" cursor-pointer>
            {{
              calculateFileCount() === 1 ? `1 ${$t('file')}` : `${calculateFileCount()} ${$t('files')}`
            }}
          </p>

          <template #popper>
            <uiScrollArea class="w-full whitespace-nowrap">
              <div
                max-w-screen-lg bg-neutral-400 p-2 dark:bg-neutral-600
              >
                <CodeDiff
                  :key="`${props.snapshot.id}-${Date.now()}`"
                  max-height="20rem"
                  old-string="todo change this"
                  new-string="todo change this too"
                  output-format="side-by-side"
                  filename="Current"
                  new-filename="Snapshot"
                />
              </div>
              <uiScrollBar orientation="horizontal" />
            </uiScrollArea>
          </template>
        </Menu>
        <p v-else text="xs neutral-400 dark:neutral-500">
          {{ `(${$t('no-changes')})` }}
        </p> -->

        <UiPopover v-if="changedFiles.length > 0">
          <UiPopoverTrigger>
            <p text="sm neutral-400 dark:neutral-500" cursor-pointer>
              {{
                changedFiles.length === 1 ? `1 ${$t('file')}` : `${changedFiles.length} ${$t('files')}`
              }}
            </p>
          </UiPopoverTrigger>

          <UiPopoverContent class="code-diff-popper max-h-[400px]" w-screen max-w-screen-lg overflow-scroll>
            <!-- <div style="height: 900px" flex flex-col justify-between align-end>
              <div style="height: 20px" mb-2 w-full bg-red-900 />
              <p>meeeeeehhhh</p>
            </div> -->

            <CodeDiff
              v-for="file in fileDiffs"
              :key="file.path"
              :old-string="file.oldString"
              :new-string="file.newString"
              output-format="side-by-side"
              filename="Current"
              new-filename="Snapshot"
              max-height="20rem"
              :theme="colorMode.value"
            />
          </UiPopoverContent>
        </UiPopover>

        <p v-else text="xs neutral-400 dark:neutral-500">
          {{ `(${$t('no-changes')})` }}
        </p>
      </div>

      <Tooltip placement="bottom">
        <span
          inline-block cursor-pointer
          text="xs bgr-200 dark:bgr-600"
        >
          {{ useTimeAgoIntl(props.snapshot.createdAt) }}
        </span>

        <template #popper>
          <p text="xs">
            {{ new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(props.snapshot.createdAt) }}
          </p>
        </template>
      </Tooltip>
    </div>

    <div
      flex="~ col gap-6"

      class="before:w-px before:content-[''] before:origin-top before:scale-y-0 before:transition-transform before:duration-300 before:inset-y-0 before:absolute group-hover/snapshot:before:scale-y-100 before:-left-px"
      :class="typeColors.line"
      ml-1 pb-3 pl-5 border-l border-l-bgr-100 relative dark:border-l-bgr-600
    >
      <p text-xs class="text-bgr-400 dark:text-bgr-200/60">
        {{ props.snapshot.message }}
      </p>

      <div h-full>
        <div flex gap-4 h-full>
          <YvButton
            class="active:text-teal-900 hover:text-teal-600 active:bg-teal-400/50 hover:bg-teal-400/20"
            dark="hover:bg-teal-300/10 hover:text-teal-300 active:bg-teal-300/20 active:text-teal-500"
            icon-class="i-carbon:rotate group-hover:-rotate-40"
            @click="fm.restoreSnapshot(props.snapshot)"
          >
            {{ $t('restore') }}
          </YvButton>
          <UiPopover>
            <UiPopoverTrigger>
              <YvButton
                class="active:text-red-900 hover:text-red-800 active:bg-red-400/50 hover:bg-red-500/20"
                dark="bg-input/30 hover:bg-red-700/20 hover:text-red-400 active:bg-red-400/20 active:text-red-500"
                icon-class="i-carbon:trash-can"
                @click.shift.alt.prevent.stop="fm.deleteSnapshot(props.snapshot.id)"
              >
                {{ $t('delete') }}
              </YvButton>
            </UiPopoverTrigger>

            <UiPopoverContent w-auto>
              <YvButton
                class="bg-bgr-200/50 active:text-red-900 hover:text-red-800 active:bg-red-400/50 hover:bg-red-500/20"
                dark="bg-input/30 hover:bg-red-700/20 hover:text-red-400 active:bg-red-400/20 active:text-red-500"
                @click="fm.deleteSnapshot(props.snapshot.id)"
              >
                {{ $t('confirm') }}
              </YvButton>
            </UiPopoverContent>
          </UiPopover>
        </div>
      </div>
    </div>
  </motion.li>
</template>

<style>
.code-diff-popper {
  --r: 5px;
  --ah: 11px;
  --aw: 11px;
  border-radius: var(--r);
  pointer-events: auto;

  --uno: 'bg-bgr-50/10 dark:bg-bgr-200/10 backdrop-blur-[2px] p2 dark:text-bgr-300 border border-bgr-200';
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15)) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));

  margin-right: 1rem;
}

.dark .code-diff-popper {
  --uno: '';
}

.code-diff-view {
  margin: 0 !important;
}
</style>
