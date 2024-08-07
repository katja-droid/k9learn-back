const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const User = require('./models/User');  // Assuming your User model is in models/User.js
const Course = require('./models/Course');  // Assuming your Course model is in models/Course.js
const New = require('./models/New'); 
const Article = require('./models/Article'); 
const Test = require('./models/Test'); 
const bcrypt = require('bcrypt');
const cors = require('cors');
const app = express();
app.use(bodyParser.json());

mongoose.connect('mongodb+srv://daria:1234@cluster0.btuhiak.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));
// Setup CORS middleware
const corsOptions = {
  origin: ['http://localhost:3000', 'http://k9learn.netlify.app', 'https://k9learn.netlify.app'],
  optionsSuccessStatus: 200,
  credentials: true
};

app.use(cors(corsOptions));
const port = process.env.PORT || 5001;
app.get('/courses', async (req, res) => {
  try {
    const courses = await Course.find();
    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching courses', error: error.message });
  }
});
app.get('/courses/:courseName', async (req, res) => {
  try {
    // Extract the courseName from the request parameters
    const { courseName } = req.params;

    // Find the course in the database by its name
    const course = await Course.findOne({ courseName });

    // If the course is not found, send a 404 response
    if (!course) {
      return res.status(404).send({ message: 'Course not found' });
    }

    // If the course is found, send it in the response
    res.status(200).json(course);
  } catch (error) {
    // If an error occurs, send a 500 response with the error message
    res.status(500).json({ message: 'Error finding course', error: error.message });
  }
});
app.post('/users', async (req, res) => {
  const { nickname, email, password } = req.body;

  if (!email || !password || !nickname) {
    return res.status(400).send({ message: 'Nickname, email, and password are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      nickname,
      email,
      password: hashedPassword,
      courses: [],
      progress: []
    });

    await newUser.save(); 
    res.status(201).send({ message: 'User created successfully', userId: newUser._id });
  } catch (error) {
    res.status(500).send({ message: 'Error creating user', error: error.message });
  }
});

app.put('/users/:id', async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).send(updatedUser);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.delete('/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(200).send({ message: 'User deleted' });
  } catch (error) {
    res.status(500).send(error);
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});


app.post('/users/:userId/friends', async (req, res) => {
  const { userId } = req.params;
  const { friendId } = req.body; // ID of the friend to add
  try {
    const user = await User.findById(userId);
    const friend = await User.findById(friendId);
    if (!friend) {
      return res.status(404).send({ message: 'Friend not found' });
    }
    
    user.friends.push(friendId);
    
    friend.friends.push(userId);
    
    await Promise.all([user.save(), friend.save()]);
    
    res.status(201).send({ user, friend });
  } catch (error) {
    res.status(500).send(error);
  }
});

app.post('/users/:userId/courses', async (req, res) => {
  const { userId } = req.params;
  const { courseId } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).send({ message: 'Course not found' });
    }

    if (user.courses.includes(courseId)) {
      return res.status(400).send({ message: 'Course already added to this user' });
    }

    user.courses.push(courseId);

    const questionProgress = course.topics.flatMap(topic =>
      topic.questions.map(question => ({
        questionId: question._id,
        triesLeft: question.type === 'true_false' ? 1 : 3, 
        answered: false,
        correct: false
      }))
    );
    user.progress.push({
      courseId: courseId,
      points: 0,
      totalPoints: 100, 
      questionProgress
    });

    await user.save();

    res.status(200).send({ message: 'Course added successfully', user });
  } catch (error) {
    console.error('Error adding course to user:', error);
    res.status(500).send({ message: 'Error adding course to user', error: error.message });
  }
});

  app.put('/users/:userId/progress/:courseId', async (req, res) => {
    try {
      const user = await User.findById(req.params.userId);
      if (!user) return res.status(404).send('User not found');
  
      const progressIndex = user.progress.findIndex(p => p.courseId.toString() === req.params.courseId);
      if (progressIndex === -1) {
        return res.status(404).send('Course progress not found');
      }
  
      // Update points and totalPoints as needed
      user.progress[progressIndex].points = req.body.points;
      user.progress[progressIndex].totalPoints = req.body.totalPoints;
      await user.save();
      res.status(200).send(user.progress[progressIndex]);
    } catch (error) {
      res.status(500).send(error.toString());
    }
  });
  
app.delete('/users/:userId/courses/:courseId', async (req, res) => {
  const { userId, courseId } = req.params;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    if (!user.courses.includes(courseId)) {
      return res.status(404).send({ message: 'Course not found in user\'s courses' });
    }

    user.courses.pull(courseId);

    user.progress = user.progress.filter(p => p.courseId.toString() !== courseId); // Fix the filtering

    await user.save();
    res.status(200).send({ message: 'Course removed', courses: user.courses });
  } catch (error) {
    res.status(500).send({ message: 'Server error', error: error.toString() });
  }
});
app.post('/courses', async (req, res) => {
  const { courseName, imageUri, topics } = req.body;

  try {
    const newCourse = new Course({
      courseName,
      imageUri,
      topics
    });

    await newCourse.save();

    res.status(201).send({ message: 'Course created successfully', courseId: newCourse._id });
  } catch (error) {
    res.status(500).send({ message: 'Error creating course', error: error.message });
  }
});
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).send({ message: 'Invalid password' });
    }

    res.status(200).send({ message: 'Login successful', user });
  } catch (error) {
    res.status(500).send({ message: 'Error logging in', error: error.message });
  }
});


app.get('/users/search/:searchTerm', async (req, res) => {
  try {
    const { searchTerm } = req.params;

    const users = await User.find({
      $or: [
        { nickname: { $regex: searchTerm, $options: 'i' } }, 
        { email: { $regex: searchTerm, $options: 'i' } } 
      ]
    });

    if (users.length === 0) {
      return res.status(404).send({ message: 'No users found matching the search term' });
    }

    res.status(200).json(users);
  } catch (error) {
    // If an error occurs, send a 500 response with the error message
    res.status(500).json({ message: 'Error searching users', error: error.message });
  }
});
app.get('/current-user', async (req, res) => {
  try {
    const userId = req.userId; 

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching current user', error: error.message });
  }
});

app.get('/all-users', async (req, res) => {
  try {
    const allUsers = await User.find();

    if (!allUsers || allUsers.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }

    res.status(200).json(allUsers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching all users', error: error.message });
  }
});
app.post('/courses/by-ids', async (req, res) => {
  const { courseIds } = req.body;

  try {
    const courses = await Course.find({ _id: { $in: courseIds } });

    if (courses.length === 0) {
      return res.status(404).send({ message: 'No courses found' });
    }

    res.status(200).json(courses);
  } catch (error) {
    res.status(500).send({ message: 'Error fetching courses', error: error.message });
  }
});

app.get('/users/:userId/friends', async (req, res) => {
  const { userId } = req.params;

  try {
    // Find the user by ID
    const user = await User.findById(userId).populate('friends');

    // If the user is not found, send a 404 response
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Send the user's friends list in the response
    res.status(200).json(user.friends);
  } catch (error) {
    // If an error occurs, send a 500 response with the error message
    res.status(500).json({ message: 'Error fetching friends', error: error.message });
  }
});
app.delete('/users/:userId/friends/:friendId', async (req, res) => {
  const { userId, friendId } = req.params;

  try {
    // Find the user by ID
    const user = await User.findById(userId);

    // If the user is not found, send a 404 response
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the friend's index in the user's friends list
    const friendIndex = user.friends.indexOf(friendId);

    // If the friend is not in the user's friends list, send a 404 response
    if (friendIndex === -1) {
      return res.status(404).json({ message: 'Friend not found in user\'s friends list' });
    }

    // Remove the friend from the user's friends list
    user.friends.splice(friendIndex, 1);

    // Save the updated user
    await user.save();

    // Send a success response
    res.status(200).json({ message: 'Friend removed successfully', user: user });
  } catch (error) {
    // If an error occurs, send a 500 response with the error message
    res.status(500).json({ message: 'Error removing friend', error: error.message });
  }
});
app.get('/users/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
});
app.get('/friend-courses/:userId/:friendId', async (req, res) => {
  const { userId, friendId } = req.params;

  try {
    // Find the user by ID to check if the friend relationship exists
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    // Check if the friendId is in the user's friends list
    if (!user.friends.includes(friendId)) {
      return res.status(403).send({ message: 'Friend not found in user\'s friends list' });
    }

    // Find the friend and populate their courses
    const friend = await User.findById(friendId).populate('courses');

    if (!friend) {
      return res.status(404).send({ message: 'Friend not found' });
    }

    // Send the friend's courses
    res.status(200).json(friend.courses);
  } catch (error) {
    res.status(500).send({ message: 'Error fetching friend\'s courses', error: error.message });
  }
});
// Add a route to fetch a course by its ID
app.get('/courses/:courseId', async (req, res) => {
  const { courseId } = req.params;

  try {
    // Find the course by its ID
    const course = await Course.findById(courseId);

    // If the course is not found, send a 404 response
    if (!course) {
      return res.status(404).send({ message: 'Course not found' });
    }

    // Send the course details in the response
    res.status(200).json(course);
  } catch (error) {
    // If an error occurs, send a 500 response with the error message
    res.status(500).send({ message: 'Error fetching course', error: error.message });
  }
});
app.put('/users/:userId/progress/:courseId/questions/:questionId', async (req, res) => {
  const { userId, courseId, questionId } = req.params;
  const { answered, correct } = req.body;

  if (!userId || !courseId || !questionId) {
    return res.status(400).send({ message: 'Missing userId, courseId, or questionId' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).send('User not found');

    let courseProgress = user.progress.find(p => p.courseId.toString() === courseId);
    if (!courseProgress) {
      // Create new course progress if not found
      courseProgress = { courseId, points: 0, questionProgress: [] };
      user.progress.push(courseProgress);
    }
    

    let questionProgress = courseProgress.questionProgress.find(qp => qp.questionId.toString() === questionId);
    if (questionProgress) {
      // Update existing question progress
      questionProgress.answered = answered;
      questionProgress.correct = correct;
    } else {
      // Create new question progress if not found
      courseProgress.questionProgress.push({ questionId, answered, correct, triesLeft: 0 });
    }

    // Decrement triesLeft if answered and not already answered
    if (answered && !questionProgress.answered) {
      questionProgress.triesLeft -= 1;
    }

    // Update points based on correct answer and no tries left
    if (questionProgress.triesLeft === 0 && answered) {
      if (correct) {
        courseProgress.points += 10; // Adjust the points increment as needed
      } else {
        courseProgress.points -= 5; // Adjust the points decrement as needed
      }
    }

    // Save user with modified progress
    await user.save();
    
    res.status(200).send(courseProgress);
  } catch (error) {
    console.error('Error updating question progress:', error);
    res.status(500).send({ message: 'Error updating question progress', error: error.message });
  }
});
// Define a new endpoint for updating progress
app.put('/users/:userId/progress/:courseId/questions/:questionId/update', async (req, res) => {
  const { userId, courseId, questionId } = req.params;
  const { answered, correct } = req.body;

  if (!userId || !courseId || !questionId) {
    return res.status(400).send({ message: 'Missing userId, courseId, or questionId' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).send('User not found');

    const courseProgress = user.progress.find(p => p.courseId.toString() === courseId);
    if (!courseProgress) return res.status(404).send('Course progress not found');

    const questionProgress = courseProgress.questionProgress.find(qp => qp.questionId.toString() === questionId);
    if (!questionProgress) return res.status(404).send('Question progress not found');

    if (questionProgress.triesLeft > 0) {
      questionProgress.triesLeft--;

      if (answered) {
        questionProgress.answered = true;
        questionProgress.correct = correct;

        // Update points based on correctness
        if (correct) {
          courseProgress.points += 10;
        } else if (!correct && questionProgress.triesLeft === 0) {
          courseProgress.points -= 5;
        }
      }
    }

    await user.save();
    res.status(200).send({ questionProgress, points: courseProgress.points });
  } catch (error) {
    console.error('Error updating question progress:', error);
    res.status(500).send({ message: 'Error updating question progress', error: error.message });
  }
});





app.get('/users/:userId/progress/:courseId', async (req, res) => {
  const { userId, courseId } = req.params;
  
  try {
    const user = await User.findById(userId).populate('progress.courseId');
    if (!user) return res.status(404).send('User not found');

    const courseProgress = user.progress.find(p => p.courseId.toString() === courseId);
    if (!courseProgress) return res.status(404).send('Course progress not found');

    res.status(200).json(courseProgress);
  } catch (error) {
    res.status(500).send({ message: 'Error fetching course progress', error: error.message });
  }
});
app.put('/users/:userId/progress/:courseId/questions/:questionId/decrease-tries', async (req, res) => {
  const { userId, courseId, questionId } = req.params;
  const { correct, answered } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).send('User not found');

    const courseProgress = user.progress.find(p => p.courseId.toString() === courseId);
    if (!courseProgress) return res.status(404).send('Course progress not found');

    const questionProgress = courseProgress.questionProgress.find(qp => qp.questionId.toString() === questionId);
    if (!questionProgress) return res.status(404).send('Question progress not found');

    if (questionProgress.triesLeft > 0) {
      questionProgress.triesLeft -= 1;
    }

    if (questionProgress.triesLeft === 0) {
      questionProgress.correct = correct;
      questionProgress.answered = answered;
    }

    await user.save();
    res.status(200).send(courseProgress);
  } catch (error) {
    res.status(500).send({ message: 'Error updating question progress', error: error.message });
  }
});


app.get('/users/:userId/progress/:courseId/questions/:questionId', async (req, res) => {
  const { userId, courseId, questionId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const courseProgress = user.progress.find(progress => progress.courseId.toString() === courseId);
    if (!courseProgress) {
      return res.status(404).json({ message: 'Course progress not found' });
    }

    const questionProgress = courseProgress.questionProgress.find(progress => progress.questionId.toString() === questionId);
    if (!questionProgress) {
      return res.status(404).json({ message: 'Question progress not found' });
    }

    res.json(questionProgress);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
app.get('/user/:userId/course/:courseId/index', async (req, res) => {
  const { userId, courseId } = req.params;
  
  try {
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the index of the course in the user's progress
    const index = user.progress.findIndex(course => course.courseId.toString() === courseId);

    if (index === -1) {
      return res.status(404).json({ message: 'Course not found in user progress' });
    }

    // Return the index
    res.status(200).json({ index });
  } catch (error) {
    console.error('Error fetching course index in user progress:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
app.get('/news', async (req, res) => {
  try {
    const news = await New.find();
    res.json(news);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/news', async (req, res) => {
  const newArticle = new New({
    imageUrl: req.body.imageUrl,
    title: req.body.title,
    content: req.body.content
  });

  try {
    const savedNew = await newArticle.save();
    res.status(201).json(savedNew);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.get('/article', async (req, res) => {
  try {
    const articles = await Article.find();
    res.json(articles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/article', async (req, res) => {
  const newArticle = new Article({
    imageUrl: req.body.imageUrl,
    imageUrls: req.body.imageUrls,
    title: req.body.title,
    content: req.body.content
  });

  try {
    const savedArticle = await newArticle.save();
    res.status(201).json(savedArticle);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
app.get('/articles/:id', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ message: 'Article not found' });
    res.json(article);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
app.get('/tests', async (req, res) => {
  try {
    const tests = await Test.find();
    res.json(tests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET route for fetching a test by ID
app.get('/tests/:id', async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    res.json(test);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST route for creating a new test
app.post('/tests', async (req, res) => {
  const { testName, imageUri, topics } = req.body;
  
  const newTest = new Test({
    testName,
    imageUri,
    topics
  });
  
  try {
    const savedTest = await newTest.save();
    res.status(201).json(savedTest);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
