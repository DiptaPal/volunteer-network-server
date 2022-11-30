const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken')
require('dotenv').config();
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5000;

//middle wares
app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.xm5hqxk.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            res.status(403).send({ message: 'forbidden' })
        }
        req.decoded = decoded;
        next()
    })
}


async function run() {
    try {
        const eventCollection = client.db("volunteerNetwork").collection('events');
        const volunteerCollection = client.db("volunteerNetwork").collection('volunteer');

        app.post('/events', async (req, res) => {
            const events = req.body;
            const result = await eventCollection.insertOne(events);
            res.send(result)
        })

        app.get('/events', async (req, res) => {
            const page = parseInt(req.query.page);
            const size = parseInt(req.query.size);
            const query = {}
            const cursor = eventCollection.find(query);
            const event = await cursor.skip(page * size).limit(size).toArray();
            const count = await eventCollection.estimatedDocumentCount();
            res.send({ event, count });
        })

        app.get('/events/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await eventCollection.findOne(query);
            res.send(result);
        })

        app.post('/volunteer', async (req, res) => {
            const volunteer = req.body;
            const result = await volunteerCollection.insertOne(volunteer);
            res.send(result)
        })

        app.get('/volunteer', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            if (decoded.email !== req.query.email) {
                res.status(403).send({
                    success: false,
                    message: 'forbidden'
                })
            }

            let query = {};
            if (req.query.email) {
                query = { email: req.query.email }
            }
            const cursor = volunteerCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })

        app.get('/volunteers', async (req, res) => {
            let query = {};
            const cursor = volunteerCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })

        app.delete('/volunteers/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            let query = { _id: ObjectId(id) };
            const result = await volunteerCollection.deleteOne(query);
            res.send(result)
        })

        app.patch('/volunteer/:id', async (req, res) => {
            const id = req.params.id;
            const status = req.body.status
            const query = { _id: ObjectId(id) }

            const updateTask = {
                $set: {
                    status: status
                }
            }
            const result = await volunteerCollection.updateOne(query, updateTask);
            res.send(result)
        })

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '365d' })
            res.send({ token })
        })
    }
    finally {
        //await client.close();
    }
}
run().catch(error => console.log(error.message))


app.get('/', (req, res) => {
    res.send('Volunteer Server is running....')
})

app.listen(port, () => {
    console.log(`Volunteer Server is running on ${port}`);
})
