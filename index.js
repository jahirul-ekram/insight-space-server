const express = require('express');
// // socket.io
const http = require('http');
const socketIo = require('socket.io');

const cors = require('cors');
require('dotenv').config()
const uuid = require('uuid');
const jwt = require('jsonwebtoken');
const SSLCommerzPayment = require('sslcommerz-lts')
const app = express();
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.PAYMENT_KEY)

// middleware
const corsOptions = {
  origin: 'https://insight-space-f2643.web.app',
  credentials: true,
  optionSuccessStatus: 200,
}

app.use(cors(corsOptions));
app.use(express.json());

// // socket.io
const server = http.createServer(app);
const socketIO = socketIo(server, {
  cors: {
    origin: 'https://insight-space-f2643.web.app',
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Access-Control-Allow-Origin']
  },
  maxHttpBufferSize: 1e8
});

//  

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


const store_id = process.env.Store_ID;
const store_passwd = process.env.Store_Password;
const is_live = false //true for live, false for sandbox


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const usersCollection = client.db("insight-space").collection("users");
    const postsCollection = client.db("insight-space").collection("allPosts");
    const bookMarksCollection = client.db("insight-space").collection("book-marks");
    const feedbackCollection = client.db('insight-space').collection('feedback');
    const conversationCollection = client.db("insight-space").collection("conversations");
    const friendRequestCollection = client.db("insight-space").collection("friendRequests");
    const quizCollection = client.db("insight-space").collection("quiz");
    const connectionsCollection = client.db("insight-space").collection("connections");
    const sslPaymentsCollection = client.db("insight-space").collection("sslPayments");
    const paymentCollection = client.db("insight-space").collection("payment")
    const messageCollection = client.db("insight-space").collection("chatMessage")
    const quizExamCollection = client.db("insight-space").collection("quizExam")


    // for find admin 
    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params?.email;
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


    // find instructor 
    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params?.email;
      if (req.decoded.email !== email) {
        res.send({ instructor: false })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.role === 'instructor' }
      res.send(result);
    });

    // for verify by instructor 
    const verifyInstructor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'instructor') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    }


    // verify premium users 
    app.get('/users/premiumUser/:email', verifyJWT, async (req, res) => {
      const email = req.params?.email;
      if (req.decoded.email !== email) {
        res.send({ premiumUser: false })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { premiumUser: user?.role === 'premium' }
      res.send(result);
    });

    // for verify by instructor 
    const verifyPremiumUser = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'premium') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    }













    // for display all users 
    app.get("/allUsers", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().sort({ date: -1 }).toArray();
      res.send(result)
    })

    app.get("/chat/allUsers", verifyJWT, async (req, res) => {
      const result = await usersCollection.find().sort({ date: -1 }).toArray();
      res.send(result)
    })


    // for get loggedUser 
    app.get('/users', async (req, res) => {
      const email = req.query.email;
      const result = await usersCollection.findOne({ email: email })
      res.send(result)
    })

    app.patch("/user/coverPhoto", verifyJWT, async (req, res) => {
      const { coverPhotoURL, email } = req.body;
      const query = { email: email };
      const result = await usersCollection.updateOne(query, { $set: { coverPhotoURL: coverPhotoURL } }, { upsert: true });
      res.send(result);
    })


    app.get("/users-payment", async (req, res) => {
      const result = await sslPaymentsCollection.find().toArray();
      res.send(result)
    })

    // for get all post 
    app.get("/posts", async (req, res) => {
      const result = await postsCollection.find().sort({ date: -1 }).toArray();
      res.send(result)
    })

    app.get("/book-marks", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const query = { email: email }
      const result = await bookMarksCollection.find(query).toArray();
      res.send(result)
    })

    // for get all quiz 
    app.get("/quiz", verifyJWT, async (req, res) => {
      const result = await quizCollection.find().toArray();
      res.send(result)
    })

    app.get("/all-instructors", verifyJWT, async (req, res) => {
      const result = await paymentCollection.find().sort({ date: -1 }).project({ instructorData: 1 }).toArray();
      res.send(result)
    })

    // single user for soket io 
    // / save conversation 
    app.post('/conversation', async (req, res) => {
      const { senderId, receiverId } = req.body;
      const query = {
        members: {
          $all: [senderId, receiverId]
        }
      };
      const result = await conversationCollection.findOne(query);
      if (result) {
        res.json("already_Created")
      } else {
        const conversation = {
          members: [senderId, receiverId]
        }
        const newConversation = await conversationCollection.insertOne(conversation)
        res.send(newConversation);
      }
    });


    // for insert users
    app.post("/add-user", async (req, res) => {
      const newUser = req.body;
      const email = newUser.email;
      const availableUser = await usersCollection.findOne({ email: email })
      const connection = {
        email: email,
        friends: []
      };
      if (!availableUser) {
        const result = await usersCollection.insertOne(newUser);
        const result1 = await connectionsCollection.insertOne(connection);
        res.send({ result, result1 })
      }
      else {
        res.send("user Already joined")
      }
    })

    // for Update users profile kakan Chandra
    app.patch("/update_profile", verifyJWT, async (req, res) => {
      const update_profile_data = req.body;
      const email = update_profile_data.email;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          displayName: update_profile_data.displayName,
          photoURL: update_profile_data.photoURL,
          lastUpdate: update_profile_data.lastUpdate
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc, options);
      res.send(result);
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
      else {
        const availableReact = react1.filter(r => r !== data.email)
        const updateDoc = {
          $set: {
            react: availableReact,
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

    // for delete post by admin 
    app.delete("/post", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.query?.id;
      const query = { _id: new ObjectId(id) };
      const result = await postsCollection.deleteOne(query);
      res.send(result);
    })


    // Feedback (Sumaiya Akhter)
    app.get('/feedback', verifyJWT, async (req, res) => {
      console.log(req.query.email);
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
    // xxxxxxxxxxxxxxxxx
    app.patch('/feedback/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedFeedback = req.body;
      console.log(updatedFeedback);
      const updateDoc = {
        $set: {
          status: feedbackCollection.status
        },
      };
      const result = await feedbackCollection.updateOne(filter, updateDoc);
      res.send(result)

    })

    app.delete('/feedback/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await feedbackCollection.deleteOne(query);
      res.send(result)
    })


    // AddQuiz
    app.post('/addquiz', verifyJWT, async (req, res) => {
      const addQuiz = req.body;
      // console.log(addQuiz)
      const result = await quizCollection.insertOne(addQuiz);
      res.send(result);

    })



    // get AllFeedback for testimonials (by Kakon)
    app.get('/testimonials', async (req, res) => {
      const result = await feedbackCollection.find().toArray();
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
    app.patch("/deleteComment", verifyJWT, async (req, res) => {
      const { postId, commentId } = req.body;
      const post = await postsCollection.findOne({ _id: new ObjectId(postId) });
      const comments = post?.comment?.filter(c => c.commentId !== commentId);
      const updateDoc = {
        $set: {
          comment: comments,
        },
      };
      const result = await postsCollection.updateOne({ _id: new ObjectId(postId) }, updateDoc)
      res.send(result);
    })

    // for delete post 
    app.delete("/deletePost/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await postsCollection.deleteOne(query);
      res.send(result)
    })
    //  for delete bookmarks 
    app.delete("/deleteBookMark/:id", verifyJWT, async (req, res) => {
      const email = req.decoded.email;
      const id = req.params.id;
      const query = { postId: id, email: email }
      const result = await bookMarksCollection.deleteOne(query);
      res.send(result);
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






    // Create a new route to retrieve conversations from the database
    app.get('/conversations', verifyJWT, async (req, res) => {
      const userEmail = req.decoded.email;
      // Retrieve conversations where the user is the sender or receiver
      const conversations = await conversationCollection.find({
        $or: [
          { sender: userEmail },
          { receiver: userEmail },
        ],
      }).toArray();
      res.send(conversations);
    });


    // Save a conversation to the database
    app.post('/conversations', async (req, res) => {
      const conversationData = req.body;

      try {
        const result = await conversationCollection.insertOne(conversationData);
        res.status(200).send({ message: 'Conversation saved successfully', result });
      } catch (error) {
        console.error('Error saving conversation:', error);
        res.status(500).send({ error: 'An error occurred while saving the conversation' });
      }
    });


    // Friend Requestfriend
    app.post('/friendRequests/send', verifyJWT, async (req, res) => {
      try {
        const senderEmail = req.decoded.email;
        const receiverEmail = req.query?.email;
        const existingRequest = await friendRequestCollection.findOne({
          sender: senderEmail,
          receiver: receiverEmail,
        });

        if (existingRequest) {
          return res.status(400).json({ message: 'Friend request already sent.' });
        }

        const newFriendRequest = {
          sender: senderEmail,
          receiver: receiverEmail,
          status: 'pending',
        };

        await friendRequestCollection.insertOne(newFriendRequest);
        res.status(200).json({ message: 'Friend request sent.' });
      } catch (error) {
        console.error('Error sending friend request:', error);
        res.status(500).json({ error: 'An error occurred while sending the friend request.' });
      }
    });

    // acpt friend req 
    app.patch('/friendRequests/accept/:requestId', verifyJWT, async (req, res) => {
      const reqCollectionId = req.params.requestId;
      const query = { _id: new ObjectId(reqCollectionId) }
      const data = await friendRequestCollection.findOne(query);
      const senderCollections = await connectionsCollection.findOne({ email: data.sender })
      const receiverCollections = await connectionsCollection.findOne({ email: data.receiver });

      const senderFriend = { email: data.receiver };
      senderCollections.friends.push(senderFriend);
      const updateDoc = {
        $set: {
          friends: senderCollections.friends,
        },
      };
      const receiverFriend = { email: data.sender };
      receiverCollections.friends.push(receiverFriend);
      const updateDoc1 = {
        $set: {
          friends: receiverCollections.friends,
        },
      };

      const result1 = await connectionsCollection.updateOne({ email: data.sender }, updateDoc);
      const result2 = await connectionsCollection.updateOne({ email: data.receiver }, updateDoc1);
      const result3 = await friendRequestCollection.deleteOne(query);
      res.send({ result1, result2, result3 })
    });


    // Deny friend request
    app.delete('/friendRequests/deny/:requestId', verifyJWT, async (req, res) => {
      const requestId = req.params.requestId;
      const query = { _id: new ObjectId(requestId) };
      const result = await friendRequestCollection.deleteOne(query);
      res.send(result)
    });

    // Get received friend request  
    app.get('/friendRequests/received', verifyJWT, async (req, res) => {
      const email = req.decoded.email;
      const query = { receiver: email }
      const result = await friendRequestCollection.find(query).toArray();
      res.send(result)
    });


    // Get all friends of a user
    app.get('/myFriends', verifyJWT, async (req, res) => {
      const email = req.query?.email;
      const friend = await connectionsCollection.findOne({ email: email });
      const emails = friend?.friends?.map(f => f.email);
      const allUsers = await usersCollection.find().toArray();
      const findFriends = allUsers?.filter(u => emails?.includes(u.email));
      res.send(findFriends);
    });



    // SSL Payments

    const transaction_Id = new ObjectId().toString();

    app.post("/ssl-payment", async (req, res) => {

      const formData = req.body;

      const data = {
        total_amount: formData?.number,
        currency: 'BDT',
        tran_id: transaction_Id, // use unique tran_id for each api call
        success_url: `https://insight-space-server.vercel.app/payment/success/${transaction_Id}`,
        fail_url: `https://insight-space-server.vercel.app/payment/fail/${transaction_Id}`,
        cancel_url: 'http://localhost:3030/cancel',
        ipn_url: 'http://localhost:3030/ipn',
        shipping_method: 'Courier',
        product_name: 'Computer.',
        product_category: 'Electronic',
        product_profile: 'general',
        cus_name: 'Customer Name',
        cus_email: 'customer@example.com',
        cus_add1: 'Dhaka',
        cus_add2: 'Dhaka',
        cus_city: 'Dhaka',
        cus_state: 'Dhaka',
        cus_postcode: '1000',
        cus_country: 'Bangladesh',
        cus_phone: '01711111111',
        cus_fax: '01711111111',
        ship_name: 'Customer Name',
        ship_add1: 'Dhaka',
        ship_add2: 'Dhaka',
        ship_city: 'Dhaka',
        ship_state: 'Dhaka',
        ship_postcode: 1000,
        ship_country: 'Bangladesh',
      };

      console.log(data);

      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
      sslcz.init(data).then(apiResponse => {
        // Redirect the user to payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL;
        res.send({ url: GatewayPageURL });


        const finalSslPayment = {
          formData, paidStatus: false, transaction_Id: transaction_Id
        };

        const result = sslPaymentsCollection.insertOne(finalSslPayment);

        console.log('Redirecting to: ', GatewayPageURL)
      });


    });

    app.post("/payment/success/:transaction_Id", async (req, res) => {

      console.log(req.params.transaction_Id)

      const result = await sslPaymentsCollection.updateOne({ transaction_Id: req.params.transaction_Id }, {

        $set: {
          paidStatus: true,
        }

      });

      if (result.modifiedCount > 0) {

        res.redirect(`https://insight-space-f2643.web.app/payment/success/${req.params.transaction_Id}`)

      };

    });

    app.post("/payment/fail/:transaction_Id", async (req, res) => {

      const result = await sslPaymentsCollection.deleteOne({ transaction_Id: req.params.transaction_Id });

      if (result.deletedCount) {

        res.redirect(`https://insight-space-f2643.web.app/payment/fail/${req.params.transaction_Id}`)

      };

    });

    // SSL Payments


    // for international payments methood
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      // console.log(price, amount)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      });
    })


    app.post('/payments', verifyJWT, async (req, res) => {
      const payment = req.body;
      const instructorRequest = payment?.instructorData?.email;
      if (instructorRequest) {
        const availablePayment = await paymentCollection.findOne({ email: payment.email })
        if (!availablePayment) {
          const insertResult = await paymentCollection.insertOne(payment)
          const result = await usersCollection.updateOne({ email: payment.email }, { $set: { role: "instructor" } });
          res.send({ insertResult, result });
        }
        else {
          res.send("you have already get this package")
        }
      }
      else {
        const result = await usersCollection.updateOne({ email: payment.email }, { $set: { role: "premium" } });
        res.send(result)
      }
    })

    app.get("/payments-history", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const query = { email: email }
      const result = await paymentCollection.find(query).sort({ date: -1 }).toArray();
      res.send(result)
    })
    app.delete("/delete-payment/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await paymentCollection.deleteOne(query);
      res.send(result)
    })
    app.post('/mock-test', verifyJWT, async (req, res) => {
      const feedback = req.body;
      const result = await quizExamCollection.insertOne(feedback);
      res.send(result);

    })

    app.get("/exam-test", async (req, res) => {
      const email = req.query.email;
      const query = { email: email }
      const result = await quizExamCollection.find(query).sort({ date: -1 }).toArray();
      res.send(result)
    })

    // // kakon socket api-----------------

    // // get conversation users ----------------
    app.get('/conversation/:userId', verifyJWT, async (req, res) => {
      try {
        const userId = req.params.userId;
        const conversations = await conversationCollection.find({ members: { $in: [userId] } }).toArray();

        const conversationUserData = Promise.all(conversations.map(async (conversation) => {
          const conversationId = conversation._id;
          const conversationUserId = conversation.members.find(m => m !== userId);
          const user = await usersCollection.findOne({ _id: new ObjectId(conversationUserId) });
          return { user, conversationId };
        }));
        res.send(await conversationUserData);
      } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred while fetching conversations.");
      }
    });

    socketIO.on('connection', socket => {
      console.log('A user connected');

      socket.on('conversationId', async (conversationId) => {
        socket.join(conversationId);
        const messages = await messageCollection.find({ conversationId: conversationId }).toArray();
        socket.emit('allMessages', messages);
      });

      socket.on('chatMessage', async (messageData) => {
        const newMessage = await messageCollection.insertOne(messageData);
        const messages = await messageCollection.find({ conversationId: messageData.conversationId }).toArray();

        // Emit the new message to all sockets in the conversation
        socketIO.to(messageData.conversationId).emit('allMessages', messages);
      });

      socket.on('disconnect', () => {
        console.log('User disconnected');
      });
    });


    // soket end 




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




server.listen(port, () => {
  console.log(`socket server is listening on port ${port}`);
});

// app.listen(port, () => {
//   console.log(`Server is running on port ${port}`)
// })











