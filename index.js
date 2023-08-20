const express = require('express');
const cors = require('cors');
require('dotenv').config()
const uuid = require('uuid');
const jwt = require('jsonwebtoken');
const app = express();
const { Server } = require("socket.io");
const http = require('http');
const port = process.env.PORT || 5000;

// middleware 
app.use(cors())
app.use(express.json())

// socket.io middleware
const server = http.createServer(app);
// socket.io middleware

app.get('/', (req, res) => {
  res.send('server running')
})

function generateUniqueId() {
  return uuid.v4(); // Generates a random UUID
}
//// jwt assign 
app.post('/jwt', (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.SECURE_TOKEN, { expiresIn: '12h' })
  res.send({ token })
})

// jwt interceptor
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // extract  token from bearer
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.SECURE_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}


// mongodb start 
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kri1sc7.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const usersCollection = client.db("insight-space").collection("users");
    const postsCollection = client.db("insight-space").collection("allPosts");
    const bookMarksCollection = client.db("insight-space").collection("book-marks");
    const feedbackCollection = client.db('insight-space').collection('feedback')

    // for find admin 
    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result);
    })

    // for verify by admin 
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    }

    app.get("/allUsers", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result)
    })


    // for get loggedUser 
    app.get('/users', async (req, res) => {
      const email = req.query.email;
      const result = await usersCollection.findOne({ email: email })
      res.send(result)
    })

    // for get all post 
    app.get("/posts", async (req, res) => {
      const result = await postsCollection.find().sort({ date: -1 }).toArray();
      res.send(result)
    })

    app.get("/book-marks", async (req, res) => {
      const email = req.query.email;
      const query = { email: email }
      const result = await bookMarksCollection.find(query).toArray();
      res.send(result)
    })

    // for insert users
    app.post("/add-user", async (req, res) => {
      const newUser = req.body;
      const email = newUser.email;
      const availableUser = await usersCollection.findOne({ email: email })
      if (!availableUser) {
        const result = await usersCollection.insertOne(newUser);
        res.send(result)
      }
    })

    // for insert post 
    app.post("/posts", verifyJWT, async (req, res) => {
      const post = req.body;
      const result = await postsCollection.insertOne(post);
      res.send(result);
    })

    // blog post api - tanjir 
    app.get("/blog", async (req, res) => {
      const result = await postsCollection.find({ category: "blog" }).sort({ date: - 1 }).toArray();
      res.send(result)
    })

    // for insert book-marks
    app.post('/book-marks', verifyJWT, async (req, res) => {
      const bookMarks = req.body;
      const id = bookMarks.postId;
      const isAvailable = await bookMarksCollection.findOne({ postId: id, email: bookMarks.email })
      if (!isAvailable) {
        const result = await bookMarksCollection.insertOne(bookMarks);
        res.send(result)
      }
    })

    // for insert update reacts
    app.patch("/reacts", verifyJWT, async (req, res) => {
      const data = req.body;
      const query = { _id: new ObjectId(data.id) }
      const post = await postsCollection.findOne(query);
      const react1 = post.react;
      const available = react1.includes(data.email);
      if (!available) {
        const allReact = [...react1, data.email];
        const updateDoc = {
          $set: {
            react: allReact,
          },
        };
        const result = await postsCollection.updateOne(query, updateDoc);
        res.send(result)
      }
    })

    app.patch("/comment", verifyJWT, async (req, res) => {
      const data = req.body;
      const id = data.postId;
      const commentId = generateUniqueId();
      const insertComment = { comment: data.comment, email: data.email, displayName: data.displayName, photoURL: data.photoURL, commentId }
      const query = { _id: new ObjectId(id) }
      const post = await postsCollection.findOne(query);
      const comment1 = post.comment;
      const newComment = [...comment1, insertComment]
      const updateDoc = {
        $set: {
          comment: newComment,
        },
      };
      const result = await postsCollection.updateOne(query, updateDoc)
      res.send(result)
    })

    // Feedback (Sumaiya Akhter)
    app.get('/feedback', async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await feedbackCollection.find(query).toArray();
      res.send(result);
    })


    app.post('/feedback', verifyJWT, async (req, res) => {
      const feedback = req.body;
      const result = await feedbackCollection.insertOne(feedback);
      res.send(result);

    })


    // for update comment 
    app.patch("/updateComment", verifyJWT, async (req, res) => {
      const data = req.body;
      const result = await postsCollection.updateOne(
        { "comment.commentId": data.commentId },
        { $set: { "comment.$.comment": data.updateComment } }
      );
      res.send(result)
    })

    // for delete comment 
    app.delete("/deleteComment", async (req, res) => {
      const id = req.query.id;
      const result = await postsCollection.deleteOne({ 'comment.commentId': id });
      res.send(result)
    })

    // delete users for admin route 
    app.delete("/user", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.query?.id;
      const query = { _id: new ObjectId(id) }
      const result = await usersCollection.deleteOne(query);
      res.send(result)
    })
    //  make admin as a admin 
    app.patch("/user", verifyJWT, verifyAdmin, async (req, res) => {
      const data = req.body;
      const query = { _id: new ObjectId(data?.id), email: data.email }
      const user = await usersCollection.findOne(query);
      if (user.role === "regular") {
        const updateDoc = {
          $set: {
            role: "admin"
          },
        };
        const result = await usersCollection.updateOne(query, updateDoc);
        res.send(result);
      }
      if (user.role === "admin") {
        const updateDoc = {
          $set: {
            role: "regular"
          },
        };
        const result = await usersCollection.updateOne(query, updateDoc);
        res.send(result);
      }
    })

    // admin post action 
    app.get("/allPosts", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await postsCollection.find().toArray();
      res.send(result)
    })

    app.delete("/post", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.query.id;
      const query = { _id: new ObjectId(id) }
      const result = await postsCollection.deleteOne(query);
      res.send(result);
    })




    
    // for my post api shamim
    app.get('/my-post/:email', async (req, res) => {
      let query = {};
      if (req.params?.email) {
        query = { email: req.params.email }
      }
      const result = await postsCollection.find(query).toArray()
      res.send(result)
    })

    // for my post api shamim

    app.get("/my-posts", verifyJWT, async (req, res) => {
      const email = req.query.userEmail;
      const query = { userEmail: email }
      const result = await postsCollection.find(query).toArray();
      res.send(result)
    })

    // for top post api by shamim
    app.get('/top-post', async (req, res) => {
      const result = await postsCollection.find().sort({ react: -1 }).toArray()
      res.send(result)
    })



    // kakon
    app.get('/chatMessage/message/:email', async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const classItem = await classCollection.findOne(filter);

      if (!classItem) {
        return res.status(404).send('Class not found');
      }

      const message = classItem.message || '';

      res.send(message);
    });


    // for send message 
    app.post('/chatMessage', async (req, res) => {
      const newMessage = req.body;
      const id = generateUniqueId();
      const updatedMessage = { date: newMessage.message.date, id: id, data: newMessage.message.data }
      const filter = { sender: newMessage.sender, receiver: newMessage.receiver }
      const oldConversations = await messageCollection.findOne(filter);
      if (!oldConversations) {
        const insertMessage = { message: [updatedMessage], sender: newMessage.sender, receiver: newMessage.receiver }
        const result = await messageCollection.insertOne(insertMessage);
        res.send(result);
      }
      else {
        const message = oldConversations.message;
        const msg = [...message, updatedMessage]
        const updateDoc = {
          $set: {
            message: msg
          },
        };
        const result = await messageCollection.updateOne(filter, updateDoc)
        res.send(result)
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
// mongodb end

// chat application functionality: tanjir

const io = new Server(server, {
  cors: {
    origin: 'https://insight-space-f2643.web.app',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  }
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("join-room", (data) => {
    socket.join(data);

    console.log(`User id: ${socket.id} joined room: ${data}`);

  });

  socket.on("send-message", (data) => {
    console.log(data);

    socket.to(data.room).emit("receive-message", data);

  });

  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id)
  });

});

server.listen(5001, () => {
  console.log("Live chat server");
});

// chat application functionality: tanjir

app.listen(port, () => {
  console.log(`this website run on port : ${port}`);
})