const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
require("dotenv").config();

const app = express();

// middleware

app.use(express.json());
app.use(cors());

// const uri = `mongodb://0.0.0.0:27017`;

const uri =`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.h73vuqp.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const classCollection = client.db("lensLegacyDB").collection("classes");
    const userCollection = client.db("lensLegacyDB").collection("users");



// add user api
app.post('/newUsers', async(req, res) => {
    const body = req.body;
    const existUser = await userCollection.findOne({email:body.email});
    if(existUser){
        return res.send({ message: "User already exist!" });
    }
    const result = await userCollection.insertOne(body);
    res.send(result)
})



    // add class api

    app.post("/newClass", async (req, res) => {
      const body = req.body;
      console.log(body);
      const result = await classCollection.insertOne(body)
      res.send(result)
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("lens legacy is running.");
});

app.listen(port, () => {
  console.log(`lens legacy is running on port ${port}`);
});
