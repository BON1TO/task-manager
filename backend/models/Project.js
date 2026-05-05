const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["admin", "member"], default: "member" },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [memberSchema],
    color: {
      type: String,
      default: "#00f5a0",
      enum: ["#00f5a0", "#4f9eff", "#9d7dff", "#ff8c42", "#ff4f72", "#ffd166"],
    },
  },
  { timestamps: true }
);

projectSchema.methods.getMemberRole = function (userId) {
  const ownerId = (this.owner._id || this.owner).toString();
  if (ownerId === userId.toString()) return "admin";
  const m = this.members.find((m) => {
    const mUserId = (m.user && m.user._id) ? m.user._id.toString() : m.user.toString();
    return mUserId === userId.toString();
  });
  return m ? m.role : null;
};

projectSchema.methods.isMember = function (userId) {
  return this.getMemberRole(userId) !== null;
};

module.exports = mongoose.model("Project", projectSchema);
