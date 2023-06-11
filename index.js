const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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



    // getting admin

    app.get('/user/admin/:email', async(req, res) => {
      const email = req.params.email;
      const query = {email: email};
      const result = await userCollection.findOne(query);

     res.send({admin: result.role === 'admin'})
    })
    // getting instructor

    app.get('/user/instructor/:email', async(req, res) => {
      const email = req.params.email;
      const query = {email: email};
      const result = await userCollection.findOne(query);
      res.send({instructor: result.role === 'instructor' })
    })

    // user api

    app.get('/users', async(req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result)
    })

    app.post("/newUsers", async (req, res) => {
      const body = req.body;
      const existUser = await userCollection.findOne({ email: body.email });
      if (existUser) {
        return res.send({ message: "User already exist!" });
      }
      const result = await userCollection.insertOne(body);
      res.send(result);
    });

    app.put('/user/:id', async(req, res) => {
      const id = req.params.id;
      const role = req.body;
      const filter = {_id: new ObjectId(id)}
      const updateDoc = {
        $set: role,
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result)
    })

    //  instructor api

    app.get('/instructors', async(req, res) => {
      const filter = {role: 'instructor'}
      const result = await userCollection.find(filter).toArray();
      res.send(result)
    })

    //  class apis

    app.get('/approvedClasses', async(req, res) => {
      const filter = {status: "approved"}
      const result = await classCollection.find(filter).toArray();
      res.send(result)
    })

    app.get("/classes", async(req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result)
    })

    app.get("/myClass", async (req, res) => {
      const query = req.query;
      // console.log("52", query);
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/newClass", async (req, res) => {
      const body = req.body;
      // console.log(body);
      const result = await classCollection.insertOne(body);
      res.send(result);
    });

    app.put("/updateClass/:id", async (req, res) => {
      const id = req.params.id;

      const updateClass = req.body;
      // console.log(updateClass);
      const updateDoc = {
        $set: {
          price: updateClass.price,
          className: updateClass.className,
          seat: updateClass.seat,
          imgUrl: updateClass.imgUrl,
        },
      };
      const filter = { _id: new ObjectId(id) };

      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

app.put('/feedback/:id', async(req, res) => {
  const id = req.params.id;
  const feedback = req.body.feedback;
  // console.log(feedback)
  const options = { upsert: true };
  const updateDoc = {
    $set: {
      feedback: feedback
    },
  };
  const filter = {_id: new ObjectId(id)};
  const result = await classCollection.updateOne(filter, updateDoc, options);
      res.send(result)
})

    app.patch('/updateStatus/:id', async(req, res) => {
      const id = req.params.id
      const updateStatus = req.body;
      // console.log(updateStatus, id)
      const updateDoc = {
        $set:{
          status: updateStatus.status,
        }
      }
      const filter = {_id: new ObjectId(id)};
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result)
    } )

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
