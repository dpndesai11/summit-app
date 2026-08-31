import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, Folder } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import ProjectDetail from '../components/ProjectDetail';
import OrphanedTasksBanner from '../components/OrphanedTasksBanner';
import CollapsibleCard from '../components/CollapsibleCard';

export default function Projects({
  tasks,
  projects,
  handleCreateProject,
  handleRenameProject,
  handleUpdateProjectNotes,
  handleDeleteProject,
  navigateTo,
  pendingNav,
  clearPendingNav,
}) {
  const [newProjectName, setNewProjectName] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  // Every project's card is collapsed by default and stays that way until
  // the user opens it — this set just tracks which ones they've expanded.
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  // Deep link from a task's detail view ("its project should be a clickable
  // link that navigates to that project's notes page") — force that one
  // project's card open, without touching the others' collapsed state.
  const [consumedNav, setConsumedNav] = useState(null);
  if (pendingNav && pendingNav !== consumedNav) {
    setConsumedNav(pendingNav);
    if (pendingNav.projectId) {
      setExpandedIds(prev => new Set(prev).add(pendingNav.projectId));
    }
  }
  useEffect(() => {
    if (pendingNav) clearPendingNav();
  }, [pendingNav]);

  const validProjectIds = new Set(projects.map(p => p.id));
  const orphanedTasks = tasks.filter(
    t => t.properties?.projectId && !validProjectIds.has(t.properties.projectId)
  );

  const onOpenTask = (taskId) => navigateTo('Task Dashboard', { taskId });

  const handleAddProject = () => {
    if (!newProjectName.trim()) return;
    handleCreateProject(newProjectName);
    setNewProjectName('');
    // Stays collapsed like every other project card — no auto-expand, so
    // "collapsed by default" holds even for the one you just created.
  };

  const startRename = (project) => {
    setRenamingId(project.id);
    setRenameValue(project.name);
  };

  const commitRename = () => {
    if (renameValue.trim()) handleRenameProject(renamingId, renameValue);
    setRenamingId(null);
  };

  const confirmDelete = () => {
    handleDeleteProject(confirmDeleteId);
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <OrphanedTasksBanner tasks={orphanedTasks} onOpenTask={onOpenTask} />

      <div className="bg-white dark:bg-[#211b34] border border-gray-200 dark:border-violet-400/15 rounded-xl p-4">
        <div className="flex gap-1.5">
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddProject()}
            placeholder="New project"
            className="flex-1 bg-gray-50 dark:bg-violet-400/5 border border-gray-200 dark:border-violet-400/15 text-black dark:text-white rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-violet-500"
          />
          <button
            onClick={handleAddProject}
            disabled={!newProjectName.trim()}
            className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-3 disabled:opacity-40 transition-colors flex items-center gap-1 text-sm font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <p className="text-sm text-black dark:text-white text-center py-10">Create a project to get started.</p>
      ) : (
        <div className="space-y-3">
          {projects.map(project => {
            const linkedCount = tasks.filter(t => t.properties?.projectId === project.id).length;
            const isRenaming = renamingId === project.id;
            return (
              <CollapsibleCard
                key={project.id}
                icon={Folder}
                iconColor="text-violet-600"
                title={isRenaming ? '' : project.name}
                badge={!isRenaming && linkedCount > 0 ? `${linkedCount} task${linkedCount === 1 ? '' : 's'}` : null}
                open={expandedIds.has(project.id)}
                onToggle={(next) => setExpandedIds(prev => {
                  const s = new Set(prev);
                  next ? s.add(project.id) : s.delete(project.id);
                  return s;
                })}
                actions={
                  isRenaming ? (
                    <>
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && commitRename()}
                        onBlur={commitRename}
                        className="bg-white dark:bg-[#2a2340] border border-violet-500 rounded-md px-1.5 py-0.5 text-sm text-black dark:text-white focus:outline-none w-40"
                      />
                      <button onClick={commitRename} className="text-violet-600" aria-label="Save name">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startRename(project)} className="text-black dark:text-white hover:text-violet-600" aria-label="Rename project">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setConfirmDeleteId(project.id)} className="text-black dark:text-white hover:text-red-500" aria-label="Delete project">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )
                }
              >
                <ProjectDetail
                  project={project}
                  tasks={tasks}
                  onUpdateNotes={handleUpdateProjectNotes}
                  onOpenTask={onOpenTask}
                />
              </CollapsibleCard>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete this project?"
        message="Its notes will be removed, but linked tasks are kept — they'll just lose their project link."
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
