import { Plugin, ItemView, WorkspaceLeaf } from 'obsidian';
import { createApp, h } from 'vue';
import App from './src/App.vue';

const HOMEPAGE_VIEW_TYPE = 'gtd-homepage-view';

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
} 