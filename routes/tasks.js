const router = require("express").Router();
const { body, validationResult } = require("express-validator");
const Task = require("../models/Task");
const Project = require("../models/Project");
const auth = require("../middleware/auth");

// POST /api/tasks — create task
router.post(
  "/",
  auth,
  [
    body("title").trim().notEmpty().withMessage("Title required"),
    body("projectId").notEmpty().withMessage("Project required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });

    try {
      const project = await Project.findById(req.body.projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (!project.isMember(req.user._id))
        return res.status(403).json({ message: "Access denied" });

      const task = await Task.create({
        title: req.body.title,
        description: req.body.description || "",
        project: project._id,
        assignee: req.body.assignee || null,
        createdBy: req.user._id,
        status: req.body.status || "todo",
        priority: req.body.priority || "medium",
        dueDate: req.body.dueDate || null,
      });

      await task.populate("assignee", "name email");
      await task.populate("createdBy", "name email");
      res.status(201).json(task);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// PUT /api/tasks/:id — update task
router.put("/:id", auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const project = await Project.findById(task.project);
    if (!project.isMember(req.user._id))
      return res.status(403).json({ message: "Access denied" });

    const allowed = ["title", "description", "status", "priority", "assignee", "dueDate"];
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) task[f] = req.body[f];
    });
    await task.save();
    await task.populate("assignee", "name email");
    await task.populate("createdBy", "name email");
    res.json(task);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/tasks/:id
router.delete("/:id", auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const project = await Project.findById(task.project);
    const role = project.getMemberRole(req.user._id);
    if (role !== "admin" && task.createdBy.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Admin or creator only" });

    await task.deleteOne();
    res.json({ message: "Task deleted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/tasks/dashboard — stats for current user
router.get("/dashboard", auth, async (req, res) => {
  try {
    const myTasks = await Task.find({ assignee: req.user._id })
      .populate("project", "name color")
      .populate("assignee", "name")
      .sort({ dueDate: 1 })
      .limit(20);

    const now = new Date();
    const overdue = myTasks.filter(
      (t) => t.dueDate && t.dueDate < now && t.status !== "done"
    );
    const todo = myTasks.filter((t) => t.status === "todo");
    const inProgress = myTasks.filter((t) => t.status === "in-progress");
    const done = myTasks.filter((t) => t.status === "done");

    res.json({
      stats: {
        total: myTasks.length,
        todo: todo.length,
        inProgress: inProgress.length,
        done: done.length,
        overdue: overdue.length,
      },
      recent: myTasks.slice(0, 8),
    });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
