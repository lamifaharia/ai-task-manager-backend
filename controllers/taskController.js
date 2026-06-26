const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "../data/db.json");
const readDB = () => JSON.parse(fs.readFileSync(dbPath, "utf-8"));
const writeDB = (data) =>
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

exports.getAllTasks = (req, res) => {
  const db = readDB();
  const { search, category, priority, status, sortBy, page = 1, limit = 8 } = req.query;

  let tasks = db.tasks;

  // Filter by user (admin sees all)
  if (req.user.role !== "admin") {
    tasks = tasks.filter((t) => t.userId === req.user.id);
  }

  if (search) {
    tasks = tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase())
    );
  }
  if (category) tasks = tasks.filter((t) => t.category === category);
  if (priority) tasks = tasks.filter((t) => t.priority === priority);
  if (status) tasks = tasks.filter((t) => t.status === status);

  if (sortBy === "date") tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (sortBy === "priority") {
    const order = { High: 0, Medium: 1, Low: 2 };
    tasks.sort((a, b) => order[a.priority] - order[b.priority]);
  }
  if (sortBy === "title") tasks.sort((a, b) => a.title.localeCompare(b.title));

  const total = tasks.length;
  const startIndex = (page - 1) * limit;
  const paginatedTasks = tasks.slice(startIndex, startIndex + parseInt(limit));

  res.json({ tasks: paginatedTasks, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
};

exports.getTaskById = (req, res) => {
  const db = readDB();
  const task = db.tasks.find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found" });
  res.json(task);
};

exports.createTask = (req, res) => {
  try {
    const { title, description, category, priority, status, dueDate, tags } = req.body;
    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required" });
    }

    const db = readDB();
    const newTask = {
      id: uuidv4(),
      title,
      description,
      category: category || "General",
      priority: priority || "Medium",
      status: status || "Todo",
      dueDate: dueDate || null,
      userId: req.user.id,
      tags: tags || [],
      rating: 0,
      createdAt: new Date().toISOString(),
    };

    db.tasks.push(newTask);
    writeDB(db);
    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateTask = (req, res) => {
  try {
    const db = readDB();
    const taskIndex = db.tasks.findIndex((t) => t.id === req.params.id);
    if (taskIndex === -1) return res.status(404).json({ message: "Task not found" });

    db.tasks[taskIndex] = { ...db.tasks[taskIndex], ...req.body };
    writeDB(db);
    res.json(db.tasks[taskIndex]);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteTask = (req, res) => {
  const db = readDB();
  const taskIndex = db.tasks.findIndex((t) => t.id === req.params.id);
  if (taskIndex === -1) return res.status(404).json({ message: "Task not found" });

  db.tasks.splice(taskIndex, 1);
  writeDB(db);
  res.json({ message: "Task deleted" });
};

exports.getStats = (req, res) => {
  const db = readDB();
  let tasks = req.user.role === "admin" ? db.tasks : db.tasks.filter((t) => t.userId === req.user.id);

  const stats = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === "Todo").length,
    inProgress: tasks.filter((t) => t.status === "In Progress").length,
    done: tasks.filter((t) => t.status === "Done").length,
    highPriority: tasks.filter((t) => t.priority === "High").length,
    byCategory: {},
    byPriority: { High: 0, Medium: 0, Low: 0 },
    totalUsers: db.users.length,
  };

  tasks.forEach((t) => {
    stats.byCategory[t.category] = (stats.byCategory[t.category] || 0) + 1;
    stats.byPriority[t.priority] = (stats.byPriority[t.priority] || 0) + 1;
  });

  res.json(stats);
};