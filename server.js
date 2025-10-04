const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const Todo = require('./models/Todo');
const pool = require('./config/database');
const { requireAuth, optionalAuth } = require('./middleware/auth');
const { generateTodoSuggestions } = require('./services/llmService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes

// GET /to-do/suggestions - Suggest new todos using the last three todos (requires authentication)
// IMPORTANT: This route MUST come before /to-do/:id to avoid matching "suggestions" as an ID
app.get('/to-do/suggestions', requireAuth, async (req, res) => {
  try {
    const recentTodos = await Todo.getRecent(3);

    if (!recentTodos.length) {
      return res.json({
        success: true,
        message: 'Not enough todos to generate suggestions yet.',
        data: {
          suggestions: [],
        },
      });
    }

    const suggestions = await generateTodoSuggestions(recentTodos);

    res.json({
      success: true,
      message: 'Todo suggestions generated successfully',
      data: {
        suggestions,
      },
    });
  } catch (error) {
    console.error('Error generating todo suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to generate todo suggestions',
      error: error.message,
    });
  }
});

// GET /to-do - Get all todos (requires authentication)
app.get('/to-do', requireAuth, async (req, res) => {
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

// GET /to-do/:id - Get a specific todo (requires authentication)
app.get('/to-do/:id', requireAuth, async (req, res) => {
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

// POST /to-do - Create a new todo (requires authentication)
app.post('/to-do', requireAuth, async (req, res) => {
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

// PUT /to-do/:id - Update a todo (requires authentication)
app.put('/to-do/:id', requireAuth, async (req, res) => {
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

// DELETE /to-do/:id - Delete a todo (requires authentication)
app.delete('/to-do/:id', requireAuth, async (req, res) => {
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

// GET /user - Get current user info (requires authentication)
app.get('/user', requireAuth, (req, res) => {
  res.json({
    success: true,
    message: 'User information retrieved',
    data: {
      user: req.user
    }
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    
    // Test auth service connection
    let authServiceStatus = 'unknown';
    try {
      const axios = require('axios');
      const authResponse = await axios.get(`${process.env.AUTH_SERVICE_URL || 'http://localhost:3001'}/health`, {
        timeout: 3000
      });
      authServiceStatus = authResponse.data.success ? 'connected' : 'error';
    } catch (error) {
      authServiceStatus = 'disconnected';
    }
    
    res.json({
      success: true,
      message: 'Todo service is running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
      authService: authServiceStatus
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Service unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'disconnected',
      authService: 'unknown',
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
      'GET /to-do/suggestions': 'Generate todo suggestions from recent items (requires auth)',
      'GET /to-do': 'Get all todos (requires auth)',
      'GET /to-do/:id': 'Get a specific todo (requires auth)',
      'POST /to-do': 'Create a new todo (requires auth)',
      'PUT /to-do/:id': 'Update a todo (requires auth)',
      'DELETE /to-do/:id': 'Delete a todo (requires auth)',
      'GET /user': 'Get current user info (requires auth)',
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
