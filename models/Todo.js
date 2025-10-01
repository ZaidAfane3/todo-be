const pool = require('../config/database');

class Todo {
  // Get all todos
  static async getAll() {
    try {
      const result = await pool.query(
        'SELECT * FROM todos ORDER BY created_at DESC'
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error fetching todos: ${error.message}`);
    }
  }

  // Get todo by ID
  static async getById(id) {
    try {
      const result = await pool.query(
        'SELECT * FROM todos WHERE id = $1',
        [id]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error fetching todo: ${error.message}`);
    }
  }

  // Get most recent todos with optional limit
  static async getRecent(limit = 3) {
    try {
      const result = await pool.query(
        'SELECT * FROM todos ORDER BY created_at DESC LIMIT $1',
        [limit]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error fetching recent todos: ${error.message}`);
    }
  }

  // Create new todo
  static async create(title, description = null, completed = false) {
    try {
      const result = await pool.query(
        'INSERT INTO todos (title, description, completed) VALUES ($1, $2, $3) RETURNING *',
        [title, description, completed]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error creating todo: ${error.message}`);
    }
  }

  // Update todo
  static async update(id, updates) {
    try {
      const { title, description, completed } = updates;
      const setClause = [];
      const values = [];
      let paramCount = 1;

      if (title !== undefined) {
        setClause.push(`title = $${paramCount}`);
        values.push(title);
        paramCount++;
      }

      if (description !== undefined) {
        setClause.push(`description = $${paramCount}`);
        values.push(description);
        paramCount++;
      }

      if (completed !== undefined) {
        setClause.push(`completed = $${paramCount}`);
        values.push(completed);
        paramCount++;
      }

      if (setClause.length === 0) {
        throw new Error('No fields to update');
      }

      setClause.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const query = `
        UPDATE todos 
        SET ${setClause.join(', ')} 
        WHERE id = $${paramCount} 
        RETURNING *
      `;

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error updating todo: ${error.message}`);
    }
  }

  // Delete todo
  static async delete(id) {
    try {
      const result = await pool.query(
        'DELETE FROM todos WHERE id = $1 RETURNING *',
        [id]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error deleting todo: ${error.message}`);
    }
  }

  // Check if todo exists
  static async exists(id) {
    try {
      const result = await pool.query(
        'SELECT id FROM todos WHERE id = $1',
        [id]
      );
      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Error checking todo existence: ${error.message}`);
    }
  }

  // Get todos count
  static async getCount() {
    try {
      const result = await pool.query('SELECT COUNT(*) FROM todos');
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw new Error(`Error getting todos count: ${error.message}`);
    }
  }
}

module.exports = Todo;
