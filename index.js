const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
require("dotenv").config();
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

const app = express();

// middleware

app.use(express.json());
app.use(cors());

// ! JWT token verify
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "Unauthorized access" });
  }
  // token
  const token = authorization.split(" ")[1];
  // console.log(token)
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    // console.log(decoded, err); // bar
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "Unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

// const uri = `mongodb://0.0.0.0:27017`;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.h73vuqp.mongodb.net/?retryWrites=true&w=majority`;

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
    // await client.connect();

    const classCollection = client.db("lensLegacyDB").collection("classes");
    const userCollection = client.db("lensLegacyDB").collection("users");
    const paymentCollection = client.db("lensLegacyDB").collection("payments");

    // ! JWT sign

    app.post("/jwt", (req, res) => {
      const user = req.body;

      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // !JWT verify Admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const filter = {email: email};
      // console.log(filter, "filter")
      const user = await userCollection.findOne(filter);
      // console.log('user',user)
      if(user?.role !== 'admin'){
        return res.status(403).send({error: true, message: "Forbidden access"})
      }
      next();
    };

    // getting admin

    app.get("/user/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if(email !== req.decoded.email){
        return res.send({admin: false})
      } 
      const query = { email: email };
      const result = await userCollection.findOne(query);

      res.send({ admin: result.role === "admin" });
    });
    // getting instructor

    app.get("/user/instructor/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send({ instructor: result.role === "instructor" });
    });


    // * selected class api
    app.post('/userSelect/:email', async(req, res) => {
      const email = req.params.email;
      const classId = req.body.classId;
      const user = await userCollection.findOne({email: email});
      if(user){
        if(!user.selectedClass){
          user.selectedClass = [classId];
        }
        else {
          if(user.selectedClass.includes(classId)){
            return res.status(400).send({error: true, message: "Class already selected"})
          }
          user.selectedClass.push(classId)
        }
        const updateDoc = { $set: user };
        const result = await userCollection.updateOne({_id: new ObjectId(user._id)},updateDoc)
        res.send(result)
      }
      else{
        res.send({error:true, message: "User not found"})
      }
    })

    // * remove class from userSelected class
    app.put('/removeSelect/:email', async(req, res) => {
      const email = req.params.email;
      const classId = req.body.classId
      const filter = {email:email};
      const result = await userCollection.updateOne(filter,  { $pull: { selectedClass: classId } });
      res.send(result)
  


    })

    app.get('/selectedClass/:email', async(req, res) => {
      const email = req.params.email;
      const filter = {email: email};
      const user = await userCollection.findOne(filter);
      // console.log(user)
      const classIds = user?.selectedClass.map(id => new ObjectId(id))
      const classes = await classCollection.find({ _id: { $in: classIds } }).toArray();
      // console.log(classes)
      res.send(classes)

      
    })


    // ^ payment api

    app.post('/create-payment-intent', verifyJWT, async(req, res) => {
      const price = req.body.price;
      const amount = parseInt(price * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    } )

    app.post('/payments',  async(req, res) => {
      const body = req.body;
      const filter = {email: email}
      // console.log(body)
      const insertedPayment = await paymentCollection.insertOne(body)
      // const user = await userCollection.findOne({email: body.email})
      const result = await userCollection.updateOne(filter,  { $pull: { selectedClass: body.classId }  })


    })

   

    // user api

    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.post("/newUsers", async (req, res) => {
      const body = req.body;
      const existUser = await userCollection.findOne({ email: body.email });
      if (existUser) {
        return res.send({ message: "User already exist!" });
      }
      const result = await userCollection.insertOne(body);
      res.send(result);
    });

    app.put("/user/:id", async (req, res) => {
      const id = req.params.id;
      const role = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: role,
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    //  instructor api

    app.get("/instructors", async (req, res) => {
      const filter = { role: "instructor" };
      const result = await userCollection.find(filter).toArray();
      res.send(result);
    });

    //  class apis

    app.get("/approvedClasses", async (req, res) => {
      const filter = { status: "approved" };
      const result = await classCollection.find(filter).toArray();
      res.send(result);
    });

    app.get("/classes",verifyJWT, verifyAdmin, async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });

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

    app.put("/feedback/:id", async (req, res) => {
      const id = req.params.id;
      const feedback = req.body.feedback;
      // console.log(feedback)
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          feedback: feedback,
        },
      };
      const filter = { _id: new ObjectId(id) };
      const result = await classCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    app.patch("/updateStatus/:id", async (req, res) => {
      const id = req.params.id;
      const updateStatus = req.body;
      // console.log(updateStatus, id)
      const updateDoc = {
        $set: {
          status: updateStatus.status,
        },
      };
      const filter = { _id: new ObjectId(id) };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
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
