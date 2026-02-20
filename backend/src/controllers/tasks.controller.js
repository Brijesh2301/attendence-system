const Task = require('../models/Task.model');
const User = require('../models/User.model');
const {
  sendSuccess, sendCreated, sendError,
  sendNotFound, sendServerError, sendForbidden,
} = require('../utils/response.utils');

const PRIORITY_ORDER = { critical: 1, high: 2, medium: 3, low: 4 };

/**
 * POST /api/tasks
 */
const createTask = async (req, res) => {
  try {
    const { title, description, priority = 'medium', due_date, assignee_id } = req.body;
    const createdBy = req.user._id;

    // Default assignee = self
    let assignedTo = createdBy;

    if (assignee_id && assignee_id !== createdBy.toString()) {
      if (!['manager', 'admin'].includes(req.user.role)) {
        return sendForbidden(res, 'Only managers/admins can assign tasks to others');
      }
      const assignee = await User.findOne({ _id: assignee_id, isActive: true });
      if (!assignee) return sendError(res, 'Assignee not found or inactive', 404);
      assignedTo = assignee._id;
    }

    const task = await Task.create({
      title: title.trim(),
      description: description || null,
      assignedTo,
      createdBy,
      priority,
      dueDate: due_date ? new Date(due_date) : null,
    });

    await task.populate([
      { path: 'assignedTo', select: 'name email role' },
      { path: 'createdBy',  select: 'name email role' },
    ]);

    return sendCreated(res, { task }, 'Task created successfully');
  } catch (error) {
    if (error.name === 'ValidationError') throw error; // Let error handler format it
    console.error('Create task error:', error);
    return sendServerError(res);
  }
};

/**
 * GET /api/tasks
 */
const getTasks = async (req, res) => {
  try {
    const { status, priority, search, page = 1, limit = 20 } = req.query;

    const query = { assignedTo: req.user._id };
    if (status)   query.status   = status;
    if (priority) query.priority = priority;
    if (search) {
      query.$or = [
        { title:       { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Task.countDocuments(query);
    const tasks = await Task.find(query)
      .sort({ dueDate: 1, createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate('assignedTo', 'name email')
      .populate('createdBy',  'name email');

    // Sort by priority order in JS (easier than complex Mongo sort)
    tasks.sort((a, b) => (PRIORITY_ORDER[a.priority] || 5) - (PRIORITY_ORDER[b.priority] || 5));

    return sendSuccess(res, {
      tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    return sendServerError(res);
  }
};

/**
 * GET /api/tasks/:id
 */
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email role')
      .populate('createdBy',  'name email role');

    if (!task) return sendNotFound(res, 'Task not found');

    const canView =
      task.assignedTo._id.equals(req.user._id) ||
      task.createdBy._id.equals(req.user._id) ||
      ['manager', 'admin'].includes(req.user.role);

    if (!canView) return sendForbidden(res, 'Access denied');

    return sendSuccess(res, { task });
  } catch (error) {
    if (error.name === 'CastError') return sendNotFound(res, 'Task not found');
    return sendServerError(res);
  }
};

/**
 * PATCH /api/tasks/:id
 */
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return sendNotFound(res, 'Task not found');

    const canUpdate =
      task.assignedTo.equals(req.user._id) ||
      task.createdBy.equals(req.user._id) ||
      ['manager', 'admin'].includes(req.user.role);

    if (!canUpdate) return sendForbidden(res, 'Access denied');

    const { title, description, priority, status, due_date } = req.body;

    if (title       !== undefined) task.title       = title.trim();
    if (description !== undefined) task.description = description;
    if (priority    !== undefined) task.priority    = priority;
    if (status      !== undefined) task.status      = status;  // completedAt handled by pre-save hook
    if (due_date    !== undefined) task.dueDate     = due_date ? new Date(due_date) : null;

    await task.save();
    await task.populate([
      { path: 'assignedTo', select: 'name email' },
      { path: 'createdBy',  select: 'name email' },
    ]);

    return sendSuccess(res, { task }, 'Task updated successfully');
  } catch (error) {
    if (error.name === 'CastError') return sendNotFound(res, 'Task not found');
    if (error.name === 'ValidationError') throw error;
    return sendServerError(res);
  }
};

/**
 * DELETE /api/tasks/:id
 */
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return sendNotFound(res, 'Task not found');

    const canDelete =
      task.createdBy.equals(req.user._id) ||
      req.user.role === 'admin';

    if (!canDelete) return sendForbidden(res, 'Only the creator or admin can delete tasks');

    await task.deleteOne();
    return sendSuccess(res, null, 'Task deleted successfully');
  } catch (error) {
    if (error.name === 'CastError') return sendNotFound(res, 'Task not found');
    return sendServerError(res);
  }
};

/**
 * GET /api/tasks/all — manager/admin
 */
const getAllTasks = async (req, res) => {
  try {
    const { status, priority, user_id, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status)   query.status     = status;
    if (priority) query.priority   = priority;
    if (user_id)  query.assignedTo = user_id;

    const total = await Task.countDocuments(query);
    const tasks = await Task.find(query)
      .sort({ dueDate: 1, createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate('assignedTo', 'name email role')
      .populate('createdBy',  'name email role');

    return sendSuccess(res, {
      tasks,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    return sendServerError(res);
  }
};

module.exports = { createTask, getTasks, getTaskById, updateTask, deleteTask, getAllTasks };
