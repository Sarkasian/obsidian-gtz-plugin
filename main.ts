import { Plugin, ItemView, WorkspaceLeaf } from 'obsidian';
import { createApp, h } from 'vue';
import App from './src/App.vue';
import { Notice, Modal, TFolder, TFile } from 'obsidian';

const HOMEPAGE_VIEW_TYPE = 'gtd-homepage-view';

export interface GtdRegistrySettings {
    registryType: 'List' | 'Distributed';
    taskLocationList: string;
    taskLocationDistributed: string;
    overwriteOnConversion: boolean;
    integrateOnConversion: boolean;
    skipConversionConfirm: boolean;
}

export const DEFAULT_SETTINGS: GtdRegistrySettings = {
    registryType: 'List',
    taskLocationList: 'Projects',
    taskLocationDistributed: 'Projects',
    overwriteOnConversion: false,
    integrateOnConversion: false,
    skipConversionConfirm: false,
};

import { PluginSettingTab, Setting } from 'obsidian';

class GtdRegistrySettingTab extends PluginSettingTab {
    plugin: MyPlugin;
    constructor(app: any, plugin: MyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'GTD Registry Settings' });
        new Setting(containerEl)
            .setName('Task Registry')
            .setDesc('Choose how tasks are stored: List or Distributed')
            .addDropdown(drop => drop
                .addOption('List', 'List')
                .addOption('Distributed', 'Distributed')
                .setValue(this.plugin.settings.registryType)
                .onChange(async (value) => {
                    this.plugin.settings.registryType = value as any;
                    await this.plugin.saveSettings();
                })
            );
        new Setting(containerEl)
            .setName('Task Location (List)')
            .setDesc('Path to folder for List mode')
            .addText(text => text
                .setPlaceholder('Projects')
                .setValue(this.plugin.settings.taskLocationList)
                .onChange(async (value) => {
                    this.plugin.settings.taskLocationList = value;
                    await this.plugin.saveSettings();
                })
            );
        new Setting(containerEl)
            .setName('Task Location (Distributed)')
            .setDesc('Path to folder for Distributed mode')
            .addText(text => text
                .setPlaceholder('Projects')
                .setValue(this.plugin.settings.taskLocationDistributed)
                .onChange(async (value) => {
                    this.plugin.settings.taskLocationDistributed = value;
                    await this.plugin.saveSettings();
                })
            );
        new Setting(containerEl)
            .setName('Overwrite On Registry Conversion')
            .setDesc('If true, overwrite files/folders on conversion')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.overwriteOnConversion)
                .onChange(async (value) => {
                    this.plugin.settings.overwriteOnConversion = value;
                    await this.plugin.saveSettings();
                })
            );
        new Setting(containerEl)
            .setName('Integrate On Registry Conversion')
            .setDesc('If true, integrate files/folders on conversion')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.integrateOnConversion)
                .onChange(async (value) => {
                    this.plugin.settings.integrateOnConversion = value;
                    await this.plugin.saveSettings();
                })
            );
        new Setting(containerEl)
            .setName('Skip Conversion Confirmation')
            .setDesc('If true, do not show conversion confirmation popup')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.skipConversionConfirm)
                .onChange(async (value) => {
                    this.plugin.settings.skipConversionConfirm = value;
                    await this.plugin.saveSettings();
                })
            );
    }
}

class HomepageView extends ItemView {
    vueApp: any;
    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType() {
        return HOMEPAGE_VIEW_TYPE;
    }

    getDisplayText() {
        return 'GTD/Zettelkasten Homepage';
    }

    async onOpen() {
        this.vueApp = createApp({
            render() {
                return h(App);
            }
        });
        this.vueApp.mount(this.contentEl);
    }

    async onClose() {
        if (this.vueApp) {
            this.vueApp.unmount();
            this.vueApp = null;
        }
        this.contentEl.empty();
    }
}

export default class MyPlugin extends Plugin {
    settings: GtdRegistrySettings;
    lastBackup: any = null;
    lastConversionType: string | null = null;
    lastConversionChanged: boolean = false;

    async onload() {
        this.registerView(
            HOMEPAGE_VIEW_TYPE,
            (leaf) => new HomepageView(leaf)
        );

        this.addRibbonIcon('home', 'Open GTD/Zettelkasten Homepage', async () => {
            await this.activateHomepageView();
        });

        this.addCommand({
            id: 'open-gtd-homepage',
            name: 'Open GTD/Zettelkasten Homepage',
            callback: () => this.activateHomepageView(),
        });

        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        this.addSettingTab(new GtdRegistrySettingTab(this.app, this));
        (window as any).gtdRegistryPlugin = this;
        (window as any).gtdRegistrySettings = this.settings;
        (window as any).gtdRegistryApp = this.app;
        (window as any).gtdRegistryVault = this.app.vault;

        // Watch for registry type changes
        const origSaveSettings = this.saveSettings.bind(this);
        this.saveSettings = async () => {
            const prevType = this.settings.registryType;
            await origSaveSettings();
            if (this.settings.registryType !== prevType) {
                await this.handleRegistryConversion(prevType, this.settings.registryType);
            }
            (window as any).gtdRegistrySettings = this.settings;
        };
        (window as any).gtdRegistryUndoConversion = this.undoConversion.bind(this);
    }

    async saveSettings() {
        await this.saveData(this.settings);
        (window as any).gtdRegistrySettings = this.settings;
    }

    async activateHomepageView() {
        const leaves = this.app.workspace.getLeavesOfType(HOMEPAGE_VIEW_TYPE);
        if (leaves.length > 0) {
            this.app.workspace.revealLeaf(leaves[0]);
        } else {
            const mainLeaf = this.app.workspace.getLeaf(false);
            if (mainLeaf) {
                await mainLeaf.setViewState({
                    type: HOMEPAGE_VIEW_TYPE,
                    active: true,
                });
            }
        }
    }

    async handleRegistryConversion(fromType: string, toType: string) {
        if (!this.settings.skipConversionConfirm) {
            const confirmed = await this.showConversionConfirm();
            if (!confirmed) return;
        }
        try {
            await this.backupCurrentState(fromType);
            if (fromType === 'List' && toType === 'Distributed') {
                await this.convertListToDistributed();
            } else if (fromType === 'Distributed' && toType === 'List') {
                await this.convertDistributedToList();
            }
            new Notice('Registry conversion complete.');
            this.lastConversionType = `${fromType}->${toType}`;
            this.lastConversionChanged = false;
        } catch (e) {
            new Notice('Error during registry conversion: ' + e.message);
        }
    }

    async showConversionConfirm(): Promise<boolean> {
        return new Promise((resolve) => {
            const modal = new Modal(this.app);
            let skip = false;
            modal.contentEl.createEl('h3', { text: 'Confirm Registry Conversion' });
            modal.contentEl.createEl('p', { text: 'Are you sure you want to convert the registry? This may overwrite or move files.' });
            const skipBox = modal.contentEl.createEl('input', { type: 'checkbox' });
            skipBox.onchange = () => { skip = skipBox.checked; };
            modal.contentEl.createEl('label', { text: ' Don\'t show this again' });
            const btns = modal.contentEl.createDiv({ cls: 'modal-button-row' });
            const okBtn = btns.createEl('button', { text: 'OK' });
            const cancelBtn = btns.createEl('button', { text: 'Cancel' });
            okBtn.onclick = () => { this.settings.skipConversionConfirm = skip; modal.close(); resolve(true); };
            cancelBtn.onclick = () => { modal.close(); resolve(false); };
            modal.open();
        });
    }

    async backupCurrentState(type: string) {
        // Save a backup of the current registry files/folders
        const vault = this.app.vault;
        if (type === 'List') {
            const folder = this.settings.taskLocationList;
            const files = ['Projects.md', 'Actions.md', 'Waiting For.md'].map(f => `${folder}/${f}`);
            this.lastBackup = {};
            for (const file of files) {
                this.lastBackup[file] = await vault.adapter.read(file).catch(() => '');
            }
        } else {
            const folder = this.settings.taskLocationDistributed;
            const folderObj = vault.getAbstractFileByPath(folder);
            this.lastBackup = {};
            if (folderObj && folderObj instanceof TFolder) {
                for (const file of folderObj.children) {
                    if (file instanceof TFile && file.extension === 'md') {
                        this.lastBackup[file.path] = await vault.adapter.read(file.path).catch(() => '');
                    }
                }
            }
        }
    }

    async undoConversion() {
        if (!this.lastBackup) {
            new Notice('No backup available to undo.');
            return;
        }
        if (this.lastConversionChanged) {
            const confirmed = await this.showUndoWarning();
            if (!confirmed) return;
        }
        const vault = this.app.vault;
        for (const file in this.lastBackup) {
            await vault.adapter.write(file, this.lastBackup[file]);
        }
        new Notice('Registry conversion undone.');
    }

    async showUndoWarning(): Promise<boolean> {
        return new Promise((resolve) => {
            const modal = new Modal(this.app);
            modal.contentEl.createEl('h3', { text: 'Undo Conversion Warning' });
            modal.contentEl.createEl('p', { text: 'You have made changes since the last conversion. Undoing may overwrite your changes. Continue?' });
            const btns = modal.contentEl.createDiv({ cls: 'modal-button-row' });
            const okBtn = btns.createEl('button', { text: 'OK' });
            const cancelBtn = btns.createEl('button', { text: 'Cancel' });
            okBtn.onclick = () => { modal.close(); resolve(true); };
            cancelBtn.onclick = () => { modal.close(); resolve(false); };
            modal.open();
        });
    }

    async convertListToDistributed() {
        // Read all tasks from list files, create project files in distributed folder
        const vault = this.app.vault;
        const listFolder = this.settings.taskLocationList;
        const distFolder = this.settings.taskLocationDistributed;
        const projectsContent = await vault.adapter.read(`${listFolder}/Projects.md`).catch(() => '');
        const actionsContent = await vault.adapter.read(`${listFolder}/Actions.md`).catch(() => '');
        const waitingContent = await vault.adapter.read(`${listFolder}/Waiting For.md`).catch(() => '');
        // For simplicity, create a single file per project, and a Misc.md for actions/waiting not tied to a project
        await vault.adapter.write(`${distFolder}/Misc.md`, actionsContent + '\n' + waitingContent);
        // Optionally, parse projects and create files for each
        // ... (extend as needed)
    }

    async convertDistributedToList() {
        // Read all project files, merge tasks into list files
        const vault = this.app.vault;
        const distFolder = this.settings.taskLocationDistributed;
        const listFolder = this.settings.taskLocationList;
        const folderObj = vault.getAbstractFileByPath(distFolder);
        let projectsMd = '';
        let actionsMd = '';
        let waitingMd = '';
        if (folderObj && folderObj instanceof TFolder) {
            for (const file of folderObj.children) {
                if (file instanceof TFile && file.extension === 'md') {
                    const content = await vault.adapter.read(file.path).catch(() => '');
                    if (file.basename === 'Misc') {
                        // Split actions/waiting
                        actionsMd += content + '\n';
                        waitingMd += content + '\n';
                    } else {
                        projectsMd += `- [ ] Project: ${file.basename}\n`;
                        actionsMd += content + '\n';
                        waitingMd += content + '\n';
                    }
                }
            }
        }
        await vault.adapter.write(`${listFolder}/Projects.md`, projectsMd);
        await vault.adapter.write(`${listFolder}/Actions.md`, actionsMd);
        await vault.adapter.write(`${listFolder}/Waiting For.md`, waitingMd);
    }
} 