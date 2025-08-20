<template>
  <div class="mod-card">
    <div v-if="loading" class="mod-muted">Loading tasks...</div>
    <div style="display: flex; flex-direction: row; gap: 1.5rem; width: 100%;">
      <div style="flex: 1 1 0; min-width: 0;">
        <ProjectsCard
          :items="projects"
          :onCreate="handleCreateProject"
          :onEdit="handleEditProject"
        />
      </div>
      <div style="flex: 1 1 0; min-width: 0;">
        <NextActionsCard
          :items="actions"
          :onCreate="handleCreateAction"
          :onEdit="handleEditAction"
        />
      </div>
      <div style="flex: 1 1 0; min-width: 0;">
        <WaitingForCard
          :items="waitingFor"
          :onCreate="handleCreateWaiting"
          :onEdit="handleEditWaiting"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import ProjectsCard from './ProjectsCard.vue';
import NextActionsCard from './NextActionsCard.vue';
import WaitingForCard from './WaitingForCard.vue';

interface TaskItem {
  title: string;
  tags: string[];
  waitingOn: string;
  sentAt: string;
  isWaiting: boolean;
  waitingForWarning: boolean;
  raw: string;
  id: string;
  line: string;
  file?: string;
  lineNumber: number; // Track exact line number in file
  originalContent: string; // Track original markdown content
}

const loading = ref(true);
const projects = ref<TaskItem[]>([]);
const actions = ref<TaskItem[]>([]);
const waitingFor = ref<TaskItem[]>([]);

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

function parseTasksFromMarkdown(content: string): TaskItem[] {
  const lines = content.split(/\r?\n/);
  const tasks: TaskItem[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
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
        lineNumber: i + 1, // Track exact line number (1-indexed)
        originalContent: line, // Track original content
      });
    }
  }
  return tasks;
}

function taskToMarkdown(task: TaskItem): string {
  let line = `- [ ] ${task.title}`;
  if (task.isWaiting || task.tags?.includes('waiting-for')) line += ' #waiting-for';
  if (task.waitingOn) line += ` waitingOn::${task.waitingOn}`;
  if (task.sentAt) line += ` sentAt::${task.sentAt}`;
  return line;
}

async function loadTasksListMode(folderPath: string) {
  const vault = getVault();
  const projectsFile = folderPath + '/Projects.md';
  const actionsFile = folderPath + '/Next Actions.md';
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
    const allProjects: TaskItem[] = [];
    const allActions: TaskItem[] = [];
    const allWaiting: TaskItem[] = [];
    for (const file of projectFiles) {
      const content = await vault.adapter.read(file.path).catch(() => '');
      const tasks = parseTasksFromMarkdown(content);
      allProjects.push({ 
        title: file.basename, 
        id: file.path, 
        tags: [], 
        waitingOn: '', 
        sentAt: '', 
        isWaiting: false, 
        waitingForWarning: false, 
        raw: '', 
        line: '', 
        file: file.path,
        lineNumber: 0,
        originalContent: ''
      });
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

// Function to detect external changes and update UI
async function checkForExternalChanges() {
  const settings = getPluginSettings();
  if (settings.registryType === 'List') {
    // Check if any of the list files have been modified externally
    const vault = getVault();
    const projectsFile = settings.taskLocationList + '/Projects.md';
    const actionsFile = settings.taskLocationList + '/Next Actions.md';
    const waitingFile = settings.taskLocationList + '/Waiting For.md';
    
    try {
      const [projectsContent, actionsContent, waitingContent] = await Promise.all([
        vault.adapter.read(projectsFile).catch(() => ''),
        vault.adapter.read(actionsFile).catch(() => ''),
        vault.adapter.read(waitingFile).catch(() => ''),
      ]);
      
      // Compare with current state to detect changes
      const currentProjectsContent = projects.value.map(p => p.originalContent).join('\n');
      const currentActionsContent = actions.value.map(a => a.originalContent).join('\n');
      const currentWaitingContent = waitingFor.value.map(w => w.originalContent).join('\n');
      
      if (projectsContent !== currentProjectsContent || 
          actionsContent !== currentActionsContent || 
          waitingContent !== currentWaitingContent) {
        // External changes detected, reload tasks
        await reloadTasks();
        getNoticeApi()('External changes detected and synced!');
      }
    } catch (e) {
      // Ignore errors during external change detection
    }
  }
}

// Project handlers
async function handleCreateProject(item: TaskItem) {
  try {
    const settings = getPluginSettings();
    const vault = getVault();
    if (settings.registryType === 'List') {
      const filePath = settings.taskLocationList + '/Projects.md';
      const content = await vault.adapter.read(filePath).catch(() => '');
      const lines = content.split(/\r?\n/).filter(Boolean);
      const newLine = `- [ ] ${item.title}`;
      lines.push(newLine);
      await vault.adapter.write(filePath, lines.join('\n'));
    } else {
      // Distributed mode - create new project file
      const filePath = settings.taskLocationDistributed + '/' + item.title + '.md';
      await vault.adapter.write(filePath, '');
    }
    getNoticeApi()('Project created!');
    await reloadTasks();
  } catch (e) {
    getNoticeApi()('Error creating project: ' + e.message);
  }
}

async function handleEditProject(id: string, newTitle: string) {
  try {
    const settings = getPluginSettings();
    const vault = getVault();
    if (settings.registryType === 'List') {
      const filePath = settings.taskLocationList + '/Projects.md';
      const content = await vault.adapter.read(filePath).catch(() => '');
      const lines = content.split(/\r?\n/);
      const project = projects.value.find(p => p.id === id);
      if (project && project.lineNumber > 0) {
        // Use exact line number for precise 1-to-1 linking
        const lineIndex = project.lineNumber - 1; // Convert to 0-indexed
        if (lineIndex >= 0 && lineIndex < lines.length) {
          // Preserve the original task structure, only update the title
          const originalLine = lines[lineIndex];
          // More robust regex to handle various task formats - only match the title part
          const newLine = originalLine.replace(/^(- \[.\] ).+?(?=\s+#\S+|\s+\w+::[^\s]+|$)/, `$1${newTitle}`);
          lines[lineIndex] = newLine;
          await vault.adapter.write(filePath, lines.join('\n'));
          
          // Update the local state to reflect the change
          project.title = newTitle;
          project.originalContent = newLine;
        }
      }
    } else {
      // Distributed mode - rename project file
      const project = projects.value.find(p => p.id === id);
      if (project && project.file) {
        const newPath = settings.taskLocationDistributed + '/' + newTitle + '.md';
        await vault.adapter.rename(project.file, newPath);
      }
    }
    getNoticeApi()('Project updated!');
    // Don't reload tasks here to maintain the 1-to-1 link
  } catch (e) {
    getNoticeApi()('Error updating project: ' + e.message);
  }
}

// Action handlers
async function handleCreateAction(item: TaskItem) {
  try {
    const settings = getPluginSettings();
    const vault = getVault();
    if (settings.registryType === 'List') {
      const filePath = settings.taskLocationList + '/Next Actions.md';
      const content = await vault.adapter.read(filePath).catch(() => '');
      const lines = content.split(/\r?\n/).filter(Boolean);
      const newLine = `- [ ] ${item.title}`;
      lines.push(newLine);
      await vault.adapter.write(filePath, lines.join('\n'));
    } else {
      // Distributed mode - add to Misc.md or first project
      const filePath = settings.taskLocationDistributed + '/Misc.md';
      const content = await vault.adapter.read(filePath).catch(() => '');
      const lines = content.split(/\r?\n/).filter(Boolean);
      const newLine = `- [ ] ${item.title}`;
      lines.push(newLine);
      await vault.adapter.write(filePath, lines.join('\n'));
    }
    getNoticeApi()('Action created!');
    await reloadTasks();
  } catch (e) {
    getNoticeApi()('Error creating action: ' + e.message);
  }
}

async function handleEditAction(id: string, newTitle: string) {
  try {
    const settings = getPluginSettings();
    const vault = getVault();
    if (settings.registryType === 'List') {
      const filePath = settings.taskLocationList + '/Next Actions.md';
      const content = await vault.adapter.read(filePath).catch(() => '');
      const lines = content.split(/\r?\n/);
      const action = actions.value.find(a => a.id === id);
      if (action && action.lineNumber > 0) {
        // Use exact line number for precise 1-to-1 linking
        const lineIndex = action.lineNumber - 1; // Convert to 0-indexed
        if (lineIndex >= 0 && lineIndex < lines.length) {
          // Preserve the original task structure, only update the title
          const originalLine = lines[lineIndex];
          // More robust regex to handle various task formats - only match the title part
          const newLine = originalLine.replace(/^(- \[.\] ).+?(?=\s+#\S+|\s+\w+::[^\s]+|$)/, `$1${newTitle}`);
          lines[lineIndex] = newLine;
          await vault.adapter.write(filePath, lines.join('\n'));
          
          // Update the local state to reflect the change
          action.title = newTitle;
          action.originalContent = newLine;
        }
      }
    } else {
      // Distributed mode - find and update in project file
      const action = actions.value.find(a => a.id === id);
      if (action && action.file) {
        const content = await vault.adapter.read(action.file).catch(() => '');
        const lines = content.split(/\r?\n/);
        if (action.lineNumber > 0) {
          const lineIndex = action.lineNumber - 1;
          if (lineIndex >= 0 && lineIndex < lines.length) {
            const originalLine = lines[lineIndex];
            const newLine = originalLine.replace(/^(- \[.\] ).+?(?=\s+#\S+|\s+\w+::[^\s]+|$)/, `$1${newTitle}`);
            lines[lineIndex] = newLine;
            await vault.adapter.write(action.file, lines.join('\n'));
            
            // Update the local state to reflect the change
            action.title = newTitle;
            action.originalContent = newLine;
          }
        }
      }
    }
    getNoticeApi()('Action updated!');
    // Don't reload tasks here to maintain the 1-to-1 link
  } catch (e) {
    getNoticeApi()('Error updating action: ' + e.message);
  }
}

// Waiting For handlers
async function handleCreateWaiting(item: TaskItem) {
  try {
    const settings = getPluginSettings();
    const vault = getVault();
    if (settings.registryType === 'List') {
      const filePath = settings.taskLocationList + '/Waiting For.md';
      const content = await vault.adapter.read(filePath).catch(() => '');
      const lines = content.split(/\r?\n/).filter(Boolean);
      const newLine = `- [ ] ${item.title} #waiting-for`;
      lines.push(newLine);
      await vault.adapter.write(filePath, lines.join('\n'));
    } else {
      // Distributed mode - add to Misc.md
      const filePath = settings.taskLocationDistributed + '/Misc.md';
      const content = await vault.adapter.read(filePath).catch(() => '');
      const lines = content.split(/\r?\n/).filter(Boolean);
      const newLine = `- [ ] ${item.title} #waiting-for`;
      lines.push(newLine);
      await vault.adapter.write(filePath, lines.join('\n'));
    }
    getNoticeApi()('Waiting For item created!');
    await reloadTasks();
  } catch (e) {
    getNoticeApi()('Error creating waiting for item: ' + e.message);
  }
}

async function handleEditWaiting(id: string, newTitle: string) {
  try {
    const settings = getPluginSettings();
    const vault = getVault();
    if (settings.registryType === 'List') {
      const filePath = settings.taskLocationList + '/Waiting For.md';
      const content = await vault.adapter.read(filePath).catch(() => '');
      const lines = content.split(/\r?\n/);
      const waiting = waitingFor.value.find(w => w.id === id);
      if (waiting && waiting.lineNumber > 0) {
        // Use exact line number for precise 1-to-1 linking
        const lineIndex = waiting.lineNumber - 1; // Convert to 0-indexed
        if (lineIndex >= 0 && lineIndex < lines.length) {
          // Preserve the original task structure, only update the title
          const originalLine = lines[lineIndex];
          // More robust regex to handle various task formats - only match the title part
          const newLine = originalLine.replace(/^(- \[.\] ).+?(?=\s+#\S+|\s+\w+::[^\s]+|$)/, `$1${newTitle}`);
          lines[lineIndex] = newLine;
          await vault.adapter.write(filePath, lines.join('\n'));
          
          // Update the local state to reflect the change
          waiting.title = newTitle;
          waiting.originalContent = newLine;
        }
      }
    } else {
      // Distributed mode - find and update in project file
      const waiting = waitingFor.value.find(w => w.id === id);
      if (waiting && waiting.file) {
        const content = await vault.adapter.read(waiting.file).catch(() => '');
        const lines = content.split(/\r?\n/);
        if (waiting.lineNumber > 0) {
          const lineIndex = waiting.lineNumber - 1;
          if (lineIndex >= 0 && lineIndex < lines.length) {
            const originalLine = lines[lineIndex];
            const newLine = originalLine.replace(/^(- \[.\] ).+?(?=\s+#\S+|\s+\w+::[^\s]+|$)/, `$1${newTitle}`);
            lines[lineIndex] = newLine;
            await vault.adapter.write(waiting.file, lines.join('\n'));
            
            // Update the local state to reflect the change
            waiting.title = newTitle;
            waiting.originalContent = newLine;
          }
        }
      }
    }
    getNoticeApi()('Waiting For item updated!');
    // Don't reload tasks here to maintain the 1-to-1 link
  } catch (e) {
    getNoticeApi()('Error updating waiting for item: ' + e.message);
  }
}

onMounted(() => {
  reloadTasks();
  // Set up periodic external change detection
  const intervalId = setInterval(checkForExternalChanges, 5000); // Check every 5 seconds
  
  // Clean up interval on component unmount
  onUnmounted(() => {
    clearInterval(intervalId);
  });
});
</script>

<style scoped>
</style>