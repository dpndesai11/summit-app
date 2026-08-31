import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import ProjectDetail from '../components/ProjectDetail';
import OrphanedTasksBanner from '../components/OrphanedTasksBanner';

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
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? null);
  const [newProjectName, setNewProjectName] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Deep link from a task's detail view ("its project should be a clickable
  // link that navigates to that project's notes page"). Consumed during
  // render rather than in a useEffect — see the matching comment in
  // TaskBoard.jsx for why.
  const [consumedNav, setConsumedNav] = useState(null);
  if (pendingNav && pendingNav !== consumedNav) {
    setConsumedNav(pendingNav);
    if (pendingNav.projectId) setSelectedProjectId(pendingNav.projectId);
  }
  useEffect(() => {
    if (pendingNav) clearPendingNav();
  }, [pendingNav]);

  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;

  const validProjectIds = new Set(projects.map(p => p.id));
  const orphanedTasks = tasks.filter(
    t => t.properties?.projectId && !validProjectIds.has(t.properties.projectId)
  );

  const onOpenTask = (taskId) => navigateTo('Task Dashboard', { taskId });

  const handleAddProject = () => {
    if (!newProjectName.trim()) return;
    const id = handleCreateProject(newProjectName);
    setNewProjectName('');
    if (id) setSelectedProjectId(id);
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
    if (selectedProjectId === confirmDeleteId) setSelectedProjectId(null);
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <OrphanedTasksBanner tasks={orphanedTasks} onOpenTask={onOpenTask} />

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        <div className="bg-white dark:bg-[#211b34] border border-gray-200 dark:border-violet-400/15 rounded-xl p-4 h-fit">
          <div className="flex gap-1.5 mb-3">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddProject()}
              placeholder="New project"
              className="flex-1 bg-gray-50 dark:bg-violet-400/5 border border-gray-200 dark:border-violet-400/15 text-black dark:text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-violet-500"
            />
            <button
              onClick={handleAddProject}
              disabled={!newProjectName.trim()}
              className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-2 disabled:opacity-40 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {projects.length === 0 ? (
            <p className="text-xs text-black dark:text-white text-center py-4">No projects yet.</p>
          ) : (
            <div className="space-y-1">
              {projects.map(project => (
                <div
                  key={project.id}
                  onClick={() => setSelectedProjectId(project.id)}
                  className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 cursor-pointer transition-colors ${
                    selectedProjectId === project.id
                      ? 'bg-violet-50 dark:bg-violet-500/10'
                      : 'hover:bg-gray-50 dark:hover:bg-violet-400/10'
                  }`}
                >
                  {renamingId === project.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.key === 'Enter' && commitRename()}
                      onBlur={commitRename}
                      className="flex-1 bg-white dark:bg-[#2a2340] border border-violet-500 rounded-md px-1.5 py-0.5 text-xs text-black dark:text-white focus:outline-none"
                    />
                  ) : (
                    <span className={`flex-1 text-sm truncate ${selectedProjectId === project.id ? 'text-violet-700 dark:text-violet-400 font-medium' : 'text-black dark:text-white'}`}>
                      {project.name}
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); startRename(project); }}
                    className="opacity-0 group-hover:opacity-100 text-black dark:text-white hover:text-black dark:hover:text-white transition-opacity"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(project.id); }}
                    className="opacity-0 group-hover:opacity-100 text-black dark:text-white hover:text-red-500 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-[#211b34] border border-gray-200 dark:border-violet-400/15 rounded-xl p-5">
          {selectedProject ? (
            <ProjectDetail
              project={selectedProject}
              tasks={tasks}
              onUpdateNotes={handleUpdateProjectNotes}
              onOpenTask={onOpenTask}
            />
          ) : (
            <p className="text-sm text-black dark:text-white text-center py-10">
              {projects.length === 0 ? 'Create a project to get started.' : 'Select a project.'}
            </p>
          )}
        </div>
      </div>

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
