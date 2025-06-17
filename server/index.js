const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Middlewares
const logger = require('./logger');
const validateTask = require('./validateTask');
const errorHandler = require('./errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = path.join(__dirname, 'tasks.json');

app.use(cors());
app.use(express.json());
app.use(logger);

// Helper functions to read/write tasks
async function readTasks() {
  try {
    const data = await fs.readFile(DATA_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeTasks(tasks) {
  await fs.writeFile(DATA_PATH, JSON.stringify(tasks, null, 2));
}

// ─── Routes ─────────────────────────

// Get all tasks
app.get('/tasks', async (req, res, next) => {
  try {
    const tasks = await readTasks();
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

// Get task by ID
app.get('/tasks/:id', async (req, res, next) => {
  try {
    const tasks = await readTasks();
    const task = tasks.find(t => t.id === req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (err) {
    next(err);
  }
});

// Create new task
app.post('/tasks', validateTask, async (req, res, next) => {
  try {
    const tasks = await readTasks();
    const newTask = {
      id: uuidv4(),
      title: req.body.title.trim(),
      description: req.body.description?.trim() || '',
      status: req.body.status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    tasks.push(newTask);
    await writeTasks(tasks);
    res.status(201).json(newTask);
  } catch (err) {
    next(err);
  }
});

// Update a task
app.put('/tasks/:id', validateTask, async (req, res, next) => {
  try {
    const tasks = await readTasks();
    const taskIndex = tasks.findIndex(t => t.id === req.params.id);
    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const updatedTask = {
      ...tasks[taskIndex],
      title: req.body.title.trim(),
      description: req.body.description?.trim() || '',
      status: req.body.status,
      updatedAt: new Date().toISOString(),
    };

    tasks[taskIndex] = updatedTask;
    await writeTasks(tasks);
    res.json(updatedTask);
  } catch (err) {
    next(err);
  }
});

// Delete a task
app.delete('/tasks/:id', async (req, res, next) => {
  try {
    const tasks = await readTasks();
    const filteredTasks = tasks.filter(t => t.id !== req.params.id);

    if (tasks.length === filteredTasks.length) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await writeTasks(filteredTasks);
    res.json({ message: 'Task deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

// Global error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
