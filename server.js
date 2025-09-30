const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const Todo = require('./models/Todo');
const pool = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes

// GET /to-do - Get all todos
app.get('/to-do', async (req, res) => {
  try {
    const todos = await Todo.getAll();
    const count = await Todo.getCount();
    
    res.json({
      success: true,
      data: todos,
      count: count
    });
  } catch (error) {
    console.error('Error fetching todos:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /to-do/:id - Get a specific todo
app.get('/to-do/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid todo ID'
      });
    }
    
    const todo = await Todo.getById(id);
    
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }
    
    res.json({
      success: true,
      data: todo
    });
  } catch (error) {
    console.error('Error fetching todo:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST /to-do - Create a new todo
app.post('/to-do', async (req, res) => {
  try {
    const { title, description, completed = false } = req.body;
    
    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }
    
    const newTodo = await Todo.create(
      title.trim(), 
      description ? description.trim() : null, 
      Boolean(completed)
    );
    
    res.status(201).json({
      success: true,
      message: 'Todo created successfully',
      data: newTodo
    });
  } catch (error) {
    console.error('Error creating todo:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// PUT /to-do/:id - Update a todo
app.put('/to-do/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, description, completed } = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid todo ID'
      });
    }
    
    if (title !== undefined && title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Title cannot be empty'
      });
    }
    
    // Check if todo exists
    const todoExists = await Todo.exists(id);
    if (!todoExists) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }
    
    const updates = {};
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description ? description.trim() : null;
    if (completed !== undefined) updates.completed = Boolean(completed);
    
    const updatedTodo = await Todo.update(id, updates);
    
    res.json({
      success: true,
      message: 'Todo updated successfully',
      data: updatedTodo
    });
  } catch (error) {
    console.error('Error updating todo:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// DELETE /to-do/:id - Delete a todo
app.delete('/to-do/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid todo ID'
      });
    }
    
    const deletedTodo = await Todo.delete(id);
    
    if (!deletedTodo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Todo deleted successfully',
      data: deletedTodo
    });
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    
    res.json({
      success: true,
      message: 'Todo service is running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Service unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Todo Microservice API',
    version: '1.0.0',
    endpoints: {
      'GET /to-do': 'Get all todos',
      'GET /to-do/:id': 'Get a specific todo',
      'POST /to-do': 'Create a new todo',
      'PUT /to-do/:id': 'Update a todo',
      'DELETE /to-do/:id': 'Delete a todo',
      'GET /health': 'Health check'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Todo service running on port ${PORT}`);
  console.log(`📝 API Documentation: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
