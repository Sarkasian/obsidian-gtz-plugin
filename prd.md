# Product Requirements Document (PRD)
## GTD Registry Plugin - Obsidian Plugin

### Version: 1.0
### Date: 2024
### Status: In Development

---

## 1. Executive Summary

The GTD Registry Plugin is an Obsidian plugin that implements a Getting Things Done (GTD) workflow with three core lists: Projects, Next Actions, and Waiting For. The plugin provides bidirectional synchronization between the UI and markdown files, with intelligent relationship management between items using inline fields and a hidden database for UI optimization.

---

## 2. Product Overview

### 2.1 Product Vision
Create a seamless GTD workflow within Obsidian that maintains the simplicity of markdown while providing powerful relationship management and real-time synchronization.

### 2.2 Target Users
- Obsidian users following GTD methodology
- Users who prefer markdown-based task management
- Teams and individuals managing complex project workflows

### 2.3 Key Value Propositions
- **Native Obsidian Integration**: Uses Obsidian's built-in file system and markdown
- **Real-Time Sync**: Bidirectional synchronization between UI and files
- **Relationship Management**: Clear connections between projects, actions, and waiting items
- **Inline Field Support**: Maintains markdown readability while enabling complex relationships
- **No External Dependencies**: Self-contained within Obsidian ecosystem

---

## 3. Core Requirements

### 3.1 Functional Requirements

#### 3.1.1 Three-List Structure
- **Projects List**: High-level initiatives and goals
- **Next Actions List**: Concrete, actionable tasks
- **Waiting For List**: Items waiting for external input or action

#### 3.1.2 Relationship Management
- **Projects → Next Actions**: 1-to-many relationship
- **Next Actions → Waiting For**: 1-to-1 relationship
- **No Sub-Projects**: Projects are flat (future enhancement)

#### 3.1.3 Inline Field Syntax
```
# Projects.md
- [ ] Website Redesign #project

# Next Actions.md
- [ ] Research competitors #next-action project::Website Redesign
- [ ] Create wireframes #next-action project::Website Redesign

# Waiting For.md
- [ ] Client feedback on wireframes #waiting-for action::Create wireframes
```

#### 3.1.4 Bidirectional Synchronization
- **UI → File**: Changes in UI immediately update markdown files
- **File → UI**: Changes in markdown files automatically sync to UI
- **Real-Time Detection**: Uses Obsidian's native file change events

### 3.2 Non-Functional Requirements

#### 3.2.1 Performance
- UI updates within 100ms of file changes
- No noticeable lag during typing or editing
- Efficient memory usage for large task lists

#### 3.2.2 Reliability
- 99.9% synchronization accuracy
- Graceful handling of file corruption or invalid syntax
- Automatic backup before major operations

#### 3.2.3 Usability
- Intuitive inline editing
- Clear visual feedback for relationships
- Consistent with Obsidian's design language

---

## 4. Technical Architecture

### 4.1 High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Markdown     │    │   Hidden         │    │      Vue        │
│     Files      │◄──►│   Database       │◄──►│      UI         │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### 4.2 Component Breakdown

#### 4.2.1 Main Plugin (main.ts)
- **File Watcher**: Monitors markdown file changes using `vault.on()`
- **Event Dispatcher**: Sends custom events to Vue components
- **Settings Management**: Handles plugin configuration

#### 4.2.2 Vue Components
- **GtdRegistryCard**: Main orchestrator component
- **ProjectsCard**: Displays and manages projects
- **NextActionsCard**: Displays and manages next actions
- **WaitingForCard**: Displays and manages waiting for items
- **BaseCard**: Reusable card component
- **BaseItem**: Reusable item component

#### 4.2.3 Hidden Database
- **Relationship Index**: Maps inline field references to actual items
- **UI State Cache**: Stores parsed and processed data for fast rendering
- **Change Tracking**: Monitors which items need UI updates

### 4.3 Data Flow

1. **File Change Detection**: Obsidian detects markdown file modification
2. **Event Dispatch**: Plugin sends `gtd-file-change` event
3. **File Parsing**: Vue component parses markdown and extracts relationships
4. **Database Update**: Hidden database updates with new relationship data
5. **UI Rendering**: Vue components render using database data
6. **User Interaction**: User edits trigger file updates
7. **Cycle Repeats**: File change detection triggers the cycle again

---

## 5. Implementation Phases

### 5.1 Phase 1: Core Infrastructure (Current)
- ✅ Basic three-list structure
- ✅ Inline editing capabilities
- ✅ File change detection
- ✅ Bidirectional synchronization
- ✅ Basic styling and layout

### 5.2 Phase 2: Relationship Management (Next)
- [ ] Inline field parsing and validation
- [ ] Hidden database implementation
- [ ] Relationship mapping and indexing
- [ ] UI relationship indicators
- [ ] Relationship validation and error handling

### 5.3 Phase 3: Enhanced Features (Future)
- [ ] Advanced filtering and search
- [ ] Relationship visualization
- [ ] Bulk operations
- [ ] Import/export functionality
- [ ] Sub-project support

### 5.4 Phase 4: Advanced UI (Future)
- [ ] Drag and drop relationship management
- [ ] Timeline views
- [ ] Progress tracking
- [ ] Team collaboration features

---

## 6. Data Models

### 6.1 TaskItem Interface
```typescript
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
  lineNumber: number;
  originalContent: string;
  filePath?: string;
  
  // New relationship fields
  projectId?: string;        // For next actions
  nextActionId?: string;     // For waiting for items
  relationships?: string[];  // All inline field references
}
```

### 6.2 Relationship Database Schema
```typescript
interface RelationshipDB {
  projects: Map<string, ProjectItem>;
  nextActions: Map<string, NextActionItem>;
  waitingFor: Map<string, WaitingForItem>;
  
  // Relationship mappings
  projectToActions: Map<string, string[]>;      // projectId → actionIds[]
  actionToWaiting: Map<string, string>;        // actionId → waitingId
  waitingToAction: Map<string, string>;        // waitingId → actionId
}
```

---

## 7. User Experience Requirements

### 7.1 Inline Editing
- **Click to Edit**: Single click on any item enters edit mode
- **Enter to Save**: Press Enter to save changes
- **Escape to Cancel**: Press Escape to cancel editing
- **Auto-focus**: Cursor automatically positioned in edit field

### 7.2 Relationship Visualization
- **Project Context**: Show project name above next actions
- **Waiting Indicators**: Visual indicators for blocked actions
- **Relationship Lines**: Subtle visual connections between related items

### 7.3 Error Handling
- **Invalid Syntax**: Clear error messages for malformed inline fields
- **Broken Relationships**: Warning indicators for orphaned items
- **Recovery Options**: Suggestions for fixing relationship issues

---

## 8. Technical Constraints

### 8.1 Obsidian Compatibility
- **Minimum Version**: Latest Obsidian version
- **API Usage**: Prefer Obsidian's built-in APIs over external libraries
- **Performance**: Must not impact Obsidian's core functionality

### 8.2 File System Limitations
- **Read/Write Operations**: Use Obsidian's vault adapter
- **File Watching**: Rely on Obsidian's file change detection
- **Error Handling**: Graceful degradation for file system issues

### 8.3 Vue.js Integration
- **Component Architecture**: Modular, reusable components
- **State Management**: Reactive data with Vue 3 Composition API
- **Event Handling**: Custom events for plugin communication

---

## 9. Success Metrics

### 9.1 Functional Metrics
- **Sync Accuracy**: 99.9% of changes properly synchronized
- **Response Time**: UI updates within 100ms of file changes
- **Error Rate**: Less than 0.1% of operations result in errors

### 9.2 User Experience Metrics
- **Task Creation Time**: New tasks created in under 2 seconds
- **Relationship Accuracy**: 100% of inline field relationships properly parsed
- **UI Responsiveness**: No noticeable lag during normal operation

---

## 10. Risk Assessment

### 10.1 Technical Risks
- **File Corruption**: Mitigation: Automatic backups and validation
- **Performance Degradation**: Mitigation: Efficient parsing and caching
- **Memory Leaks**: Mitigation: Proper cleanup and event listener management

### 10.2 User Experience Risks
- **Complex Relationships**: Mitigation: Clear documentation and examples
- **Data Loss**: Mitigation: Multiple backup strategies
- **Learning Curve**: Mitigation: Intuitive UI and progressive disclosure

---

## 11. Future Considerations

### 11.1 Scalability
- **Large Task Lists**: Optimize for 1000+ items
- **Complex Relationships**: Support for multi-level dependencies
- **Team Collaboration**: Multi-user editing and conflict resolution

### 11.2 Integration
- **Calendar Integration**: Due dates and scheduling
- **External Tools**: Export to other GTD applications
- **Mobile Support**: Responsive design for mobile devices

---

## 12. Conclusion

The GTD Registry Plugin represents a significant advancement in Obsidian-based task management, combining the simplicity of markdown with the power of intelligent relationship management. The inline field approach ensures data portability while the hidden database provides optimal UI performance.

The phased implementation approach allows for iterative development and user feedback, ensuring that each feature meets real user needs before moving to the next phase.

---

## Document Control

- **Created**: [Date]
- **Last Updated**: [Date]
- **Version**: 1.0
- **Status**: In Development
- **Next Review**: [Date]
