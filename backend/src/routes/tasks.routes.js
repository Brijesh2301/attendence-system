const express = require('express');
const { body, query, param } = require('express-validator');
const {
  createTask, getTasks, getTaskById, updateTask, deleteTask, getAllTasks,
} = require('../controllers/tasks.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const router = express.Router();

router.use(authenticate);

const createValidators = [
  body('title').trim().notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 255 }).withMessage('Title must be 3–255 chars'),
  body('description').optional().isLength({ max: 5000 }),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('due_date').optional().isDate().withMessage('due_date must be YYYY-MM-DD'),
  body('assignee_id').optional().isMongoId().withMessage('Invalid assignee ID'),
];

const updateValidators = [
  param('id').isMongoId().withMessage('Invalid task ID'),
  body('title').optional().trim().isLength({ min: 3, max: 255 }),
  body('description').optional().isLength({ max: 5000 }),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('status').optional().isIn(['todo', 'in_progress', 'completed', 'cancelled']),
  body('due_date').optional().isDate().withMessage('due_date must be YYYY-MM-DD'),
];

router.get('/all', authorize('manager', 'admin'), getAllTasks);
router.get('/',    getTasks);
router.post('/',   createValidators, validate, createTask);
router.get('/:id',    [param('id').isMongoId()], validate, getTaskById);
router.patch('/:id',  updateValidators, validate, updateTask);
router.delete('/:id', [param('id').isMongoId()], validate, deleteTask);

module.exports = router;
