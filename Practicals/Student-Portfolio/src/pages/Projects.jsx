import { useEffect, useState } from 'react';
import { createTask, deleteTask, getTasks, updateTask } from '../api/api';
import Spinner from '../components/Spinner';
import Toast from '../components/Toast';

const emptyForm = { title: '', description: '', priority: 'medium', completed: false };

function TaskFields({ values, onChange, includeCompleted = true }) {
  return (
    <>
      <label>Title<input name="title" value={values.title} onChange={onChange} required /></label>
      <label>Description<textarea name="description" value={values.description} onChange={onChange} rows="3" /></label>
      <div className="task-form-row">
        <label>Priority<select name="priority" value={values.priority} onChange={onChange}>
          <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
        </select></label>
        {includeCompleted && <label className="checkbox-label"><input type="checkbox" name="completed" checked={values.completed} onChange={onChange} /> Completed</label>}
      </div>
    </>
  );
}

function Projects() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  };

  const loadTasks = async (signal) => {
    setLoading(true);
    setLoadError('');
    try {
      setTasks(await getTasks(signal));
    } catch (error) {
      if (error.name !== 'AbortError') setLoadError(error.message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadTasks(controller.signal);
    return () => controller.abort();
  }, []);

  const changeForm = (event, setter) => {
    const { name, value, type, checked } = event.target;
    setter((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    const temporaryId = `temporary-${Date.now()}`;
    setTasks((current) => [{ ...form, _id: temporaryId, createdAt: new Date().toISOString(), isPending: true }, ...current]);
    setIsCreating(true);
    try {
      const created = await createTask(form);
      setTasks((current) => current.map((task) => task._id === temporaryId ? created : task));
      setForm(emptyForm);
      showToast('success', 'Task created successfully');
    } catch (error) {
      setTasks((current) => current.filter((task) => task._id !== temporaryId));
      showToast('error', `Failed to create task: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const startEditing = (task) => {
    setEditingId(task._id);
    setEditForm({ title: task.title, description: task.description || '', priority: task.priority || 'medium', completed: task.completed });
  };

  const handleUpdate = async (event, id) => {
    event.preventDefault();
    setUpdatingId(id);
    try {
      const updated = await updateTask(id, editForm);
      setTasks((current) => current.map((task) => task._id === id ? updated : task));
      setEditingId(null);
      showToast('success', 'Task updated successfully');
    } catch (error) {
      showToast('error', `Failed to update task: ${error.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    setDeletingId(id);
    try {
      await deleteTask(id);
      setTasks((current) => current.filter((task) => task._id !== id));
      showToast('success', 'Task deleted successfully');
    } catch (error) {
      showToast('error', `Failed to delete task: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="page-content container">
      <Toast toast={toast} />
      <section className="card task-page-header">
        <p className="eyebrow">MongoDB task manager</p>
        <h1>Tasks</h1>
        <p className="section-intro">Create, track, and update practical work from the connected task API.</p>
      </section>
      <section className="card task-form-card">
        <div className="section-heading"><div><p className="eyebrow">New record</p><h2>Add a task</h2></div><span className="api-status">API connected</span></div>
        <form className="task-form" onSubmit={handleCreate}>
          <TaskFields values={form} onChange={(event) => changeForm(event, setForm)} includeCompleted={false} />
          <button className="btn" type="submit" disabled={isCreating}>{isCreating ? 'Saving...' : 'Create task'}</button>
        </form>
      </section>
      <section className="card task-list-card">
        <div className="section-heading"><div><p className="eyebrow">Live collection</p><h2>Your tasks</h2></div>{!loading && !loadError && <span className="task-count">{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</span>}</div>
        {loading && <Spinner />}
        {loadError && <div className="error-message" role="alert"><p>{loadError}</p><button type="button" className="btn" onClick={() => loadTasks()}>Retry</button></div>}
        {!loading && !loadError && tasks.length === 0 && <p className="empty-state">No tasks yet. Add your first one above.</p>}
        {!loading && !loadError && tasks.length > 0 && <div className="projects-grid task-grid">
          {tasks.map((task) => <article className={`project-card task-card ${task.isPending ? 'task-pending' : ''}`} key={task._id}>
            {editingId === task._id ? <form className="task-form" onSubmit={(event) => handleUpdate(event, task._id)}>
              <TaskFields values={editForm} onChange={(event) => changeForm(event, setEditForm)} />
              <div className="task-actions"><button className="btn" type="submit" disabled={updatingId === task._id}>{updatingId === task._id ? 'Updating...' : 'Save changes'}</button><button className="btn btn-secondary" type="button" onClick={() => setEditingId(null)}>Cancel</button></div>
            </form> : <>
              <div className="project-card-header"><h3>{task.title}</h3><span className={`priority-badge priority-${task.priority}`}>{task.priority}</span></div>
              <p>{task.description || 'No description provided.'}</p>
              <div className="task-meta"><span className={task.completed ? 'status-complete' : 'status-open'}>{task.completed ? 'Completed' : 'In progress'}</span><span>Created {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'Date unavailable'}</span></div>
              {task.isPending ? <p className="pending-label">Saving to MongoDB...</p> : <div className="task-actions">{!task.completed && <button className="btn" type="button" onClick={() => startEditing(task)}>Edit</button>}<button className="btn btn-danger" type="button" onClick={() => handleDelete(task._id)} disabled={deletingId === task._id}>{deletingId === task._id ? 'Deleting...' : 'Delete'}</button></div>}
            </>}
          </article>)}
        </div>}
      </section>
    </main>
  );
}

export default Projects;
