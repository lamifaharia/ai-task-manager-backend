const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getStats,
} = require("../controllers/taskController");

router.use(authMiddleware); // All task routes require auth

router.get("/", getAllTasks);
router.get("/stats", getStats);
router.get("/:id", getTaskById);
router.post("/", createTask);
router.put("/:id", updateTask);
router.delete("/:id", deleteTask);

module.exports = router;