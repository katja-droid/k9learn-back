const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Schema = mongoose.Schema;

const questionProgressSchema = new Schema({
  questionId: { type: Schema.Types.ObjectId, ref: 'Course.topics.questions', required: true },
  answered: { type: Boolean, default: false },
  correct: { type: Boolean, default: false },
  triesLeft: { type: Number, required: true }  // Add triesLeft property
});

const progressSchema = new Schema({
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  points: { type: Number, required: true, default: 0 },
  totalPoints: { type: Number, required: true, default: 0 },
  questionProgress: [questionProgressSchema]
});

const userSchema = new Schema({
  nickname: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  courses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
  friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  progress: [progressSchema]
});

// Middleware to add progress when a course is added
userSchema.pre('save', async function(next) {
  if (this.isModified('courses')) {
    if (!this.progress) {
      this.progress = [];
    }

    const existingCourses = this.progress.map(p => p.courseId.toString());
    const Course = mongoose.model('Course');  // Assuming you have a Course model defined somewhere

    for (const courseId of this.courses) {
      if (!existingCourses.includes(courseId.toString())) {
        const course = await Course.findById(courseId).populate('topics.questions');
        const questionProgress = course.topics.flatMap(topic => 
          topic.questions.map(question => ({
            questionId: question._id,
            triesLeft: question.type === 'true_false' ? 1 : 3  // Set triesLeft based on question type
          }))
        );
        this.progress.push({ courseId: courseId, points: 0, totalPoints: 100, questionProgress });
      }
    }
  }
  next();
});

// Helper method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Compile and export our model
const User = mongoose.model('User', userSchema);

module.exports = User;
