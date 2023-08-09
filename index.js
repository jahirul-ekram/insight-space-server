const express = require('express');
const cors = require('cors');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middleware 
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send('server running')
})

// mongodb start 
const { MongoClient, ServerApiVersion } = require('mongodb');
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
    await client.connect();
    const usersCollection = client.db("insight-space").collection("users");
    const postsCollection = client.db("insight-space").collection("allPosts");

    app.get('/users', async (req, res) => {
      const email = req.query.email;
      const result = await usersCollection.findOne({ email: email })
      res.send(result)
    })
    app.post("/add-user", async (req, res) => {
      const newUser = req.body;
      const email = newUser.email;
      const availableUser = await usersCollection.findOne({ email: email })
      if (!availableUser) {
        const result = await usersCollection.insertOne(newUser);
        res.send(result)
      }
    })





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


app.listen(port, () => {
  console.log(`this website run on port : ${port}`);
})