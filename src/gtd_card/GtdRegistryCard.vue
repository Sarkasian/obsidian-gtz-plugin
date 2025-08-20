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
  filePath?: string; // Track the file path for the item
  
  // New relationship fields
  projectId?: string;        // For next actions
  nextActionId?: string;     // For waiting for items
  relationships?: string[];  // All inline field references
}

// Relationship database for managing connections between items
class RelationshipDatabase {
  private data = {
    projects: new Map<string, TaskItem>(),
    nextActions: new Map<string, TaskItem>(),
    waitingFor: new Map<string, TaskItem>(),
    
    // Relationship mappings
    projectToActions: new Map<string, string[]>(),      // projectId → actionIds[]
    actionToWaiting: new Map<string, string>(),        // actionId → waitingId
    waitingToAction: new Map<string, string>(),        // waitingId → actionId
  };

  // Load relationship data from Obsidian plugin storage
  async loadFromStorage() {
    try {
      const plugin = (window as any).gtdRegistryPlugin;
      if (plugin) {
        const stored = await plugin.loadData();
        if (stored && stored.relationshipDb) {
          this.deserialize(stored.relationshipDb);
        }
      }
    } catch (e) {
      console.warn('Failed to load relationship database:', e);
    }
  }

  // Save relationship data to Obsidian plugin storage
  async saveToStorage() {
    try {
      const plugin = (window as any).gtdRegistryPlugin;
      if (plugin) {
        const serialized = this.serialize();
        await plugin.saveData({ relationshipDb: serialized });
      }
    } catch (e) {
      console.warn('Failed to save relationship database:', e);
    }
  }

  // Serialize the database for storage
  private serialize() {
    return {
      projects: Array.from(this.data.projects.entries()),
      nextActions: Array.from(this.data.nextActions.entries()),
      waitingFor: Array.from(this.data.waitingFor.entries()),
      projectToActions: Array.from(this.data.projectToActions.entries()),
      actionToWaiting: Array.from(this.data.actionToWaiting.entries()),
      waitingToAction: Array.from(this.data.waitingToAction.entries()),
    };
  }

  // Deserialize the database from storage
  private deserialize(stored: any) {
    if (stored.projects) {
      this.data.projects = new Map(stored.projects);
    }
    if (stored.nextActions) {
      this.data.nextActions = new Map(stored.nextActions);
    }
    if (stored.waitingFor) {
      this.data.waitingFor = new Map(stored.waitingFor);
    }
    if (stored.projectToActions) {
      this.data.projectToActions = new Map(stored.projectToActions);
    }
    if (stored.actionToWaiting) {
      this.data.actionToWaiting = new Map(stored.actionToWaiting);
    }
    if (stored.waitingToAction) {
      this.data.waitingToAction = new Map(stored.waitingToAction);
    }
  }

  // Update the database with new items and relationships
  updateDatabase(projects: TaskItem[], actions: TaskItem[], waiting: TaskItem[]) {
    // Clear existing data
    this.data.projects.clear();
    this.data.nextActions.clear();
    this.data.waitingFor.clear();
    this.data.projectToActions.clear();
    this.data.actionToWaiting.clear();
    this.data.waitingToAction.clear();

    // Add projects
    projects.forEach(project => {
      this.data.projects.set(project.id, project);
    });

    // Add next actions and build relationships
    actions.forEach(action => {
      this.data.nextActions.set(action.id, action);
      
      // Extract project relationship
      if (action.projectId) {
        const projectActions = this.data.projectToActions.get(action.projectId) || [];
        projectActions.push(action.id);
        this.data.projectToActions.set(action.projectId, projectActions);
      }
    });

    // Add waiting for items and build relationships
    waiting.forEach(waitingItem => {
      this.data.waitingFor.set(waitingItem.id, waitingItem);
      
      // Extract next action relationship
      if (waitingItem.nextActionId) {
        this.data.actionToWaiting.set(waitingItem.nextActionId, waitingItem.id);
        this.data.waitingToAction.set(waitingItem.id, waitingItem.nextActionId);
      }
    });

    // Save to storage
    this.saveToStorage();
  }

  // Get all next actions for a specific project
  getActionsForProject(projectId: string): TaskItem[] {
    const actionIds = this.data.projectToActions.get(projectId) || [];
    return actionIds.map(id => this.data.nextActions.get(id)).filter(Boolean) as TaskItem[];
  }

  // Get the waiting for item that blocks a specific next action
  getWaitingForAction(actionId: string): TaskItem | undefined {
    const waitingId = this.data.actionToWaiting.get(actionId);
    return waitingId ? this.data.waitingFor.get(waitingId) : undefined;
  }

  // Get the next action that a waiting for item is blocking
  getActionForWaiting(waitingId: string): TaskItem | undefined {
    const actionId = this.data.waitingToAction.get(waitingId);
    return actionId ? this.data.nextActions.get(actionId) : undefined;
  }
}

const loading = ref(true);
const projects = ref<TaskItem[]>([]);
const actions = ref<TaskItem[]>([]);
const waitingFor = ref<TaskItem[]>([]);

// Create relationship database instance
const relationshipDB = new RelationshipDatabase();

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
      
      // Extract relationship information from inline fields
      const relationships: string[] = [];
      let projectId: string | undefined;
      let nextActionId: string | undefined;
      
      // Parse inline field relationships
      const inlineFieldMatches = raw.match(/\w+::[^\s]+/g) || [];
      inlineFieldMatches.forEach(field => {
        const [fieldType, fieldValue] = field.split('::');
        relationships.push(field);
        
        // Extract specific relationship types
        if (fieldType === 'project') {
          projectId = fieldValue;
        } else if (fieldType === 'action') {
          nextActionId = fieldValue;
        }
      });
      
      // Add tags to relationships array
      tags.forEach(tag => {
        relationships.push(`#${tag}`);
      });
      
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
        filePath: undefined, // No file path for initial parsing
        
        // New relationship fields
        projectId,
        nextActionId,
        relationships,
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
    
    // Update relationship database with new data
    relationshipDB.updateDatabase(projects.value, actions.value, waitingFor.value);
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
        originalContent: '',
        filePath: file.path,
        projectId: undefined,
        nextActionId: undefined,
        relationships: [],
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
    
    // Update relationship database with new data
    relationshipDB.updateDatabase(projects.value, actions.value, waitingFor.value);
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

// Reload a specific file and update the corresponding items
async function reloadSpecificFile(filePath: string, currentItems: TaskItem[], itemType: string) {
  const vault = getVault();
  try {
    const content = await vault.adapter.read(filePath).catch(() => '');
    const newItems = parseTasksFromMarkdown(content);
    
    // Clear existing items and replace with new ones
    currentItems.length = 0;
    currentItems.push(...newItems);
    
    // Update file paths for the new items
    newItems.forEach(item => {
      item.filePath = filePath;
    });
    
    // Update relationship database with new data
    relationshipDB.updateDatabase(projects.value, actions.value, waitingFor.value);
    
  } catch (e) {
    console.error(`Error reloading ${itemType} file:`, e);
  }
}

// Handle file change events from the main plugin
function handleFileChange(event: CustomEvent) {
  const { type, filePath } = event.detail;
  
  // Determine which list this file belongs to
  const settings = getPluginSettings();
  let targetList: any = null;
  let itemType = '';
  
  if (settings.registryType === 'List') {
    if (filePath.endsWith('/Projects.md')) {
      targetList = projects.value;
      itemType = 'project';
    } else if (filePath.endsWith('/Next Actions.md')) {
      targetList = actions.value;
      itemType = 'action';
    } else if (filePath.endsWith('/Waiting For.md')) {
      targetList = waitingFor.value;
      itemType = 'waiting';
    }
  } else {
    // Distributed mode - need to determine which list based on content
    // For now, reload all lists to be safe
    reloadTasks();
    return;
  }
  
  if (targetList && itemType) {
    // Reload the specific file that changed
    reloadSpecificFile(filePath, targetList, itemType);
    getNoticeApi()(`${itemType} file updated and synced!`);
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

onMounted(async () => {
  // Load relationship database from storage first
  await relationshipDB.loadFromStorage();
  
  // Then load tasks (which will update the database with current data)
  reloadTasks();
  
  // Listen for file change events from the main plugin
  document.addEventListener('gtd-file-change', handleFileChange as EventListener);
  
  // Clean up event listener on component unmount
  onUnmounted(() => {
    document.removeEventListener('gtd-file-change', handleFileChange as EventListener);
  });
});
</script>

<style scoped>
</style>