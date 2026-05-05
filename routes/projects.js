const router = require("express").Router();
const { body, validationResult } = require("express-validator");
const Project = require("../models/Project");
const Task = require("../models/Task");
const User = require("../models/User");
const auth = require("../middleware/auth");

// GET /api/projects — projects where user is owner or member
router.get("/", auth, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [{ owner: req.user._id }, { "members.user": req.user._id }],
    })
      .populate("owner", "name email")
      .populate("members.user", "name email")
      .sort({ createdAt: -1 });

    const withCounts = await Promise.all(
      projects.map(async (p) => {
        const taskCount = await Task.countDocuments({ project: p._id });
        const doneCount = await Task.countDocuments({ project: p._id, status: "done" });
        return {
          ...p.toObject(),
          taskCount,
          doneCount,
          myRole: p.getMemberRole(req.user._id),
        };
      })
    );

    res.json(withCounts);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/projects
router.post(
  "/",
  auth,
  [
    body("name").trim().notEmpty().withMessage("Project name required"),
    body("description").optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });

    try {
      const project = await Project.create({
        name: req.body.name,
        description: req.body.description || "",
        color: req.body.color || "#00f5a0",
        owner: req.user._id,
        members: [],
      });
      await project.populate("owner", "name email");
      res.status(201).json({ ...project.toObject(), taskCount: 0, doneCount: 0, myRole: "admin" });
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// GET /api/projects/:id
router.get("/:id", auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("owner", "name email")
      .populate("members.user", "name email");

    if (!project) return res.status(404).json({ message: "Project not found" });
    if (!project.isMember(req.user._id))
      return res.status(403).json({ message: "Access denied" });

    const tasks = await Task.find({ project: project._id })
      .populate("assignee", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json({ project: { ...project.toObject(), myRole: project.getMemberRole(req.user._id) }, tasks });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/projects/:id
router.put("/:id", auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (project.getMemberRole(req.user._id) !== "admin")
      return res.status(403).json({ message: "Admin only" });

    if (req.body.name !== undefined) project.name = req.body.name;
    if (req.body.description !== undefined) project.description = req.body.description;
    if (req.body.color !== undefined) project.color = req.body.color;
    await project.save();
    await project.populate("owner", "name email");
    await project.populate("members.user", "name email");
    res.json(project);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/projects/:id
router.delete("/:id", auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (project.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Owner only" });

    await Task.deleteMany({ project: project._id });
    await project.deleteOne();
    res.json({ message: "Project deleted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/projects/:id/members — add member (admin only)
router.post("/:id/members", auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (project.getMemberRole(req.user._id) !== "admin")
      return res.status(403).json({ message: "Admin only" });

    const target = await User.findOne({ email: req.body.email });
    if (!target) return res.status(404).json({ message: "User not found" });
    if (project.isMember(target._id))
      return res.status(409).json({ message: "Already a member" });

    project.members.push({ user: target._id, role: req.body.role || "member" });
    await project.save();
    await project.populate("members.user", "name email");
    res.json(project.members);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/projects/:id/members/:userId
router.delete("/:id/members/:userId", auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (project.getMemberRole(req.user._id) !== "admin")
      return res.status(403).json({ message: "Admin only" });
    if (project.owner.toString() === req.params.userId)
      return res.status(400).json({ message: "Cannot remove owner" });

    project.members = project.members.filter(
      (m) => m.user.toString() !== req.params.userId
    );
    await project.save();
    res.json({ message: "Member removed" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
