<template>
  <div class="gtd-registry-card mod-card">
    <h3 class="mod-card-title">Projects, Next Actions, Waiting For</h3>
    <div v-if="loading" class="mod-muted">Loading tasks...</div>
    <div v-else style="display: flex; gap: 1.5rem; width: 100%;">
      <div class="mod-card-section" style="flex: 1 1 0; min-width: 200px; max-width: 320px; display: flex; flex-direction: column;">
        <div style="display: flex; justify-content: space-between; align-items: center; font-weight: bold; margin-bottom: 0.5rem;">
          <span>Projects</span>
          <button class="mod-cta" @click="() => openModal('project')">+ New</button>
        </div>
        <div class="mod-scrollable" style="flex: 1 1 auto; overflow-y: auto; border-top: 1px solid var(--background-modifier-border); padding-top: 0.5rem; max-height: 350px;">
          <div v-for="item in projects" :key="item.id" class="mod-clickable" style="padding: 0.5rem 0.25rem; border-bottom: 1px solid var(--background-modifier-border); cursor: pointer;" @click="() => openModal('project', item)">
            {{ item.title }}
          </div>
        </div>
      </div>
      <div class="mod-card-section" style="flex: 1 1 0; min-width: 200px; max-width: 320px; display: flex; flex-direction: column;">
        <div style="display: flex; justify-content: space-between; align-items: center; font-weight: bold; margin-bottom: 0.5rem;">
          <span>Next Actions</span>
          <button class="mod-cta" @click="() => openModal('action')">+ New</button>
        </div>
        <div class="mod-scrollable" style="flex: 1 1 auto; overflow-y: auto; border-top: 1px solid var(--background-modifier-border); padding-top: 0.5rem; max-height: 350px;">
          <div v-for="item in actions" :key="item.id" class="mod-clickable" style="padding: 0.5rem 0.25rem; border-bottom: 1px solid var(--background-modifier-border); cursor: pointer;" @click="() => openModal('action', item)">
            {{ item.title }}
            <span v-if="item.waitingForWarning" class="gtd-warning" title="This task is #waiting-for but missing waitingOn field">&#9888;</span>
          </div>
        </div>
      </div>
      <div class="mod-card-section" style="flex: 1 1 0; min-width: 200px; max-width: 320px; display: flex; flex-direction: column;">
        <div style="display: flex; justify-content: space-between; align-items: center; font-weight: bold; margin-bottom: 0.5rem;">
          <span>Waiting For</span>
          <button class="mod-cta" @click="() => openModal('waiting')">+ New</button>
        </div>
        <div class="mod-scrollable" style="flex: 1 1 auto; overflow-y: auto; border-top: 1px solid var(--background-modifier-border); padding-top: 0.5rem; max-height: 350px;">
          <div v-for="item in waitingFor" :key="item.id" class="mod-clickable" style="padding: 0.5rem 0.25rem; border-bottom: 1px solid var(--background-modifier-border); cursor: pointer;" @click="() => openModal('waiting', item)">
            {{ item.title }}
          </div>
        </div>
      </div>
    </div>
    <div v-if="modalOpen" class="modal-bg">
      <div class="modal mod-settings">
        <h4>{{ modalEdit ? 'Edit' : 'Create' }} {{ modalTypeLabel }}</h4>
        <input v-model="modalTitle" class="input" placeholder="Title" />
        <div v-if="modalType === 'action' || modalType === 'waiting'">
          <label><input type="checkbox" v-model="modalWaitingFor" /> #waiting-for</label>
          <input v-if="modalWaitingFor" v-model="modalWaitingOn" class="input" placeholder="waitingOn (name)" />
          <input v-if="modalWaitingFor" v-model="modalSentAt" class="input" placeholder="sentAt (timestamp)" />
        </div>
        <div class="modal-button-container">
          <button class="mod-cta" @click="saveModal">Save</button>
          <button class="mod-warning" @click="closeModal">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const loading = ref(true);
const projects = ref<any[]>([]);
const actions = ref<any[]>([]);
const waitingFor = ref<any[]>([]);

// Modal state
const modalOpen = ref(false);
const modalType = ref('');
const modalTypeLabel = ref('');
const modalEdit = ref(false);
const modalItem = ref<any>(null);
const modalTitle = ref('');
const modalWaitingFor = ref(false);
const modalWaitingOn = ref('');
const modalSentAt = ref('');

function getPluginSettings() {
  return (window as any).gtdRegistrySettings || {
    registryType: 'List',
    taskLocationList: 'Projects',
    taskLocationDistributed: 'Projects',
    overwriteOnConversion: false,
    integrateOnConversion: false,
    skipConversionConfirm: false,
  };
}
function getVault() {
  return (window as any).gtdRegistryVault;
}
function getNoticeApi() {
  return (window as any).app?.internalPlugins?.plugins?.getPlugin('core-notes')?.instance?.notice || ((msg: string) => alert(msg));
}

function parseTasksFromMarkdown(content: string) {
  const lines = content.split(/\r?\n/);
  const tasks = [];
  for (const line of lines) {
    const match = line.match(/^\s*- \[.\] (.+)$/);
    if (match) {
      const raw = match[1];
      const title = raw.replace(/#\S+/g, '').replace(/\w+::[^\s]+/g, '').trim();
      const tags = (raw.match(/#\S+/g) || []).map(t => t.replace('#', ''));
      const waitingOn = (raw.match(/waitingOn::([^\s]+)/) || [])[1] || '';
      const sentAt = (raw.match(/sentAt::([^\s]+)/) || [])[1] || '';
      const isWaiting = tags.includes('waiting-for');
      tasks.push({
        title,
        tags,
        waitingOn,
        sentAt,
        isWaiting,
        waitingForWarning: isWaiting && !waitingOn,
        raw,
        id: Math.random().toString(36).slice(2),
        line,
      });
    }
  }
  return tasks;
}
function taskToMarkdown(task: any) {
  let line = `- [ ] ${task.title}`;
  if (task.isWaiting || task.tags?.includes('waiting-for') || modalWaitingFor.value) line += ' #waiting-for';
  if (task.waitingOn || modalWaitingOn.value) line += ` waitingOn::${task.waitingOn || modalWaitingOn.value}`;
  if (task.sentAt || modalSentAt.value) line += ` sentAt::${task.sentAt || modalSentAt.value}`;
  return line;
}

async function loadTasksListMode(folderPath: string) {
  const vault = getVault();
  const projectsFile = folderPath + '/Projects.md';
  const actionsFile = folderPath + '/Actions.md';
  const waitingFile = folderPath + '/Waiting For.md';
  try {
    const [projectsContent, actionsContent, waitingContent] = await Promise.all([
      vault.adapter.read(projectsFile).catch(() => ''),
      vault.adapter.read(actionsFile).catch(() => ''),
      vault.adapter.read(waitingFile).catch(() => ''),
    ]);
    projects.value = parseTasksFromMarkdown(projectsContent);
    actions.value = parseTasksFromMarkdown(actionsContent);
    waitingFor.value = parseTasksFromMarkdown(waitingContent);
  } catch (e) {
    getNoticeApi()('Error loading GTD registry files: ' + e.message);
  }
}

async function loadTasksDistributedMode(folderPath: string) {
  const vault = getVault();
  try {
    const folder = vault.getAbstractFileByPath(folderPath);
    if (!folder || folder.children === undefined) throw new Error('Folder not found');
    const projectFiles = folder.children.filter((f: any) => f.extension === 'md');
    const allProjects: any[] = [];
    const allActions: any[] = [];
    const allWaiting: any[] = [];
    for (const file of projectFiles) {
      const content = await vault.adapter.read(file.path).catch(() => '');
      const tasks = parseTasksFromMarkdown(content);
      allProjects.push({ title: file.basename, id: file.path });
      for (const task of tasks) {
        if (task.isWaiting) {
          allWaiting.push({ ...task, file: file.path });
        } else {
          allActions.push({ ...task, file: file.path });
        }
      }
    }
    projects.value = allProjects;
    actions.value = allActions;
    waitingFor.value = allWaiting;
  } catch (e) {
    getNoticeApi()('Error loading distributed GTD tasks: ' + e.message);
  }
}

async function reloadTasks() {
  loading.value = true;
  const settings = getPluginSettings();
  if (settings.registryType === 'List') {
    await loadTasksListMode(settings.taskLocationList);
  } else {
    await loadTasksDistributedMode(settings.taskLocationDistributed);
  }
  loading.value = false;
}

function openModal(type: string, item: any = null) {
  modalOpen.value = true;
  modalType.value = type;
  modalTypeLabel.value =
    type === 'project' ? 'Project' : type === 'action' ? 'Next Action' : 'Waiting For';
  modalEdit.value = !!item;
  modalItem.value = item;
  modalTitle.value = item?.title || '';
  modalWaitingFor.value = item?.isWaiting || false;
  modalWaitingOn.value = item?.waitingOn || '';
  modalSentAt.value = item?.sentAt || '';
}
function closeModal() {
  modalOpen.value = false;
  modalType.value = '';
  modalEdit.value = false;
  modalItem.value = null;
  modalTitle.value = '';
  modalWaitingFor.value = false;
  modalWaitingOn.value = '';
  modalSentAt.value = '';
}

async function saveModal() {
  const settings = getPluginSettings();
  const vault = getVault();
  let filePath = '';
  let newLine = '';
  let fileContent = '';
  let lines: string[] = [];
  try {
    if (settings.registryType === 'List') {
      if (modalType.value === 'project') filePath = settings.taskLocationList + '/Projects.md';
      if (modalType.value === 'action') filePath = settings.taskLocationList + '/Actions.md';
      if (modalType.value === 'waiting') filePath = settings.taskLocationList + '/Waiting For.md';
      fileContent = await vault.adapter.read(filePath).catch(() => '');
      lines = fileContent.split(/\r?\n/).filter(Boolean);
      newLine = taskToMarkdown({
        title: modalTitle.value,
        isWaiting: modalWaitingFor.value,
        waitingOn: modalWaitingOn.value,
        sentAt: modalSentAt.value,
      });
      if (modalEdit.value && modalItem.value) {
        // Edit: replace the line
        const idx = lines.findIndex(l => l === modalItem.value.line);
        if (idx !== -1) lines[idx] = newLine;
      } else {
        // Create: add new line
        lines.push(newLine);
      }
      await vault.adapter.write(filePath, lines.join('\n'));
    } else {
      // Distributed mode
      if (modalType.value === 'project') {
        // Create/edit a project file
        filePath = settings.taskLocationDistributed + '/' + modalTitle.value + '.md';
        if (!modalEdit.value) {
          await vault.adapter.write(filePath, '');
        } else if (modalItem.value && modalItem.value.id !== filePath) {
          // Rename file if project name changed
          await vault.adapter.rename(modalItem.value.id, filePath);
        }
      } else {
        // Action or waiting: add/edit in the correct project file
        filePath = modalItem.value?.file || settings.taskLocationDistributed + '/Misc.md';
        fileContent = await vault.adapter.read(filePath).catch(() => '');
        lines = fileContent.split(/\r?\n/).filter(Boolean);
        newLine = taskToMarkdown({
          title: modalTitle.value,
          isWaiting: modalWaitingFor.value,
          waitingOn: modalWaitingOn.value,
          sentAt: modalSentAt.value,
        });
        if (modalEdit.value && modalItem.value) {
          const idx = lines.findIndex(l => l === modalItem.value.line);
          if (idx !== -1) lines[idx] = newLine;
        } else {
          lines.push(newLine);
        }
        await vault.adapter.write(filePath, lines.join('\n'));
      }
    }
    getNoticeApi()('Task saved!');
    closeModal();
    await reloadTasks();
  } catch (e) {
    getNoticeApi()('Error saving task: ' + e.message);
  }
}

onMounted(reloadTasks);
</script>

<style scoped>
.gtd-warning {
  color: var(--color-orange);
  margin-left: 0.5em;
  font-size: 1.2em;
  vertical-align: middle;
}
.modal-bg {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-button-container {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}
</style>
